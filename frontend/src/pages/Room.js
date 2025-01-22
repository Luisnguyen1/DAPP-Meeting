import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CloudflareCallsService from '../services/CloudflareCallsService';
import {
  Box,
  Grid,
  Paper,
  IconButton,
  Button,
  Typography,
  Stack,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  ScreenShare,
  Chat,
  PresentToAll,
  Settings
} from '@mui/icons-material';
import VideoGrid from '../components/VideoGrid';
import ChatPanel from '../components/ChatPanel';
import Controls from '../components/Controls';

const Room = () => {
  const { roomId } = useParams();
  const [userId, setUserId] = useState(localStorage.getItem('userId'));
  const [error, setError] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [participants, setParticipants] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const videoRef = useRef();
  const navigate = useNavigate();

  // Khởi tạo userId nếu chưa có
  useEffect(() => {
    if (!userId) {
      const tempUserId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', tempUserId);
      setUserId(tempUserId);
    }
  }, [userId]);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Initialize local stream and peer connection
        const localStream = await CloudflareCallsService.initialize(userId, roomId);
        setLocalStream(localStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }

        // Join room to get remote streams
        await CloudflareCallsService.joinRoom(roomId);

        // Listen for new participants
        CloudflareCallsService.on('participantJoined', (participant) => {
          console.log('New participant:', participant);
          if (participant.stream) {
            setParticipants(prev => {
              const newMap = new Map(prev);
              newMap.set(participant.userId, {
                id: participant.userId,
                stream: participant.stream,
                active: true
              });
              return newMap;
            });
          }
        });

      } catch (error) {
        console.error('Error initializing call:', error);
        setError(error.message);
      }
    };

    if (userId && roomId) {
      initializeCall();
    }

    return () => {
      CloudflareCallsService.leaveRoom();
    };
  }, [userId, roomId]);

  // Add function to handle video elements
  const handleVideoElement = (el, participant) => {
    if (el && participant.stream && el.srcObject !== participant.stream) {
      console.log(`Setting up video for participant ${participant.id}`, {
        tracks: participant.stream.getTracks().map(t => t.kind),
        active: participant.stream.active
      });

      el.srcObject = participant.stream;
      el.muted = participant.id === userId; // Mute only local video
      
      el.onloadedmetadata = () => {
        console.log(`Video metadata loaded for participant ${participant.id}`);
        el.play().catch(error => {
          console.error('Error playing video:', error);
        });
      };

      // Add error handling
      el.onerror = (error) => {
        console.error(`Video error for participant ${participant.id}:`, error);
      };
    }
  };

  const toggleAudio = () => {
    CloudflareCallsService.toggleAudio(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    CloudflareCallsService.toggleVideo(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const handleScreenShare = async () => {
    try {
      await CloudflareCallsService.startScreenShare();
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const handleJoinRoom = async () => {
    try {
      if (!userId) {
        const tempUserId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', tempUserId);
        setUserId(tempUserId);
        return; // Exit early to allow state update
      }
      await CloudflareCallsService.initialize(userId, roomId);
      console.log('Joined room successfully');
    } catch (error) {
      console.error('Error joining room:', error);
      setError(error.message);
    }
  };

  // Hiển thị lỗi nếu có
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header với nút Join Room */}
      <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Room: {roomId}</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleJoinRoom}
          startIcon={<Videocam />}
        >
          Join Room
        </Button>
      </Box>

      <Grid container sx={{ flex: 1 }}>
        <Grid item xs={isChatOpen ? 9 : 12}>
          <VideoGrid>
            {/* Local video */}
            <Paper elevation={3} sx={{ 
              position: 'relative', 
              height: '100%', 
              backgroundColor: 'black',
              overflow: 'hidden'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: isVideoOff ? 'none' : 'scaleX(-1)'
                }}
              />
            </Paper>
            {/* Remote participants */}
            {Array.from(participants.values()).map((participant) => (
              <Paper 
                key={participant.id} 
                elevation={3} 
                sx={{ 
                  position: 'relative', 
                  height: '100%',
                  backgroundColor: 'black',
                  overflow: 'hidden'
                }}
              >
                <video
                  autoPlay
                  playsInline
                  ref={(el) => handleVideoElement(el, participant)}
                  style={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
                {/* Add participant name overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    color: 'white',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    padding: '4px 8px',
                    borderRadius: 1,
                  }}
                >
                  {participant.id}
                </Box>
              </Paper>
            ))}
          </VideoGrid>
        </Grid>
        
        {isChatOpen && (
          <Grid item xs={3}>
            <ChatPanel roomId={roomId} />
          </Grid>
        )}
      </Grid>

      <Controls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onScreenShare={handleScreenShare}
        onLeaveRoom={() => {
          CloudflareCallsService.leaveRoom();
          navigate('/');
        }}
      />
    </Box>
  );
};

export default Room;