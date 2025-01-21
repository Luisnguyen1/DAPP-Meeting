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
        console.log('Starting call initialization...');
        if (!userId) {
          throw new Error('User ID not initialized');
        }
        const localStream = await CloudflareCallsService.initialize(userId, roomId);
        console.log('Got local stream, setting up video...');
        setLocalStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }

        // Lắng nghe sự kiện người dùng mới tham gia
        CloudflareCallsService.on('participantJoined', (participant) => {
          console.log('New participant joined:', participant);
          setParticipants(prev => new Map(prev.set(participant.userId, participant)));
        });

        // Lắng nghe sự kiện người dùng rời phòng
        CloudflareCallsService.on('participantLeft', (participant) => {
          console.log('Participant left:', participant);
          setParticipants(prev => {
            const newMap = new Map(prev);
            newMap.delete(participant.userId);
            return newMap;
          });
        });
      } catch (error) {
        console.error('Error initializing call:', error);
        setError(error.message);
      }
    };

    initializeCall();
    return () => {
      console.log('Cleaning up...');
      CloudflareCallsService.leaveRoom();
    };
  }, [roomId, userId]);

  useEffect(() => {
    CloudflareCallsService.on('participantJoined', ({userId, stream}) => {
      console.log('Participant joined with stream:', stream?.getTracks().length);
      setParticipants(prev => new Map(prev.set(userId, {
        id: userId,
        stream: stream
      })));
    });

    CloudflareCallsService.on('participantLeft', ({userId}) => {
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    });

    return () => {
      CloudflareCallsService.leaveRoom();
    };
  }, []);

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
        throw new Error('User ID not initialized');
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
            <Paper elevation={3} sx={{ position: 'relative', height: '100%' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Paper>
            {/* Remote participants */}
            {Array.from(participants.values()).map((participant) => (
              <Paper key={participant.id} elevation={3} sx={{ position: 'relative', height: '100%' }}>
                <video
                  autoPlay
                  playsInline 
                  ref={(el) => {
                    if (el && participant.stream) {
                      console.log(`Setting stream for participant ${participant.id}`);
                      el.srcObject = participant.stream;
                      el.play().catch(error => 
                        console.error('Error playing video:', error)
                      );
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
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