'use client';



import { fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramBusinessInsights({ growth, overview }) {
  if (!growth || !overview) {
    return null;
  }

  const followersGrowthPercent = growth.followersGrowthRate90d;
  const avgEngagementRate = overview.engagementRate;
  const avgContentPerDay = overview.weeklyPosts / 7;

  return (
    <Card sx={{ bgcolor: 'background.neutral' }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:target-bold" />
            <Typography variant="h6">Business Insights</Typography>
          </Stack>
        }
        subheader="Key metrics to help you understand and improve your Instagram performance"
      />

      <CardContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify
                  icon={followersGrowthPercent > 0 ? 'solar:trending-up-bold' : 'solar:trending-down-bold'}
                  sx={{ color: followersGrowthPercent > 0 ? 'success.main' : 'error.main' }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Growth Performance
                </Typography>
              </Stack>

              <Typography variant="h4">
                {followersGrowthPercent > 0 ? '+' : ''}{fPercent(followersGrowthPercent)}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                90-day growth rate
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:heart-bold" sx={{ color: 'error.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Engagement Rate
                </Typography>
              </Stack>

              <Typography variant="h4">
                {fPercent(avgEngagementRate)}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Average daily engagement rate
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:camera-bold" sx={{ color: 'primary.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Content Strategy
                </Typography>
              </Stack>

              <Typography variant="h4">
                {avgContentPerDay.toFixed(1)}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Posts per day on average
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
