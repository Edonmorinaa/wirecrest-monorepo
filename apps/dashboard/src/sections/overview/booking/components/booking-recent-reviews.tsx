import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  reviews: any[];
};

export function BookingRecentReviews({ reviews }: Props) {
  return (
    <Card>
      <CardHeader title="Recent Reviews" subheader={`${reviews?.length || 0} most recent reviews`} />
      <Box sx={{ p: 3 }}>
        {reviews && reviews.length > 0 ? (
          <Typography variant="body2">{reviews.length} reviews loaded</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No recent reviews available
          </Typography>
        )}
      </Box>
    </Card>
  );
}

