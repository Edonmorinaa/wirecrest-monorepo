/**
 * Page Loading Component
 * 
 * Optimized for SPA experience:
 * - Minimal, non-intrusive design
 * - Positioned in content area (not full viewport)
 * - Fast, smooth animation
 */

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

interface PageLoadingProps {
  message?: string;
  fullHeight?: boolean;
}

export function PageLoading({ message, fullHeight = false }: PageLoadingProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: fullHeight ? '100vh' : '60vh',
        width: '100%',
        gap: 2,
      }}
    >
      <Box sx={{ width: '300px' }}>
        <LinearProgress />
      </Box>
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}

