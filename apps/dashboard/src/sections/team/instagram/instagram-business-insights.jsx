'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';

import { fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramBusinessInsights() {
  const { businessProfile, isLoading } = useInstagramBusinessProfile();

  const insights = useMemo(() => {
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
      avgEngagementRate,
      avgContentPerDay,
      totalSnapshots: snapshots.length,
      lastUpdated: businessProfile.lastSnapshotAt,
    };
  }, [businessProfile]);

  if (isLoading || !insights) {
    return null;
  }

  return (
    <Card sx={{ bgcolor: 'background.neutral' }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:target-bold" />
            <Typography variant="h6">Business Insights</Typography>
          </Stack>
        }
        subheader="Key metrics to help you understand and improve your Instagram performance"
      />
      
      <CardContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify 
                  icon={insights.followersGrowthPercent > 0 ? 'solar:trending-up-bold' : 'solar:trending-down-bold'} 
                  sx={{ color: insights.followersGrowthPercent > 0 ? 'success.main' : 'error.main' }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Growth Performance
                </Typography>
              </Stack>
              
              <Typography variant="h4">
                {insights.followersGrowthPercent > 0 ? '+' : ''}{fPercent(insights.followersGrowthPercent)}
              </Typography>
              
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Follower growth in selected period
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:heart-bold" sx={{ color: 'error.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Engagement Rate
                </Typography>
              </Stack>
              
              <Typography variant="h4">
                {fPercent(insights.avgEngagementRate)}
              </Typography>
              
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Average daily engagement rate
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:camera-bold" sx={{ color: 'primary.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Content Strategy
                </Typography>
              </Stack>
              
              <Typography variant="h4">
                {insights.avgContentPerDay.toFixed(1)}
              </Typography>
              
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Posts per day on average
              </Typography>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Last updated: {insights.lastUpdated ? format(new Date(insights.lastUpdated), 'MMM dd, yyyy') : 'Never'}
          </Typography>
          
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {insights.totalSnapshots} snapshots collected
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
