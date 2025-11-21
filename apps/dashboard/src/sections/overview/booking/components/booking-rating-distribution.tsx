import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  businessName?: string;
  ratingDistribution?: Record<string, number>;
  reviewCount?: number;
};

export function BookingRatingDistribution({ businessName, ratingDistribution, reviewCount }: Props) {
  return (
    <Card>
      <CardHeader
        title="Rating Distribution"
        subheader={`Distribution of ${reviewCount || 0} reviews for ${businessName || 'this property'}`}
      />
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Rating distribution chart will be displayed here
        </Typography>
      </Box>
    </Card>
  );
}

