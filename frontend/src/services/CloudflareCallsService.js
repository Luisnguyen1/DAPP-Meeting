class CloudflareCallsService {
  constructor() {
    this.APP_ID = "fc7fdab8c9f9250624fa046ee52c3c5d";
    this.APP_TOKEN = "2d503c1e7b2fd21bfee9ea52c967593b04ce352fc2ceb55031f3f41e6a9dd149";
    this.API_BASE = "https://rtc.live.cloudflare.com/v1/apps";
    this.peerConnection = null;
    this.localStream = null;
    this.sessionId = null;
    this.eventListeners = new Map();
  }

  async initialize(userId, roomId) {
    try {
      if (this.peerConnection) {
        console.log('Cleaning up existing connection...');
        await this.leaveRoom();
      }

      // 1. Get local stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // 2. Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
        bundlePolicy: 'max-bundle'
      });

      // 3. Add tracks to peer connection
      const tracks = this.localStream.getTracks();
      for (const track of tracks) {
        console.log('Adding track:', track.kind);
        this.peerConnection.addTrack(track, this.localStream);
      }

      // 4. Create and set local offer
      const offer = await this.peerConnection.createOffer();
      console.log('Setting local description...');
      await this.peerConnection.setLocalDescription(offer);

      // 5. Create new session with Cloudflare
      console.log('Creating Cloudflare session...');
      const sessionResponse = await fetch(`${this.API_BASE}/${this.APP_ID}/sessions/new`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.APP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionDescription: {
            type: 'offer',
            sdp: this.peerConnection.localDescription.sdp
          }
        })
      });

      const data = await sessionResponse.json();
      if (!data.sessionId) {
        throw new Error('Failed to get session ID from Cloudflare');
      }

      this.sessionId = data.sessionId;
      console.log('Session created:', this.sessionId);

      // 6. Set remote description from Cloudflare
      if (data.sessionDescription) {
        console.log('Setting remote description from session...');
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.sessionDescription)
        );
      }

      // 7. Handle remote tracks
      this.peerConnection.ontrack = (event) => {
        console.log('Remote track received:', event.track.kind);
        const remoteStream = new MediaStream([event.track]);
        this.emitEvent('participantJoined', {
          userId: roomId,
          stream: remoteStream
        });
      };

      // 8. Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);
      };

      return this.localStream;

    } catch (error) {
      console.error('Error in initialize:', error);
      await this.leaveRoom();
      throw error;
    }
  }

  async joinRoom(roomId) {
    try {
      if (!this.sessionId || !this.peerConnection) {
        throw new Error('Must initialize before joining room');
      }

      console.log('Joining room:', roomId);
      const response = await fetch(`${this.API_BASE}/${this.APP_ID}/sessions/${this.sessionId}/tracks/new`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.APP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tracks: [{
            location: 'remote',
            sessionId: roomId
          }]
        })
      });

      const data = await response.json();
      
      if (data.requiresImmediateRenegotiation) {
        console.log('Renegotiation required...');
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.sessionDescription)
        );

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        await fetch(`${this.API_BASE}/${this.APP_ID}/sessions/${this.sessionId}/renegotiate`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.APP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionDescription: {
              type: 'answer',
              sdp: answer.sdp
            }
          })
        });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(callback);
  }

  emitEvent(eventName, data) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).forEach(callback => callback(data));
    }
  }

  async leaveRoom() {
    if (this.sessionId) {
      await fetch(`${this.API_BASE}/${this.APP_ID}/sessions/${this.sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.APP_TOKEN}`
        }
      });
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.sessionId = null;
  }
}

export default new CloudflareCallsService();