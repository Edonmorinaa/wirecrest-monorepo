'use client';

import { useMemo } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import type { SxProps, Theme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type TProps = {
  businessName?: string;
  reviewCount?: number;
  oneStarCount?: number;
  twoStarCount?: number;
  threeStarCount?: number;
  fourStarCount?: number;
  fiveStarCount?: number;
  sx?: SxProps<Theme>;
  [key: string]: any;
};

export function TripAdvisorRatingDistribution(props: TProps) {
  const {
    businessName,
    reviewCount = 0,
    oneStarCount = 0,
    twoStarCount = 0,
    threeStarCount = 0,
    fourStarCount = 0,
    fiveStarCount = 0,
    sx,
    ...other
  } = props;
  
  const theme = useTheme();

  // Generate rating distribution data
  const ratingDistributionData = useMemo(() => {
    const hasData =
      oneStarCount + twoStarCount + threeStarCount + fourStarCount + fiveStarCount > 0;

    if (!hasData) return [];

    return [
      { rating: '1', count: oneStarCount, label: '1 Star' },
      { rating: '2', count: twoStarCount, label: '2 Stars' },
      { rating: '3', count: threeStarCount, label: '3 Stars' },
      { rating: '4', count: fourStarCount, label: '4 Stars' },
      { rating: '5', count: fiveStarCount, label: '5 Stars' },
    ];
  }, [oneStarCount, twoStarCount, threeStarCount, fourStarCount, fiveStarCount]);

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
              {businessName || 'TripAdvisor Rating Distribution'}
            </Typography>
          </Stack>
        }
        subheader={`Total Reviews: ${reviewCount}`}
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
