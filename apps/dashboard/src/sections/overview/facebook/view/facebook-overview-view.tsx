'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFacebookReviews } from '@/hooks';
import useFacebookBusinessProfile from '@/hooks/useFacebookBusinessProfile';
import { useTeamSlug } from '@/hooks/use-subdomain';
import useTeam from '@/hooks/useTeam';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FacebookMap, 
        FacebookContactInfo,
        FacebookTopKeywords,
        FacebookBusinessInfo,
        FacebookRecentReviews,
        FacebookReviewQuality,
        FacebookRecentActivity,
        FacebookContentAnalysis,
        FacebookMetricsOverview,
        FacebookOverviewWelcome,
        FacebookEmotionalAnalysis,
        FacebookEngagementMetrics,
        FacebookSentimentAnalysis,
        FacebookRatingDistribution,
 } from '../components';

// Time period options for metrics
const TIME_PERIODS = [
  { key: '3', label: 'Last 3 Days', shortLabel: '3d' },
  { key: '7', label: 'Last 7 Days', shortLabel: '7d' },
  { key: '30', label: 'Last 30 Days', shortLabel: '30d' },
  { key: '180', label: 'Last 6 Months', shortLabel: '6m' },
  { key: '365', label: 'Last Year', shortLabel: '1y' },
  { key: '0', label: 'All Time', shortLabel: 'All' },
];

// ----------------------------------------------------------------------

export function FacebookOverviewView() {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const slug = (subdomainTeamSlug || params.slug) as string;

  const { team } = useTeam(slug);
  const { businessProfile } = useFacebookBusinessProfile(slug);
  const { reviews } = useFacebookReviews(slug, {
    limit: 5,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const hasSetInitialPeriod = useRef(false);

  // Filter time periods to only show those with review data
  const availableTimePeriods = useMemo(() => {
    if (!businessProfile?.overview?.facebookPeriodicalMetric) {
      return TIME_PERIODS.filter((period) => period.key === '0'); // Only show "All Time" if no metrics
    }

    const metrics = businessProfile.overview.facebookPeriodicalMetric;
    return TIME_PERIODS.filter((period) => {
      const metric = metrics.find((m) => m.periodKey.toString() === period.key);
      // Always include "All Time" period, and include others only if they have reviews
      return period.key === '0' || (metric && metric.reviewCount > 0);
    });
  }, [businessProfile?.overview?.facebookPeriodicalMetric]);

  // Auto-select first available period if current selection is not available
  useEffect(() => {
    if (availableTimePeriods.length > 0 && !hasSetInitialPeriod.current) {
      setSelectedPeriod(availableTimePeriods[0].key);
      hasSetInitialPeriod.current = true;
    }
  }, [availableTimePeriods]);

  // Get current period metrics
  const currentPeriodMetrics = useMemo(() => {
    if (!businessProfile?.overview?.facebookPeriodicalMetric) return null;
    
    const currentPeriod = businessProfile.overview.facebookPeriodicalMetric.find(
      (metric) => metric.periodKey.toString() === selectedPeriod
    );
    
    return currentPeriod || null;
  }, [businessProfile?.overview?.facebookPeriodicalMetric, selectedPeriod]);

  // Get all-time metrics for header
  const allTimePeriodMetrics = useMemo(() => {
    if (!businessProfile?.overview) return { recommendationRate: 0, reviewCount: 0 };
    
    const allTimeMetric = businessProfile.overview.facebookPeriodicalMetric?.find(
      (metric) => metric.periodKey === 0
    );
    
    if (allTimeMetric) {
      return {
        recommendationRate: Number(allTimeMetric.recommendationRate) || 0,
        reviewCount: Number(allTimeMetric.reviewCount) || 0,
      };
    }
    
    // Fallback to overview data
    return {
      recommendationRate: Number(businessProfile.overview.recommendationRate) || 0,
      reviewCount: Number(businessProfile.overview.totalReviews) || 0,
    };
  }, [businessProfile?.overview]);

  // Get display metrics for current period
  const displayMetrics = useMemo(() => {
    if (!currentPeriodMetrics) return null;

    return {
      // Facebook-specific metrics
      totalReviews: Number(currentPeriodMetrics.reviewCount) || 0,
      recommendedCount: Number(currentPeriodMetrics.recommendedCount) || 0,
      notRecommendedCount: Number(currentPeriodMetrics.notRecommendedCount) || 0,
      recommendationRate: Number(currentPeriodMetrics.recommendationRate) || 0,
      totalLikes: Number(currentPeriodMetrics.totalLikes) || 0,
      totalComments: Number(currentPeriodMetrics.totalComments) || 0,
      totalPhotos: Number(currentPeriodMetrics.totalPhotos) || 0,
      engagementRate: Number(currentPeriodMetrics.engagementRate) || 0,
      responseRate: Number(currentPeriodMetrics.responseRatePercent) || 0,
      avgResponseTime: Number(currentPeriodMetrics.avgResponseTimeHours) || 0,
      
      // Analysis data
      sentimentAnalysis: businessProfile?.overview?.sentimentAnalysis,
      emotionalAnalysis: businessProfile?.overview?.emotionalAnalysis,
      reviewQuality: businessProfile?.overview?.reviewQuality,
      contentLength: businessProfile?.overview?.contentLength,
      topKeywords: businessProfile?.overview?.keywords || [],
      recentReviews: businessProfile?.overview?.recentReviews || [],
    };
  }, [currentPeriodMetrics, businessProfile?.overview]);

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>

        <Grid size={{ xs: 12 }} >
        <CustomBreadcrumbs
          heading="Facebook Overview"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || '', href: paths.dashboard.teams.bySlug(slug as string) },
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
        <FacebookOverviewWelcome displayName={businessProfile.pageName || businessProfile.title} recommendationRate={allTimePeriodMetrics.recommendationRate} totalReviews={allTimePeriodMetrics.reviewCount} sx={{}} />
      </Grid>

        {/* Time Period Selector and Key Metrics */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              {availableTimePeriods.length > 1 && (
                <Tabs
                  value={selectedPeriod}
                  onChange={(event, newValue) => setSelectedPeriod(newValue)}
                  sx={{ mb: 3 }}
                >
                  {availableTimePeriods.map((period) => (
                    <Tab
                      key={period.key}
                      label={period.shortLabel}
                      value={period.key}
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

                  <FacebookMetricsOverview 
                    metrics={displayMetrics} 
                    periodicalMetrics={businessProfile?.overview?.facebookPeriodicalMetric}
                    currentPeriodKey={selectedPeriod}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <FacebookRecentReviews reviews={reviews} />
        </Grid>

        {/* 2. ANALYTICS & CHARTS SECTION */}
        {/* Rating Distribution - Full Width */}
        <Grid size={{ xs: 12 }}>
          <FacebookRatingDistribution businessProfile={businessProfile as any} currentPeriodMetrics={currentPeriodMetrics as any} />
        </Grid>

        {/* Sentiment Analysis and Emotional Analysis - Side by Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookSentimentAnalysis title="" subheader="" chart={{}} metrics={displayMetrics as any} sx={{}} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookEmotionalAnalysis emotionalAnalysis={displayMetrics?.emotionalAnalysis} sx={{}} />
        </Grid>

        {/* Top Keywords and Review Quality - Side by Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookTopKeywords keywords={displayMetrics?.topKeywords || []} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookReviewQuality reviewQuality={displayMetrics?.reviewQuality} sx={{}} />
        </Grid>

        {/* Content Analysis and Engagement Metrics - Side by Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookContentAnalysis contentLength={displayMetrics?.contentLength} sx={{}} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookEngagementMetrics overview={businessProfile?.overview} sx={{}} />
        </Grid>

        {/* Recent Review Activity - Full Width */}
        <Grid size={{ xs: 12 }}>
          <FacebookRecentActivity recentReviews={displayMetrics?.recentReviews || []} sx={{}} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FacebookContactInfo businessProfile={businessProfile} sx={{}} />
        </Grid>

        {/* Facebook Map - Full Width */}
        <Grid size={{ xs: 12 }}>
          <FacebookMap businessProfile={businessProfile} />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}