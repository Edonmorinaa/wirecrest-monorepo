'use client';

import { useState, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';
import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';
import { fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

// Helper function to aggregate data by time period
const aggregateData = (data, period) => {
  if (!data || data.length === 0) return [];

  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.snapshotDate);
    let key;

    switch (period) {
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default: // daily
        key = date.toISOString().split('T')[0];
    }

    if (!acc[key]) {
      acc[key] = {
        date: key,
        followers: [],
        likes: [],
        comments: [],
        views: [],
        engagement: [],
        count: 0,
      };
    }

    acc[key].followers.push(item.followersCount || 0);
    acc[key].likes.push(item.totalLikes || 0);
    acc[key].comments.push(item.totalComments || 0);
    acc[key].views.push(item.totalViews || 0);
    acc[key].engagement.push(item.engagementRate || 0);
    acc[key].count += 1;

    return acc;
  }, {});

  return Object.values(grouped)
    .map((group) => ({
      date: group.date,
      followers: Math.round(group.followers.reduce((a, b) => a + b, 0) / group.count),
      likes: Math.round(group.likes.reduce((a, b) => a + b, 0) / group.count),
      comments: Math.round(group.comments.reduce((a, b) => a + b, 0) / group.count),
      views: Math.round(group.views.reduce((a, b) => a + b, 0) / group.count),
      engagement: Number((group.engagement.reduce((a, b) => a + b, 0) / group.count).toFixed(2)),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Helper function to format date labels
const formatDateLabel = (dateString, period) => {
  const date = new Date(dateString);
  
  switch (period) {
    case 'weekly':
      const weekEnd = new Date(date);
      weekEnd.setDate(date.getDate() + 6);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'monthly':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

export function InstagramAdvancedAnalytics() {
  const theme = useTheme();
  const { businessProfile, isLoading } = useInstagramBusinessProfile();
  const [aggregationType, setAggregationType] = useState('daily');

  // Prepare chart data from daily snapshots with aggregation
  const chartData = useMemo(() => {
    if (!businessProfile?.dailySnapshots || businessProfile.dailySnapshots.length === 0) {
      return [];
    }

    const rawData = businessProfile.dailySnapshots
      .sort((a, b) => new Date(a.snapshotDate) - new Date(b.snapshotDate))
      .map((snapshot) => ({
        snapshotDate: snapshot.snapshotDate,
        followersCount: snapshot.followersCount || 0,
        totalLikes: snapshot.totalLikes || 0,
        totalComments: snapshot.totalComments || 0,
        totalViews: snapshot.totalViews || 0,
        engagementRate: snapshot.engagementRate || 0,
      }));

    return aggregateData(rawData, aggregationType);
  }, [businessProfile?.dailySnapshots, aggregationType]);

  // Followers Growth Chart - using analytics line chart style
  const followersChartOptions = useChart({
    colors: [theme.palette.primary.main],
    xaxis: {
      categories: chartData.map((item) => formatDateLabel(item.date, aggregationType)),
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
        rotate: aggregationType === 'weekly' ? -45 : 0,
        rotateAlways: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
        formatter: (value) => fNumber(value),
      },
    },
    tooltip: {
      y: {
        formatter: (value) => fNumber(value),
        title: {
          formatter: () => 'Followers: ',
        },
      },
    },
    ...theme.applyStyles('dark', {
      xaxis: {
        labels: {
          style: {
            colors: theme.palette.text.secondary,
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: theme.palette.text.secondary,
          },
        },
      },
    }),
  });

  // Engagement Chart - using ecommerce area chart style
  const engagementChartOptions = useChart({
    colors: [theme.palette.success.main],
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0, color: theme.palette.success.main, opacity: 0.6 },
          { offset: 100, color: theme.palette.success.main, opacity: 0.1 },
        ],
      },
    },
    xaxis: {
      categories: chartData.map((item) => formatDateLabel(item.date, aggregationType)),
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
        rotate: aggregationType === 'weekly' ? -45 : 0,
        rotateAlways: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
        formatter: (value) => `${value.toFixed(2)}%`,
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${value.toFixed(2)}%`,
        title: {
          formatter: () => 'Engagement: ',
        },
      },
    },
    ...theme.applyStyles('dark', {
      xaxis: {
        labels: {
          style: {
            colors: theme.palette.text.secondary,
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: theme.palette.text.secondary,
          },
        },
      },
    }),
  });

  // Content Performance Chart - using Facebook reviews bar chart style
  const contentChartOptions = useChart({
    colors: [theme.palette.primary.main, theme.palette.warning.main, theme.palette.error.main],
    chart: {
      stacked: false,
      zoom: {
        enabled: false,
      },
    },
    xaxis: {
      categories: chartData.map((item) => formatDateLabel(item.date, aggregationType)),
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
        rotate: aggregationType === 'weekly' ? -45 : 0,
        rotateAlways: false,
      },
    },
    yaxis: {
      labels: {
        formatter: (value) => fNumber(value),
        style: {
          colors: theme.palette.text.secondary,
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value) => fNumber(value),
        title: {
          formatter: () => '',
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 0,
        horizontal: false,
        columnWidth: '55%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    fill: {
      opacity: 1,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    ...theme.applyStyles('dark', {
      xaxis: {
        labels: {
          style: {
            colors: theme.palette.text.secondary,
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: theme.palette.text.secondary,
          },
        },
      },
    }),
  });

  const contentChartSeries = [
    {
      name: 'Likes',
      data: chartData.map((item) => item.likes),
    },
    {
      name: 'Comments',
      data: chartData.map((item) => item.comments),
    },
    {
      name: 'Views',
      data: chartData.map((item) => item.views),
    },
  ];

  if (isLoading || !businessProfile) {
    return null;
  }

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Performance Analytics
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Track your Instagram performance with trend zones and actionable insights
        </Typography>
        
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Trend zones:
          </Typography>
          <Typography variant="caption" sx={{ color: 'success.main' }}>
            ↗ Growth
          </Typography>
          <Typography variant="caption" sx={{ color: 'error.main' }}>
            ↘ Decline
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            → Stable
          </Typography>
        </Stack>
      </Box>

      {/* Aggregation Type Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ToggleButtonGroup
          value={aggregationType}
          exclusive
          onChange={(event, newValue) => {
            if (newValue !== null) {
              setAggregationType(newValue);
            }
          }}
          size="small"
        >
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="weekly">Weekly</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Data Summary */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={3} alignItems="center">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Showing {chartData.length} {aggregationType} data points
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Period: {aggregationType === 'daily' ? 'Last 30 days' : aggregationType === 'weekly' ? 'Last 12 weeks' : 'Last 12 months'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Followers Growth Chart */}
      <Card>
        <CardHeader
          title={`Follower Growth (${aggregationType})`}
          subheader={`Track your total follower count over time. ${aggregationType === 'daily' ? 'Daily snapshots' : aggregationType === 'weekly' ? 'Weekly averages' : 'Monthly averages'}.`}
          action={
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                // TODO: Add info modal
                console.log('Show follower growth details');
              }}
            >
              <Iconify icon="solar:info-circle-bold" />
            </Button>
          }
        />
        <CardContent>
          {chartData.length > 0 ? (
            <Box sx={{ height: 400 }}>
              <Chart
                type="line"
                series={[{ name: 'Followers', data: chartData.map((item) => item.followers) }]}
                options={followersChartOptions}
                height={350}
              />
            </Box>
          ) : (
            <Box
              sx={{
                height: 350,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Stack alignItems="center" spacing={1}>
                <Iconify icon="solar:chart-2-bold" sx={{ fontSize: 48, opacity: 0.5 }} />
                <Typography>No data available for the selected period</Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Engagement Rate Chart */}
      <Card>
        <CardHeader
          title={`Engagement Rate (${aggregationType})`}
          subheader={`Monitor engagement rate to understand audience interaction quality. ${aggregationType === 'daily' ? 'Daily snapshots' : aggregationType === 'weekly' ? 'Weekly averages' : 'Monthly averages'}.`}
          action={
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                // TODO: Add info modal
                console.log('Show engagement rate details');
              }}
            >
              <Iconify icon="solar:info-circle-bold" />
            </Button>
          }
        />
        <CardContent>
          {chartData.length > 0 ? (
            <Box sx={{ height: 400 }}>
              <Chart
                type="area"
                series={[{ name: 'Engagement Rate', data: chartData.map((item) => item.engagement) }]}
                options={engagementChartOptions}
                height={350}
              />
            </Box>
          ) : (
            <Box
              sx={{
                height: 350,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Stack alignItems="center" spacing={1}>
                <Iconify icon="solar:activity-bold" sx={{ fontSize: 48, opacity: 0.5 }} />
                <Typography>No engagement data available</Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Content Performance Chart */}
      <Card>
        <CardHeader
          title={`Content Performance (${aggregationType})`}
          subheader={`Compare likes, comments, and views across your content. ${aggregationType === 'daily' ? 'Daily snapshots' : aggregationType === 'weekly' ? 'Weekly averages' : 'Monthly averages'}.`}
          action={
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                // TODO: Add info modal
                console.log('Show content performance details');
              }}
            >
              <Iconify icon="solar:info-circle-bold" />
            </Button>
          }
        />
        <CardContent>
          {chartData.length > 0 ? (
            <Box sx={{ height: 400 }}>
              <Chart
                type="bar"
                series={contentChartSeries}
                options={contentChartOptions}
                height={350}
              />
            </Box>
          ) : (
            <Box
              sx={{
                height: 350,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Stack alignItems="center" spacing={1}>
                <Iconify icon="solar:chart-2-bold" sx={{ fontSize: 48, opacity: 0.5 }} />
                <Typography>No content performance data available</Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
