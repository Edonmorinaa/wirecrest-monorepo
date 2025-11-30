'use client';

import dayjs from 'dayjs';
import { useMemo, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useTeam from '@/hooks/useTeam';
import { useLocationBySlug, useFacebookProfile, useFacebookAnalytics, useFacebookReviews } from '@/hooks/useLocations';

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

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CustomDateRangePicker } from 'src/components/custom-date-range-picker';
import { LoadingState, ErrorState, EmptyState } from 'src/components/states';

import {
  FacebookMap,
  FacebookContactInfo,
  FacebookTopKeywords,
  FacebookBusinessInfo,
  FacebookRecentReviews,
  FacebookRecentActivity,
  FacebookMetricsOverview,
  FacebookOverviewWelcome,
  FacebookEmotionalAnalysis,
  FacebookEngagementMetrics,
  FacebookSentimentAnalysis,
  FacebookRatingDistribution,
} from '../components';

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

export function FacebookOverviewView() {
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

  // Get all-time analytics (for header/welcome section)
  const allTimeStart = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 10);
    return date.toISOString();
  }, []);

  const { profile: businessProfile, isLoading: profileLoading, error: profileError } = useFacebookProfile(locationId, !!location && isValidLocationId);
  const { analytics: allTimeAnalytics } = useFacebookAnalytics(
    locationId,
    allTimeStart,
    new Date().toISOString(),
    !!location && isValidLocationId
  );
  const { analytics: currentAnalytics } = useFacebookAnalytics(
    locationId,
    startDate,
    endDate,
    !!location && isValidLocationId
  );
  const { reviews } = useFacebookReviews(
    locationId,
    {},
    { page: 1, limit: 5 },
    !!location && isValidLocationId
  );

  // Available time periods (simplified - show all)
  const availableTimePeriods = TIME_PERIODS;

  // Get all-time metrics for header
  const allTimePeriodMetrics = useMemo(() => ({
    recommendationRate: allTimeAnalytics?.recommendations?.recommendationRate || 0,
    reviewCount: allTimeAnalytics?.reviewCount || 0,
  }), [allTimeAnalytics]);

  // Get display metrics for current period
  const displayMetrics = useMemo(() => {
    if (!currentAnalytics) return null;

    return {
      // Facebook-specific metrics
      totalReviews: currentAnalytics.reviewCount || 0,
      recommendedCount: currentAnalytics.recommendations?.recommendedCount || 0,
      notRecommendedCount: currentAnalytics.recommendations?.notRecommendedCount || 0,
      recommendationRate: currentAnalytics.recommendations?.recommendationRate || 0,
      totalLikes: currentAnalytics.engagement?.totalLikes || 0,
      totalComments: currentAnalytics.engagement?.totalComments || 0,
      totalPhotos: currentAnalytics.engagement?.totalPhotos || 0,
      engagementRate: currentAnalytics.engagement?.engagementRate || 0,
      averageLikesPerReview: currentAnalytics.engagement?.averageLikesPerReview || 0,
      averageCommentsPerReview: currentAnalytics.engagement?.averageCommentsPerReview || 0,
      responseRate: currentAnalytics.responseRate || 0,
      avgResponseTime: currentAnalytics.averageResponseTime || 0,

      // Analysis data
      sentimentAnalysis: currentAnalytics.sentiment,
      emotionalAnalysis: currentAnalytics.emotions,
      reviewQuality: currentAnalytics.reviewQuality,
      contentLength: currentAnalytics.contentLength,
      topKeywords: currentAnalytics.keywords || [],
      recentReviews: reviews || [],
    };
  }, [currentAnalytics, reviews]);

  // 1. LOADING STATE
  if (locationLoading || (isValidLocationId && profileLoading)) {
    return (
      <DashboardContent maxWidth="xl">
        <LoadingState message="Loading Facebook Business overview..." />
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
          heading="Facebook Overview"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
            { name: location?.name || locationSlug, href: paths.dashboard.locations.bySlug(teamSlug, locationSlug) },
            { name: 'Facebook Overview', href: '#' },
          ]}
          sx={{ mb: 3 }}
        />
        <EmptyState
          icon="solar:facebook-bold"
          title="Facebook Business Profile Not Set Up"
          message="Connect your Facebook Page to start tracking reviews, recommendations, and engagement metrics."
          action={
            <Button
              variant="contained"
              size="large"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              sx={{ mt: 2 }}
            >
              Connect Facebook Page
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
          heading="Facebook Overview"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
            { name: location?.name || locationSlug, href: paths.dashboard.locations.bySlug(teamSlug, locationSlug) },
            { name: 'Facebook Overview', href: '#' },
          ]}
          sx={{ mb: 3 }}
        />
        <ErrorState
          type="network"
          platform="Facebook"
          onRetry={() => window.location.reload()}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>

        <Grid size={{ xs: 12 }} >
          <CustomBreadcrumbs
            heading="Facebook Overview"
            links={[
              { name: 'Dashboard', href: paths.dashboard.root },
              { name: 'Teams', href: paths.dashboard.teams.root },
              { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
              { name: location?.name || locationSlug, href: paths.dashboard.locations.bySlug(teamSlug, locationSlug) },
              { name: 'Facebook Overview', href: '#' },
            ]}
            action={
              businessProfile?.pageUrl && (
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:arrow-right-up-linear" width={20} height={20} />}
                  target="_blank"
                  href={businessProfile.pageUrl}
                >
                  Visit Facebook Page
                </Button>
              )
            }
          />
        </Grid>

        {/* 1. HEADER & OVERVIEW SECTION */}
        {/* Facebook Business Header */}
        <Grid size={{ xs: 12 }}>
          <FacebookOverviewWelcome displayName={businessProfile?.pageName || businessProfile?.title || location.name} recommendationRate={allTimePeriodMetrics.recommendationRate} totalReviews={allTimePeriodMetrics.reviewCount} sx={{}} />
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
                <Box key={period.key} sx={{ display: selectedPeriod === period.key ? 'block' : 'none' }}>
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

                  <FacebookMetricsOverview
                    metrics={displayMetrics}
                    periodicalMetrics={(businessProfile as any)?.overview?.facebookPeriodicalMetric}
                    currentPeriodKey={selectedPeriod}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Reviews - Full Width */}
        <Grid size={{ xs: 12 }}>
          <FacebookRecentReviews reviews={reviews} />
        </Grid>

        {/* 2. ANALYTICS & CHARTS SECTION */}
        {/* Rating Distribution - Full Width */}
        <Grid size={{ xs: 12 }}>
          <FacebookRatingDistribution
            businessProfile={businessProfile as any}
            currentPeriodMetrics={{
              recommendedCount: displayMetrics?.recommendedCount || 0,
              notRecommendedCount: displayMetrics?.notRecommendedCount || 0,
            } as any}
          />
        </Grid>

        {/* Sentiment Analysis and Emotional Analysis - Side by Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookSentimentAnalysis title="" subheader="" chart={{}} metrics={displayMetrics as any} sx={{}} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookEmotionalAnalysis emotionalAnalysis={displayMetrics?.emotionalAnalysis} sx={{}} />
        </Grid>

        {/* Top Keywords and Engagement Metrics - Side by Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookTopKeywords keywords={displayMetrics?.topKeywords || []} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookEngagementMetrics overview={(businessProfile as any)?.overview} sx={{}} />
        </Grid>

        {/* Recent Review Activity - Full Width */}
        <Grid size={{ xs: 12 }}>
          <FacebookRecentActivity recentReviews={displayMetrics?.recentReviews || []} sx={{}} />
        </Grid>

        {/* Contact Info and Business Details */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookContactInfo businessProfile={businessProfile as any} sx={{}} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookBusinessInfo businessProfile={businessProfile as any} />
        </Grid>

        {/* Facebook Map - Full Width */}
        <Grid size={{ xs: 12 }}>
          <FacebookMap businessProfile={businessProfile} />
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