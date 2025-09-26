'use client';

import { useMemo } from 'react';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { AnalyticsWebsiteVisits } from 'src/sections/overview/analytics/analytics-website-visits';

import { TikTokMetricsWidget } from '../components/tiktok-metrics-widget';

// ----------------------------------------------------------------------

interface OverviewData {
  followersGrowthRate90d?: number;
  weeklyFollowers?: number;
  engagementRate?: number;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  avgShares?: number;
  avgDownloads?: number;
  weeklyVideos?: number;
  followersRatio?: number;
  commentsRatio?: number;
  followersChart?: Array<{ date: string; value: number }>;
  followingChart?: Array<{ date: string; value: number }>;
  engagementRateChart?: Array<{ date: string; value: number }>;
  avgLikesChart?: Array<{ date: string; value: number }>;
  avgViewsChart?: Array<{ date: string; value: number }>;
}

interface TikTokOverviewTabProps {
  data: OverviewData | null;
  startDate: Date;
  endDate: Date;
}

export function TikTokOverviewTab({ data, startDate, endDate }: TikTokOverviewTabProps) {
  // Process chart data from the analytics data
  const processedChartData = useMemo(() => {
    if (!data) return null;

    const formatChartData = (chartData: Array<{ date: string; value: number }> | undefined) => {
      if (!chartData || chartData.length === 0) return null;
      
      const categories = chartData.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );
      
      const series = [{
        name: 'Value',
        data: chartData.map(item => item.value),
        type: 'area'
      }];

      return { 
        categories, 
        series,
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
      };
    };

    return {
      followers: formatChartData(data.followersChart),
      following: formatChartData(data.followingChart),
      engagementRate: formatChartData(data.engagementRateChart),
      avgLikes: formatChartData(data.avgLikesChart),
      avgViews: formatChartData(data.avgViewsChart)
    };
  }, [data]);

  if (!data) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          No overview data available for the selected date range.
        </Typography>
      </Alert>
    );
  }

  const formatNumber = (num: number | undefined): string => {
    if (num == null || isNaN(num)) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(1);
  };

  const formatPercentage = (num: number | undefined): string => {
    if (num == null || isNaN(num)) return '0%';
    return `${num.toFixed(1)}%`;
  };

  const metrics = [
    {
      title: 'Followers Growth (90d)',
      value: formatPercentage(data.followersGrowthRate90d),
      icon: 'eva:trending-up-fill',
      color: 'primary',
      trend: (data.followersGrowthRate90d && data.followersGrowthRate90d > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Weekly Followers',
      value: formatNumber(data.weeklyFollowers),
      icon: 'eva:people-fill',
      color: 'info',
      trend: (data.weeklyFollowers && data.weeklyFollowers > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Engagement Rate',
      value: formatPercentage(data.engagementRate),
      icon: 'eva:heart-fill',
      color: 'error',
      trend: (data.engagementRate && data.engagementRate > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Likes',
      value: formatNumber(data.avgLikes),
      icon: 'eva:heart-fill',
      color: 'warning',
      trend: (data.avgLikes && data.avgLikes > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Comments',
      value: formatNumber(data.avgComments),
      icon: 'eva:message-circle-fill',
      color: 'success',
      trend: (data.avgComments && data.avgComments > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Views',
      value: formatNumber(data.avgViews),
      icon: 'eva:eye-fill',
      color: 'secondary',
      trend: (data.avgViews && data.avgViews > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Shares',
      value: formatNumber(data.avgShares),
      icon: 'eva:share-fill',
      color: 'info',
      trend: (data.avgShares && data.avgShares > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Downloads',
      value: formatNumber(data.avgDownloads),
      icon: 'eva:download-fill',
      color: 'primary',
      trend: (data.avgDownloads && data.avgDownloads > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Weekly Videos',
      value: formatNumber(data.weeklyVideos),
      icon: 'eva:video-fill',
      color: 'warning',
      trend: (data.weeklyVideos && data.weeklyVideos > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    }
  ];

  return (
    <Stack spacing={3}>
      {/* Key Metrics Grid */}
      <Grid container spacing={3}>
        {metrics.map((metric, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
            <TikTokMetricsWidget
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              color={metric.color as any}
              trend={metric.trend}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Performance Charts
          </Typography>
          
          <Grid container spacing={3}>
            {/* Followers Chart */}
            {processedChartData?.followers && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Followers Growth"
                  subheader="Track your follower count over time"
                  chart={processedChartData.followers}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Following Chart */}
            {processedChartData?.following && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Following Count"
                  subheader="Track your following count over time"
                  chart={processedChartData.following}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Engagement Rate Chart */}
            {processedChartData?.engagementRate && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Engagement Rate"
                  subheader="Monitor engagement rate to understand audience interaction quality"
                  chart={processedChartData.engagementRate}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Average Likes Chart */}
            {processedChartData?.avgLikes && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Average Likes"
                  subheader="Track average likes received on your content"
                  chart={processedChartData.avgLikes}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Average Views Chart */}
            {processedChartData?.avgViews && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Average Views"
                  subheader="Track average views on your content"
                  chart={processedChartData.avgViews}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}
