'use client';

import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { InstagramGrowthTab } from './tabs/instagram-growth-tab';
import { InstagramHistoryTab } from './tabs/instagram-history-tab';
import { InstagramOverviewTab } from './tabs/instagram-overview-tab';
import { InstagramEngagementTab } from './tabs/instagram-engagement-tab';

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

interface InstagramAnalyticsTabsProps {
  data: AnalyticsData | null;
  startDate: Date;
  endDate: Date;
}

export function InstagramAnalyticsTabs({ data, startDate, endDate }: InstagramAnalyticsTabsProps) {
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
        return <InstagramOverviewTab data={data.overview} startDate={startDate} endDate={endDate} />;
      case 'growth':
        return <InstagramGrowthTab data={data.growth} startDate={startDate} endDate={endDate} />;
      case 'engagement':
        return <InstagramEngagementTab data={data.engagement} startDate={startDate} endDate={endDate} />;
      case 'history':
        return <InstagramHistoryTab data={data.history} startDate={startDate} endDate={endDate} />;
      default:
        return <InstagramOverviewTab data={data.overview} startDate={startDate} endDate={endDate} />;
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
