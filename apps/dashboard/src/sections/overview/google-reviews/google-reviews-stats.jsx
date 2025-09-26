import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// Import the GoogleMetricsWidgetSummary component
import { GoogleMetricsWidgetSummary } from '../google/google-metrics-overview';

// ----------------------------------------------------------------------

export function GoogleReviewsStats({ stats = {} }) {
  const theme = useTheme();

  // Generate mock chart data for demonstration
  const generateMockChartData = () =>
    Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 20);

  const statsData = [
    {
      title: 'Total Reviews',
      total: fNumber(stats.total || 0),
      icon: <Iconify icon="solar:chart-2-bold" width={24} />,
      color: 'primary',
      // percent: 12,
      // chart: {
      //   series: generateMockChartData(),
      //   categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      // },
    },
    {
      title: 'Average Rating',
      total: `${stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'} / 5`,
      icon: <Iconify icon="solar:star-bold" width={24} />,
      color: 'warning',
      // percent: 0.2,
      // chart: {
      //   series: generateMockChartData().map((val) => (val / 20).toFixed(1)),
      //   categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      // },
    },
    {
      title: 'With Response',
      total: `${stats.withResponse || 0}`,
      subtitle:
        stats.total > 0
          ? `${(((stats.withResponse || 0) / stats.total) * 100).toFixed(1)}% of total`
          : '0% of total',
      icon: <Iconify icon="solar:chat-round-dots-bold" width={24} />,
      color: 'info',
      // percent: 5,
      showProgress: true,
      progressValue: stats.total > 0 ? ((stats.withResponse || 0) / stats.total) * 100 : 0,
      // chart: {
      //   series: generateMockChartData(),
      //   categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      // },
    },
    {
      title: 'Unread Reviews',
      total: fNumber(stats.unread || 0),
      icon: <Iconify icon="solar:eye-bold" width={24} />,
      color: 'error',
      // percent: -8,
      // chart: {
      //   series: generateMockChartData(),
      //   categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      // },
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {statsData.map((stat) => (
        <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
          <GoogleMetricsWidgetSummary
            title={stat.title}
            total={stat.total}
            subtitle={stat.subtitle}
            icon={stat.icon}
            color={stat.color}
            percent={stat.percent}
            chart={stat.chart}
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
