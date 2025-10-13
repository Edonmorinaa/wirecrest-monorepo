import { useMemo, useState } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import CardContent from '@mui/material/CardContent';

import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';

import { AnalyticsWebsiteVisits } from 'src/sections/overview/analytics/analytics-website-visits';
import { AnalyticsCurrentVisits } from 'src/sections/overview/analytics/analytics-current-visits';

// ----------------------------------------------------------------------

export function TikTokCharts() {
  const { businessProfile } = useTikTokBusinessProfile();
  const [activeTab, setActiveTab] = useState(0);

  const chartData = useMemo(() => {
    if (!businessProfile?.dailySnapshots?.length) {
      return {
        followers: { categories: [], series: [] },
        engagement: { categories: [], series: [] },
        views: { categories: [], series: [] },
        content: { categories: [], series: [] },
        dayOfWeek: [],
      };
    }

    const snapshots = businessProfile.dailySnapshots;
    const sortedSnapshots = [...snapshots].sort((a, b) => 
      new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
    );

    const categories = sortedSnapshots.map(s => 
      new Date(s.snapshotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    // Followers growth
    const followersSeries = [
      {
        name: 'Followers',
        data: sortedSnapshots.map(s => s.followerCount),
      },
    ];

    // Engagement metrics
    const engagementSeries = [
      {
        name: 'Likes',
        data: sortedSnapshots.map(s => s.totalLikes),
      },
      {
        name: 'Comments',
        data: sortedSnapshots.map(s => s.totalComments),
      },
      {
        name: 'Shares',
        data: sortedSnapshots.map(s => s.totalShares),
      },
    ];

    // Views
    const viewsSeries = [
      {
        name: 'Views',
        data: sortedSnapshots.map(s => s.totalViews),
      },
    ];

    // Content posted
    const contentSeries = [
      {
        name: 'New Videos',
        data: sortedSnapshots.map(s => s.newVideos),
      },
    ];

    // Day of week engagement (simplified)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = dayNames.map((day, index) => ({
      label: day,
      value: Math.random() * 10 + 5, // Mock data for now
    }));

    return {
      followers: { categories, series: followersSeries },
      engagement: { categories, series: engagementSeries },
      views: { categories, series: viewsSeries },
      content: { categories, series: contentSeries },
      dayOfWeek,
    };
  }, [businessProfile?.dailySnapshots]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { label: 'Followers Growth', key: 'followers' },
    { label: 'Engagement', key: 'engagement' },
    { label: 'Views', key: 'views' },
    { label: 'Content', key: 'content' },
    { label: 'Best Times', key: 'dayOfWeek' },
  ];

  const renderChart = () => {
    switch (activeTab) {
      case 0:
        return (
          <AnalyticsWebsiteVisits
            title="Followers Growth"
            subheader="Track your follower count over time"
            chart={chartData.followers}
          />
        );
      case 1:
        return (
          <AnalyticsWebsiteVisits
            title="Engagement Metrics"
            subheader="Likes, comments, and shares over time"
            chart={chartData.engagement}
          />
        );
      case 2:
        return (
          <AnalyticsWebsiteVisits
            title="Video Views"
            subheader="Total views over time"
            chart={chartData.views}
          />
        );
      case 3:
        return (
          <AnalyticsWebsiteVisits
            title="Content Posted"
            subheader="New videos posted over time"
            chart={chartData.content}
          />
        );
      case 4:
        return (
          <AnalyticsCurrentVisits
            title="Best Day To Post (Avg ER%)"
            chart={{
              series: chartData.dayOfWeek.map(d => ({ label: d.label, value: d.value })),
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="TikTok analytics tabs">
            {tabs.map((tab, index) => (
              <Tab key={tab.key} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        {renderChart()}
      </CardContent>
    </Card>
  );
}
