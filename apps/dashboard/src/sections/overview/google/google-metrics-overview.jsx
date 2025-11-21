'use client';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

// Custom MetricsWidgetSummary with progress bar support
export function GoogleMetricsWidgetSummary({
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
}) {
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
          color: `${color}.darker`,
          backgroundColor: 'common.white',
          backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ width: 48, height: 48, mb: 3 }}>{icon}</Box>

      {/* {renderTrending()} */}

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

// Loading Skeleton for Metric Card
function MetricCardSkeleton({ color = 'primary' }) {
  const theme = useTheme();
  
  return (
    <Card
      sx={{
        p: 2,
        boxShadow: 'none',
        position: 'relative',
        color: `${color}.darker`,
        backgroundColor: 'common.white',
        backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
      }}
    >
      {/* Icon skeleton with matching color */}
      <Box sx={{ width: 48, height: 48, mb: 3 }}>
        <Skeleton 
          variant="circular" 
          width={48} 
          height={48}
          sx={{ bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.2) }}
        />
      </Box>

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
        <Skeleton 
          variant="rectangular" 
          width={84} 
          height={76}
          sx={{ 
            bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.15),
            borderRadius: 1,
          }}
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
          <Box sx={{ mb: 1 }}>
            <Skeleton 
              variant="text" 
              width="70%" 
              height={24}
              sx={{ bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.15) }}
            />
          </Box>

          <Box sx={{ mb: 0.5 }}>
            <Skeleton 
              variant="text" 
              width="50%" 
              height={40}
              sx={{ bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.2) }}
            />
          </Box>

          <Box>
            <Skeleton 
              variant="text" 
              width="60%" 
              height={18}
              sx={{ bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.12) }}
            />
          </Box>
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

export function GoogleMetricsOverview({ metrics, periodicalMetrics, currentPeriodKey, isLoading = false }) {
  const theme = useTheme();

  // Show loading skeletons
  if (isLoading) {
    const skeletonColors = ['warning', 'info', 'success', 'primary'];
    return (
      <Grid container spacing={3}>
        {skeletonColors.map((color, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCardSkeleton color={color} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!metrics) return null;

  // Generate chart data from periodical metrics
  const generateChartDataFromPeriods = (metricKey) => {
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
          return Number(period.avgRating) || 0;
        case 'responseRate':
          return Number(period.responseRatePercent) || 0;
        case 'averageResponseTime':
          return Number(period.avgResponseTimeHours ?? 0) || 0;
        case 'totalReviews':
          return Number(period.reviewCount) || 0;
        default:
          return 0;
      }
    });
  };

  // Generate categories from periodical metrics
  const generateCategories = () => {
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

  // Get current period data from metrics prop or periodicalMetrics
  const getCurrentPeriodData = (metricKey) => {
    // If periodicalMetrics is empty or not available, use metrics directly
    if (!periodicalMetrics || periodicalMetrics.length === 0) {
      switch (metricKey) {
        case 'averageRating':
          return Number(metrics?.averageRating) || 0;
        case 'responseRate':
          return Number(metrics?.responseRate) || 0;
        case 'averageResponseTime':
          return Number(metrics?.averageResponseTimeHours) || 0;
        case 'totalReviews':
          return Number(metrics?.totalReviews) || 0;
        default:
          return 0;
      }
    }

    // Otherwise, use periodicalMetrics
    const currentPeriod = periodicalMetrics.find(
      (metric) => metric.periodKey.toString() === currentPeriodKey
    );

    if (!currentPeriod) {
      return 0;
    }

    switch (metricKey) {
      case 'averageRating':
        return Number(currentPeriod.avgRating) || 0;
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
  const calculatePercentageChange = (metricKey) => {
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
        currentValue = Number(currentPeriod.avgRating) || 0;
        previousValue = Number(previousPeriod.avgRating) || 0;
        break;
      case 'responseRate':
        currentValue = Number(currentPeriod.responseRatePercent) || 0;
        previousValue = Number(previousPeriod.responseRatePercent) || 0;
        break;
      case 'averageResponseTime':
        currentValue = Number(currentPeriod.avgResponseTimeHours ?? 0) || 0;
        previousValue = Number(previousPeriod.avgResponseTimeHours ?? 0) || 0;
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

  const averageResponseTime = getCurrentPeriodData('averageResponseTime');
  const averageRating = getCurrentPeriodData('averageRating');
  const responseRate = getCurrentPeriodData('responseRate');
  const totalReviews = getCurrentPeriodData('totalReviews');

  const metricCards = [
    {
      title: 'Average Rating',
      total: (Number(averageRating) || 0).toFixed(1),
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
      total: `${Number(responseRate).toFixed(1)}%`,
      icon: <Iconify icon="solar:chat-round-dots-bold" width={24} />,
      color: 'info',
      percent: calculatePercentageChange('responseRate'),
      showProgress: true,
      progressValue: Number(responseRate) || 0,
      chart: {
        series: generateChartDataFromPeriods('responseRate'),
        categories,
      },
    },
    {
      title: 'Avg Response Time',
      total: averageResponseTime ? `${Number(averageResponseTime).toFixed(1)}h` : '0h',
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
      total: Number(totalReviews) || 0,
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
          <GoogleMetricsWidgetSummary
            title={card.title}
            total={card.total}
            icon={card.icon}
            color={card.color}
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
