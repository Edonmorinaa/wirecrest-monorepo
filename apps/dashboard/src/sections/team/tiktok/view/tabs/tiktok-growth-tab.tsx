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

interface GrowthData {
  followersGrowthRate90d?: number;
  steadyGrowthRate?: number;
  dailyFollowers?: number;
  weeklyFollowers?: number;
  monthlyFollowers?: number;
  followersChart?: Array<{ date: string; value: number }>;
  followingChart?: Array<{ date: string; value: number }>;
  newDailyFollowersChart?: Array<{ date: string; value: number }>;
  predictedFollowersChart?: Array<{ date: string; value: number }>;
}

interface TikTokGrowthTabProps {
  data: GrowthData | null;
  startDate: Date;
  endDate: Date;
}

export function TikTokGrowthTab({ data, startDate, endDate }: TikTokGrowthTabProps) {
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
      newDailyFollowers: formatChartData(data.newDailyFollowersChart),
      predictedFollowers: formatChartData(data.predictedFollowersChart)
    };
  }, [data]);

  if (!data) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          No growth data available for the selected date range.
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

  const growthMetrics = [
    {
      title: '90-Day Growth Rate',
      value: formatPercentage(data.followersGrowthRate90d),
      icon: 'eva:trending-up-fill',
      color: 'primary' as const,
      trend: (data.followersGrowthRate90d && data.followersGrowthRate90d > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Steady Growth Rate',
      value: formatPercentage(data.steadyGrowthRate),
      icon: 'eva:activity-fill',
      color: 'info' as const,
      trend: (data.steadyGrowthRate && data.steadyGrowthRate > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Daily Followers',
      value: formatNumber(data.dailyFollowers),
      icon: 'eva:calendar-fill',
      color: 'success' as const,
      trend: (data.dailyFollowers && data.dailyFollowers > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Weekly Followers',
      value: formatNumber(data.weeklyFollowers),
      icon: 'eva:clock-fill',
      color: 'warning' as const,
      trend: (data.weeklyFollowers && data.weeklyFollowers > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Monthly Followers',
      value: formatNumber(data.monthlyFollowers),
      icon: 'eva:calendar-outline',
      color: 'secondary' as const,
      trend: (data.monthlyFollowers && data.monthlyFollowers > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    }
  ];

  return (
    <Stack spacing={3}>
      {/* Growth Metrics Grid */}
      <Grid container spacing={3}>
        {growthMetrics.map((metric, index) => (
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

      {/* Growth Charts */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Growth Analytics
          </Typography>
          
          <Grid container spacing={3}>
            {/* Followers Growth Chart */}
            {processedChartData?.followers && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Followers Growth Over Time"
                  subheader="Track your follower count growth"
                  chart={processedChartData.followers}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Following Chart */}
            {processedChartData?.following && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Following Count Over Time"
                  subheader="Track your following count changes"
                  chart={processedChartData.following}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Daily New Followers Chart */}
            {processedChartData?.newDailyFollowers && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Daily New Followers"
                  subheader="Track daily follower acquisition"
                  chart={processedChartData.newDailyFollowers}
                  sx={{ height: 400 }}
                />
              </Grid>
            )}

            {/* Predicted Followers Chart */}
            {processedChartData?.predictedFollowers && (
              <Grid size={{ xs: 12, md: 6 }}>
                <AnalyticsWebsiteVisits
                  title="Predicted Followers Growth"
                  subheader="Forecast future follower growth based on current trends"
                  chart={processedChartData.predictedFollowers}
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
