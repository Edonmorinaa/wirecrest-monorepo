'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

export function BookingSentimentAnalysis({ title, subheader, chart, metrics, sx, ...other }) {
  const theme = useTheme();

  // Process sentiment data from metrics prop
  const sentimentData = useMemo(() => {
    if (!metrics?.sentimentAnalysis) return [];

    const { positive, neutral, negative } = metrics.sentimentAnalysis;
    const total = positive + neutral + negative;

    if (total === 0) return [];

    return [
      {
        name: 'Positive',
        value: positive,
        percentage: Math.round((positive / total) * 100),
        color: theme.palette.success.main,
      },
      {
        name: 'Neutral',
        value: neutral,
        percentage: Math.round((neutral / total) * 100),
        color: theme.palette.info.main,
      },
      {
        name: 'Negative',
        value: negative,
        percentage: Math.round((negative / total) * 100),
        color: theme.palette.error.main,
      },
    ];
  }, [metrics?.sentimentAnalysis, theme.palette]);

  // Use sentiment data if available, otherwise fall back to chart prop
  const chartColors =
    sentimentData.length > 0
      ? sentimentData.map((item) => item.color)
      : (chart?.colors ?? [
          theme.palette.primary.lighter,
          theme.palette.primary.light,
          theme.palette.primary.dark,
          theme.palette.primary.darker,
        ]);

  const chartSeries =
    sentimentData.length > 0
      ? sentimentData.map((item) => item.value)
      : (chart?.series?.map((item) => item.value) ?? []);

  const chartLabels =
    sentimentData.length > 0
      ? sentimentData.map((item) => item.name)
      : (chart?.series?.map((item) => item.label) ?? []);

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    labels: chartLabels,
    stroke: { width: 0 },
    dataLabels: {
      enabled: true,
      dropShadow: { enabled: false },
      formatter: (val, opts) => `${val.toFixed(1)}%`,
      style: {
        fontSize: '14px',
        fontWeight: 600,
        textAlign: 'center',
      },
    },

    tooltip: {
      y: {
        formatter: (value, { seriesIndex }) => {
          const item = sentimentData[seriesIndex];
          if (item) {
            return `${item.value} reviews (${item.percentage}%)`;
          }
          return fNumber(value);
        },
        title: { formatter: (seriesName) => `${seriesName}` },
      },
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: false,
          },
        },
      },
    },
    ...chart?.options,
  });

  // Use default title and subheader if not provided
  const displayTitle = title || 'Sentiment Analysis';
  const displaySubheader = subheader || 'Showing sentiment distribution of reviews';

  // Calculate total reviews
  const totalReviews = sentimentData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:pie-chart-2-bold" />
            <Typography variant="h6">{displayTitle}</Typography>
          </Stack>
        }
        subheader={displaySubheader}
        action={
          totalReviews > 0 && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h4" color="primary.main">
                {fNumber(totalReviews)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Reviews
              </Typography>
            </Box>
          )
        }
      />

      {sentimentData.length > 0 ? (
        <>
          <Chart
            type="pie"
            series={chartSeries}
            options={chartOptions}
            sx={{
              my: 6,
              mx: 'auto',
              width: { xs: 240, xl: 260 },
              height: { xs: 240, xl: 260 },
            }}
          />

          <Divider sx={{ borderStyle: 'dashed' }} />

          <ChartLegends
            labels={chartOptions?.labels}
            colors={chartOptions?.colors}
            sx={{ p: 3, justifyContent: 'center' }}
          />
        </>
      ) : (
        <Box
          sx={{
            height: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: 'text.secondary',
            p: 3,
          }}
        >
          <Iconify icon="solar:pie-chart-2-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="body2">No sentiment data available</Typography>
        </Box>
      )}
    </Card>
  );
}
