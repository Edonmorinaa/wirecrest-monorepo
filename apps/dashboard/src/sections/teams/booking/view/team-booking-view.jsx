'use client';

import { useParams } from 'next/navigation';
import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';

import { useTeamBookingData } from 'src/hooks/use-team-booking-data';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { BookingTopKeywords } from '../components/booking-top-keywords';
import { BookingBusinessInfo } from '../components/booking-business-info';
import { BookingRecentReviews } from '../components/booking-recent-reviews';
import { BookingOverviewWelcome } from '../components/booking-overview-welcome';
import { BookingMetricsOverview } from '../components/booking-metrics-overview';
import { BookingSentimentAnalysis } from '../components/booking-sentiment-analysis';
import { BookingRatingDistribution } from '../components/booking-rating-distribution';

// Time period options for metrics
const TIME_PERIODS = [
  { key: '1', label: 'Last 24 Hours', shortLabel: '24h' },
  { key: '3', label: 'Last 3 Days', shortLabel: '3d' },
  { key: '7', label: 'Last 7 Days', shortLabel: '7d' },
  { key: '30', label: 'Last 30 Days', shortLabel: '30d' },
  { key: '180', label: 'Last 6 Months', shortLabel: '6m' },
  { key: '365', label: 'Last Year', shortLabel: '1y' },
  { key: '0', label: 'All Time', shortLabel: 'All' },
];

// ----------------------------------------------------------------------

export function TeamBookingView() {
  const params = useParams();
  const { slug } = params;
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const hasSetInitialPeriod = useRef(false);

  const {
    businessProfile,
    overview,
    sentimentAnalysis,
    topKeywords,
    recentReviews,
    ratingDistribution,
    periodicalMetrics,
    refreshData,
  } = useTeamBookingData(slug);

  // Filter time periods to only show those with review data
  const availableTimePeriods = useMemo(() => {
    if (!periodicalMetrics) {
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
    if (availableTimePeriods.length > 0 && !hasSetInitialPeriod.current) {
      const isCurrentPeriodAvailable = availableTimePeriods.some((p) => p.key === selectedPeriod);
      if (!isCurrentPeriodAvailable) {
        setSelectedPeriod(availableTimePeriods[0].key);
        hasSetInitialPeriod.current = true;
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

  // Get periodic metrics for all time period
  const allTimePeriodMetrics = useMemo(() => {
    const metrics = periodicalMetrics?.find((metric) => metric.periodKey.toString() === '0');
    return metrics;
  }, [periodicalMetrics]);

  // Use current period data if available, fallback to overview snapshot data, then to profile data
  const displayMetrics = useMemo(() => {
    if (!businessProfile) return null;

    return {
      averageRating:
        currentPeriodMetrics?.averageRating ||
        overview?.averageRating ||
        businessProfile.averageRating,
      totalReviews:
        currentPeriodMetrics?.reviewCount || overview?.totalReviews || businessProfile.totalReviews,
      responseRate: currentPeriodMetrics?.responseRate || overview?.responseRate,
      averageLengthOfStay:
        currentPeriodMetrics?.averageLengthOfStay || overview?.averageLengthOfStay,
      sentimentAnalysis: currentPeriodMetrics
        ? {
            positive: currentPeriodMetrics.sentimentPositive || 0,
            neutral: currentPeriodMetrics.sentimentNeutral || 0,
            negative: currentPeriodMetrics.sentimentNegative || 0,
          }
        : sentimentAnalysis,
      topKeywords: (() => {
        const keywords = currentPeriodMetrics?.topKeywords || topKeywords;
        if (!keywords) return [];
        if (Array.isArray(keywords)) return keywords;
        if (typeof keywords === 'string') {
          try {
            const parsed = JSON.parse(keywords);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        if (typeof keywords === 'object') {
          if (Array.isArray(Object.values(keywords))) {
            return Object.values(keywords);
          }
          return [];
        }
        return [];
      })(),
    };
  }, [businessProfile, currentPeriodMetrics, overview, sentimentAnalysis, topKeywords]);

  const handleRefresh = async () => {
    await refreshData();
  };

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <CustomBreadcrumbs
            heading="Booking.com Overview"
            links={[
              { name: 'Dashboard', href: paths.dashboard.root },
              { name: 'Teams', href: paths.dashboard.teams.root },
              { name: slug, href: paths.dashboard.teams.bySlug(slug) },
              { name: 'Booking.com' },
            ]}
            action={
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:arrow-right-up-linear" width={20} height={20} />}
                target="_blank"
                href={businessProfile.website}
              >
                Visit Property
              </Button>
            }
          />
        </Grid>

        {/* 1. HEADER & OVERVIEW SECTION */}
        {/* Booking.com Business Header */}
        <Grid size={{ xs: 12 }}>
          <BookingOverviewWelcome
            businessProfile={businessProfile}
            averageRating={allTimePeriodMetrics?.averageRating || overview?.averageRating}
            totalReviews={allTimePeriodMetrics?.reviewCount || overview?.totalReviews}
          />
        </Grid>

        {/* Time Period Selector and Key Metrics */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:chart-2-bold" />
                  <Typography variant="h6">Property Metrics</Typography>
                </Stack>
              }
              subheader="Select a time period to view metrics for that specific timeframe"
            />
            <CardContent>
              {availableTimePeriods.length > 1 && (
                <Tabs
                  value={selectedPeriod}
                  onChange={(e, newValue) => setSelectedPeriod(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 3 }}
                >
                  {availableTimePeriods.map((period) => (
                    <Tab
                      key={period.key}
                      value={period.key}
                      label={period.shortLabel}
                      sx={{ minWidth: 'auto' }}
                    />
                  ))}
                </Tabs>
              )}

              {availableTimePeriods.map((period) => (
                <Box
                  key={period.key}
                  sx={{ display: selectedPeriod === period.key ? 'block' : 'none' }}
                >
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Typography variant="h6">{period.label}</Typography>
                    <Chip
                      label={`${displayMetrics?.totalReviews || 0} reviews`}
                      size="small"
                      color="primary"
                    />
                  </Stack>

                  <BookingMetricsOverview
                    metrics={displayMetrics}
                    periodicalMetrics={periodicalMetrics}
                    currentPeriodKey={selectedPeriod}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <BookingRecentReviews businessProfile={businessProfile} />
        </Grid>

        {/* 2. ANALYTICS & CHARTS SECTION */}
        {/* Rating Distribution - Full Width */}
        <Grid size={{ xs: 12 }}>
          <BookingRatingDistribution
            businessProfile={businessProfile}
            currentPeriodMetrics={currentPeriodMetrics}
          />
        </Grid>

        {/* Sentiment Analysis and Top Keywords - Side by Side */}
        <Grid size={{ xs: 12, md: 4 }}>
          <BookingSentimentAnalysis metrics={displayMetrics} />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <BookingTopKeywords keywords={displayMetrics?.topKeywords || []} />
        </Grid>

        {/* Business Info */}
        <Grid size={{ xs: 12, md: 4 }}>
          <BookingBusinessInfo businessProfile={businessProfile} />
        </Grid>

        {/* 5. FOOTER SECTION */}
        {/* Last Updated */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Last updated:{' '}
              {overview?.lastRefreshedAt
                ? new Date(overview.lastRefreshedAt).toLocaleString()
                : 'Not available'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
