'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { TripAdvisorTripTypes } from '../tripadvisor-trip-types';
import { TripAdvisorSubRatings } from '../tripadvisor-sub-ratings';
import { TripAdvisorTopKeywords } from '../tripadvisor-top-keywords';
import { TripAdvisorBusinessInfo } from '../tripadvisor-business-info';
import { TripAdvisorMetricsCards } from '../tripadvisor-metrics-cards';
import { TripAdvisorRecentReviews } from '../tripadvisor-recent-reviews';
import { useTripAdvisorOverview } from '../hooks/use-tripadvisor-overview';
import { TripAdvisorTimePeriodTabs } from '../tripadvisor-time-period-tabs';
import { TripAdvisorBusinessProfile } from '../tripadvisor-business-profile';
import { TripAdvisorSentimentAnalysis } from '../tripadvisor-sentiment-analysis';
import { TripAdvisorRatingDistribution } from '../tripadvisor-rating-distribution';

// ----------------------------------------------------------------------

const TIME_PERIODS = [
  { key: '1', label: 'Last 24 Hours', shortLabel: '24h' },
  { key: '3', label: 'Last 3 Days', shortLabel: '3d' },
  { key: '7', label: 'Last 7 Days', shortLabel: '7d' },
  { key: '30', label: 'Last 30 Days', shortLabel: '30d' },
  { key: '180', label: 'Last 6 Months', shortLabel: '6m' },
  { key: '365', label: 'Last Year', shortLabel: '1y' },
  { key: '0', label: 'All Time', shortLabel: 'All' },
];

export function TripAdvisorOverviewView() {
  const theme = useTheme();
  const params = useParams();
  const teamSlug = params?.slug;

  const [selectedPeriod, setSelectedPeriod] = useState('30');

  const {
    businessProfile,
    overview,
    sentimentAnalysis,
    topKeywords,
    topTags,
    recentReviews,
    ratingDistribution,
    periodicalMetrics,
    isLoading,
    isError,
  } = useTripAdvisorOverview(teamSlug);

  // Filter time periods to only show those with review data
  const availableTimePeriods = useMemo(() => {
    if (!periodicalMetrics || periodicalMetrics.length === 0) {
      return TIME_PERIODS.filter((period) => period.key === '0'); // Only show "All Time" if no metrics
    }

    return TIME_PERIODS.filter((period) => {
      const metric = periodicalMetrics.find((m) => m.periodKey.toString() === period.key);
      // Always include "All Time" period, and include others only if they have reviews
      return period.key === '0' || (metric && metric.reviewCount > 0);
    });
  }, [periodicalMetrics]);

  // Auto-select first available period if current selection is not available
  useEffect(() => {
    if (availableTimePeriods.length > 0) {
      const isCurrentPeriodAvailable = availableTimePeriods.some(
        (p) => p.key === selectedPeriod
      );
      if (!isCurrentPeriodAvailable) {
        setSelectedPeriod(availableTimePeriods[0].key);
      }
    }
  }, [availableTimePeriods, selectedPeriod]);

  // Get periodic metrics for selected period
  const currentPeriodMetrics = useMemo(() => {
    const metrics = periodicalMetrics?.find(
      (metric) => metric.periodKey.toString() === selectedPeriod
    );

    return metrics;
  }, [periodicalMetrics, selectedPeriod]);

  // Use current period data if available, fallback to overview data
  const displayMetrics = {
    averageRating: currentPeriodMetrics?.averageRating || overview?.averageRating || 0,
    totalReviews: currentPeriodMetrics?.reviewCount || overview?.totalReviews || 0,
    responseRate: currentPeriodMetrics?.responseRatePercent || 0,
    averageResponseTime: currentPeriodMetrics?.avgResponseTimeHours 
      ? `${currentPeriodMetrics.avgResponseTimeHours.toFixed(1)}h`
      : 'Not available',
    sentimentAnalysis: currentPeriodMetrics ? {
      positive: currentPeriodMetrics.sentimentPositive || 0,
      neutral: currentPeriodMetrics.sentimentNeutral || 0,
      negative: currentPeriodMetrics.sentimentNegative || 0,
    } : sentimentAnalysis,
    topKeywords: currentPeriodMetrics?.topKeywords || topKeywords || [],
    helpfulVotes: currentPeriodMetrics?.totalHelpfulVotes || 0,
    averageHelpfulVotes: currentPeriodMetrics?.averageHelpfulVotes || 0,
    reviewsWithPhotos: currentPeriodMetrics?.reviewsWithPhotos || 0,
    // Sub-ratings
    averageServiceRating: currentPeriodMetrics?.averageServiceRating || overview?.averageServiceRating,
    averageFoodRating: currentPeriodMetrics?.averageFoodRating || overview?.averageFoodRating,
    averageValueRating: currentPeriodMetrics?.averageValueRating || overview?.averageValueRating,
    averageAtmosphereRating: currentPeriodMetrics?.averageAtmosphereRating || overview?.averageAtmosphereRating,
    averageCleanlinessRating: currentPeriodMetrics?.averageCleanlinessRating || overview?.averageCleanlinessRating,
    averageLocationRating: currentPeriodMetrics?.averageLocationRating || overview?.averageLocationRating,
    averageRoomsRating: overview?.averageRoomsRating,
    averageSleepQualityRating: overview?.averageSleepQualityRating,
    // Trip types
    familyReviews: currentPeriodMetrics?.familyReviews || overview?.familyReviews || 0,
    couplesReviews: currentPeriodMetrics?.couplesReviews || overview?.couplesReviews || 0,
    soloReviews: currentPeriodMetrics?.soloReviews || overview?.soloReviews || 0,
    businessReviews: currentPeriodMetrics?.businessReviews || overview?.businessReviews || 0,
    friendsReviews: currentPeriodMetrics?.friendsReviews || overview?.friendsReviews || 0,
  };

  // Generate rating distribution data
  const ratingDistributionData = useMemo(() => {
    if (!overview && !currentPeriodMetrics) return [];

    const oneStarCount = currentPeriodMetrics?.oneStarCount || overview?.oneStarCount || 0;
    const twoStarCount = currentPeriodMetrics?.twoStarCount || overview?.twoStarCount || 0;
    const threeStarCount = currentPeriodMetrics?.threeStarCount || overview?.threeStarCount || 0;
    const fourStarCount = currentPeriodMetrics?.fourStarCount || overview?.fourStarCount || 0;
    const fiveStarCount = currentPeriodMetrics?.fiveStarCount || overview?.fiveStarCount || 0;

    const hasData = oneStarCount + twoStarCount + threeStarCount + fourStarCount + fiveStarCount > 0;
    
    if (!hasData) return [];

    return [
      { rating: '1', count: oneStarCount, label: '1 Star', fill: '#ef4444' },
      { rating: '2', count: twoStarCount, label: '2 Stars', fill: '#f97316' },
      { rating: '3', count: threeStarCount, label: '3 Stars', fill: '#f59e0b' },
      { rating: '4', count: fourStarCount, label: '4 Stars', fill: '#10b981' },
      { rating: '5', count: fiveStarCount, label: '5 Stars', fill: '#059669' },
    ];
  }, [overview, currentPeriodMetrics]);

  // Generate sentiment data for pie chart
  const sentimentData = useMemo(() => {
    const sentiment = displayMetrics.sentimentAnalysis;
    if (!sentiment) return [];

    // Handle different sentiment data structures
    const positive = sentiment?.positive || sentiment?.positiveCount || 0;
    const neutral = sentiment?.neutral || sentiment?.neutralCount || 0;
    const negative = sentiment?.negative || sentiment?.negativeCount || 0;

    const total = positive + neutral + negative;
    if (total === 0) return [];

    return [
      {
        name: 'Positive',
        value: positive,
        fill: '#10b981',
        percentage: ((positive / total) * 100).toFixed(1)
      },
      {
        name: 'Neutral',
        value: neutral,
        fill: '#6b7280',
        percentage: ((neutral / total) * 100).toFixed(1)
      },
      {
        name: 'Negative',
        value: negative,
        fill: '#ef4444',
        percentage: ((negative / total) * 100).toFixed(1)
      }
    ];
  }, [displayMetrics.sentimentAnalysis]);

  // Generate trip type data
  const tripTypeData = useMemo(() => {
    const family = displayMetrics.familyReviews;
    const couples = displayMetrics.couplesReviews;
    const solo = displayMetrics.soloReviews;
    const business = displayMetrics.businessReviews;
    const friends = displayMetrics.friendsReviews;
    const total = family + couples + solo + business + friends;

    return { family, couples, solo, business, friends, total };
  }, [displayMetrics]);

  // Generate sub-ratings data for chart
  const subRatingsData = useMemo(() => {
    const data = [];
    
    if (displayMetrics.averageServiceRating) {
      data.push({ category: 'Service', rating: displayMetrics.averageServiceRating, fill: '#10b981' });
    }
    if (displayMetrics.averageFoodRating) {
      data.push({ category: 'Food', rating: displayMetrics.averageFoodRating, fill: '#f59e0b' });
    }
    if (displayMetrics.averageValueRating) {
      data.push({ category: 'Value', rating: displayMetrics.averageValueRating, fill: '#3b82f6' });
    }
    if (displayMetrics.averageAtmosphereRating) {
      data.push({ category: 'Atmosphere', rating: displayMetrics.averageAtmosphereRating, fill: '#8b5cf6' });
    }
    if (displayMetrics.averageCleanlinessRating) {
      data.push({ category: 'Cleanliness', rating: displayMetrics.averageCleanlinessRating, fill: '#06b6d4' });
    }
    if (displayMetrics.averageLocationRating) {
      data.push({ category: 'Location', rating: displayMetrics.averageLocationRating, fill: '#ef4444' });
    }
    if (displayMetrics.averageRoomsRating) {
      data.push({ category: 'Rooms', rating: displayMetrics.averageRoomsRating, fill: '#f97316' });
    }
    if (displayMetrics.averageSleepQualityRating) {
      data.push({ category: 'Sleep Quality', rating: displayMetrics.averageSleepQualityRating, fill: '#84cc16' });
    }

    return data;
  }, [displayMetrics]);

  if (isLoading) {
    return (
      <DashboardContent maxWidth="xl">
        <Container maxWidth="xl">
          <Box sx={{ py: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
              Loading TripAdvisor Overview...
            </Typography>
          </Box>
        </Container>
      </DashboardContent>
    );
  }

  if (isError) {
    return (
      <DashboardContent maxWidth="xl">
        <Container maxWidth="xl">
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Error Loading TripAdvisor Data
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isError?.message || 'An error occurred while loading the data.'}
            </Typography>
          </Box>
        </Container>
      </DashboardContent>
    );
  }

  if (!businessProfile) {
    return (
      <DashboardContent maxWidth="xl">
        <Container maxWidth="xl">
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              TripAdvisor Profile Not Set Up
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              To view TripAdvisor reviews and analytics, you need to connect your TripAdvisor business profile first.
            </Typography>
            <Button variant="contained" size="large">
              Set Up TripAdvisor Profile
            </Button>
          </Box>
        </Container>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h3" sx={{ mb: 1 }}>
              TripAdvisor Overview
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor your TripAdvisor business performance & reviews
            </Typography>
          </Box>

          {/* Business Profile */}
          <TripAdvisorBusinessProfile businessProfile={businessProfile} />

          {/* Time Period Tabs */}
          {availableTimePeriods.length > 1 && (
            <Box sx={{ mb: 3 }}>
              <TripAdvisorTimePeriodTabs
                periods={availableTimePeriods}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
            </Box>
          )}

          {/* Metrics Cards */}
          <Box sx={{ mb: 4 }}>
            <TripAdvisorMetricsCards metrics={displayMetrics} />
          </Box>

          {/* Charts Row 1: Rating Distribution and Sentiment Analysis */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={6}>
              <TripAdvisorRatingDistribution data={ratingDistributionData} />
            </Grid>
            <Grid item xs={12} lg={6}>
              <TripAdvisorSentimentAnalysis data={sentimentData} />
            </Grid>
          </Grid>

          {/* Charts Row 2: Sub-ratings and Trip Types */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {subRatingsData.length > 0 && (
              <Grid item xs={12} lg={6}>
                <TripAdvisorSubRatings data={subRatingsData} />
              </Grid>
            )}
            <Grid item xs={12} lg={6}>
              <TripAdvisorTripTypes data={tripTypeData} />
            </Grid>
          </Grid>

          {/* Business Info and Keywords */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={6}>
              <TripAdvisorBusinessInfo businessProfile={businessProfile} />
            </Grid>
            <Grid item xs={12} lg={6}>
              <TripAdvisorTopKeywords keywords={displayMetrics.topKeywords} />
            </Grid>
          </Grid>

          {/* Recent Reviews */}
          {recentReviews && recentReviews.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <TripAdvisorRecentReviews reviews={recentReviews} />
            </Box>
          )}
        </Box>
      </Container>
    </DashboardContent>
  );
}
