import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  metrics: any;
  currentPeriodKey: string;
};

export function BookingMetricsOverview({ metrics, currentPeriodKey }: Props) {
  if (!metrics) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No metrics data available for this period
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Average Rating
          </Typography>
          <Typography variant="h6">{metrics.averageRating?.toFixed(1) || '0.0'} / 10</Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Total Reviews
          </Typography>
          <Typography variant="h6">{metrics.totalReviews || 0}</Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Response Rate
          </Typography>
          <Typography variant="h6">{metrics.responseRate?.toFixed(1) || 0}%</Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Verified Stays
          </Typography>
          <Typography variant="h6">{metrics.verifiedStays || 0}</Typography>
        </Box>
      </Grid>
    </Grid>
  );
}

