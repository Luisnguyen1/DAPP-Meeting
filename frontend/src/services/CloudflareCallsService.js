class CallsApp {
  constructor(appId, appSecret) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.baseUrl = '/cloudflare/client/v4';
  }

  async sendRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('Sending request to:', url, options);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Response error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async createStream(roomId) {
    return this.sendRequest(`/accounts/${this.appId}/stream/live_inputs`, {
      method: 'POST',
      body: JSON.stringify({
        meta: { name: roomId },
        settings: {
          recording: { mode: "automatic" },
          allowedOrigins: ["*"]
        }
      })
    });
  }

  async getStreamKey(streamId) {
    return this.sendRequest(`/accounts/${this.appId}/stream/live_inputs/${streamId}/keys`, {
      method: 'POST'
    });
  }
}

class CloudflareCallsService {
  constructor() {
    this.localStream = null;
    this.peerConnections = new Map();
    this.eventListeners = new Map();
    this.ws = null;
    this.wsBaseUrl = window.location.hostname;
  }

  async getMediaStream() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('Using modern getUserMedia API');
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      }
      
      console.log('Falling back to legacy getUserMedia');
      // Fallback cho các trình duyệt cũ
      const getUserMedia = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;
      
      if (!getUserMedia) {
        console.error('No getUserMedia support');
        throw new Error('Your browser does not support camera/microphone access');
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, 
          { video: true, audio: true },
          stream => resolve(stream),
          error => {
            console.error('getUserMedia error:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('Error getting media stream:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera/microphone access was denied. Please allow access in your browser settings.');
      }
      throw error;
    }
  }

  async getTurnCredentials() {
    try {
      const response = await fetch('/api/turn-credentials');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('TURN credentials error:', errorText);
        throw new Error(`Failed to get TURN credentials: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching TURN credentials:', error);
      throw error;
    }
  }

  async initialize(userId, roomId) {
    if (!userId) {
      throw new Error('userId is required');
    }

    try {
      await this.closeWebSocket();

      const wsProtocol = 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.hostname}:8080/ws?userId=${userId}&roomId=${roomId}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      await new Promise((resolve, reject) => {
        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          resolve();
        };
        this.ws.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          reject(new Error('WebSocket connection failed'));
        };
      });

      console.log('WebSocket connected successfully');

      this.ws.onmessage = async (event) => {
        console.log('Received WebSocket message:', event.data);
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'user-joined':
            console.log('User joined event received:', message);
            await this.handleUserJoined(message.userId);
            break;
          case 'user-left':
            console.log('User left event received:', message);
            this.handleUserLeft(message.userId);
            break;
          case 'offer':
            console.log('Offer received:', message);
            await this.handleOffer(message.userId, message.offer);
            break;
          case 'answer':
            console.log('Answer received:', message);
            await this.handleAnswer(message.userId, message.answer);
            break;
          case 'ice-candidate':
            console.log('ICE candidate received:', message);
            await this.handleIceCandidate(message.userId, message.candidate);
            break;
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

      this.localStream = await this.getMediaStream();

      const turnConfig = await this.getTurnCredentials();
      console.log('Got TURN config:', turnConfig);

      this.iceServers = [{
        urls: turnConfig.iceServers.urls,
        username: turnConfig.iceServers.username,
        credential: turnConfig.iceServers.credential
      }];

      return this.localStream;
    } catch (error) {
      console.error('Error in initialize:', error);
      throw error;
    }
  }

  async handleUserJoined(userId) {
    console.log('User joined:', userId);
    try {
      const pc = await this.createPeerConnection(userId);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Sending offer to:', userId);
      this.sendMessage({
        type: 'offer',
        targetUserId: userId,
        offer: offer
      });
    } catch (error) {
      console.error('Error in handleUserJoined:', error);
    }
  }

  async handleUserLeft(userId) {
    console.log('User left:', userId);
    if (this.peerConnections.has(userId)) {
      this.peerConnections.get(userId).close();
      this.peerConnections.delete(userId);
    }
    this.emitEvent('participantLeft', { userId });
  }

  async handleOffer(userId, offer) {
    console.log('Handling offer from:', userId);
    try {
      const pc = await this.createPeerConnection(userId);
      console.log('Setting remote description...');
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
      
      console.log('Setting local description...');
      await pc.setLocalDescription(answer);
      
      console.log('Sending answer to:', userId);
      this.sendMessage({
        type: 'answer',
        targetUserId: userId,
        answer: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(userId, answer) {
    console.log('Received answer from:', userId);
    try {
      const pc = this.peerConnections.get(userId);
      if (pc) {
        console.log('Current signaling state:', pc.signalingState);
        
        // Chỉ set remote description nếu peer connection đang ở trạng thái have-local-offer
        if (pc.signalingState === 'have-local-offer') {
          console.log('Setting remote description:', answer);
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('Answer processed successfully');
        } else {
          console.warn('Peer connection not in correct state for setting remote description');
          console.warn('Current state:', pc.signalingState);
        }
      } else {
        console.warn('No peer connection found for user:', userId);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(userId, candidate) {
    console.log('Received ICE candidate for:', userId);
    const pc = this.peerConnections.get(userId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  async createPeerConnection(userId) {
    console.log('Creating peer connection for user:', userId);
    const configuration = {
      iceServers: this.iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      // Enable unified plan for consistent behavior
      sdpSemantics: 'unified-plan'
    };

    const pc = new RTCPeerConnection(configuration);
    
    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      console.log('Adding local track to peer connection:', track.kind);
      pc.addTrack(track, this.localStream);
    });

    // Improved ontrack handler
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (!event.streams || !event.streams[0]) {
        console.warn('No streams in track event');
        return;
      }
      
      const remoteStream = event.streams[0];
      console.log('Remote stream tracks:', remoteStream.getTracks().length);
      
      this.emitEvent('participantJoined', {
        userId: userId,
        stream: remoteStream
      });
    };

    // Log ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${userId}:`, pc.iceConnectionState);
    };

    this.peerConnections.set(userId, pc);
    return pc;
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open. ReadyState:', this.ws?.readyState);
    }
  }

  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      await this.room.publishStream(screenStream, { type: 'screen' });
      return screenStream;
    } catch (error) {
      console.error('Error sharing screen:', error);
      throw error;
    }
  }

  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(callback);
  }

  off(eventName, callback) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).delete(callback);
    }
  }

  emitEvent(eventName, data) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).forEach(callback => callback(data));
    }
  }

  async leaveRoom() {
    try {
      console.log('Leaving room...');
      for (const [userId, pc] of this.peerConnections) {
        pc.close();
        this.peerConnections.delete(userId);
      }

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      await this.closeWebSocket();
      console.log('Left room successfully');
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  async toggleAudio(enabled) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }

  async toggleVideo(enabled) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }

  async closeWebSocket() {
    if (this.ws) {
      return new Promise((resolve) => {
        const ws = this.ws;
        this.ws = null;

        if (ws.readyState === WebSocket.CLOSED) {
          resolve();
          return;
        }

        ws.onclose = () => {
          console.log('WebSocket closed successfully');
          resolve();
        };

        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    }
  }
}

export default new CloudflareCallsService();