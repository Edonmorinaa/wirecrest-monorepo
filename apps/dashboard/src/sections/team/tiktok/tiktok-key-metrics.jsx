import { useMemo } from 'react';
import Grid from '@mui/material/Grid';

import { AnalyticsWidgetSummary } from 'src/sections/overview/analytics/analytics-widget-summary';
import { Iconify } from 'src/components/iconify';
import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';

// ----------------------------------------------------------------------

export function TikTokKeyMetrics() {
  const { businessProfile } = useTikTokBusinessProfile();

  const metrics = useMemo(() => {
    if (!businessProfile?.dailySnapshots?.length) {
      return {
        followers: { total: 0, percent: 0, chart: { categories: [], series: [] } },
        engagement: { total: 0, percent: 0, chart: { categories: [], series: [] } },
        views: { total: 0, percent: 0, chart: { categories: [], series: [] } },
        content: { total: 0, percent: 0, chart: { categories: [], series: [] } },
      };
    }

    const snapshots = businessProfile.dailySnapshots;
    const sortedSnapshots = [...snapshots].sort((a, b) => 
      new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
    );

    const lastSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
    const firstSnapshot = sortedSnapshots[0];

    // Followers metrics
    const followersGrowth = lastSnapshot.followerCount - firstSnapshot.followerCount;
    const followersGrowthPercent = firstSnapshot.followerCount > 0 
      ? (followersGrowth / firstSnapshot.followerCount) * 100 
      : 0;

    // Engagement metrics
    const totalLikes = snapshots.reduce((sum, s) => sum + s.totalLikes, 0);
    const totalComments = snapshots.reduce((sum, s) => sum + s.totalComments, 0);
    const totalShares = snapshots.reduce((sum, s) => sum + s.totalShares, 0);
    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagementRate = lastSnapshot.followerCount > 0 
      ? (totalEngagement / lastSnapshot.followerCount) * 100 
      : 0;

    // Views metrics
    const totalViews = snapshots.reduce((sum, s) => sum + s.totalViews, 0);
    const avgViewsPerVideo = lastSnapshot.videoCount > 0 
      ? totalViews / lastSnapshot.videoCount 
      : 0;

    // Content metrics
    const totalNewVideos = snapshots.reduce((sum, s) => sum + s.newVideos, 0);
    const avgContentPerDay = snapshots.length > 0 
      ? totalNewVideos / snapshots.length 
      : 0;

    // Prepare chart data
    const categories = sortedSnapshots.map(s => 
      new Date(s.snapshotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    return {
      followers: {
        total: lastSnapshot.followerCount,
        percent: followersGrowthPercent,
        chart: {
          categories,
          series: sortedSnapshots.map(s => s.followerCount),
        },
      },
      engagement: {
        total: Math.round(avgEngagementRate * 100) / 100,
        percent: avgEngagementRate > 0 ? 1 : 0,
        chart: {
          categories,
          series: sortedSnapshots.map(s => 
            s.followerCount > 0 ? ((s.totalLikes + s.totalComments + s.totalShares) / s.followerCount) * 100 : 0
          ),
        },
      },
      views: {
        total: Math.round(avgViewsPerVideo),
        percent: avgViewsPerVideo > 0 ? 1 : 0,
        chart: {
          categories,
          series: sortedSnapshots.map(s => s.totalViews),
        },
      },
      content: {
        total: Math.round(avgContentPerDay * 10) / 10,
        percent: avgContentPerDay > 0 ? 1 : 0,
        chart: {
          categories,
          series: sortedSnapshots.map(s => s.newVideos),
        },
      },
    };
  }, [businessProfile?.dailySnapshots]);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AnalyticsWidgetSummary
          title="Followers"
          percent={metrics.followers.percent}
          total={metrics.followers.total}
          icon={<Iconify icon="solar:users-group-rounded-bold" />}
          chart={metrics.followers.chart}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AnalyticsWidgetSummary
          title="Engagement Rate"
          percent={metrics.engagement.percent}
          total={`${metrics.engagement.total}%`}
          color="secondary"
          icon={<Iconify icon="solar:heart-bold" />}
          chart={metrics.engagement.chart}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AnalyticsWidgetSummary
          title="Avg Views/Video"
          percent={metrics.views.percent}
          total={metrics.views.total}
          color="warning"
          icon={<Iconify icon="solar:eye-bold" />}
          chart={metrics.views.chart}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AnalyticsWidgetSummary
          title="Content/Day"
          percent={metrics.content.percent}
          total={metrics.content.total}
          color="error"
          icon={<Iconify icon="solar:video-library-bold" />}
          chart={metrics.content.chart}
        />
      </Grid>
    </Grid>
  );
}
