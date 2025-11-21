'use client';

import dayjs from 'dayjs';
import { useMemo, useState, useCallback } from 'react';

import useTeam from '@/hooks/useTeam';
import { useGoogleProfile, useGoogleReviews, useLocationBySlug, useGoogleAnalytics } from '@/hooks/useLocations';

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

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CustomDateRangePicker } from 'src/components/custom-date-range-picker';

import { GoogleMap } from '../google-map';
import { GoogleBusinessInfo } from '../google-business-info';
import { GoogleRecentReviews } from '../google-recent-reviews';
import { GoogleOverviewWelcome } from '../google-overview-welcome';
import { GoogleMetricsOverview } from '../google-metrics-overview';
import { GoogleSentimentAnalysis } from '../google-sentiment-analysis';
import { GoogleRatingDistribution } from '../google-rating-distribution';

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

export function GoogleOverviewView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamSlug = params.slug as string;
  const locationSlug = params.locationSlug as string;

  const { team } = useTeam(teamSlug);
  
  // Get location by slug (new location-based system)
  const { location, isLoading: locationLoading } = useLocationBySlug(teamSlug, locationSlug);
  
  // Log location data for debugging
  console.log('[GoogleOverviewView] Location data:', { 
    locationSlug, 
    location: location ? { id: location.id, name: location.name, slug: location.slug } : null,
    locationLoading 
  });
  
  // Use location-based hooks for the new system
  // Only pass locationId if it's a valid UUID
  const locationId = location?.id || '';
  const isValidLocationId = locationId && locationId.length > 20; // Basic validation
  
  const { profile: businessProfile } = useGoogleProfile(locationId, !!location && isValidLocationId);
  const { reviews: reviewsData } = useGoogleReviews(locationId, {}, { page: 1, limit: 5 }, !!location && isValidLocationId);
  const reviews = reviewsData || [];

  // Get period from URL or default to '30'
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
  
  // Get all-time analytics for metric cards (20 years ago to now)
  const allTimeStart = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 20);
    return date.toISOString();
  }, []);

  // const { analytics: allTimeAnalytics, isLoading: isLoadingAllTime } = useGoogleAnalytics(
  //   locationId,
  //   allTimeStart,
  //   new Date().toISOString(),
  //   !!location && isValidLocationId
  // );

  // Get analytics for selected period (for graphs and other components)
  const { analytics: currentAnalytics, isLoading: isLoadingAnalytics } = useGoogleAnalytics(
    locationId,
    startDate,
    endDate,
    !!location && isValidLocationId
  );

  // Available time periods (simplified - show all)
  const availableTimePeriods = TIME_PERIODS;

  // Display metrics from all-time analytics (metric cards always show all-time data)
  const displayMetrics = useMemo(() => {
    if (!currentAnalytics) return null;

    return {
      averageRating: currentAnalytics.averageRating,
      totalReviews: currentAnalytics.reviewCount,
      responseRate: currentAnalytics.responseRate,
      averageResponseTimeHours: currentAnalytics.averageResponseTimeHours,
      sentimentAnalysis: currentAnalytics.sentiment
        ? {
            positive: currentAnalytics.sentiment.positive || 0,
            neutral: currentAnalytics.sentiment.neutral || 0,
            negative: currentAnalytics.sentiment.negative || 0,
          }
        : null,
    };
  }, [currentAnalytics]);

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


        <Grid size={{ xs: 12 }} >
        <CustomBreadcrumbs
          heading="Google Overview"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
            { name: location?.name || locationSlug, href: '#' },
            { name: 'Google Overview', href: '#' },
          ]}
          action={
            businessProfile?.formattedAddress && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:arrow-right-up-linear" width={20} height={20} />}
                target="_blank"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessProfile.formattedAddress)}`}
              >
                View on Maps
              </Button>
            )
          }
        />
        </Grid>

        {/* 1. HEADER & OVERVIEW SECTION */}
        {/* Google Business Header */}
        <Grid size={{ xs: 12 }}>
        <GoogleOverviewWelcome 
          displayName={businessProfile?.displayName || location?.name || ""} 
          averageRating={currentAnalytics?.averageRating || 0} 
          totalReviews={currentAnalytics?.reviewCount || 0}
          isLoading={isLoadingAnalytics}
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

                  <GoogleMetricsOverview 
                    metrics={displayMetrics} 
                    periodicalMetrics={[]}
                    currentPeriodKey="all-time"
                      isLoading={isLoadingAnalytics}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* 2. ANALYTICS & CHARTS SECTION */}
        {/* Rating Distribution - Full Width */}
        <Grid size={{ xs: 12 }}>
          <GoogleRatingDistribution 
            businessProfile={businessProfile} 
            currentPeriodMetrics={{ ratingDistribution: currentAnalytics?.ratingDistribution }} 
            sx={{}}
          />
        </Grid>

        {/* Sentiment Analysis and Google Map - Side by Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <GoogleSentimentAnalysis 
            metrics={displayMetrics}
            title="Sentiment Analysis"
            subheader="Distribution of review sentiments"
            chart={{}}
            sx={{}}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <GoogleMap businessProfile={businessProfile} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          {/* @ts-ignore - Type compatibility issue between Prisma optional types and component props */}
          <GoogleRecentReviews reviews={reviews} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <GoogleBusinessInfo businessProfile={businessProfile} />
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
