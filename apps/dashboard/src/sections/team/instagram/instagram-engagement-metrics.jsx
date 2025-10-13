'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';

import { fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramEngagementMetrics() {
  const { businessProfile, isLoading } = useInstagramBusinessProfile();

  const engagementData = useMemo(() => {
    if (!businessProfile?.dailySnapshots || businessProfile.dailySnapshots.length === 0) {
      return null;
    }

    const snapshots = businessProfile.dailySnapshots;
    
    // Calculate total engagement over the period
    const totalLikes = snapshots.reduce((sum, s) => sum + (s.totalLikes || 0), 0);
    const totalComments = snapshots.reduce((sum, s) => sum + (s.totalComments || 0), 0);
    const totalViews = snapshots.reduce((sum, s) => sum + (s.totalViews || 0), 0);
    
    // Calculate averages
    const avgDailyLikes = snapshots.length > 0 ? totalLikes / snapshots.length : 0;
    const avgDailyComments = snapshots.length > 0 ? totalComments / snapshots.length : 0;
    const avgDailyViews = snapshots.length > 0 ? totalViews / snapshots.length : 0;
    
    // Calculate engagement trends (comparing last two snapshots)
    const engagementTrend = snapshots.length >= 2 ? 
      (snapshots[0].totalLikes + snapshots[0].totalComments) - 
      (snapshots[1].totalLikes + snapshots[1].totalComments) : 0;
    
    // Find best performing day
    const bestPerformingDay = snapshots.reduce((best, snapshot) => {
      const engagement = snapshot.totalLikes + snapshot.totalComments;
      return engagement > best.engagement ? { date: snapshot.snapshotDate, engagement } : best;
    }, { date: null, engagement: 0 });

    return {
      totalLikes,
      totalComments,
      totalViews,
      avgDailyLikes,
      avgDailyComments,
      avgDailyViews,
      engagementTrend,
      bestPerformingDay,
      totalSnapshots: snapshots.length,
    };
  }, [businessProfile]);

  if (isLoading || !engagementData) {
    return null;
  }

  const engagementCards = [
    {
      title: 'Total Likes',
      value: fShortenNumber(engagementData.totalLikes),
      average: fShortenNumber(engagementData.avgDailyLikes),
      icon: 'solar:heart-bold',
      color: 'error.main',
      description: 'Total likes received',
      trend: engagementData.engagementTrend > 0 ? 'up' : 'down'
    },
    {
      title: 'Total Comments',
      value: fShortenNumber(engagementData.totalComments),
      average: fShortenNumber(engagementData.avgDailyComments),
      icon: 'solar:chat-round-dots-bold',
      color: 'info.main',
      description: 'Total comments received',
      trend: engagementData.engagementTrend > 0 ? 'up' : 'down'
    },
    {
      title: 'Total Views',
      value: fShortenNumber(engagementData.totalViews),
      average: fShortenNumber(engagementData.avgDailyViews),
      icon: 'solar:eye-bold',
      color: 'warning.main',
      description: 'Total post views',
      trend: engagementData.engagementTrend > 0 ? 'up' : 'down'
    },
    {
      title: 'Best Day',
      value: engagementData.bestPerformingDay.date ? 
        new Date(engagementData.bestPerformingDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
      average: fShortenNumber(engagementData.bestPerformingDay.engagement),
      icon: 'solar:star-bold',
      color: 'success.main',
      description: 'Highest engagement day',
      trend: 'up'
    }
  ];

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:chart-2-bold" />
            <Typography variant="h6">Engagement Metrics</Typography>
          </Stack>
        }
        subheader="Detailed breakdown of your content engagement performance"
      />
      
      <CardContent>
        <Grid container spacing={3}>
          {engagementCards.map((metric, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={2} alignItems="center" textAlign="center">
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${metric.color}15`,
                  }}
                >
                  <Iconify icon={metric.icon} sx={{ color: metric.color, fontSize: 24 }} />
                </Box>
                
                <Stack spacing={0.5}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {metric.value}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {metric.title}
                  </Typography>
                  
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {metric.description}
                  </Typography>
                  
                  {metric.average !== '0' && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Avg: {metric.average}/day
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Grid>
          ))}
        </Grid>
        
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Engagement Trend: {engagementData.engagementTrend > 0 ? '📈 Increasing' : 
                                engagementData.engagementTrend < 0 ? '📉 Decreasing' : '➡️ Stable'}
            </Typography>
            
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Based on {engagementData.totalSnapshots} daily snapshots
            </Typography>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
