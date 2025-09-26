'use client';

import { useMemo } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export function TripAdvisorRatingDistribution({
  businessProfile,
  currentPeriodMetrics,
  sx,
  ...other
}) {
  const theme = useTheme();

  // Generate rating distribution data
  const ratingDistributionData = useMemo(() => {
    // First, try to get data from current period metrics
    if (currentPeriodMetrics) {
      const oneStarCount = currentPeriodMetrics.oneStarCount || 0;
      const twoStarCount = currentPeriodMetrics.twoStarCount || 0;
      const threeStarCount = currentPeriodMetrics.threeStarCount || 0;
      const fourStarCount = currentPeriodMetrics.fourStarCount || 0;
      const fiveStarCount = currentPeriodMetrics.fiveStarCount || 0;

      const hasData =
        oneStarCount + twoStarCount + threeStarCount + fourStarCount + fiveStarCount > 0;

      if (hasData) {
        return [
          { rating: '1', count: oneStarCount, label: '1 Star' },
          { rating: '2', count: twoStarCount, label: '2 Stars' },
          { rating: '3', count: threeStarCount, label: '3 Stars' },
          { rating: '4', count: fourStarCount, label: '4 Stars' },
          { rating: '5', count: fiveStarCount, label: '5 Stars' },
        ];
      }
    }

    // Fallback: Use overview data
    if (businessProfile?.overview) {
      const oneStarCount = businessProfile.overview.oneStarCount || 0;
      const twoStarCount = businessProfile.overview.twoStarCount || 0;
      const threeStarCount = businessProfile.overview.threeStarCount || 0;
      const fourStarCount = businessProfile.overview.fourStarCount || 0;
      const fiveStarCount = businessProfile.overview.fiveStarCount || 0;

      const hasData =
        oneStarCount + twoStarCount + threeStarCount + fourStarCount + fiveStarCount > 0;

      if (hasData) {
        return [
          { rating: '1', count: oneStarCount, label: '1 Star' },
          { rating: '2', count: twoStarCount, label: '2 Stars' },
          { rating: '3', count: threeStarCount, label: '3 Stars' },
          { rating: '4', count: fourStarCount, label: '4 Stars' },
          { rating: '5', count: fiveStarCount, label: '5 Stars' },
        ];
      }
    }

    // Final fallback: Empty array
    return [];
  }, [businessProfile, currentPeriodMetrics]);

  const chartColors = [
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.primary.main,
  ];

  const chartOptions = useChart({
    colors: chartColors,
    stroke: { width: 5 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
        endingShape: 'rounded',
        distributed: true, // This enables individual colors for each bar
      },
    },
    xaxis: {
      categories: ratingDistributionData.map((item) => item.label),
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
      },
    },
    yaxis: {
      title: {
        text: 'Number of Reviews',
        style: {
          color: theme.palette.text.secondary,
        },
      },
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
      },
    },
    legend: { show: false }, // Hide legend since colors are distributed
    tooltip: {
      y: {
        formatter: (value) => `${value} reviews`,
        title: {
          formatter: () => 'Reviews',
        },
      },
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 3,
    },
  });

  const series = [
    {
      name: 'Reviews',
      data: ratingDistributionData.map((item) => ({
        x: item.label,
        y: item.count,
        fillColor: chartColors[parseInt(item.rating) - 1], // Map rating to color index
      })),
    },
  ];

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:star-bold" />
            <Typography variant="h6">
              {businessProfile?.name || 'TripAdvisor Rating Distribution'}
            </Typography>
          </Stack>
        }
        subheader={`Total Reviews: ${currentPeriodMetrics?.reviewCount || businessProfile?.overview?.totalReviews || 0}`}
      />

      <Chart
        type="bar"
        series={series}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: 364,
        }}
      />
    </Card>
  );
}
