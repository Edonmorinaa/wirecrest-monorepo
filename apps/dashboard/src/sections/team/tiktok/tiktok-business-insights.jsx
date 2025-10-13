import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';


// ----------------------------------------------------------------------

export function TikTokBusinessInsights() {
  const { businessProfile } = useTikTokBusinessProfile();

  const insights = useMemo(() => {
    if (!businessProfile?.dailySnapshots?.length) {
      return {
        followersGrowth: 0,
        avgEngagementRate: 0,
        avgContentPerDay: 0,
      };
    }

    const snapshots = businessProfile.dailySnapshots;
    const sortedSnapshots = [...snapshots].sort((a, b) => 
      new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
    );

    if (sortedSnapshots.length < 2) {
      return {
        followersGrowth: 0,
        avgEngagementRate: 0,
        avgContentPerDay: sortedSnapshots[0]?.newVideos || 0,
      };
    }

    const firstSnapshot = sortedSnapshots[0];
    const lastSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
    const followersGrowth = lastSnapshot.followerCount - firstSnapshot.followerCount;

    const totalLikes = snapshots.reduce((sum, s) => sum + s.totalLikes, 0);
    const totalComments = snapshots.reduce((sum, s) => sum + s.totalComments, 0);
    const totalShares = snapshots.reduce((sum, s) => sum + s.totalShares, 0);
    const totalViews = snapshots.reduce((sum, s) => sum + s.totalViews, 0);

    const avgEngagementRate = lastSnapshot.followerCount > 0 
      ? ((totalLikes + totalComments + totalShares) / lastSnapshot.followerCount) * 100 
      : 0;

    const avgContentPerDay = snapshots.reduce((sum, s) => sum + s.newVideos, 0) / snapshots.length;

    return {
      followersGrowth,
      avgEngagementRate,
      avgContentPerDay,
    };
  }, [businessProfile?.dailySnapshots]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Business Insights Summary
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: 'success.main', mb: 1 }}>
                +{insights.followersGrowth.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Follower Growth
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: 'primary.main', mb: 1 }}>
                {insights.avgEngagementRate.toFixed(2)}%
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Avg Engagement Rate
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: 'warning.main', mb: 1 }}>
                {insights.avgContentPerDay.toFixed(1)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Avg Content/Day
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
