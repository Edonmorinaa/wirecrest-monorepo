'use client';

import { useParams } from 'next/navigation';
import { useRef, useMemo, useState, useEffect } from 'react';

import { useTripAdvisorReviews } from '@/hooks';
import { useTeamSlug } from '@/hooks/use-subdomain';
import useTripAdvisorOverview from '@/hooks/useTripAdvisorOverview';

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
  { key: '0', label: 'All Time', shortLabel: 'All' },
];

// ----------------------------------------------------------------------

export function TripAdvisorOverviewView() {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const rawSlug = subdomainTeamSlug || params.slug;
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const {
    businessProfile,
    overview,
    sentimentAnalysis,
    topKeywords,
    periodicalMetrics,
    isLoading,
    isError,
  } = useTripAdvisorOverview(slug);

  const { reviews } = useTripAdvisorReviews(slug, {
    limit: 10,
    sortBy: 'publishedDate',
    sortOrder: 'desc',
  });

  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const hasSetInitialPeriod = useRef(false);

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

  // Get periodic metrics for selected period
  const allTimePeriodMetrics = useMemo(() => {
    const metrics = periodicalMetrics?.find((metric) => metric.periodKey.toString() === '0');
    return metrics;
  }, [periodicalMetrics]);

  // Use current period data if available, fallback to overview snapshot data, then to profile data
  const displayMetrics = useMemo(() => {
    if (!businessProfile) return null;

    return {
      averageRating:
        currentPeriodMetrics?.averageRating || overview?.averageRating || businessProfile.rating,
      totalReviews:
        currentPeriodMetrics?.reviewCount ||
        overview?.totalReviews ||
        businessProfile.numberOfReviews ||
        0,
      responseRate: currentPeriodMetrics?.responseRatePercent,
      averageResponseTime: currentPeriodMetrics?.avgResponseTimeHours,
      sentimentAnalysis: currentPeriodMetrics
        ? {
            positive: currentPeriodMetrics.sentimentPositive || 0,
            neutral: currentPeriodMetrics.sentimentNeutral || 0,
            negative: currentPeriodMetrics.sentimentNegative || 0,
          }
        : sentimentAnalysis
        ? {
            positive: sentimentAnalysis.positiveCount || 0,
            neutral: sentimentAnalysis.neutralCount || 0,
            negative: sentimentAnalysis.negativeCount || 0,
          }
        : { positive: 0, neutral: 0, negative: 0 },
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

  // Show loading state
  if (isLoading) {
    return (
      <DashboardContent maxWidth="xl">
        <Box sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Skeleton variant="rectangular" height={200} />
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Skeleton variant="rectangular" height={400} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Skeleton variant="rectangular" height={400} />
              </Grid>
            </Grid>
          </Stack>
        </Box>
      </DashboardContent>
    );
  }

  // Show error state
  if (isError) {
    return (
      <DashboardContent maxWidth="xl">
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <AlertTitle>Error Loading Data</AlertTitle>
            Failed to load TripAdvisor Business Profile data. Please try refreshing the page.
          </Alert>
        </Box>
      </DashboardContent>
    );
  }

  // Show not found state
  // if (!businessProfile) {
  //   return (
  //     <DashboardContent maxWidth="xl">
  //       <Box sx={{ p: 3 }}>
  //         <Alert severity="warning">
  //           <AlertTitle>No Data Found</AlertTitle>
  //           No TripAdvisor Business Profile found for this tenant.
  //         </Alert>
  //       </Box>
  //     </DashboardContent>
  //   );
  // }

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <CustomBreadcrumbs
            heading="TripAdvisor Overview"
            links={[
              { name: 'Dashboard', href: paths.dashboard.root },
              { name: 'Teams', href: paths.dashboard.teams.root },
              { name: slug || 'Team', href: paths.dashboard.teams.bySlug(slug || '') },
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
            averageRating={allTimePeriodMetrics?.averageRating || overview?.averageRating || 0}
            totalReviews={allTimePeriodMetrics?.reviewCount || overview?.totalReviews || 0}
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

                  <TripAdvisorMetricsOverview
                    metrics={displayMetrics}
                    periodicalMetrics={periodicalMetrics?.filter((m: any) => m.periodKey != null).map((m: any) => ({
                      periodKey: m.periodKey,
                      averageRating: m.averageRating,
                      responseRatePercent: m.responseRatePercent,
                      avgResponseTimeHours: m.avgResponseTimeHours,
                      reviewCount: m.reviewCount,
                    })) || []}
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
            reviewCount={currentPeriodMetrics?.reviewCount || overview?.totalReviews || 0}
            oneStarCount={currentPeriodMetrics?.oneStarCount || overview?.oneStarCount || 0}
            twoStarCount={currentPeriodMetrics?.twoStarCount || overview?.twoStarCount || 0}
            threeStarCount={currentPeriodMetrics?.threeStarCount || overview?.threeStarCount || 0}
            fourStarCount={currentPeriodMetrics?.fourStarCount || overview?.fourStarCount || 0}
            fiveStarCount={currentPeriodMetrics?.fiveStarCount || overview?.fiveStarCount || 0}
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
              {overview?.lastUpdated
                ? new Date(overview.lastUpdated).toLocaleString()
                : 'Not available'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
