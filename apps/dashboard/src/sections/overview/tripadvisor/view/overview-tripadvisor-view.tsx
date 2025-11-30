'use client';

import dayjs from 'dayjs';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useCallback } from 'react';

import useTeam from '@/hooks/useTeam';
import { useLocationBySlug, useTripAdvisorProfile, useTripAdvisorAnalytics, useTripAdvisorReviews } from '@/hooks/useLocations';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import AlertTitle from '@mui/material/AlertTitle';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CustomDateRangePicker } from 'src/components/custom-date-range-picker';
import { LoadingState, ErrorState, EmptyState } from 'src/components/states';

import { TripAdvisorTopKeywords } from '../components/tripadvisor-top-keywords';
import { TripAdvisorBusinessInfo } from '../components/tripadvisor-business-info';
import { TripAdvisorRecentReviews } from '../components/tripadvisor-recent-reviews';
import { TripAdvisorOverviewWelcome } from '../components/tripadvisor-overview-welcome';
import { TripAdvisorMetricsOverview } from '../components/tripadvisor-metrics-overview';
import { TripAdvisorSentimentAnalysis } from '../components/tripadvisor-sentiment-analysis';
import { TripAdvisorRatingDistribution } from '../components/tripadvisor-rating-distribution';

// Time period options for metrics
const TIME_PERIODS = [
  { key: '1', label: 'Last 24 Hours', shortLabel: '24h' },
  { key: '3', label: 'Last 3 Days', shortLabel: '3d' },
  { key: '7', label: 'Last 7 Days', shortLabel: '7d' },
  { key: '30', label: 'Last 30 Days', shortLabel: '30d' },
  { key: '180', label: 'Last 6 Months', shortLabel: '6m' },
  { key: '365', label: 'Last Year', shortLabel: '1y' },
  { key: '7300', label: 'All Time', shortLabel: 'All' },
  { key: 'custom', label: 'Custom Range', shortLabel: 'Custom' },
];

// ----------------------------------------------------------------------

export function TripAdvisorOverviewView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamSlug = params.slug as string;
  const locationSlug = params.locationSlug as string;

  const { team } = useTeam(teamSlug);
  const { location, isLoading: locationLoading, error: locationError } = useLocationBySlug(teamSlug, locationSlug);

  // Validate locationId
  const locationId = location?.id || '';
  const isValidLocationId = locationId && locationId.length > 20;

  // Get period from URL or default to '7300'
  const selectedPeriod = searchParams.get('period') || '7300';

  // Custom date picker state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempFromDate, setTempFromDate] = useState<Date | null>(null);
  const [tempToDate, setTempToDate] = useState<Date | null>(null);

  // Get custom date range from URL
  const customRange = useMemo(() => {
    const customFrom = searchParams.get('customFrom');
    const customTo = searchParams.get('customTo');

    if (customFrom && customTo) {
      return {
        from: new Date(customFrom),
        to: new Date(customTo),
      };
    }
    return null;
  }, [searchParams]);

  // Calculate date ranges based on selected period or custom range
  const { startDate, endDate } = useMemo(() => {
    if (selectedPeriod === 'custom' && customRange) {
      return {
        startDate: customRange.from.toISOString(),
        endDate: customRange.to.toISOString(),
      };
    }

    const end = new Date();
    const start = new Date();
    const days = parseInt(selectedPeriod) || 30;
    start.setDate(end.getDate() - days);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [selectedPeriod, customRange]);

  // Update URL with new period
  const updatePeriod = useCallback((newPeriod: string) => {
    const urlParams = new URLSearchParams(searchParams);
    urlParams.set('period', newPeriod);

    // Clear custom range if switching away from custom
    if (newPeriod !== 'custom') {
      urlParams.delete('customFrom');
      urlParams.delete('customTo');
    }

    router.replace(`?${urlParams.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Update URL with custom range
  const updateCustomRange = useCallback((from: Date, to: Date) => {
    const urlParams = new URLSearchParams(searchParams);
    urlParams.set('period', 'custom');
    urlParams.set('customFrom', from.toISOString().split('T')[0]);
    urlParams.set('customTo', to.toISOString().split('T')[0]);

    router.replace(`?${urlParams.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Get all-time analytics
  const allTimeStart = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 10);
    return date.toISOString();
  }, []);

  const { profile: businessProfile, isLoading: profileLoading, error: profileError } = useTripAdvisorProfile(locationId, !!location && isValidLocationId);
  const { analytics: allTimeAnalytics } = useTripAdvisorAnalytics(
    locationId,
    allTimeStart,
    new Date().toISOString(),
    !!location && isValidLocationId
  );
  const { analytics: currentAnalytics, isLoading: analyticsLoading } = useTripAdvisorAnalytics(
    locationId,
    startDate,
    endDate,
    !!location && isValidLocationId
  );
  const { reviews } = useTripAdvisorReviews(
    locationId,
    {},
    { page: 1, limit: 10 },
    !!location && isValidLocationId
  );

  // Available time periods (simplified - show all)
  const availableTimePeriods = TIME_PERIODS;

  // Get all-time metrics for header
  const allTimePeriodMetrics = useMemo(() => ({
    averageRating: allTimeAnalytics?.averageRating || businessProfile?.rating || 0,
    reviewCount: allTimeAnalytics?.reviewCount || businessProfile?.numberOfReviews || 0,
  }), [allTimeAnalytics, businessProfile]);

  // Use current period data if available
  const displayMetrics = useMemo(() => {
    if (!currentAnalytics) return null;

    return {
      averageRating: currentAnalytics.averageRating || 0,
      totalReviews: currentAnalytics.reviewCount || 0,
      responseRate: currentAnalytics.responseRate,
      averageResponseTime: currentAnalytics.averageResponseTime,
      sentimentAnalysis: currentAnalytics.sentiment
        ? {
          positive: currentAnalytics.sentiment.positive || 0,
          neutral: currentAnalytics.sentiment.neutral || 0,
          negative: currentAnalytics.sentiment.negative || 0,
        }
        : { positive: 0, neutral: 0, negative: 0 },
      topKeywords: (() => {
        const keywords = currentAnalytics.keywords;
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
      ratingDistribution: currentAnalytics.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }, [currentAnalytics]);

  // 1. LOADING STATE
  if (locationLoading || (isValidLocationId && profileLoading)) {
    return (
      <DashboardContent maxWidth="xl">
        <LoadingState message="Loading TripAdvisor overview..." />
      </DashboardContent>
    );
  }

  // 2. LOCATION ERROR
  if (locationError || !location) {
    return (
      <DashboardContent maxWidth="xl">
        <ErrorState
          type="not-found"
          platform="Location"
          customMessage="The requested location could not be found. It may have been deleted or you may not have access to it."
        />
      </DashboardContent>
    );
  }

  // 3. PROFILE NOT FOUND
  if (!businessProfile && !profileLoading && isValidLocationId) {
    return (
      <DashboardContent maxWidth="xl">
        <CustomBreadcrumbs
          heading="TripAdvisor Overview"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
            { name: location?.name || locationSlug, href: paths.dashboard.locations.bySlug(teamSlug, locationSlug) },
            { name: 'TripAdvisor Overview', href: '#' },
          ]}
          sx={{ mb: 3 }}
        />
        <EmptyState
          icon="solar:map-point-bold"
          title="TripAdvisor Profile Not Set Up"
          message="Connect your TripAdvisor listing to track reviews, ratings, and traveler feedback."
          action={
            <Button
              variant="contained"
              size="large"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              sx={{ mt: 2 }}
            >
              Connect TripAdvisor
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  // 4. PROFILE ERROR
  if (profileError) {
    return (
      <DashboardContent maxWidth="xl">
        <CustomBreadcrumbs
          heading="TripAdvisor Overview"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
            { name: location?.name || locationSlug, href: paths.dashboard.locations.bySlug(teamSlug, locationSlug) },
            { name: 'TripAdvisor Overview', href: '#' },
          ]}
          sx={{ mb: 3 }}
        />
        <ErrorState
          type="network"
          platform="TripAdvisor"
          onRetry={() => window.location.reload()}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <CustomBreadcrumbs
            heading="TripAdvisor Overview"
            links={[
              { name: 'Dashboard', href: paths.dashboard.root },
              { name: 'Teams', href: paths.dashboard.teams.root },
              { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
              { name: location?.name || locationSlug, href: paths.dashboard.locations.bySlug(teamSlug, locationSlug) },
              { name: 'TripAdvisor Overview', href: '' },
            ]}
            action={
              businessProfile && (
                <Button
                  variant="contained"
                  startIcon={
                    <Iconify
                      icon="solar:arrow-right-up-linear"
                      width={20}
                      height={20}
                      target="_blank"
                      href={businessProfile.website}
                    />
                  }
                >
                  Visit Website
                </Button>
              )
            }
          />
        </Grid>

        {/* 1. HEADER & OVERVIEW SECTION */}
        {/* TripAdvisor Business Header */}
        <Grid size={{ xs: 12 }}>
          <TripAdvisorOverviewWelcome
            displayName={businessProfile?.name}
            averageRating={allTimePeriodMetrics?.averageRating || 0}
            totalReviews={allTimePeriodMetrics?.reviewCount || 0}
          />
        </Grid>

        {/* Time Period Selector and Key Metrics */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:chart-2-bold" />
                  <Typography variant="h6">Business Metrics</Typography>
                </Stack>
              }
              subheader="Select a time period to view metrics for that specific timeframe"
            />
            <CardContent>
              {availableTimePeriods.length > 1 && (
                <Tabs
                  value={selectedPeriod}
                  onChange={(e, newValue) => updatePeriod(newValue)}
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
                    {selectedPeriod === 'custom' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<Iconify icon="eva:calendar-outline" />}
                        onClick={() => {
                          setTempFromDate(customRange?.from || null);
                          setTempToDate(customRange?.to || null);
                          setDatePickerOpen(true);
                        }}
                        sx={{ ml: 2 }}
                      >
                        {customRange?.from && customRange?.to
                          ? `${customRange.from.toLocaleDateString()} - ${customRange.to.toLocaleDateString()}`
                          : 'Select Dates'}
                      </Button>
                    )}
                  </Stack>

                  <TripAdvisorMetricsOverview
                    metrics={displayMetrics}
                    periodicalMetrics={[]}
                    currentPeriodKey={selectedPeriod}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TripAdvisorRecentReviews reviews={reviews} />
        </Grid>

        {/* 2. ANALYTICS & CHARTS SECTION */}
        {/* Rating Distribution - Full Width */}
        <Grid size={{ xs: 12 }}>
          <TripAdvisorRatingDistribution
            businessName={businessProfile?.name}
            reviewCount={displayMetrics?.totalReviews || 0}
            oneStarCount={displayMetrics?.ratingDistribution?.[1] || 0}
            twoStarCount={displayMetrics?.ratingDistribution?.[2] || 0}
            threeStarCount={displayMetrics?.ratingDistribution?.[3] || 0}
            fourStarCount={displayMetrics?.ratingDistribution?.[4] || 0}
            fiveStarCount={displayMetrics?.ratingDistribution?.[5] || 0}
          />
        </Grid>

        {/* Sentiment Analysis and Top Keywords - Side by Side */}
        <Grid size={{ xs: 12, md: 4 }}>
          <TripAdvisorSentimentAnalysis metrics={displayMetrics} />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TripAdvisorTopKeywords
            keywords={(displayMetrics?.topKeywords || []).map((kw: any) => ({
              keyword: kw.keyword || kw.key || kw,
              count: kw.count || kw.value || 1
            }))}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TripAdvisorBusinessInfo
            address={businessProfile?.address}
            phone={businessProfile?.phone}
            website={businessProfile?.website}
            type={businessProfile?.type}
            rankingPosition={businessProfile?.rankingPosition}
            rankingString={businessProfile?.rankingString}
          />
        </Grid>

        {/* 3. BUSINESS DETAILS SECTION */}
        {/* Business Information */}

        {/* 4. CONTENT & REVIEWS SECTION */}
        {/* Recent Reviews - Full Width */}

        {/* 5. FOOTER SECTION */}
        {/* Last Updated */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Last updated:{' '}
              {businessProfile?.updatedAt
                ? new Date(businessProfile.updatedAt).toLocaleString()
                : 'Not available'}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Custom Date Picker Dialog */}
      <CustomDateRangePicker
        variant="calendar"
        title="Select Custom Date Range"
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        startDate={tempFromDate ? dayjs(tempFromDate) : null}
        endDate={tempToDate ? dayjs(tempToDate) : null}
        onChangeStartDate={(date) => setTempFromDate(date ? date.toDate() : null)}
        onChangeEndDate={(date) => setTempToDate(date ? date.toDate() : null)}
        error={tempFromDate && tempToDate ? tempFromDate > tempToDate : false}
        onSubmit={() => {
          if (tempFromDate && tempToDate && tempFromDate <= tempToDate) {
            updateCustomRange(tempFromDate, tempToDate);
            setDatePickerOpen(false);
          }
        }}
        slotProps={{}}
      />
    </DashboardContent>
  );
}
