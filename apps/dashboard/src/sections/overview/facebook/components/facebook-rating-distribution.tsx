'use client';

import { useMemo } from 'react';
import { FacebookPeriodicalMetric } from '@prisma/client';
import { FacebookProfileWithRelations } from '@/hooks/useFacebookProfile';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { Theme, SxProps, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

/**
 * Typed review structure based on Prisma FacebookReview model
 */
interface FacebookReview {
  isRecommended: boolean;
  [key: string]: unknown;
}

/**
 * Recommendation distribution data structure
 */
interface RecommendationDistributionData {
  type: 'recommended' | 'not_recommended';
  count: number;
  label: string;
}

type TProps = {
  businessProfile: FacebookProfileWithRelations;
  currentPeriodMetrics: FacebookPeriodicalMetric;
  sx?: SxProps<Theme>;
  other?: any;
};
export function FacebookRatingDistribution(props: TProps) {
  const { businessProfile, currentPeriodMetrics, sx, ...other } = props;
  const theme = useTheme();

  // Generate recommendation distribution data for Facebook
  const recommendationDistributionData = useMemo((): RecommendationDistributionData[] => {
    // Strategy 1: Use current period metrics (recommendedCount and notRecommendedCount)
    if (currentPeriodMetrics) {
      const recommended = currentPeriodMetrics.recommendedCount ?? 0;
      const notRecommended = currentPeriodMetrics.notRecommendedCount ?? 0;
      
      if (recommended > 0 || notRecommended > 0) {
        return [
          { type: 'recommended' as const, count: recommended, label: 'Recommended' },
          { type: 'not_recommended' as const, count: notRecommended, label: 'Not Recommended' },
        ];
      }
    }

    // Strategy 2: Use recommendation distribution from businessProfile
    if (businessProfile?.recommendationDistribution) {
      const distribution = businessProfile.recommendationDistribution;
      const recommended = distribution.recommended ?? 0;
      const notRecommended = distribution.notRecommended ?? 0;
      
      if (recommended > 0 || notRecommended > 0) {
        return [
          { type: 'recommended' as const, count: recommended, label: 'Recommended' },
          { type: 'not_recommended' as const, count: notRecommended, label: 'Not Recommended' },
        ];
      }
    }

    // Strategy 3: Calculate from reviews if available
    if (Array.isArray(businessProfile?.reviews) && businessProfile.reviews.length > 0) {
      let recommended = 0;
      let notRecommended = 0;

      businessProfile.reviews.forEach((review) => {
        // Type guard to check if review has isRecommended property
        const typedReview = review as FacebookReview;
        if (typedReview.isRecommended === true) {
          recommended++;
        } else if (typedReview.isRecommended === false) {
          notRecommended++;
        }
      });

      if (recommended > 0 || notRecommended > 0) {
        return [
          { type: 'recommended' as const, count: recommended, label: 'Recommended' },
          { type: 'not_recommended' as const, count: notRecommended, label: 'Not Recommended' },
        ];
      }
    }

    // Strategy 4: Use overview data to calculate distribution
    if (businessProfile?.overview) {
      const { totalReviews, recommendationRate, recommendedCount, notRecommendedCount } = businessProfile.overview;
      
      // Use direct counts if available
      if (recommendedCount !== undefined && notRecommendedCount !== undefined) {
        return [
          { type: 'recommended' as const, count: recommendedCount, label: 'Recommended' },
          { type: 'not_recommended' as const, count: notRecommendedCount, label: 'Not Recommended' },
        ];
      }
      
      // Calculate from rate if available
      if (totalReviews && recommendationRate !== undefined) {
        const recommended = Math.round((totalReviews * recommendationRate) / 100);
        const notRecommended = totalReviews - recommended;
        
        return [
          { type: 'recommended' as const, count: recommended, label: 'Recommended' },
          { type: 'not_recommended' as const, count: notRecommended, label: 'Not Recommended' },
        ];
      }
    }

    // Final fallback: Empty array (no data available)
    return [];
  }, [businessProfile, currentPeriodMetrics]);

  const chartColors = [
    theme.palette.success.main, // Recommended - Green
    theme.palette.error.main, // Not Recommended - Red
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
      categories: recommendationDistributionData.map((item) => item.label),
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
      data: recommendationDistributionData.map((item, index) => ({
        x: item.label,
        y: item.count,
        fillColor: chartColors[index], // Map type to color index
      })),
    },
  ];

  // Calculate total reviews from available data
  const totalReviews = 
    businessProfile?.overview?.totalReviews ??
    (recommendationDistributionData.reduce((sum, item) => sum + item.count, 0)) ??
    0;

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:thumb-up-bold" />
            <Typography variant="h6">Recommendation Distribution</Typography>
          </Stack>
        }
        subheader={`Total Reviews: ${totalReviews}`}
      />

      <Chart
        type="bar"
        series={series}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        className=""
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
