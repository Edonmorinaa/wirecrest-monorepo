'use client';

import useTeam from '@/hooks/useTeam';
import { useParams } from 'next/navigation';
import { useTeamSlug } from '@/hooks/use-subdomain';
import { useRef, useMemo, useState, useEffect } from 'react';
import { PlatformFeatureGate } from '@/components/feature-gates/PlatformFeatureGate';
import dayjs from 'dayjs';

import { useLocationBySlug, useInstagramProfile, useInstagramAnalytics } from 'src/hooks/useLocations';
import { LoadingState, ErrorState, EmptyState } from 'src/components/states';
import { CustomDateRangePicker } from 'src/components/custom-date-range-picker';

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
import { useTheme } from '@mui/material/styles';
import AlertTitle from '@mui/material/AlertTitle';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';



import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { InstagramKeyMetrics } from '../instagram-key-metrics';
import { InstagramBusinessInfo } from '../instagram-business-info';
import { InstagramContentAnalysis } from '../instagram-content-analysis';
import { InstagramProfileOverview } from '../instagram-profile-overview';
import { InstagramBusinessInsights } from '../instagram-business-insights';
import { InstagramSnapshotControls } from '../instagram-snapshot-controls';
import { InstagramAdvancedAnalytics } from '../instagram-advanced-analytics';
import { InstagramEngagementMetrics } from '../instagram-engagement-metrics';
import { InstagramPerformanceMetrics } from '../instagram-performance-metrics';

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

export function InstagramOverviewView() {
  const params = useParams();
  const theme = useTheme();
  const subdomainTeamSlug = useTeamSlug();
  const teamSlug = subdomainTeamSlug || params.slug;
  const locationSlug = params.locationSlug;

  const { team } = useTeam(teamSlug);

  // Get location by slug
  const { location, isLoading: locationLoading, error: locationError } = useLocationBySlug(teamSlug, locationSlug);

  // Get Instagram profile
  const { profile: businessProfile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useInstagramProfile(locationSlug, teamSlug, !!location);

  // Date range state
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempFromDate, setTempFromDate] = useState(null);
  const [tempToDate, setTempToDate] = useState(null);
  const [customRange, setCustomRange] = useState(null);

  // Calculate date range
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

    if (selectedPeriod === '0') { // All time (approx 20 years)
      start.setFullYear(end.getFullYear() - 20);
    } else {
      start.setDate(end.getDate() - days);
    }

    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [selectedPeriod, customRange]);

  // Get analytics
  const { analytics, isLoading: analyticsLoading, error: analyticsError } = useInstagramAnalytics(
    teamSlug,
    locationSlug,
    startDate,
    endDate,
    !!businessProfile
  );

  // 1. LOADING STATE
  if (locationLoading || (location && profileLoading)) {
    return (
      <DashboardContent maxWidth="xl">
        <LoadingState message="Loading Instagram overview..." />
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
          customMessage="The requested location could not be found."
        />
      </DashboardContent>
    );
  }

  // 3. PROFILE NOT FOUND
  if (!businessProfile && !profileLoading) {
    return (
      <DashboardContent maxWidth="xl">
        <CustomBreadcrumbs
          heading="Instagram Overview"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
            { name: location?.name || locationSlug, href: '#' },
            { name: 'Instagram Overview', href: '#' },
          ]}
          sx={{ mb: 3 }}
        />
        <EmptyState
          icon="solar:instagram-bold"
          title="Instagram Not Connected"
          message="Connect your Instagram Business Profile to start tracking analytics."
          action={
            <Button
              variant="contained"
              size="large"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              sx={{ mt: 2 }}
              onClick={() => window.location.href = paths.dashboard.teams.settings(teamSlug)}
            >
              Connect Instagram
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
        <ErrorState
          type="network"
          platform="Instagram"
          onRetry={() => window.location.reload()}
        />
      </DashboardContent>
    );
  }

  return (
    <PlatformFeatureGate
      platform="instagram"
      tenantId={teamSlug}
      showUpgradePrompt
      upgradeMessage="Instagram features are not available on your current plan."
    >
      <DashboardContent maxWidth="xl">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <CustomBreadcrumbs
              heading="Instagram Overview"
              links={[
                { name: 'Dashboard', href: paths.dashboard.root },
                { name: 'Teams', href: paths.dashboard.teams.root },
                { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
                { name: location?.name || locationSlug, href: '#' },
                { name: 'Instagram Overview', href: '#' },
              ]}
              action={
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:arrow-right-up-linear" width={20} height={20} />}
                  target="_blank"
                  href={`https://instagram.com/${businessProfile.username}`}
                >
                  Visit Profile
                </Button>
              }
            />
          </Grid>

          {/* 1. HEADER & OVERVIEW SECTION */}
          <Grid size={{ xs: 12 }}>
            <InstagramProfileOverview profile={businessProfile} generalMetrics={analytics?.general} />
          </Grid>

          {/* Time Period Selector */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="solar:chart-2-bold" />
                    <Typography variant="h6">Business Metrics</Typography>
                  </Stack>
                }
                subheader="Select a time period to view metrics"
                action={
                  selectedPeriod === 'custom' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="eva:calendar-outline" />}
                      onClick={() => {
                        setTempFromDate(customRange?.from || null);
                        setTempToDate(customRange?.to || null);
                        setDatePickerOpen(true);
                      }}
                    >
                      {customRange?.from && customRange?.to
                        ? `${dayjs(customRange.from).format('MMM D')} - ${dayjs(customRange.to).format('MMM D')}`
                        : 'Select Dates'}
                    </Button>
                  )
                }
              />
              <CardContent>
                <Tabs
                  value={selectedPeriod}
                  onChange={(e, newValue) => setSelectedPeriod(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 3 }}
                >
                  {TIME_PERIODS.map((period) => (
                    <Tab
                      key={period.key}
                      value={period.key}
                      label={period.shortLabel}
                      sx={{ minWidth: 'auto' }}
                    />
                  ))}
                </Tabs>

                {analyticsLoading ? (
                  <LoadingState message="Calculating analytics..." />
                ) : (
                  <InstagramKeyMetrics metrics={analytics?.overview} />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 2. ANALYTICS & CHARTS SECTION */}
          <Grid size={{ xs: 12 }}>
            <InstagramBusinessInsights growth={analytics?.growth} overview={analytics?.overview} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <InstagramEngagementMetrics engagement={analytics?.engagement} />
          </Grid>



          <Grid size={{ xs: 12 }}>
            <InstagramBusinessInfo profile={businessProfile} />
          </Grid>

          {/* 3. ADVANCED ANALYTICS SECTION */}
          <Grid size={{ xs: 12, md: 6 }}>
            <InstagramPerformanceMetrics profile={businessProfile} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <InstagramAdvancedAnalytics growth={analytics?.growth} engagement={analytics?.engagement} />
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <InstagramContentAnalysis history={analytics?.history} engagement={analytics?.engagement} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <InstagramSnapshotControls
              teamSlug={teamSlug}
              locationSlug={locationSlug}
              profile={businessProfile}
              onUpdate={refetchProfile}
            />
          </Grid>

          {/* 4. FOOTER SECTION */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mt: 3, textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Last updated:{' '}
                {businessProfile.lastSnapshotAt
                  ? new Date(businessProfile.lastSnapshotAt).toLocaleString()
                  : 'Not available'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

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
              setCustomRange({ from: tempFromDate, to: tempToDate });
              setDatePickerOpen(false);
            }
          }}
        />
      </DashboardContent>
    </PlatformFeatureGate>
  );
}
