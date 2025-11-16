'use client';

import useTeam from '@/hooks/useTeam';
import { useParams } from 'next/navigation';
import { useTeamSlug } from '@/hooks/use-subdomain';
import { useRef, useMemo, useState, useEffect } from 'react';
import useGoogleBusinessProfile from '@/hooks/useGoogleBusinessProfile';

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

import { GoogleMap } from '../google-map';
import { GoogleTopKeywords } from '../google-top-keywords';
import { GoogleBusinessInfo } from '../google-business-info';
import { GoogleRecentReviews } from '../google-recent-reviews';
import { GoogleOverviewWelcome } from '../google-overview-welcome';
import { GoogleMetricsOverview } from '../google-metrics-overview';
import { GoogleSentimentAnalysis } from '../google-sentiment-analysis';
import { GoogleRatingDistribution } from '../google-rating-distribution';
import { useGoogleReviews } from '@/hooks';

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

export function GoogleOverviewView() {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const slug = subdomainTeamSlug || params.slug;

  const { team } = useTeam(slug as string);
  const { businessProfile } = useGoogleBusinessProfile(slug as string);
  const { reviews } = useGoogleReviews(slug as string, {
    limit: 5,
    sortBy: 'publishedAtDate',
    sortOrder: 'desc',
  });

  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const hasSetInitialPeriod = useRef(false);

  // Filter time periods to only show those with review data
  const availableTimePeriods = useMemo(() => {
    if (!businessProfile?.overview?.periodicalMetrics) {
      return TIME_PERIODS.filter((period) => period.key === '0'); // Only show "All Time" if no metrics
    }

    const metrics = businessProfile.overview.periodicalMetrics;
    return TIME_PERIODS.filter((period) => {
      const metric = metrics.find((m) => m.periodKey.toString() === period.key);
      // Always include "All Time" period, and include others only if they have reviews
      return period.key === '0' || (metric && metric.reviewCount > 0);
    });
  }, [businessProfile?.overview?.periodicalMetrics]);

  // Auto-select first available period if current selection is not available
  useEffect(() => {
    if (availableTimePeriods.length > 0 && !hasSetInitialPeriod.current) {
      const isCurrentPeriodAvailable = availableTimePeriods.some(
        (p) => p.key === selectedPeriod
      );
      if (!isCurrentPeriodAvailable) {
        setSelectedPeriod(availableTimePeriods[0].key);
        hasSetInitialPeriod.current = true;
      }
    }
  }, [availableTimePeriods, selectedPeriod]);

  // Get periodic metrics for selected period
  const currentPeriodMetrics = useMemo(() => {
    const metrics = businessProfile?.overview?.periodicalMetrics?.find(
      (metric) => metric.periodKey.toString() === selectedPeriod
    );
    return metrics;
  }, [businessProfile?.overview?.periodicalMetrics, selectedPeriod]);

    // Get periodic metrics for selected period
    const allTimePeriodMetrics = useMemo(() => {
      const metrics = businessProfile?.overview?.periodicalMetrics?.find(
        (metric) => metric.periodKey.toString() === "0"
      );
      return metrics;
    }, [businessProfile?.overview?.periodicalMetrics]);

  // Use current period data if available, fallback to overview snapshot data, then to profile data
  const displayMetrics = useMemo(() => {
    if (!businessProfile) return null;

    return {
      averageRating:
        currentPeriodMetrics?.avgRating ||
        businessProfile.overview?.currentOverallRating ||
        businessProfile.rating,
      totalReviews:
        currentPeriodMetrics?.reviewCount ||
        businessProfile.overview?.currentTotalReviews ||
        businessProfile.userRatingCount,
      responseRate: currentPeriodMetrics?.responseRatePercent,
      averageResponseTime: currentPeriodMetrics?.avgResponseTimeHours
        ? `${currentPeriodMetrics.avgResponseTimeHours}h`
        : 'Not available',
      sentimentAnalysis: currentPeriodMetrics
        ? {
            positive: currentPeriodMetrics.sentimentPositive || 0,
            neutral: currentPeriodMetrics.sentimentNeutral || 0,
            negative: currentPeriodMetrics.sentimentNegative || 0,
          }
        : null,
      topKeywords: (() => {
        const keywords = currentPeriodMetrics?.topKeywords;
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
  }, [businessProfile, currentPeriodMetrics]);

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>


        <Grid size={{ xs: 12 }} >
        <CustomBreadcrumbs
          heading="Google Overview"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team.name, href: paths.dashboard.teams.bySlug(slug) },
            { name: 'Google Overview' },
          ]}
          action={
            <Button
            variant="contained"
            startIcon={<Iconify icon="solar:arrow-right-up-linear" width={20} height={20} 
            target="_blank"
            href={businessProfile.overview?.profileWebsiteUri}
            />}
          >
            Visit Website
          </Button>
          }
        />
        </Grid>

        {/* 1. HEADER & OVERVIEW SECTION */}
        {/* Google Business Header */}
        <Grid size={{ xs: 12 }}>
        <GoogleOverviewWelcome displayName={businessProfile?.displayName || ""} averageRating={allTimePeriodMetrics?.avgRating || 0} totalReviews={allTimePeriodMetrics?.reviewCount || 0}  />
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
                <Box key={period.key} sx={{ display: selectedPeriod === period.key ? 'block' : 'none' }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Typography variant="h6">{period.label}</Typography>
                    <Chip
                      label={`${displayMetrics?.totalReviews || 0} reviews`}
                      size="small"
                      color="primary"
                    />
                  </Stack>

                  <GoogleMetricsOverview 
                    metrics={displayMetrics} 
                    periodicalMetrics={businessProfile?.overview?.periodicalMetrics}
                    currentPeriodKey={selectedPeriod}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <GoogleRecentReviews reviews={reviews} />
        </Grid>

        {/* 2. ANALYTICS & CHARTS SECTION */}
        {/* Rating Distribution - Full Width */}
        <Grid size={{ xs: 12 }}>
          <GoogleRatingDistribution businessProfile={businessProfile} currentPeriodMetrics={currentPeriodMetrics} />
        </Grid>

        {/* Sentiment Analysis and Top Keywords - Side by Side */}
        <Grid size={{ xs: 12, md: 4 }}>
          <GoogleSentimentAnalysis metrics={displayMetrics} />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <GoogleTopKeywords keywords={displayMetrics?.topKeywords || []} />
        </Grid>

                {/* Google Map */}
        <Grid size={{ xs: 12, md: 4 }}>
          <GoogleMap businessProfile={businessProfile} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <GoogleBusinessInfo businessProfile={businessProfile} />
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
              Last updated: {businessProfile.overview?.lastRefreshedAt
                ? new Date(businessProfile.overview.lastRefreshedAt).toLocaleString()
                : 'Not available'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
