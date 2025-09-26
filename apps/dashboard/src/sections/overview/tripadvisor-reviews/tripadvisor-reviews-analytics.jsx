import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function TripAdvisorReviewsAnalytics({ teamSlug }) {
  const theme = useTheme();

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          TripAdvisor Reviews Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review trends and performance metrics over time
        </Typography>
      </Box>

      <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Analytics chart will be implemented here
        </Typography>
      </Box>
    </Card>
  );
}
