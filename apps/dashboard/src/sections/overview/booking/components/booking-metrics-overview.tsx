'use client';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

// Custom MetricsWidgetSummary with progress bar support
function BookingMetricsWidgetSummary({
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
}: any) {
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
      y: { formatter: (value: number) => fNumber(value), title: { formatter: () => '' } },
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
          className=""
          slotProps={{}}
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

// Loading Skeleton for Metric Card
function MetricCardSkeleton({ color = 'primary' }: { color?: string }) {
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
      {/* Icon skeleton */}
      <Box sx={{ width: 48, height: 48, mb: 3 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.2),
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
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
        <Box
          sx={{
            width: 84,
            height: 76,
            bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.15),
            borderRadius: 1,
            animation: 'pulse 1.5s ease-in-out infinite',
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
            <Box
              sx={{
                width: '70%',
                height: 24,
                bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.15),
                borderRadius: 1,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </Box>

          <Box sx={{ mb: 0.5 }}>
            <Box
              sx={{
                width: '50%',
                height: 40,
                bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.2),
                borderRadius: 1,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </Box>

          <Box sx={{ width: '60%' }}>
            <Box
              sx={{
                width: '100%',
                height: 18,
                bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.12),
                borderRadius: 1,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </Box>
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

type Props = {
  metrics: any;
  currentPeriodKey: string;
  isLoading?: boolean;
};

export function BookingMetricsOverview({ metrics, currentPeriodKey, isLoading = false }: Props) {
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

  if (!metrics) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No metrics data available for this period
        </Typography>
      </Box>
    );
  }

  // Simple trend data generation
  const generateSimpleChartData = (value: number) => {
    const variation = value * 0.1;
    return Array.from({ length: 7 }, () => {
      const randomVariation = (Math.random() - 0.5) * variation;
      return Math.max(0, value + randomVariation);
    });
  };

  const categories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Convert 0-10 rating to percentage for progress bar
  const ratingPercentage = ((metrics.averageRating || 0) / 10) * 100;

  const metricCards = [
    {
      title: 'Average Rating',
      total: `${(metrics.averageRating || 0).toFixed(1)} / 10`,
      subtitle: 'Rating scale: 0-10',
      icon: <Iconify icon="solar:star-bold" width={24} />,
      color: 'warning',
      percent: 0,
      showProgress: true,
      progressValue: ratingPercentage,
      chart: {
        series: generateSimpleChartData(metrics.averageRating || 0),
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
    {
      title: 'Response Rate',
      total: `${(metrics.responseRate || 0).toFixed(1)}%`,
      icon: <Iconify icon="solar:reply-bold" width={24} />,
      color: 'info',
      percent: 0,
      showProgress: true,
      progressValue: metrics.responseRate || 0,
      chart: {
        series: generateSimpleChartData(metrics.responseRate || 0),
        categories,
      },
    },
    {
      title: 'Verified Stays',
      total: (metrics.verifiedStays || 0).toLocaleString(),
      icon: <Iconify icon="solar:shield-check-bold" width={24} />,
      color: 'success',
      percent: 0,
      chart: {
        series: generateSimpleChartData(metrics.verifiedStays || 0),
        categories,
      },
    },
  ];

  return (
    <Grid container spacing={3}>
      {metricCards.map((card) => (
        <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
          <BookingMetricsWidgetSummary
            title={card.title}
            total={card.total}
            subtitle={card.subtitle}
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
