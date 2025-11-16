'use client';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

// Custom MetricsWidgetSummary with progress bar support
function FacebookMetricsWidgetSummary({
  sx,
  icon,
  title,
  total,
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
    xaxis: { categories: chart.categories },
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
    ...chart.options,
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
            <Chart
          type="line"
          series={[{ data: chart.series }]}
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

export function FacebookMetricsOverview({ metrics, periodicalMetrics, currentPeriodKey }) {
  const theme = useTheme();

  if (!metrics) return null;

  // Generate chart data from periodical metrics
  const generateChartDataFromPeriods = (metricKey) => {
    if (!periodicalMetrics || !Array.isArray(periodicalMetrics)) {
      return []; // Return empty array if no data
    }

    // Sort periods by periodKey (excluding "All Time" which is 0)
    const sortedPeriods = periodicalMetrics
      .filter(period => period.periodKey !== 0)
      .sort((a, b) => a.periodKey - b.periodKey);

    return sortedPeriods.map(period => {
      switch (metricKey) {
        case 'recommendationRate':
          return Number(period.recommendationRate) || 0;
        case 'totalLikes':
          return Number(period.totalLikes) || 0;
        case 'totalComments':
          return Number(period.totalComments) || 0;
        case 'totalPhotos':
          return Number(period.totalPhotos) || 0;
        case 'totalReviews':
          return Number(period.reviewCount) || 0;
        case 'responseRate':
          return Number(period.responseRatePercent) || 0;
        case 'averageResponseTime':
          return Number(period.avgResponseTimeHours) || 0;
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
      .filter(period => period.periodKey !== 0)
      .sort((a, b) => a.periodKey - b.periodKey);

    return sortedPeriods.map(period => {
      switch (period.periodKey) {
        case 1: return '24h';
        case 3: return '3d';
        case 7: return '7d';
        case 30: return '30d';
        case 180: return '6m';
        case 365: return '1y';
        default: return `${period.periodKey}d`;
      }
    });
  };

  const categories = generateCategories();

  // Get current period data based on periodKey
  const getCurrentPeriodData = (metricKey) => {
    const currentPeriod = periodicalMetrics.find(metric => metric.periodKey.toString() === currentPeriodKey);

    switch (metricKey) {
      case 'recommendationRate':
        return currentPeriod?.recommendationRate || 0;
      case 'totalLikes':
        return currentPeriod?.totalLikes || 0;
      case 'totalComments':
        return currentPeriod?.totalComments || 0;
      case 'totalPhotos':
        return currentPeriod?.totalPhotos || 0;
      case 'totalReviews':
        return Number(currentPeriod?.reviewCount) || 0;
      case 'responseRate':
        return currentPeriod?.responseRatePercent || 0;
      case 'averageResponseTime':
        return currentPeriod?.avgResponseTimeHours || 0;
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
      .filter(period => period.periodKey !== 0)
      .sort((a, b) => a.periodKey - b.periodKey);

    // Find current period
    const currentPeriod = periodicalMetrics.find(period => period.periodKey.toString() === currentPeriodKey.toString());
    
    if (!currentPeriod) {
      return 0; // Current period not found
    }

    // Find the previous period (next shorter period)
    const currentPeriodIndex = sortedPeriods.findIndex(period => period.periodKey.toString() === currentPeriodKey.toString());
    const previousPeriod = currentPeriodIndex > 0 ? sortedPeriods[currentPeriodIndex - 1] : null;

    if (!previousPeriod) {
      return 0; // No previous period to compare with
    }

    let currentValue, previousValue;

    switch (metricKey) {
      case 'recommendationRate':
        currentValue = Number(currentPeriod.recommendationRate) || 0;
        previousValue = Number(previousPeriod.recommendationRate) || 0;
        break;
      case 'totalLikes':
        currentValue = Number(currentPeriod.totalLikes) || 0;
        previousValue = Number(previousPeriod.totalLikes) || 0;
        break;
      case 'totalComments':
        currentValue = Number(currentPeriod.totalComments) || 0;
        previousValue = Number(previousPeriod.totalComments) || 0;
        break;
      case 'totalPhotos':
        currentValue = Number(currentPeriod.totalPhotos) || 0;
        previousValue = Number(previousPeriod.totalPhotos) || 0;
        break;
      case 'totalReviews':
        currentValue = Number(currentPeriod.reviewCount) || 0;
        previousValue = Number(previousPeriod.reviewCount) || 0;
        break;
      case 'responseRate':
        currentValue = Number(currentPeriod.responseRatePercent) || 0;
        previousValue = Number(previousPeriod.responseRatePercent) || 0;
        break;
      case 'averageResponseTime':
        currentValue = Number(currentPeriod.avgResponseTimeHours) || 0;
        previousValue = Number(previousPeriod.avgResponseTimeHours) || 0;
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

  // let averageResponseTime = getCurrentPeriodData('averageResponseTime');

  const metricCards = [
    {
      title: 'Recommendation Rate',
      total: `${getCurrentPeriodData('recommendationRate')}%`,
      icon: <Iconify icon="solar:thumb-up-bold" width={24} />,
      color: 'success',
      percent: calculatePercentageChange('recommendationRate'),
      showProgress: true,
      progressValue: Number(getCurrentPeriodData('recommendationRate')) || 0,
      chart: {
        series: generateChartDataFromPeriods('recommendationRate'),
        categories,
      },
    },
    {
      title: 'Total Engagement',
      total: (Number(getCurrentPeriodData('totalLikes')) + Number(getCurrentPeriodData('totalComments'))).toLocaleString(),
      icon: <Iconify icon="solar:heart-bold" width={24} />,
      color: 'error',
      percent: calculatePercentageChange('totalLikes'),
      chart: {
        series: generateChartDataFromPeriods('totalLikes'),
        categories,
      },
    },
    {
      title: 'Total Photos',
      total: Number(getCurrentPeriodData('totalPhotos')) || 0,
      icon: <Iconify icon="solar:camera-bold" width={24} />,
      color: 'warning',
      percent: calculatePercentageChange('totalPhotos'),
      chart: {
        series: generateChartDataFromPeriods('totalPhotos'),
        categories,
      },
    },
    {
      title: 'Total Reviews',
      total: Number(getCurrentPeriodData('totalReviews')) || 0,
      icon: <Iconify icon="solar:chat-round-dots-bold" width={24} />,
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
          <FacebookMetricsWidgetSummary
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
