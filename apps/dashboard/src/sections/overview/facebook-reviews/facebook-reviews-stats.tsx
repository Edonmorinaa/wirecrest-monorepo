import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// Import the GoogleMetricsWidgetSummary component
import { GoogleMetricsWidgetSummary } from '../google/google-metrics-overview';

// ----------------------------------------------------------------------

interface FacebookReviewsStatsProps {
  stats?: {
    total?: number;
    recommendationRate?: number;
    recommendedCount?: number;
    notRecommendedCount?: number;
    totalLikes?: number;
    totalComments?: number;
    unread?: number;
    withPhotos?: number;
    withTags?: number;
    averageEngagement?: number;
    sentimentScore?: number;
    qualityScore?: number;
  };
  sx?: any;
}

export function FacebookReviewsStats({ stats = {}, sx }: FacebookReviewsStatsProps) {
  const theme = useTheme();

  const statsData = [
    {
      title: 'Total Reviews',
      total: fNumber(stats.total || 0),
      icon: <Iconify icon="solar:chart-2-bold" width={24} height={24} className="" sx={{}} />,
      color: 'primary',
      percent: undefined,
      chart: undefined,
      subtitle: undefined,
      showProgress: undefined,
      progressValue: undefined,
    },
    {
      title: 'Recommendation Rate',
      total: `${stats.recommendationRate ? (stats.recommendationRate * 100).toFixed(1) : '0.0'}%`,
      icon: <Iconify icon="solar:star-bold" width={24} height={24} className="" sx={{}} />,
      color: 'warning',
      percent: undefined,
      chart: undefined,
      subtitle: undefined,
      showProgress: undefined,
      progressValue: undefined,
    },
    {
      title: 'Total Likes',
      total: `${stats.totalLikes || 0}`,
      subtitle:
        stats.total > 0
          ? `${((stats.totalLikes || 0) / stats.total).toFixed(1)} avg per review`
          : '0 avg per review',
      icon: <Iconify icon="solar:heart-bold" width={24} height={24} className="" sx={{}} />,
      color: 'error',
      showProgress: true,
      progressValue: stats.total > 0 ? ((stats.totalLikes || 0) / stats.total) * 100 : 0,
      percent: undefined,
      chart: undefined,
    },
    {
      title: 'Unread Reviews',
      total: fNumber(stats.unread || 0),
      icon: <Iconify icon="solar:eye-bold" width={24} height={24} className="" sx={{}} />,
      color: 'info',
      percent: undefined,
      chart: undefined,
      subtitle: undefined,
      showProgress: undefined,
      progressValue: undefined,
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3, ...sx }}>
      {statsData.map((stat) => (
        <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
          <GoogleMetricsWidgetSummary
            title={stat.title}
            total={stat.total}
            subtitle={stat.subtitle}
            icon={stat.icon}
            color={stat.color}
            percent={stat.percent || undefined}
            chart={stat.chart || undefined}
            showProgress={stat.showProgress}
            progressValue={stat.progressValue}
            sx={{
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.shadows[8],
              },
            }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
