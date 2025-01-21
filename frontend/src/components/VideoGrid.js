import React from 'react';
import { Box, Grid } from '@mui/material';

const VideoGrid = ({ children }) => {
  return (
    <Box sx={{ p: 2, height: '100%' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {React.Children.map(children, (child, index) => (
          <Grid
            item
            xs={12}
            md={React.Children.count(children) > 1 ? 6 : 12}
            lg={React.Children.count(children) > 2 ? 4 : React.Children.count(children) > 1 ? 6 : 12}
            key={index}
          >
            {child}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default VideoGrid; 