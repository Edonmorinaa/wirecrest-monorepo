'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import type { SxProps, Theme } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  metrics: any;
  sx?: SxProps<Theme>;
};

export function BookingSentimentAnalysis({ metrics, sx }: Props) {
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

  const chartColors = sentimentData.length > 0
    ? sentimentData.map((item) => item.color)
    : [theme.palette.primary.light, theme.palette.primary.main, theme.palette.primary.dark];

  const chartSeries = sentimentData.length > 0
    ? sentimentData.map((item) => item.value)
    : [];

  const chartLabels = sentimentData.length > 0
    ? sentimentData.map((item) => item.name)
    : [];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    labels: chartLabels,
    stroke: { width: 0 },
    dataLabels: {
      enabled: true,
      dropShadow: { enabled: false },
      formatter: (val: number) => `${val.toFixed(1)}%`,
      style: {
        fontSize: '14px',
        fontWeight: 600,
        textAlign: 'center',
      },
    },
    tooltip: {
      y: {
        formatter: (value: number, { seriesIndex }: any) => {
          const item = sentimentData[seriesIndex];
          if (item) {
            return `${item.value} reviews (${item.percentage}%)`;
          }
          return fNumber(value);
        },
        title: { formatter: (seriesName: string) => `${seriesName}` },
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
  });

  const totalReviews = sentimentData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card sx={sx}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:pie-chart-2-bold" />
            <Typography variant="h6">Sentiment Analysis</Typography>
          </Stack>
        }
        subheader="Showing sentiment distribution of reviews"
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
            className=""
            slotProps={{}}
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
