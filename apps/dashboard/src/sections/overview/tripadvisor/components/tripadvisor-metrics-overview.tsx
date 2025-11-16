'use client';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import type { SxProps, Theme } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type TChart = {
  series?: number[];
  categories?: string[];
  options?: any;
};

type TPeriodicalMetric = {
  periodKey: number;
  averageRating?: number;
  responseRatePercent?: number;
  avgResponseTimeHours?: number;
  reviewCount?: number;
};

type TMetricsWidgetSummaryProps = {
  sx?: SxProps<Theme>;
  icon: React.ReactNode;
  title: string;
  total: string | number;
  subtitle?: string;
  chart?: TChart;
  percent?: number;
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  showProgress?: boolean;
  progressValue?: number;
  [key: string]: any;
};

// Custom MetricsWidgetSummary with progress bar support
export function TripAdvisorMetricsWidgetSummary({
  sx,
  icon,
  title,
  total,
  subtitle,
  chart,
  percent,
  color = 'primary',
  showProgress = false,
  progressValue = 0,
  ...other
}: TMetricsWidgetSummaryProps) {
  const theme = useTheme();

  const chartColors = [theme.palette[color].dark];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    xaxis: { categories: chart?.categories || [] },
    grid: {
      padding: {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
      },
    },
    tooltip: {
      y: { formatter: (value) => fNumber(value), title: { formatter: () => '' } },
    },
    markers: {
      strokeWidth: 0,
    },
    ...(chart?.options || {}),
  });

  return (
    <Card
      sx={[
        () => ({
          p: 2,
          boxShadow: 'none',
          position: 'relative',
          color: `${color}.dark`,
          backgroundColor: 'common.white',
          backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ width: 48, height: 48, mb: 3 }}>{icon}</Box>

      <Box
        sx={{
          top: 16,
          gap: 0.5,
          right: 16,
          display: 'flex',
          position: 'absolute',
          alignItems: 'center',
        }}
      >
        {percent !== undefined && percent !== 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mr: 1,
            }}
          >
            <Iconify
              width={16}
              icon={percent < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'}
              color={percent < 0 ? 'error.main' : 'success.main'}
            />
            <Box
              component="span"
              sx={{
                typography: 'caption',
                color: percent < 0 ? 'error.main' : 'success.main',
                fontWeight: 600,
              }}
            >
              {percent > 0 && '+'}
              {percent}%
            </Box>
          </Box>
        )}
        <Chart
          type="line"
          series={[{ data: chart?.series || [] }]}
          options={chartOptions}
          sx={{ width: 84, height: 76 }}
        />
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 112 }}>
          <Box sx={{ mb: 1, typography: 'subtitle2' }}>{title}</Box>

          <Box sx={{ typography: 'h4' }}>{total}</Box>

          {subtitle && (
            <Box sx={{ typography: 'caption', color: 'text.secondary', mt: 0.5 }}>{subtitle}</Box>
          )}

          {showProgress && (
            <Box sx={{ width: '100%', mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    bgcolor: theme.palette[color].main,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

      <SvgColor
        src={`${CONFIG.assetsDir}/assets/background/shape-square.svg`}
        sx={{
          top: 0,
          left: -20,
          width: 240,
          zIndex: -1,
          height: 240,
          opacity: 0.24,
          position: 'absolute',
          color: `${color}.main`,
        }}
      />
    </Card>
  );
}

type TMetricsOverviewProps = {
  metrics?: {
    averageRating?: number;
    totalReviews?: number;
    responseRate?: number;
    averageResponseTime?: number;
  };
  periodicalMetrics?: TPeriodicalMetric[];
  currentPeriodKey: string;
};

export function TripAdvisorMetricsOverview({ metrics, periodicalMetrics, currentPeriodKey }: TMetricsOverviewProps) {
  const theme = useTheme();

  if (!metrics) return null;

  // Generate chart data from periodical metrics
  const generateChartDataFromPeriods = (metricKey: string): number[] => {
    if (!periodicalMetrics || !Array.isArray(periodicalMetrics)) {
      return []; // Return empty array if no data
    }

    // Sort periods by periodKey (excluding "All Time" which is 0)
    const sortedPeriods = periodicalMetrics
      .filter((period) => period.periodKey !== 0)
      .sort((a, b) => a.periodKey - b.periodKey);

    return sortedPeriods.map((period) => {
      switch (metricKey) {
        case 'averageRating':
          return Number(period.averageRating) || 0;
        case 'responseRate':
          return Number(period.responseRatePercent) || 0;
        case 'averageResponseTime':
          return Number(period.avgResponseTimeHours) || 0;
        case 'totalReviews':
          return Number(period.reviewCount) || 0;
        default:
          return 0;
      }
    });
  };

  // Generate categories from periodical metrics
  const generateCategories = (): string[] => {
    if (!periodicalMetrics || !Array.isArray(periodicalMetrics)) {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }

    const sortedPeriods = periodicalMetrics
      .filter((period) => period.periodKey !== 0)
      .sort((a, b) => a.periodKey - b.periodKey);

    return sortedPeriods.map((period) => {
      switch (period.periodKey) {
        case 1:
          return '24h';
        case 3:
          return '3d';
        case 7:
          return '7d';
        case 30:
          return '30d';
        case 180:
          return '6m';
        case 365:
          return '1y';
        default:
          return `${period.periodKey}d`;
      }
    });
  };

  const categories = generateCategories();

  // Get current period data based on periodKey
  const getCurrentPeriodData = (metricKey: string): number => {
    const currentPeriod = periodicalMetrics.find(
      (metric) => metric.periodKey.toString() === currentPeriodKey
    );

    if (!currentPeriod) return 0;

    switch (metricKey) {
      case 'averageRating':
        return Number(currentPeriod.averageRating) || 0;
      case 'responseRate':
        return currentPeriod.responseRatePercent;
      case 'averageResponseTime':
        return currentPeriod.avgResponseTimeHours;
      case 'totalReviews':
        return Number(currentPeriod.reviewCount) || 0;
      default:
        return 0;
    }
  };

  // Calculate percentage change between current selected period and previous period
  const calculatePercentageChange = (metricKey: string): number => {
    if (!periodicalMetrics || !Array.isArray(periodicalMetrics) || !currentPeriodKey) {
      return 0; // No change if insufficient data
    }

    // Sort periods by periodKey (excluding "All Time" which is 0)
    const sortedPeriods = periodicalMetrics
      .filter((period) => period.periodKey !== 0)
      .sort((a, b) => a.periodKey - b.periodKey);

    // Find current period
    const currentPeriod = periodicalMetrics.find(
      (period) => period.periodKey.toString() === currentPeriodKey.toString()
    );

    if (!currentPeriod) {
      return 0; // Current period not found
    }

    // Find the previous period (next shorter period)
    const currentPeriodIndex = sortedPeriods.findIndex(
      (period) => period.periodKey.toString() === currentPeriodKey.toString()
    );
    const previousPeriod = currentPeriodIndex > 0 ? sortedPeriods[currentPeriodIndex - 1] : null;

    if (!previousPeriod) {
      return 0; // No previous period to compare with
    }

    let currentValue, previousValue;

    switch (metricKey) {
      case 'averageRating':
        currentValue = Number(currentPeriod.averageRating) || 0;
        previousValue = Number(previousPeriod.averageRating) || 0;
        break;
      case 'responseRate':
        currentValue = Number(currentPeriod.responseRatePercent) || 0;
        previousValue = Number(previousPeriod.responseRatePercent) || 0;
        break;
      case 'averageResponseTime':
        currentValue = Number(currentPeriod.avgResponseTimeHours) || 0;
        previousValue = Number(previousPeriod.avgResponseTimeHours) || 0;
        break;
      case 'totalReviews':
        currentValue = Number(currentPeriod.reviewCount) || 0;
        previousValue = Number(previousPeriod.reviewCount) || 0;
        break;
      default:
        return 0;
    }

    // Calculate percentage change
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0; // 100% increase if previous was 0 and current > 0
    }

    const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
    return Math.round(percentageChange * 10) / 10; // Round to 1 decimal place
  };

  let averageResponseTime = getCurrentPeriodData('averageResponseTime');

  const metricCards = [
    {
      title: 'Average Rating',
      total: (Number(getCurrentPeriodData('averageRating')) || 0).toFixed(1),
      icon: <Iconify icon="solar:star-bold" width={24} />,
      color: 'warning',
      percent: calculatePercentageChange('averageRating'),
      chart: {
        series: generateChartDataFromPeriods('averageRating'),
        categories,
      },
    },
    {
      title: 'Response Rate',
      total: `${getCurrentPeriodData('responseRate')}%`,
      icon: <Iconify icon="solar:chat-round-dots-bold" width={24} />,
      color: 'info',
      percent: calculatePercentageChange('responseRate'),
      showProgress: true,
      progressValue: Number(getCurrentPeriodData('responseRate')) || 0,
      chart: {
        series: generateChartDataFromPeriods('responseRate'),
        categories,
      },
    },
    {
      title: 'Avg Response Time',
      total: averageResponseTime ? `${averageResponseTime} h` : 'N/A',
      icon: <Iconify icon="solar:clock-circle-bold" width={24} />,
      color: 'success',
      percent: calculatePercentageChange('averageResponseTime'),
      chart: {
        series: generateChartDataFromPeriods('averageResponseTime'),
        categories,
      },
    },
    {
      title: 'Total Reviews',
      total: Number(getCurrentPeriodData('totalReviews')) || 0,
      icon: <Iconify icon="solar:chart-2-bold" width={24} />,
      color: 'primary',
      percent: calculatePercentageChange('totalReviews'),
      chart: {
        series: generateChartDataFromPeriods('totalReviews'),
        categories,
      },
    },
  ];

  return (
    <Grid container spacing={3}>
      {metricCards.map((card) => (
        <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
          <TripAdvisorMetricsWidgetSummary
            title={card.title}
            total={card.total}
            icon={card.icon}
            color={card.color as 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'}
            // percent={card.percent}
            chart={card.chart}
            showProgress={card.showProgress}
            progressValue={card.progressValue}
            sx={{
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.shadows[8],
              },
            }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
