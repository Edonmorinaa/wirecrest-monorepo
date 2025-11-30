'use client';

import { fPercent, fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramEngagementMetrics({ engagement }) {
  if (!engagement) {
    return null;
  }

  const engagementCards = [
    {
      title: 'Engagement Rate',
      value: fPercent(engagement.engagementRate),
      subValue: `${fPercent(engagement.weeklyEngagementRate)} (7d avg)`,
      icon: 'solar:pie-chart-2-bold',
      color: 'primary.main',
      description: 'Engagement per follower',
    },
    {
      title: 'Avg Likes',
      value: fShortenNumber(engagement.avgLikes),
      subValue: 'Per post',
      icon: 'solar:heart-bold',
      color: 'error.main',
      description: 'Average likes per post',
    },
    {
      title: 'Avg Comments',
      value: fShortenNumber(engagement.avgComments),
      subValue: 'Per post',
      icon: 'solar:chat-round-dots-bold',
      color: 'info.main',
      description: 'Average comments per post',
    },
    {
      title: 'Comments Ratio',
      value: fPercent(engagement.commentsRatio),
      subValue: 'Per 100 likes',
      icon: 'solar:chat-line-bold',
      color: 'warning.main',
      description: 'Comments vs Likes ratio',
    }
  ];

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:chart-2-bold" />
            <Typography variant="h6">Engagement Metrics</Typography>
          </Stack>
        }
        subheader="Detailed breakdown of your content engagement performance"
      />

      <CardContent>
        <Grid container spacing={3}>
          {engagementCards.map((metric, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={2} alignItems="center" textAlign="center">
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${metric.color}15`,
                  }}
                >
                  <Iconify icon={metric.icon} sx={{ color: metric.color, fontSize: 24 }} />
                </Box>

                <Stack spacing={0.5}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {metric.value}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {metric.title}
                  </Typography>

                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {metric.description}
                  </Typography>

                  {metric.subValue && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
                      {metric.subValue}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
