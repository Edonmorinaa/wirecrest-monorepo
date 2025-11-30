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

import { TikTokMetricsWidget } from '../components/tiktok-metrics-widget';

// ----------------------------------------------------------------------

interface HistoryDataPoint {
  date: string;
  followerCount: number;
  followersDelta: number;
  followingCount: number;
  followingDelta: number;
  videoCount: number;
  videoDelta: number;
  engagementRate: number;
  engagementRateDelta: number;
}

interface TikTokHistoryTabProps {
  data: HistoryDataPoint[] | null;
  startDate: Date;
  endDate: Date;
}

export function TikTokHistoryTab({ data, startDate, endDate }: TikTokHistoryTabProps) {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          No historical data available for the selected date range.
        </Typography>
      </Alert>
    );
  }

  // Prepare chart data for large charts
  const followersChartData = {
    categories: data.map(point => new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    series: [
      {
        name: 'Followers',
        data: data.map(point => point.followerCount),
      },
    ],
    colors: ['#2065d1'],
  };

  const followingChartData = {
    categories: data.map(point => new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    series: [
      {
        name: 'Following',
        data: data.map(point => point.followingCount),
      },
    ],
    colors: ['#00b8d4'],
  };

  const videosChartData = {
    categories: data.map(point => new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    series: [
      {
        name: 'Videos',
        data: data.map(point => point.videoCount),
      },
    ],
    colors: ['#00a76f'],
  };

  const engagementRateChartData = {
    categories: data.map(point => new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    series: [
      {
        name: 'Engagement Rate (%)',
        data: data.map(point => point.engagementRate),
      },
    ],
    colors: ['#ff5630'],
  };

  const formatNumber = (num: number): string => 
    num >= 1000000 
      ? (num / 1000000).toFixed(1) + 'M'
      : num >= 1000 
        ? (num / 1000).toFixed(1) + 'K'
        : num.toString();

  const formatPercentage = (num: number): string => `${num.toFixed(1)}%`;

  // Calculate summary metrics from historical data
  const latestData = data[data.length - 1];
  const firstData = data[0];
  
  const totalFollowersGrowth = latestData.followerCount - firstData.followerCount;
  const totalFollowingGrowth = latestData.followingCount - firstData.followingCount;
  const totalVideoGrowth = latestData.videoCount - firstData.videoCount;
  const avgEngagementRate = data.reduce((sum, point) => sum + point.engagementRate, 0) / data.length;

  // Prepare chart data for sparklines in metric cards
  const followersChartForSparkline = data.map(point => point.followerCount);
  const followingChartForSparkline = data.map(point => point.followingCount);
  const videosChartForSparkline = data.map(point => point.videoCount);
  const engagementRateChartForSparkline = data.map(point => point.engagementRate);
  const datesForSparkline = data.map(point => point.date);

  const historyMetrics = [
    {
      title: 'Total Followers Growth',
      total: formatNumber(totalFollowersGrowth),
      icon: <Iconify icon="solar:users-group-rounded-bold" width={24} height={24} className="" sx={{}} />,
      color: 'primary' as const,
      chart: {
        series: followersChartForSparkline,
        categories: datesForSparkline,
      },
    },
    {
      title: 'Total Following Growth',
      total: formatNumber(totalFollowingGrowth),
      icon: <Iconify icon="solar:user-plus-bold" width={24} height={24} className="" sx={{}} />,
      color: 'info' as const,
      chart: {
        series: followingChartForSparkline,
        categories: datesForSparkline,
      },
    },
    {
      title: 'Total Videos Growth',
      total: formatNumber(totalVideoGrowth),
      icon: <Iconify icon="solar:video-bold" width={24} height={24} className="" sx={{}} />,
      color: 'success' as const,
      chart: {
        series: videosChartForSparkline,
        categories: datesForSparkline,
      },
    },
    {
      title: 'Average Engagement Rate',
      total: formatPercentage(avgEngagementRate),
      icon: <Iconify icon="solar:heart-bold" width={24} height={24} className="" sx={{}} />,
      color: 'error' as const,
      chart: {
        series: engagementRateChartForSparkline,
        categories: datesForSparkline,
      },
    },
    {
      title: 'Current Followers',
      total: formatNumber(latestData.followerCount),
      icon: <Iconify icon="solar:users-group-rounded-bold" width={24} height={24} className="" sx={{}} />,
      color: 'primary' as const,
      chart: {
        series: followersChartForSparkline,
        categories: datesForSparkline,
      },
    },
    {
      title: 'Current Following',
      total: formatNumber(latestData.followingCount),
      icon: <Iconify icon="solar:user-plus-bold" width={24} height={24} className="" sx={{}} />,
      color: 'info' as const,
      chart: {
        series: followingChartForSparkline,
        categories: datesForSparkline,
      },
    },
    {
      title: 'Current Videos',
      total: formatNumber(latestData.videoCount),
      icon: <Iconify icon="solar:video-bold" width={24} height={24} className="" sx={{}} />,
      color: 'success' as const,
      chart: {
        series: videosChartForSparkline,
        categories: datesForSparkline,
      },
    },
    {
      title: 'Current Engagement Rate',
      total: formatPercentage(latestData.engagementRate),
      icon: <Iconify icon="solar:heart-bold" width={24} height={24} className="" sx={{}} />,
      color: 'error' as const,
      chart: {
        series: engagementRateChartForSparkline,
        categories: datesForSparkline,
      },
    }
  ];

  return (
    <Box>
      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {historyMetrics.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <TikTokMetricsWidget
              title={card.title}
              total={card.total}
              icon={card.icon}
              color={card.color}
              chart={card.chart}
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
              title="Followers Count"
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
              title="Video Count"
              subheader="Daily video count over time"
              action={
                <Iconify icon="solar:video-bold" width={24} height={24} className="" sx={{ color: 'info.main' }} />
              }
            />
            <CardContent>
              <ChartArea
                series={videosChartData.series}
                categories={videosChartData.categories}
                colors={videosChartData.colors}
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
                <Iconify icon="solar:heart-bold" width={24} height={24} className="" sx={{ color: 'error.main' }} />
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
      </Grid>

      {/* Data Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Historical Data Points
          </Typography>
          
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Followers</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Following</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Videos</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Engagement Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(-10).reverse().map((point, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px' }}>
                      {new Date(point.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatNumber(point.followerCount)}
                      {point.followersDelta !== 0 && (
                        <span style={{ 
                          color: point.followersDelta > 0 ? '#4caf50' : '#f44336',
                          fontSize: '0.875rem',
                          marginLeft: '4px'
                        }}>
                          ({point.followersDelta > 0 ? '+' : ''}{point.followersDelta})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatNumber(point.followingCount)}
                      {point.followingDelta !== 0 && (
                        <span style={{ 
                          color: point.followingDelta > 0 ? '#4caf50' : '#f44336',
                          fontSize: '0.875rem',
                          marginLeft: '4px'
                        }}>
                          ({point.followingDelta > 0 ? '+' : ''}{point.followingDelta})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatNumber(point.videoCount)}
                      {point.videoDelta !== 0 && (
                        <span style={{ 
                          color: point.videoDelta > 0 ? '#4caf50' : '#f44336',
                          fontSize: '0.875rem',
                          marginLeft: '4px'
                        }}>
                          ({point.videoDelta > 0 ? '+' : ''}{point.videoDelta})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatPercentage(point.engagementRate)}
                      {point.engagementRateDelta !== 0 && (
                        <span style={{ 
                          color: point.engagementRateDelta > 0 ? '#4caf50' : '#f44336',
                          fontSize: '0.875rem',
                          marginLeft: '4px'
                        }}>
                          ({point.engagementRateDelta > 0 ? '+' : ''}{point.engagementRateDelta.toFixed(1)}%)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
