import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  totalReviews?: number;
}

interface Stats {
  total: number;
  averageRating: number;
  verifiedStays: number;
  responseRate: number;
}

interface BookingReviewsWelcomeProps {
  team: Team;
  businessProfile: BusinessProfile;
  stats: Stats;
  sx?: any;
}

export function BookingReviewsWelcome({
  team,
  businessProfile,
  stats,
  sx,
}: BookingReviewsWelcomeProps) {
  const theme = useTheme();

  const formatRating = (rating: number) => {
    if (rating === null || rating === undefined) return '—';
    return rating.toFixed(1);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'success';
    if (rating >= 4.0) return 'warning';
    if (rating >= 3.0) return 'info';
    return 'error';
  };

  return (
    <Card sx={{ p: 3, ...sx }}>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={8}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Welcome to Booking.com Reviews
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage and analyze guest reviews for {businessProfile.name || 'your property'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                icon={<Iconify icon="solar:building-2-bold" />}
                label={businessProfile.name || 'Property'}
                color="primary"
                variant="outlined"
              />
              {businessProfile.rating && (
                <Chip
                  icon={<Iconify icon="solar:star-bold" />}
                  label={`${formatRating(businessProfile.rating)}/5`}
                  color={getRatingColor(businessProfile.rating)}
                  variant="outlined"
                />
              )}
              {businessProfile.totalReviews && (
                <Chip
                  icon={<Iconify icon="solar:chat-round-dots-bold" />}
                  label={`${businessProfile.totalReviews} reviews`}
                  color="info"
                  variant="outlined"
                />
              )}
            </Stack>

            {businessProfile.address && (
              <Typography variant="body2" color="text.secondary">
                <Iconify icon="solar:map-point-bold" sx={{ mr: 1, verticalAlign: 'middle' }} />
                {businessProfile.address}
              </Typography>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Quick Stats
              </Typography>
              <Stack spacing={1}>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Total Reviews
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {stats.total || 0}
                  </Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Average Rating
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    color={getRatingColor(stats.averageRating) + '.main'}
                  >
                    {formatRating(stats.averageRating)}
                  </Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Response Rate
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {(stats.responseRate || 0).toFixed(1)}%
                  </Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Verified Stays
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {stats.verifiedStays || 0}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </Card>
  );
}
