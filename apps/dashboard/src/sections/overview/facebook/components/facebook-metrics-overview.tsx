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
          slotProps={{}}
          className=""
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
        className=""
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

  // Simple trend data (last 7 data points for sparkline)
  const generateSimpleChartData = (value) => {
    // Generate simple trend data around the current value
    const variation = value * 0.1; // 10% variation
    return Array.from({ length: 7 }, (_, i) => {
      const randomVariation = (Math.random() - 0.5) * variation;
      return Math.max(0, value + randomVariation);
    });
  };

  const categories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const metricCards = [
    {
      title: 'Recommendation Rate',
      total: `${(metrics.recommendationRate || 0).toFixed(1)}%`,
      icon: <Iconify icon="solar:thumb-up-bold" width={24} />,
      color: 'success',
      percent: 0,
      showProgress: true,
      progressValue: Math.min(100, Math.max(0, Number(metrics.recommendationRate) || 0)), // Cap at 100
      chart: {
        series: generateSimpleChartData(metrics.recommendationRate || 0),
        categories,
      },
    },
    {
      title: 'Total Engagement',
      total: ((metrics.totalLikes || 0) + (metrics.totalComments || 0)).toLocaleString(),
      icon: <Iconify icon="solar:heart-bold" width={24} />,
      color: 'error',
      percent: 0,
      chart: {
        series: generateSimpleChartData((metrics.totalLikes || 0) + (metrics.totalComments || 0)),
        categories,
      },
    },
    {
      title: 'Total Photos',
      total: (metrics.totalPhotos || 0).toLocaleString(),
      icon: <Iconify icon="solar:camera-bold" width={24} />,
      color: 'warning',
      percent: 0,
      chart: {
        series: generateSimpleChartData(metrics.totalPhotos || 0),
        categories,
      },
    },
    {
      title: 'Total Reviews',
      total: (metrics.totalReviews || 0).toLocaleString(),
      icon: <Iconify icon="solar:chat-round-dots-bold" width={24} />,
      color: 'primary',
      percent: 0,
      chart: {
        series: generateSimpleChartData(metrics.totalReviews || 0),
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
            percent={card.percent}
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
