/**
 * Loading Component for Dashboard Routes
 * 
 * Displays a simple horizontal loading bar in the center of the page
 * Used by Next.js App Router with Suspense boundaries
 */

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

export default function Loading() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <Box sx={{ width: '300px' }}>
        <LinearProgress />
      </Box>
    </Box>
  );
}

