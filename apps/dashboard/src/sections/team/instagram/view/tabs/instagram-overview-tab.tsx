'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';
import { ChartArea, ChartLine } from 'src/components/chart';

import { InstagramMetricsWidget } from '../components/instagram-metrics-widget';

// ----------------------------------------------------------------------

interface ChartDataPoint {
  date: string;
  value: number;
}

interface OverviewData {
  followersGrowthRate90d?: number;
  weeklyFollowers?: number;
  engagementRate?: number;
  avgLikes?: number;
  avgComments?: number;
  weeklyPosts?: number;
  followersRatio?: number;
  commentsRatio?: number;
  followersChart?: ChartDataPoint[];
  followingChart?: ChartDataPoint[];
  engagementRateChart?: ChartDataPoint[];
  avgLikesChart?: ChartDataPoint[];
}

interface InstagramOverviewTabProps {
  data: OverviewData | null;
  startDate: Date;
  endDate: Date;
}

export function InstagramOverviewTab({ data, startDate, endDate }: InstagramOverviewTabProps) {
  const theme = useTheme();

  // Handle missing or invalid data
  if (!data) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          No overview data available for the selected date range.
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
  const safeData: Required<OverviewData> = {
    followersGrowthRate90d: data?.followersGrowthRate90d || 0,
    weeklyFollowers: data?.weeklyFollowers || 0,
    engagementRate: data?.engagementRate || 0,
    avgLikes: data?.avgLikes || 0,
    avgComments: data?.avgComments || 0,
    weeklyPosts: data?.weeklyPosts || 0,
    followersRatio: data?.followersRatio || 0,
    commentsRatio: data?.commentsRatio || 0,
    followersChart: data?.followersChart || [],
    followingChart: data?.followingChart || [],
    engagementRateChart: data?.engagementRateChart || [],
    avgLikesChart: data?.avgLikesChart || []
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

  const engagementRateChartData = {
    categories: safeData.engagementRateChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Engagement Rate (%)',
        data: safeData.engagementRateChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#00a76f'],
  };

  const avgLikesChartData = {
    categories: safeData.avgLikesChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Average Likes',
        data: safeData.avgLikesChart.map(item => item?.value || 0),
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
      title: 'Weekly Followers',
      total: formatNumber(safeData.weeklyFollowers),
      icon: <Iconify icon="solar:users-group-rounded-bold" width={24} height={24} className="" sx={{}} />,
      color: 'success' as const,
      chart: {
        series: safeData.followingChart.map(item => item?.value || 0),
        categories: safeData.followingChart.map(item => item?.date || ''),
      },
    },
    {
      title: 'Engagement Rate',
      total: formatPercentage(safeData.engagementRate),
      icon: <Iconify icon="solar:heart-bold" width={24} height={24} className="" sx={{}} />,
      color: 'info' as const,
      chart: {
        series: safeData.engagementRateChart.map(item => item?.value || 0),
        categories: safeData.engagementRateChart.map(item => item?.date || ''),
      },
      infoDescription: 'The average engagement for recent posts compared to the number of followers',
    },
    {
      title: 'Average Likes',
      total: formatNumber(safeData.avgLikes),
      icon: <Iconify icon="solar:like-bold" width={24} height={24} className="" sx={{}} />,
      color: 'warning' as const,
      chart: {
        series: safeData.avgLikesChart.map(item => item?.value || 0),
        categories: safeData.avgLikesChart.map(item => item?.date || ''),
      },
    },
    {
      title: 'Average Comments',
      total: formatNumber(safeData.avgComments),
      icon: <Iconify icon="solar:chat-round-bold" width={24} height={24} className="" sx={{}} />,
      color: 'error' as const,
      chart: {
        series: safeData.avgLikesChart.map(item => item?.value || 0),
        categories: safeData.avgLikesChart.map(item => item?.date || ''),
      },
    },
    {
      title: 'Weekly Posts',
      total: formatNumber(safeData.weeklyPosts),
      icon: <Iconify icon="solar:gallery-bold" width={24} height={24} className="" sx={{}} />,
      color: 'secondary' as const,
      chart: {
        series: safeData.avgLikesChart.map(item => item?.value || 0),
        categories: safeData.avgLikesChart.map(item => item?.date || ''),
      },
    },
    {
      title: 'Followers Ratio',
      total: formatNumber(safeData.followersRatio),
      icon: <Iconify icon="solar:scale-bold" width={24} height={24} className="" sx={{}} />,
      color: 'info' as const,
      chart: {
        series: safeData.followersChart.map(item => item?.value || 0),
        categories: safeData.followersChart.map(item => item?.date || ''),
      },
      infoDescription: 'The number of followers compared to each single followed account',
    },
    {
      title: 'Comments Ratio',
      total: formatPercentage(safeData.commentsRatio),
      icon: <Iconify icon="solar:chat-round-dots-bold" width={24} height={24} className="" sx={{}} />,
      color: 'success' as const,
      chart: {
        series: safeData.engagementRateChart.map(item => item?.value || 0),
        categories: safeData.engagementRateChart.map(item => item?.date || ''),
      },
      infoDescription: 'The number of comments received for each 100 likes',
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
              title="Engagement Rate"
              subheader="Daily engagement rate percentage"
              action={
                <Iconify icon="solar:heart-bold" width={24} height={24} className="" sx={{ color: 'info.main' }} />
              }
            />
            <CardContent>
              <ChartLine
                series={engagementRateChartData.series}
                categories={engagementRateChartData.categories}
                colors={engagementRateChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader 
              title="Average Likes"
              subheader="Daily average likes per post"
              action={
                <Iconify icon="solar:like-bold" width={24} height={24} className="" sx={{ color: 'warning.main' }} />
              }
            />
            <CardContent>
              <ChartLine
                series={avgLikesChartData.series}
                categories={avgLikesChartData.categories}
                colors={avgLikesChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
