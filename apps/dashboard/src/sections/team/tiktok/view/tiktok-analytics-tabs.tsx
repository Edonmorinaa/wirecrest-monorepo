'use client';

import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { TikTokGrowthTab } from './tabs/tiktok-growth-tab';
import { TikTokHistoryTab } from './tabs/tiktok-history-tab';
import { TikTokOverviewTab } from './tabs/tiktok-overview-tab';
import { TikTokEngagementTab } from './tabs/tiktok-engagement-tab';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'growth', label: 'Growth' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'history', label: 'History' },
] as const;

type TabValue = typeof TABS[number]['value'];

interface AnalyticsData {
  general?: any;
  overview?: any;
  growth?: any;
  engagement?: any;
  history?: any;
}

interface TikTokAnalyticsTabsProps {
  data: AnalyticsData | null;
  startDate: Date;
  endDate: Date;
}

export function TikTokAnalyticsTabs({ data, startDate, endDate }: TikTokAnalyticsTabsProps) {
  const [currentTab, setCurrentTab] = useState<TabValue>('overview');

  const handleTabChange = (event: React.SyntheticEvent, newValue: TabValue) => {
    setCurrentTab(newValue);
  };

  // Handle missing or invalid data
  if (!data) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            <Typography variant="body2">
              No analytics data available. Please try refreshing or selecting a different date range.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'overview':
        return <TikTokOverviewTab data={data.overview} startDate={startDate} endDate={endDate} />;
      case 'growth':
        return <TikTokGrowthTab data={data.growth} startDate={startDate} endDate={endDate} />;
      case 'engagement':
        return <TikTokEngagementTab data={data.engagement} startDate={startDate} endDate={endDate} />;
      case 'history':
        return <TikTokHistoryTab data={data.history} startDate={startDate} endDate={endDate} />;
      default:
        return <TikTokOverviewTab data={data.overview} startDate={startDate} endDate={endDate} />;
    }
  };

  return (
    <Card>
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        sx={{ px: 3, pt: 2 }}
      >
        {TABS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>

      <CardContent>
        {renderTabContent()}
      </CardContent>
    </Card>
  );
}
