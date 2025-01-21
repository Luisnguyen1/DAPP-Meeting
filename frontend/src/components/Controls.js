import React from 'react';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  ScreenShare,
  Chat,
  CallEnd
} from '@mui/icons-material';

const Controls = ({
  isMuted,
  isVideoOff,
  onToggleAudio,
  onToggleVideo,
  onToggleChat,
  onScreenShare,
  onLeaveRoom
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        p: 2,
        mb: 2,
        borderRadius: 8
      }}
    >
      <Stack direction="row" spacing={2}>
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
          <IconButton onClick={onToggleAudio} color={isMuted ? 'error' : 'primary'}>
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isVideoOff ? 'Start Video' : 'Stop Video'}>
          <IconButton onClick={onToggleVideo} color={isVideoOff ? 'error' : 'primary'}>
            {isVideoOff ? <VideocamOff /> : <Videocam />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Share Screen">
          <IconButton onClick={onScreenShare} color="primary">
            <ScreenShare />
          </IconButton>
        </Tooltip>

        <Tooltip title="Chat">
          <IconButton onClick={onToggleChat} color="primary">
            <Chat />
          </IconButton>
        </Tooltip>

        <Tooltip title="Leave Room">
          <IconButton onClick={onLeaveRoom} color="error">
            <CallEnd />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
};

export default Controls; 