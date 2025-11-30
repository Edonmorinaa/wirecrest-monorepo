'use client';



import { fPercent, fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramKeyMetrics({ general, overview }) {
  if (!general || !overview) {
    return null;
  }

  const metricCards = [
    {
      title: 'Audience Growth',
      value: fShortenNumber(general.followers.count),
      change: general.followers.delta,
      changePercent: general.followers.count > 0 ? (general.followers.delta / (general.followers.count - general.followers.delta)) * 100 : 0,
      icon: 'solar:users-group-rounded-bold',
      color: 'primary.main',
      trend: general.followers.delta >= 0 ? 'up' : 'down',
      description: 'Total followers',
      insight: general.followers.delta > 0 ? '📈 Growing audience' : '⚠️ Audience shrinking'
    },
    {
      title: 'Engagement Rate',
      value: fPercent(overview.engagementRate),
      change: null,
      changePercent: null,
      icon: 'solar:heart-bold',
      color: 'error.main',
      trend: overview.engagementRate > 3 ? 'up' : 'down',
      description: 'Average engagement',
      insight: overview.engagementRate > 5 ? '🎯 Exceptional engagement!' :
        overview.engagementRate > 2 ? '👍 Good engagement' : '💡 Improve content quality'
    },
    {
      title: 'Content Strategy',
      value: (overview.weeklyPosts / 7).toFixed(1),
      change: null,
      changePercent: null,
      icon: 'solar:camera-bold',
      color: 'secondary.main',
      trend: overview.weeklyPosts > 7 ? 'up' : 'down',
      description: 'Posts per day (avg)',
      insight: overview.weeklyPosts > 10 ? '📱 High activity' :
        overview.weeklyPosts > 3 ? '📝 Regular content' : '📅 Increase frequency'
    },
    {
      title: 'Total Posts',
      value: fShortenNumber(general.posts.count),
      change: general.posts.delta,
      changePercent: null,
      icon: 'solar:chart-2-bold',
      color: 'warning.main',
      trend: general.posts.delta >= 0 ? 'up' : 'down',
      description: 'Total content',
      insight: general.posts.count && general.followers.count
        ? `1 post per ${Math.ceil(general.followers.count / general.posts.count)} followers`
        : 'No posts yet'
    }
  ];

  return (
    <Grid container spacing={3}>
      {metricCards.map((metric, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 80,
                height: 80,
                bgcolor: `${metric.color}10`,
                borderRadius: '0 0 0 100%',
              }}
            />

            <CardHeader
              sx={{ pb: 1 }}
              title={
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {metric.title}
                  </Typography>
                  <Iconify icon={metric.icon} sx={{ color: metric.color }} />
                </Stack>
              }
            />

            <CardContent>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {metric.value}
              </Typography>

              {metric.change !== null && (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                  <Iconify
                    icon={metric.trend === 'up' ? 'solar:trending-up-bold' : 'solar:trending-down-bold'}
                    sx={{
                      fontSize: 16,
                      color: metric.trend === 'up' ? 'success.main' : 'error.main'
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: metric.trend === 'up' ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  >
                    {metric.change >= 0 ? '+' : ''}{metric.change}
                    {metric.changePercent !== null && ` (${metric.changePercent >= 0 ? '+' : ''}${metric.changePercent.toFixed(1)}%)`}
                  </Typography>
                </Stack>
              )}

              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                {metric.description}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {metric.insight}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
