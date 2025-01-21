import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid
} from '@mui/material';
import { VideoCall, Input } from '@mui/icons-material';

const Home = () => {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `${userName}'s Room` }),
      });
      const data = await response.json();
      navigate(`/room/${data.id}`);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleJoinRoom = () => {
    if (roomId && userName) {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Online Meeting Room
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<VideoCall />}
                onClick={handleCreateRoom}
                disabled={!userName}
              >
                Create New Room
              </Button>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6">OR</Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<Input />}
                onClick={handleJoinRoom}
                disabled={!roomId || !userName}
              >
                Join Room
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Home; 