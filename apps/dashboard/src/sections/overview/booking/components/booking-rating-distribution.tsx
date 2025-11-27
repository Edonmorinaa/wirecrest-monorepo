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

type Props = {
  businessName?: string;
  ratingDistribution?: Record<string, number>;
  reviewCount?: number;
  sx?: SxProps<Theme>;
  [key: string]: any;
};

export function BookingRatingDistribution({ businessName, ratingDistribution, reviewCount, sx, ...other }: Props) {
  const theme = useTheme();

  // Generate rating distribution data for Booking.com (0-10 scale)
  // Group into ranges: 0-2, 2-4, 4-6, 6-8, 8-10
  const ratingDistributionData = useMemo(() => {
    if (!ratingDistribution || Object.keys(ratingDistribution).length === 0) {
      return [];
    }

    // Initialize ranges
    const ranges = {
      '0-2': 0,
      '2-4': 0,
      '4-6': 0,
      '6-8': 0,
      '8-10': 0,
    };

    // Aggregate ratings into ranges
    Object.entries(ratingDistribution).forEach(([rating, count]) => {
      const ratingNum = Number(rating);
      if (ratingNum >= 0 && ratingNum < 2) ranges['0-2'] += count;
      else if (ratingNum >= 2 && ratingNum < 4) ranges['2-4'] += count;
      else if (ratingNum >= 4 && ratingNum < 6) ranges['4-6'] += count;
      else if (ratingNum >= 6 && ratingNum < 8) ranges['6-8'] += count;
      else if (ratingNum >= 8 && ratingNum <= 10) ranges['8-10'] += count;
    });

    const hasData = Object.values(ranges).some((count) => count > 0);
    if (!hasData) return [];

    return [
      { range: '0-2', count: ranges['0-2'], label: '0-2' },
      { range: '2-4', count: ranges['2-4'], label: '2-4' },
      { range: '4-6', count: ranges['4-6'], label: '4-6' },
      { range: '6-8', count: ranges['6-8'], label: '6-8' },
      { range: '8-10', count: ranges['8-10'], label: '8-10' },
    ];
  }, [ratingDistribution]);

  const chartColors = [
    theme.palette.error.main,      // 0-2: Red
    theme.palette.warning.main,    // 2-4: Orange
    theme.palette.info.main,       // 4-6: Blue
    theme.palette.success.light,   // 6-8: Light Green
    theme.palette.success.main,    // 8-10: Green
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
        distributed: true,
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
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} reviews`,
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
      data: ratingDistributionData.map((item, index) => ({
        x: item.label,
        y: item.count,
        fillColor: chartColors[index],
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
              {businessName || 'Rating Distribution'}
            </Typography>
          </Stack>
        }
        subheader={`Total Reviews: ${reviewCount || 0} (Rating scale: 0-10)`}
      />

      <Chart
        type="bar"
        series={series}
        options={chartOptions}
        className=""
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
