'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { fPercent, fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';

// ----------------------------------------------------------------------

export function InstagramKeyMetrics() {
  const { businessProfile, isLoading } = useInstagramBusinessProfile();

  const metrics = useMemo(() => {
    if (!businessProfile?.dailySnapshots || businessProfile.dailySnapshots.length === 0) {
      return null;
    }

    const snapshots = businessProfile.dailySnapshots;
    const firstSnapshot = snapshots[snapshots.length - 1]; // Oldest
    const latestSnapshot = snapshots[0]; // Newest

    // Calculate growth metrics
    const followersGrowth = latestSnapshot.followersCount - firstSnapshot.followersCount;
    const followersGrowthPercent = firstSnapshot.followersCount > 0 
      ? (followersGrowth / firstSnapshot.followersCount) * 100 
      : 0;

    const mediaGrowth = latestSnapshot.mediaCount - firstSnapshot.mediaCount;

    // Calculate engagement metrics
    const totalLikes = snapshots.reduce((sum, s) => sum + (s.totalLikes || 0), 0);
    const totalComments = snapshots.reduce((sum, s) => sum + (s.totalComments || 0), 0);
    const avgDailyLikes = snapshots.length > 0 ? totalLikes / snapshots.length : 0;
    const avgDailyComments = snapshots.length > 0 ? totalComments / snapshots.length : 0;
    
    const avgEngagementRate = latestSnapshot.followersCount > 0 
      ? (avgDailyLikes + avgDailyComments) / latestSnapshot.followersCount * 100 
      : 0;

    // Calculate content metrics
    const totalNewPosts = snapshots.reduce((sum, s) => sum + (s.newPosts || 0), 0);
    const avgContentPerDay = snapshots.length > 0 ? totalNewPosts / snapshots.length : 0;

    return {
      followersGrowth,
      followersGrowthPercent,
      mediaGrowth,
      avgEngagementRate,
      avgContentPerDay,
      currentFollowers: latestSnapshot.followersCount,
      currentMedia: latestSnapshot.mediaCount,
    };
  }, [businessProfile]);

  if (isLoading || !metrics) {
    return null;
  }

  const metricCards = [
    {
      title: 'Audience Growth',
      value: fShortenNumber(metrics.currentFollowers),
      change: metrics.followersGrowth,
      changePercent: metrics.followersGrowthPercent,
      icon: 'solar:users-group-rounded-bold',
      color: 'primary.main',
      trend: metrics.followersGrowth >= 0 ? 'up' : 'down',
      description: 'Total followers',
      insight: metrics.followersGrowthPercent > 5 ? '🚀 Excellent growth rate!' : 
               metrics.followersGrowthPercent > 0 ? '📈 Steady growth' : '⚠️ Consider content strategy'
    },
    {
      title: 'Engagement Rate',
      value: fPercent(metrics.avgEngagementRate),
      change: null,
      changePercent: null,
      icon: 'solar:heart-bold',
      color: 'error.main',
      trend: metrics.avgEngagementRate > 3 ? 'up' : 'down',
      description: 'Average daily engagement',
      insight: metrics.avgEngagementRate > 5 ? '🎯 Exceptional engagement!' : 
               metrics.avgEngagementRate > 2 ? '👍 Good engagement' : '💡 Improve content quality'
    },
    {
      title: 'Content Strategy',
      value: metrics.avgContentPerDay.toFixed(1),
      change: null,
      changePercent: null,
      icon: 'solar:camera-bold',
      color: 'secondary.main',
      trend: metrics.avgContentPerDay > 1 ? 'up' : 'down',
      description: 'Posts per day on average',
      insight: metrics.avgContentPerDay > 1.5 ? '📱 Consistent posting!' : 
               metrics.avgContentPerDay > 0.5 ? '📝 Regular content' : '📅 Increase frequency'
    },
    {
      title: 'Total Posts',
      value: fShortenNumber(metrics.currentMedia),
      change: metrics.mediaGrowth,
      changePercent: null,
      icon: 'solar:chart-2-bold',
      color: 'warning.main',
      trend: metrics.mediaGrowth >= 0 ? 'up' : 'down',
      description: 'Total content',
      insight: metrics.currentMedia && metrics.currentFollowers 
        ? `1 post per ${Math.ceil(metrics.currentFollowers / metrics.currentMedia)} followers`
        : 'No posts yet'
    }
  ];

  return (
    <Grid container spacing={3}>
      {metricCards.map((metric, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 80,
                height: 80,
                bgcolor: `${metric.color}10`,
                borderRadius: '0 0 0 100%',
              }}
            />
            
            <CardHeader
              sx={{ pb: 1 }}
              title={
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {metric.title}
                  </Typography>
                  <Iconify icon={metric.icon} sx={{ color: metric.color }} />
                </Stack>
              }
            />
            
            <CardContent>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {metric.value}
              </Typography>
              
              {metric.change !== null && (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                  <Iconify 
                    icon={metric.trend === 'up' ? 'solar:trending-up-bold' : 'solar:trending-down-bold'} 
                    sx={{ 
                      fontSize: 16, 
                      color: metric.trend === 'up' ? 'success.main' : 'error.main' 
                    }} 
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: metric.trend === 'up' ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  >
                    {metric.change >= 0 ? '+' : ''}{metric.change}
                    {metric.changePercent !== null && ` (${metric.changePercent >= 0 ? '+' : ''}${metric.changePercent.toFixed(1)}%)`}
                  </Typography>
                </Stack>
              )}
              
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                {metric.description}
              </Typography>
              
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {metric.insight}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
