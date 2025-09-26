import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';

// ----------------------------------------------------------------------

export function TikTokLoadingState() {
  return (
    <Grid container spacing={3}>
      {/* Business Insights Summary */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Skeleton variant="text" width="80%" height={24} />
                <Skeleton variant="text" width="60%" height={20} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Skeleton variant="text" width="80%" height={24} />
                <Skeleton variant="text" width="60%" height={20} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Skeleton variant="text" width="80%" height={24} />
                <Skeleton variant="text" width="60%" height={20} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Profile Overview */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="70%" height={20} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="70%" height={20} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Key Metrics */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="30%" height={28} sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              {[...Array(4)].map((_, index) => (
                <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Skeleton variant="rectangular" width="100%" height={80} />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Engagement Metrics */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={28} sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              {[...Array(5)].map((_, index) => (
                <Grid key={index} size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <Skeleton variant="rectangular" width="100%" height={60} />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Business Info and Performance Metrics */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="50%" height={28} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={20} />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="50%" height={28} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={20} />
          </CardContent>
        </Card>
      </Grid>

      {/* Snapshot Controls */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="200" height={40} />
          </CardContent>
        </Card>
      </Grid>

      {/* Charts */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="30%" height={28} sx={{ mb: 3 }} />
            <Skeleton variant="rectangular" width="100%" height={400} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
