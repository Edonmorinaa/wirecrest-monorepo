'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { AnalyticsWebsiteVisits } from 'src/sections/overview/analytics/analytics-website-visits';

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
  if (!data || data.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          No historical data available for the selected date range.
        </Typography>
      </Alert>
    );
  }

  // Process chart data for historical charts
  const chartData = {
    followers: {
      categories: data.map(point => new Date(point.date).toLocaleDateString()),
      series: [
        {
          name: 'Followers',
          data: data.map(point => point.followerCount),
          type: 'area'
        }
      ],
      chart: {
        type: 'area',
        height: 350,
        sparkline: {
          enabled: false
        },
        toolbar: {
          show: true
        }
      }
    },
    following: {
      categories: data.map(point => new Date(point.date).toLocaleDateString()),
      series: [
        {
          name: 'Following',
          data: data.map(point => point.followingCount),
          type: 'area'
        }
      ],
      chart: {
        type: 'area',
        height: 350,
        sparkline: {
          enabled: false
        },
        toolbar: {
          show: true
        }
      }
    },
    videos: {
      categories: data.map(point => new Date(point.date).toLocaleDateString()),
      series: [
        {
          name: 'Videos',
          data: data.map(point => point.videoCount),
          type: 'area'
        }
      ],
      chart: {
        type: 'area',
        height: 350,
        sparkline: {
          enabled: false
        },
        toolbar: {
          show: true
        }
      }
    },
    engagementRate: {
      categories: data.map(point => new Date(point.date).toLocaleDateString()),
      series: [
        {
          name: 'Engagement Rate',
          data: data.map(point => point.engagementRate),
          type: 'area'
        }
      ],
      chart: {
        type: 'area',
        height: 350,
        sparkline: {
          enabled: false
        },
        toolbar: {
          show: true
        }
      }
    }
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

  const historyMetrics = [
    {
      title: 'Total Followers Growth',
      value: formatNumber(totalFollowersGrowth),
      icon: 'eva:people-fill',
      color: 'primary' as const,
      trend: (totalFollowersGrowth > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Total Following Growth',
      value: formatNumber(totalFollowingGrowth),
      icon: 'eva:person-add-fill',
      color: 'info' as const,
      trend: (totalFollowingGrowth > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Total Videos Growth',
      value: formatNumber(totalVideoGrowth),
      icon: 'eva:video-fill',
      color: 'success' as const,
      trend: (totalVideoGrowth > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Average Engagement Rate',
      value: formatPercentage(avgEngagementRate),
      icon: 'eva:heart-fill',
      color: 'error' as const,
      trend: (avgEngagementRate > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Current Followers',
      value: formatNumber(latestData.followerCount),
      icon: 'eva:people-outline',
      color: 'primary' as const,
      trend: 'neutral' as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Current Following',
      value: formatNumber(latestData.followingCount),
      icon: 'eva:person-outline',
      color: 'info' as const,
      trend: 'neutral' as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Current Videos',
      value: formatNumber(latestData.videoCount),
      icon: 'eva:video-outline',
      color: 'success' as const,
      trend: 'neutral' as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Current Engagement Rate',
      value: formatPercentage(latestData.engagementRate),
      icon: 'eva:heart-outline',
      color: 'error' as const,
      trend: 'neutral' as 'up' | 'down' | 'neutral'
    }
  ];

  return (
    <Stack spacing={3}>
      {/* Historical Summary Metrics */}
      <Grid container spacing={3}>
        {historyMetrics.map((metric, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
            <TikTokMetricsWidget
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              color={metric.color}
              trend={metric.trend}
            />
          </Grid>
        ))}
      </Grid>

      {/* Historical Charts */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Historical Performance
          </Typography>
          
          <Grid container spacing={3}>
            {/* Followers History Chart */}
            <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Followers Count Over Time"
                  subheader="Track your follower growth over the selected period"
                  chart={chartData.followers}
                  sx={{ height: 400 }}
                />
            </Grid>

            {/* Following History Chart */}
            <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Following Count Over Time"
                  subheader="Track your following count changes over time"
                  chart={chartData.following}
                  sx={{ height: 400 }}
                />
            </Grid>

            {/* Videos History Chart */}
            <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Video Count Over Time"
                  subheader="Track your video count growth over time"
                  chart={chartData.videos}
                  sx={{ height: 400 }}
                />
            </Grid>

            {/* Engagement Rate History Chart */}
            <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Engagement Rate Over Time"
                  subheader="Track your engagement rate trends over time"
                  chart={chartData.engagementRate}
                  sx={{ height: 400 }}
                />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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
    </Stack>
  );
}
