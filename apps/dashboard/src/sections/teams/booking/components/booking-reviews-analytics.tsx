import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

interface BookingReviewsAnalyticsProps {
  teamSlug: string;
}

export function BookingReviewsAnalytics({ teamSlug }: BookingReviewsAnalyticsProps) {
  const theme = useTheme();

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Booking.com Reviews Analytics
      </Typography>
      <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Analytics chart will be implemented here
        </Typography>
      </Box>
    </Card>
  );
}
