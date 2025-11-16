import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export type TProps = {
  title: string;
  subtitle: string;
  height?: number;
  placeholderMessage?: string;
  sx?: SxProps<Theme>;
};

/**
 * Dumb component for displaying TripAdvisor reviews analytics
 * Only receives primitive data and displays it
 */
export function TripAdvisorReviewsAnalytics({ 
  title,
  subtitle,
  height = 400,
  placeholderMessage = 'Analytics chart will be implemented here',
  sx,
}: TProps): JSX.Element {
  return (
    <Card sx={{ p: 3, ...sx }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>

      <Box 
        sx={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {placeholderMessage}
        </Typography>
      </Box>
    </Card>
  );
}
