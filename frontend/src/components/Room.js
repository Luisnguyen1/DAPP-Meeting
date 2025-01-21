// ...existing code...
{participants.map((participant) => (
  <Paper 
    key={participant.userId}  // Thêm key prop ở đây
    elevation={3} 
    className={classes.participantContainer}
  >
    // ...existing code...
  </Paper>
))}
// ...existing code...
