'use client';

import dayjs from 'dayjs';
import { useMemo, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

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

import useTeam from 'src/hooks/useTeam';
import { useLocationBySlug, useBookingProfile, useBookingAnalytics, useBookingReviews } from 'src/hooks/useLocations';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CustomDateRangePicker } from 'src/components/custom-date-range-picker';

import { BookingOverviewWelcome } from '../components/booking-overview-welcome';
import { BookingMetricsOverview } from '../components/booking-metrics-overview';
import { BookingRatingDistribution } from '../components/booking-rating-distribution';
import { BookingSentimentAnalysis } from '../components/booking-sentiment-analysis';
import { BookingRecentReviews } from '../components/booking-recent-reviews';
import { BookingBusinessInfo } from '../components/booking-business-info';
import { BookingTopKeywords } from '../components/booking-top-keywords';

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

export function OverviewBookingView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamSlug = params.slug as string;
  const locationSlug = params.locationSlug as string;

  const { team } = useTeam(teamSlug);
  const { location, isLoading: locationLoading } = useLocationBySlug(teamSlug, locationSlug);

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

  const { profile: businessProfile } = useBookingProfile(locationId, !!location && isValidLocationId);
  const { analytics: allTimeAnalytics } = useBookingAnalytics(
    locationId,
    allTimeStart,
    new Date().toISOString(),
    !!location && isValidLocationId
  );
  const { analytics: currentAnalytics } = useBookingAnalytics(
    locationId,
    startDate,
    endDate,
    !!location && isValidLocationId
  );
  const { reviews } = useBookingReviews(
    locationId,
    {},
    { page: 1, limit: 5 },
    !!location && isValidLocationId
  );

  // Available time periods
  const availableTimePeriods = TIME_PERIODS;

  // Get all-time metrics for header
  const allTimePeriodMetrics = useMemo(() => ({
    averageRating: allTimeAnalytics?.averageRating || businessProfile?.rating || 0,
    reviewCount: allTimeAnalytics?.reviewCount || businessProfile?.numberOfReviews || 0,
  }), [allTimeAnalytics, businessProfile]);

  // Get display metrics for current period
  const displayMetrics = useMemo(() => {
    if (!currentAnalytics) return null;

    return {
      // Booking.com-specific metrics (0-10 scale)
      averageRating: currentAnalytics.averageRating || 0,
      totalReviews: currentAnalytics.reviewCount || 0,
      responseRate: currentAnalytics.responseRate || 0,
      averageResponseTime: currentAnalytics.averageResponseTime || 0,
      verifiedStays: currentAnalytics.verifiedStays || 0,
      
      // Category scores (if available)
      categoryScores: currentAnalytics.categoryScores || {
        cleanliness: 0,
        comfort: 0,
        location: 0,
        facilities: 0,
        staff: 0,
        valueForMoney: 0,
        wifi: 0,
      },
      
      // Analysis data
      sentimentAnalysis: currentAnalytics.sentiment
        ? {
            positive: currentAnalytics.sentiment.positive || 0,
            neutral: currentAnalytics.sentiment.neutral || 0,
            negative: currentAnalytics.sentiment.negative || 0,
          }
        : { positive: 0, neutral: 0, negative: 0 },
      topKeywords: currentAnalytics.keywords || [],
      ratingDistribution: currentAnalytics.ratingDistribution || {},
      recentReviews: reviews || [],
    };
  }, [currentAnalytics, reviews]);

  // Show loading state
  if (locationLoading || !location) {
    return (
      <DashboardContent maxWidth="xl">
        <Typography>Loading location...</Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <CustomBreadcrumbs
            heading="Booking.com Overview"
            links={[
              { name: 'Dashboard', href: paths.dashboard.root },
              { name: 'Teams', href: paths.dashboard.teams.root },
              { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
              { name: location?.name || locationSlug, href: paths.dashboard.locations.bySlug(teamSlug, locationSlug) },
              { name: 'Booking.com Overview', href: '' },
            ]}
            action={
              businessProfile?.hotelUrl && (
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:arrow-right-up-linear" width={20} height={20} />}
                  target="_blank"
                  href={businessProfile.hotelUrl}
                >
                  Visit Booking.com Page
                </Button>
              )
            }
          />
        </Grid>

        {/* 1. HEADER & OVERVIEW SECTION */}
        {/* Booking.com Business Header */}
        <Grid size={{ xs: 12 }}>
          <BookingOverviewWelcome
            displayName={businessProfile?.hotelName || businessProfile?.name || location.name}
            averageRating={allTimePeriodMetrics.averageRating}
            totalReviews={allTimePeriodMetrics.reviewCount}
            sx={{}}
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

                  <BookingMetricsOverview 
                    metrics={displayMetrics}
                    currentPeriodKey={selectedPeriod}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Reviews */}
        <Grid size={{ xs: 12 }}>
          <BookingRecentReviews reviews={displayMetrics?.recentReviews || []} />
        </Grid>

        {/* 2. ANALYTICS & CHARTS SECTION */}
        {/* Rating Distribution - Full Width */}
        <Grid size={{ xs: 12 }}>
          <BookingRatingDistribution
            businessName={businessProfile?.hotelName || businessProfile?.name}
            ratingDistribution={displayMetrics?.ratingDistribution || {}}
            reviewCount={displayMetrics?.totalReviews || 0}
          />
        </Grid>

        {/* Sentiment Analysis and Top Keywords - Side by Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <BookingSentimentAnalysis
            metrics={displayMetrics}
            sx={{}}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <BookingTopKeywords keywords={displayMetrics?.topKeywords || []} />
        </Grid>

        {/* 3. BUSINESS DETAILS SECTION */}
        {/* Business Information */}
        <Grid size={{ xs: 12 }}>
          <BookingBusinessInfo businessProfile={businessProfile} sx={{}} />
        </Grid>

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

