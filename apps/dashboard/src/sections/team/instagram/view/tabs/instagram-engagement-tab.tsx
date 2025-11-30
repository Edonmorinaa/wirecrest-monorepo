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
import { ChartBar, ChartArea, ChartLine } from 'src/components/chart';
import { EngagementMetrics } from 'src/types/instagram-analytics';

import { InstagramMetricsWidget } from '../components/instagram-metrics-widget';

// ----------------------------------------------------------------------

interface InstagramEngagementTabProps {
  data: EngagementMetrics | null | undefined;
  startDate: Date;
  endDate: Date;
}

export function InstagramEngagementTab({ data, startDate, endDate }: InstagramEngagementTabProps) {
  const theme = useTheme();

  // Handle missing or invalid data
  if (!data) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          No engagement data available for the selected date range.
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
  const safeData: Required<EngagementMetrics> = {
    engagementRate: data?.engagementRate || 0,
    avgLikes: data?.avgLikes || 0,
    weeklyEngagementRate: data?.weeklyEngagementRate || 0,
    weeklyPosts: data?.weeklyPosts || 0,
    avgComments: data?.avgComments || 0,
    commentsRatio: data?.commentsRatio || 0,
    engagementRateChart: data?.engagementRateChart || [],
    avgLikesChart: data?.avgLikesChart || [],
    weeklyEngagementRateChart: data?.weeklyEngagementRateChart || [],
    weeklyPostsChart: data?.weeklyPostsChart || [],
    avgCommentsChart: data?.avgCommentsChart || [],
    commentsRatioChart: data?.commentsRatioChart || []
  };

  // Prepare chart data with safe access
  const engagementRateChartData = {
    categories: safeData.engagementRateChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Engagement Rate (%)',
        data: safeData.engagementRateChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#2065d1'],
  };

  const avgLikesChartData = {
    categories: safeData.avgLikesChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Average Likes',
        data: safeData.avgLikesChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#00b8d4'],
  };

  const weeklyEngagementRateChartData = {
    categories: safeData.weeklyEngagementRateChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Weekly Engagement Rate (%)',
        data: safeData.weeklyEngagementRateChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#00a76f'],
  };

  const weeklyPostsChartData = {
    categories: safeData.weeklyPostsChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Weekly Posts',
        data: safeData.weeklyPostsChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#ff5630'],
  };

  const avgCommentsChartData = {
    categories: safeData.avgCommentsChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Average Comments',
        data: safeData.avgCommentsChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#7635dc'],
  };

  const commentsRatioChartData = {
    categories: safeData.commentsRatioChart.map(item => item?.date || ''),
    series: [
      {
        name: 'Comments Ratio (%)',
        data: safeData.commentsRatioChart.map(item => item?.value || 0),
      },
    ],
    colors: ['#ff5630'],
  };

  // Metric cards data
  const metricCards = [
    {
      title: 'Engagement Rate',
      total: formatPercentage(safeData.engagementRate),
      icon: <Iconify icon="solar:heart-bold" width={24} height={24} className="" sx={{}} />,
      color: 'primary' as const,
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
      color: 'success' as const,
      chart: {
        series: safeData.avgLikesChart.map(item => item?.value || 0),
        categories: safeData.avgLikesChart.map(item => item?.date || ''),
      },
    },
    {
      title: 'Weekly Engagement Rate',
      total: formatPercentage(safeData.weeklyEngagementRate),
      icon: <Iconify icon="solar:chart-2-bold" width={24} height={24} className="" sx={{}} />,
      color: 'info' as const,
      chart: {
        series: safeData.weeklyEngagementRateChart.map(item => item?.value || 0),
        categories: safeData.weeklyEngagementRateChart.map(item => item?.date || ''),
      },
      infoDescription: 'The cumulative engagement rate for all posts in the last 7 days. This is a better indicator of engagement than just the engagement rate as it takes into account the weekly posts.',
    },
    {
      title: 'Weekly Posts',
      total: formatNumber(safeData.weeklyPosts),
      icon: <Iconify icon="solar:gallery-bold" width={24} height={24} className="" sx={{}} />,
      color: 'warning' as const,
      chart: {
        series: safeData.weeklyPostsChart.map(item => item?.value || 0),
        categories: safeData.weeklyPostsChart.map(item => item?.date || ''),
      },
    },
    {
      title: 'Average Comments',
      total: formatNumber(safeData.avgComments),
      icon: <Iconify icon="solar:chat-round-bold" width={24} height={24} className="" sx={{}} />,
      color: 'secondary' as const,
      chart: {
        series: safeData.avgCommentsChart.map(item => item?.value || 0),
        categories: safeData.avgCommentsChart.map(item => item?.date || ''),
      },
    },
    {
      title: 'Comments Ratio',
      total: formatPercentage(safeData.commentsRatio),
      icon: <Iconify icon="solar:chat-round-dots-bold" width={24} height={24} className="" sx={{}} />,
      color: 'error' as const,
      chart: {
        series: safeData.commentsRatioChart.map(item => item?.value || 0),
        categories: safeData.commentsRatioChart.map(item => item?.date || ''),
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
              title="Engagement Rate"
              subheader="Daily engagement rate percentage"
              action={
                <Iconify icon="solar:heart-bold" width={24} height={24} className="" sx={{ color: 'primary.main' }} />
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
                <Iconify icon="solar:like-bold" width={24} height={24} className="" sx={{ color: 'success.main' }} />
              }
            />
            <CardContent>
              <ChartArea
                series={avgLikesChartData.series}
                categories={avgLikesChartData.categories}
                colors={avgLikesChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title="Weekly Engagement Rate"
              subheader="Weekly cumulative engagement rate"
              action={
                <Iconify icon="solar:chart-2-bold" width={24} height={24} className="" sx={{ color: 'info.main' }} />
              }
            />
            <CardContent>
              <ChartLine
                series={weeklyEngagementRateChartData.series}
                categories={weeklyEngagementRateChartData.categories}
                colors={weeklyEngagementRateChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title="Weekly Posts"
              subheader="Number of posts per week"
              action={
                <Iconify icon="solar:gallery-bold" width={24} height={24} className="" sx={{ color: 'warning.main' }} />
              }
            />
            <CardContent>
              <ChartBar
                series={weeklyPostsChartData.series}
                categories={weeklyPostsChartData.categories}
                colors={weeklyPostsChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title="Average Comments"
              subheader="Daily average comments per post"
              action={
                <Iconify icon="solar:chat-round-bold" width={24} height={24} className="" sx={{ color: 'secondary.main' }} />
              }
            />
            <CardContent>
              <ChartArea
                series={avgCommentsChartData.series}
                categories={avgCommentsChartData.categories}
                colors={avgCommentsChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title="Comments Ratio"
              subheader="Comments per 100 likes"
              action={
                <Iconify icon="solar:chat-round-dots-bold" width={24} height={24} className="" sx={{ color: 'error.main' }} />
              }
            />
            <CardContent>
              <ChartLine
                series={commentsRatioChartData.series}
                categories={commentsRatioChartData.categories}
                colors={commentsRatioChartData.colors}
                sx={{ height: 300 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
