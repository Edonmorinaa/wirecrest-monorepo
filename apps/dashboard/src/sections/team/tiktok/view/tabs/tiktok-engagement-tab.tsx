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

interface EngagementData {
  engagementRate?: number;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  avgShares?: number;
  avgDownloads?: number;
  weeklyEngagementRate?: number;
  weeklyVideos?: number;
  commentsRatio?: number;
  engagementRateChart?: Array<{ date: string; value: number }>;
  avgLikesChart?: Array<{ date: string; value: number }>;
  avgViewsChart?: Array<{ date: string; value: number }>;
  weeklyEngagementRateChart?: Array<{ date: string; value: number }>;
  weeklyVideosChart?: Array<{ date: string; value: number }>;
  avgCommentsChart?: Array<{ date: string; value: number }>;
  avgSharesChart?: Array<{ date: string; value: number }>;
  avgDownloadsChart?: Array<{ date: string; value: number }>;
  commentsRatioChart?: Array<{ date: string; value: number }>;
}

interface TikTokEngagementTabProps {
  data: EngagementData | null;
  startDate: Date;
  endDate: Date;
}

export function TikTokEngagementTab({ data, startDate, endDate }: TikTokEngagementTabProps) {
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
      engagementRate: formatChartData(data.engagementRateChart),
      avgLikes: formatChartData(data.avgLikesChart),
      avgViews: formatChartData(data.avgViewsChart),
      weeklyEngagementRate: formatChartData(data.weeklyEngagementRateChart),
      weeklyVideos: formatChartData(data.weeklyVideosChart),
      avgComments: formatChartData(data.avgCommentsChart),
      avgShares: formatChartData(data.avgSharesChart),
      avgDownloads: formatChartData(data.avgDownloadsChart),
      commentsRatio: formatChartData(data.commentsRatioChart)
    };
  }, [data]);

  if (!data) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          No engagement data available for the selected date range.
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

  const engagementMetrics = [
    {
      title: 'Engagement Rate',
      value: formatPercentage(data.engagementRate),
      icon: 'eva:heart-fill',
      color: 'error' as const,
      trend: (data.engagementRate && data.engagementRate > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Likes',
      value: formatNumber(data.avgLikes),
      icon: 'eva:heart-fill',
      color: 'warning' as const,
      trend: (data.avgLikes && data.avgLikes > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Comments',
      value: formatNumber(data.avgComments),
      icon: 'eva:message-circle-fill',
      color: 'success' as const,
      trend: (data.avgComments && data.avgComments > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Views',
      value: formatNumber(data.avgViews),
      icon: 'eva:eye-fill',
      color: 'info' as const,
      trend: (data.avgViews && data.avgViews > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Shares',
      value: formatNumber(data.avgShares),
      icon: 'eva:share-fill',
      color: 'primary' as const,
      trend: (data.avgShares && data.avgShares > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Avg Downloads',
      value: formatNumber(data.avgDownloads),
      icon: 'eva:download-fill',
      color: 'secondary' as const,
      trend: (data.avgDownloads && data.avgDownloads > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Weekly Engagement Rate',
      value: formatPercentage(data.weeklyEngagementRate),
      icon: 'eva:activity-fill',
      color: 'error' as const,
      trend: (data.weeklyEngagementRate && data.weeklyEngagementRate > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Weekly Videos',
      value: formatNumber(data.weeklyVideos),
      icon: 'eva:video-fill',
      color: 'warning' as const,
      trend: (data.weeklyVideos && data.weeklyVideos > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Comments Ratio',
      value: formatPercentage(data.commentsRatio),
      icon: 'eva:message-circle-outline',
      color: 'success' as const,
      trend: (data.commentsRatio && data.commentsRatio > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    }
  ];

  return (
    <Stack spacing={3}>
      {/* Engagement Metrics Grid */}
      <Grid container spacing={3}>
        {engagementMetrics.map((metric, index) => (
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

      {/* Engagement Charts */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Engagement Analytics
          </Typography>
          
          <Grid container spacing={3}>
            {/* Engagement Rate Chart */}
            {processedChartData?.engagementRate && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Engagement Rate Over Time"
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
                  title="Average Likes Over Time"
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
                  title="Average Views Over Time"
                  subheader="Track average views on your content"
                  chart={processedChartData.avgViews}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Weekly Engagement Rate Chart */}
            {processedChartData?.weeklyEngagementRate && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Weekly Engagement Rate"
                  subheader="Track weekly engagement rate trends"
                  chart={processedChartData.weeklyEngagementRate}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Weekly Videos Chart */}
            {processedChartData?.weeklyVideos && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Weekly Videos Posted"
                  subheader="Track your weekly video posting activity"
                  chart={processedChartData.weeklyVideos}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Average Comments Chart */}
            {processedChartData?.avgComments && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Average Comments Over Time"
                  subheader="Track average comments received on your content"
                  chart={processedChartData.avgComments}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Average Shares Chart */}
            {processedChartData?.avgShares && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Average Shares Over Time"
                  subheader="Track average shares of your content"
                  chart={processedChartData.avgShares}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Average Downloads Chart */}
            {processedChartData?.avgDownloads && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Average Downloads Over Time"
                  subheader="Track average downloads of your content"
                  chart={processedChartData.avgDownloads}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Comments Ratio Chart */}
            {processedChartData?.commentsRatio && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Comments Ratio Over Time"
                  subheader="Track comments to likes ratio"
                  chart={processedChartData.commentsRatio}
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
