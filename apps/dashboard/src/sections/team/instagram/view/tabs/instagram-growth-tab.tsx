'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { ChartArea, ChartLine } from 'src/components/chart';

import { InstagramMetricsWidget } from '../components/instagram-metrics-widget';

// ----------------------------------------------------------------------

interface ChartDataPoint {
  date: string;
  value: number;
}

interface GrowthData {
  followersGrowthRate90d?: number;
  steadyGrowthRate?: number;
  dailyFollowers?: number;
  weeklyFollowers?: number;
  monthlyFollowers?: number;
  followersChart?: ChartDataPoint[];
  followingChart?: ChartDataPoint[];
  newDailyFollowersChart?: ChartDataPoint[];
  predictedFollowersChart?: ChartDataPoint[];
}

interface InstagramGrowthTabProps {
  data: GrowthData | null;
  startDate: Date;
  endDate: Date;
}

export function InstagramGrowthTab({ data, startDate, endDate }: InstagramGrowthTabProps) {
  const theme = useTheme();

  // Handle missing or invalid data
  if (!data) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          No growth data available for the selected date range.
        </Typography>
      </Alert>
    );
  }

  const formatNumber = (num: number | null | undefined): string => {
    if (num == null || isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (num: number | null | undefined): string => {
    if (num == null || isNaN(num)) return '0%';
    return `${num.toFixed(1)}%`;
  };

  // Safe data access with fallbacks
  const safeData: Required<GrowthData> = {
    followersGrowthRate90d: data?.followersGrowthRate90d || 0,
    steadyGrowthRate: data?.steadyGrowthRate || 0,
    dailyFollowers: data?.dailyFollowers || 0,
    weeklyFollowers: data?.weeklyFollowers || 0,
    monthlyFollowers: data?.monthlyFollowers || 0,
    followersChart: data?.followersChart || [],
    followingChart: data?.followingChart || [],
    newDailyFollowersChart: data?.newDailyFollowersChart || [],
    predictedFollowersChart: data?.predictedFollowersChart || []
  };

  // Prepare chart data with safe access
  const followersChartData = {
    categories: safeData.followersChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Followers',
        data: safeData.followersChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#2065d1'],
  };

  const followingChartData = {
    categories: safeData.followingChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Following',
        data: safeData.followingChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#00b8d4'],
  };

  const newDailyFollowersChartData = {
    categories: safeData.newDailyFollowersChart.map(item => item?.date || ''),
    series: [
      {
        name: 'New Daily Followers',
        data: safeData.newDailyFollowersChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#00a76f'],
  };

  const predictedFollowersChartData = {
    categories: safeData.predictedFollowersChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Predicted Followers',
        data: safeData.predictedFollowersChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#ff5630'],
  };

  // Metric cards data
  const metricCards = [
    {
      title: '90-Day Growth Rate',
      total: formatPercentage(safeData.followersGrowthRate90d),
      icon: <Iconify icon="solar:chart-2-bold" width={24} height={24} className="" sx={{}} />,
      color: 'primary' as const,
      chart: {
        series: safeData.followersChart.map(item => item?.value || 0),
        categories: safeData.followersChart.map(item => item?.date || ''),
      },
      infoDescription: 'The percentage of gained followers over the past 90 days',
    },
    {
      title: 'Steady Growth Rate',
      total: formatPercentage(safeData.steadyGrowthRate),
      icon: <Iconify icon="solar:trend-up-bold" width={24} height={24} className="" sx={{}} />,
      color: 'success' as const,
      chart: {
        series: safeData.followersChart.map(item => item?.value || 0),
        categories: safeData.followersChart.map(item => item?.date || ''),
      },
      infoDescription: 'The consistency of followers growth. 100% means a very consistent and predictable growth. Less than 40% is very inconsistent (Might be a result of gaining followers the wrong way).',
    },
    {
      title: 'Daily Followers',
      total: formatNumber(safeData.dailyFollowers),
      icon: <Iconify icon="solar:calendar-bold" width={24} height={24} className="" sx={{}} />,
      color: 'info' as const,
      chart: {
        series: safeData.newDailyFollowersChart.map(item => item?.value || 0),
        categories: safeData.newDailyFollowersChart.map(item => item?.date || ''),
      },
    },
    {
      title: 'Weekly Followers',
      total: formatNumber(safeData.weeklyFollowers),
      icon: <Iconify icon="solar:users-group-rounded-bold" width={24} height={24} className="" sx={{}} />,
      color: 'warning' as const,
      chart: {
        series: safeData.followersChart.map(item => item?.value || 0),
        categories: safeData.followersChart.map(item => item?.date || ''),
      },
    },
    {
      title: 'Monthly Followers',
      total: formatNumber(safeData.monthlyFollowers),
      icon: <Iconify icon="solar:calendar-mark-bold" width={24} height={24} className="" sx={{}} />,
      color: 'secondary' as const,
      chart: {
        series: safeData.followersChart.map(item => item?.value || 0),
        categories: safeData.followersChart.map(item => item?.date || ''),
      },
    },
  ];

  return (
    <Box>
      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metricCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <InstagramMetricsWidget
              title={card.title}
              total={card.total}
              icon={card.icon}
              color={card.color}
              chart={card.chart}
              infoDescription={card.infoDescription}
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

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader 
              title="Followers Growth"
              subheader="Daily followers count over time"
              action={
                <Iconify icon="solar:users-group-rounded-bold" width={24} height={24} className="" sx={{ color: 'primary.main' }} />
              }
            />
            <CardContent>
              <ChartArea
                series={followersChartData.series}
                categories={followersChartData.categories}
                colors={followersChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader 
              title="Following Count"
              subheader="Daily following count over time"
              action={
                <Iconify icon="solar:user-plus-bold" width={24} height={24} className="" sx={{ color: 'success.main' }} />
              }
            />
            <CardContent>
              <ChartArea
                series={followingChartData.series}
                categories={followingChartData.categories}
                colors={followingChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader 
              title="New Daily Followers"
              subheader="Daily new followers gained"
              action={
                <Iconify icon="solar:user-plus-bold" width={24} height={24} className="" sx={{ color: 'info.main' }} />
              }
            />
            <CardContent>
              <ChartLine
                series={newDailyFollowersChartData.series}
                categories={newDailyFollowersChartData.categories}
                colors={newDailyFollowersChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader 
              title="Predicted Followers"
              subheader="Projected followers based on growth trend"
              action={
                <Iconify icon="solar:chart-2-bold" width={24} height={24} className="" sx={{ color: 'warning.main' }} />
              }
            />
            <CardContent>
              <ChartLine
                series={predictedFollowersChartData.series}
                categories={predictedFollowersChartData.categories}
                colors={predictedFollowersChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
