import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function BookingReviewsLoadingSkeleton() {
  const theme = useTheme();

  return (
    <Stack spacing={3}>
      {/* Breadcrumbs Skeleton */}
      <Box>
        <Skeleton variant="text" width="60%" height={32} />
      </Box>

      {/* Welcome Section Skeleton */}
      <Card sx={{ p: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              <Box>
                <Skeleton variant="text" width="70%" height={40} />
                <Skeleton variant="text" width="50%" height={24} />
              </Box>
              <Stack direction="row" spacing={2}>
                <Skeleton variant="rectangular" width={120} height={32} />
                <Skeleton variant="rectangular" width={80} height={32} />
                <Skeleton variant="rectangular" width={100} height={32} />
              </Stack>
              <Skeleton variant="text" width="60%" height={20} />
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Skeleton variant="text" width="40%" height={24} />
              <Stack spacing={1}>
                {[...Array(4)].map((_, i) => (
                  <Box
                    key={i}
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="20%" height={20} />
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Stats Cards Skeleton */}
      <Grid container spacing={3}>
        {[...Array(4)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ p: 3, textAlign: 'center' }}>
              <Stack spacing={2} alignItems="center">
                <Skeleton variant="circular" width={64} height={64} />
                <Box>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="80%" height={20} />
                </Box>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Analytics Chart Skeleton */}
      <Card sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={400} />
      </Card>

      {/* Filters Skeleton */}
      <Card>
        <Box sx={{ p: 3, borderBottom: `solid 1px ${theme.palette.divider}` }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Skeleton variant="text" width="20%" height={24} />
            <Skeleton variant="rectangular" width={120} height={32} />
          </Box>
          <Grid container spacing={2.5}>
            {[...Array(8)].map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={3}>
                <Skeleton variant="rectangular" width="100%" height={40} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Reviews List Skeleton */}
          <Stack spacing={2}>
            {[...Array(5)].map((_, index) => (
              <Card key={index}>
                <Box sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Skeleton variant="circular" width={48} height={48} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" />
                      </Box>
                    </Box>
                    <Skeleton variant="rectangular" height={60} />
                    <Skeleton variant="text" width="80%" />
                  </Stack>
                </Box>
              </Card>
            ))}
          </Stack>

          {/* Pagination Skeleton */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Skeleton variant="rectangular" width={300} height={32} />
          </Box>
        </Box>
      </Card>
    </Stack>
  );
}
