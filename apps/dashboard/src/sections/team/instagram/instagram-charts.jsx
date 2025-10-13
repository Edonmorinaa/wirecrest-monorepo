'use client';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import CardContent from '@mui/material/CardContent';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';

import { AnalyticsCurrentVisits } from 'src/sections/overview/analytics/analytics-current-visits';
import { AnalyticsWebsiteVisits } from 'src/sections/overview/analytics/analytics-website-visits';

// ----------------------------------------------------------------------

export function InstagramCharts() {
  const { businessProfile } = useInstagramBusinessProfile();
  const [activeTab, setActiveTab] = useState(0);

  const chartData = useMemo(() => {
    if (!businessProfile?.dailySnapshots?.length) {
      return {
        followers: { categories: [], series: [] },
        engagement: { categories: [], series: [] },
        likes: { categories: [], series: [] },
        comments: { categories: [], series: [] },
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
        data: sortedSnapshots.map(s => s.followerCount || 0),
      },
    ];

    // Engagement metrics
    const engagementSeries = [
      {
        name: 'Engagement Rate',
        data: sortedSnapshots.map(s => {
          const followers = s.followerCount || 0;
          const likes = s.totalLikes || 0;
          const comments = s.totalComments || 0;
          return followers > 0 ? ((likes + comments) / followers) * 100 : 0;
        }),
      },
    ];

    // Likes
    const likesSeries = [
      {
        name: 'Likes',
        data: sortedSnapshots.map(s => s.totalLikes || 0),
      },
    ];

    // Comments
    const commentsSeries = [
      {
        name: 'Comments',
        data: sortedSnapshots.map(s => s.totalComments || 0),
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
      likes: { categories, series: likesSeries },
      comments: { categories, series: commentsSeries },
      dayOfWeek,
    };
  }, [businessProfile?.dailySnapshots]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { label: 'Followers Growth', key: 'followers' },
    { label: 'Engagement Rate', key: 'engagement' },
    { label: 'Likes', key: 'likes' },
    { label: 'Comments', key: 'comments' },
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
            title="Engagement Rate"
            subheader="Monitor engagement rate to understand audience interaction quality"
            chart={chartData.engagement}
          />
        );
      case 2:
        return (
          <AnalyticsWebsiteVisits
            title="Likes"
            subheader="Track total likes received on your content"
            chart={chartData.likes}
          />
        );
      case 3:
        return (
          <AnalyticsWebsiteVisits
            title="Comments"
            subheader="Track comment engagement on your content"
            chart={chartData.comments}
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
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="Instagram analytics tabs">
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
