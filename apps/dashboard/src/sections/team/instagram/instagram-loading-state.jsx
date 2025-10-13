'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

// ----------------------------------------------------------------------

export function InstagramLoadingState() {
  return (
    <Stack spacing={3}>
      {/* Header Loading */}
      <Box sx={{ display: 'flex', alignItems: 'center', space: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ ml: 2 }}>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={300} height={20} />
        </Box>
      </Box>

      {/* Business Insights Loading */}
      <Card>
        <CardHeader
          title={<Skeleton variant="text" width={150} height={24} />}
          subheader={<Skeleton variant="text" width={300} height={20} />}
        />
        <CardContent>
          <Grid container spacing={3}>
            {[...Array(3)].map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 4 }}>
                <Stack spacing={1}>
                  <Skeleton variant="text" width={120} height={20} />
                  <Skeleton variant="text" width={80} height={32} />
                  <Skeleton variant="text" width={200} height={16} />
                </Stack>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Profile Overview Loading */}
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={2}>
              <Skeleton variant="circular" width={64} height={64} />
              <Box>
                <Skeleton variant="text" width={150} height={24} />
                <Skeleton variant="text" width={100} height={20} />
              </Box>
            </Stack>
          }
          action={
            <Box sx={{ textAlign: 'right' }}>
              <Skeleton variant="text" width={120} height={16} />
              <Skeleton variant="text" width={100} height={16} />
            </Box>
          }
        />
        <CardContent>
          <Skeleton variant="text" width="100%" height={20} sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            {[...Array(3)].map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 4 }}>
                <Stack spacing={1} alignItems="center">
                  <Skeleton variant="text" width={80} height={32} />
                  <Skeleton variant="text" width={100} height={20} />
                </Stack>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Key Metrics Loading */}
      <Grid container spacing={3}>
        {[...Array(4)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Skeleton variant="text" width={100} height={20} />
                    <Skeleton variant="circular" width={20} height={20} />
                  </Stack>
                }
              />
              <CardContent>
                <Skeleton variant="text" width={80} height={32} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={120} height={16} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={150} height={16} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Engagement Metrics Loading */}
      <Card>
        <CardHeader
          title={<Skeleton variant="text" width={150} height={24} />}
          subheader={<Skeleton variant="text" width={300} height={20} />}
        />
        <CardContent>
          <Grid container spacing={3}>
            {[...Array(4)].map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Stack spacing={2} alignItems="center" textAlign="center">
                  <Skeleton variant="circular" width={56} height={56} />
                  <Skeleton variant="text" width={80} height={24} />
                  <Skeleton variant="text" width={100} height={20} />
                  <Skeleton variant="text" width={120} height={16} />
                </Stack>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Charts Loading */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <Card>
            <CardHeader
              title={<Skeleton variant="text" width={150} height={24} />}
              subheader={<Skeleton variant="text" width={300} height={20} />}
            />
            <CardContent>
              <Skeleton variant="text" width={200} height={20} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={320} />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader
              title={<Skeleton variant="text" width={150} height={24} />}
              subheader={<Skeleton variant="text" width={250} height={20} />}
            />
            <CardContent>
              <Stack spacing={3}>
                <Skeleton variant="rectangular" width="100%" height={60} />
                <Grid container spacing={2}>
                  {[...Array(4)].map((_, i) => (
                    <Grid key={i} size={{ xs: 6 }}>
                      <Stack spacing={1} alignItems="center">
                        <Skeleton variant="circular" width={48} height={48} />
                        <Skeleton variant="text" width={60} height={24} />
                        <Skeleton variant="text" width={80} height={16} />
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
