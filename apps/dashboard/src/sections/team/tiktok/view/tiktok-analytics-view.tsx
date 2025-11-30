'use client';

import useTeam from '@/hooks/useTeam';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { paths } from 'src/routes/paths';

import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';
import { useTikTokAnalytics } from 'src/hooks/useLocations';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { TikTokGeneralInfo } from './tiktok-general-info';
import { TikTokAnalyticsTabs } from './tiktok-analytics-tabs';

// ----------------------------------------------------------------------

interface AnalyticsData {
  general?: any;
  overview?: any;
  growth?: any;
  engagement?: any;
  history?: any;
}

interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export function TikTokAnalyticsView() {
  const params = useParams();
  const teamSlug = params?.slug as string;
  const locationSlug = params?.locationSlug as string;

  const { team } = useTeam(teamSlug);
  const { businessProfile, refetch: refetchProfile } = useTikTokBusinessProfile(teamSlug, locationSlug);

  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last week
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Convert dates to ISO strings for the hook
  const startDateISO = useMemo(() => startDate.toISOString(), [startDate]);
  const endDateISO = useMemo(() => endDate.toISOString(), [endDate]);

  // Get analytics data using new hook
  const { analytics: analyticsResult, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useTikTokAnalytics(
    teamSlug,
    locationSlug,
    startDateISO,
    endDateISO,
    !!businessProfile
  );

  const analyticsData = analyticsResult?.data;

  // Show toast on errors or success
  useMemo(() => {
    if (analyticsError) {
      setToast({
        open: true,
        message: 'Failed to load analytics data',
        severity: 'error'
      });
    } else if (analyticsResult?.success && analyticsData && !analyticsLoading) {
      setToast({
        open: true,
        message: 'Analytics data loaded successfully',
        severity: 'success'
      });
    } else if (analyticsResult?.success === false) {
      setToast({
        open: true,
        message: analyticsResult.error || 'Failed to load analytics data',
        severity: 'error'
      });
    }
  }, [analyticsError, analyticsResult, analyticsData, analyticsLoading]);

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleRetry = () => {
    refetchProfile();
    refetchAnalytics();
  };

  const handleDateRangeChange = (newStartDate: Date | null, newEndDate: Date | null) => {
    if (newStartDate && newEndDate) {
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    }
  };

  return (
    <DashboardContent maxWidth="xl" disablePadding={false} sx={{}} className="">
      <Stack spacing={3}>
        {/* Breadcrumbs */}
        <CustomBreadcrumbs
          heading="TikTok Analytics"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || 'Team', href: paths.dashboard.teams.bySlug(teamSlug) },
            { name: 'TikTok Analytics' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
          action={null}
          backHref=""
        />

        {/* Date Range Picker */}
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Iconify icon="eva:calendar-outline" width={20} height={20} className="" sx={{ fontSize: 20 }} />
              <Typography variant="h6">Date Range</Typography>
            </Stack>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => {
                      if (newValue) {
                        handleDateRangeChange(newValue instanceof Date ? newValue : newValue.toDate(), endDate);
                      }
                    }}
                    maxDate={endDate}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => {
                      if (newValue) {
                        handleDateRangeChange(startDate, newValue instanceof Date ? newValue : newValue.toDate());
                      }
                    }}
                    minDate={startDate}
                    maxDate={new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </CardContent>
        </Card>

        {/* General Information */}
        <TikTokGeneralInfo />

        {/* Analytics Tabs */}
        {analyticsLoading ? (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Skeleton variant="rectangular" height={60} />
                <Skeleton variant="rectangular" height={400} />
              </Stack>
            </CardContent>
          </Card>
        ) : analyticsError ? (
          <Card>
            <CardContent>
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={handleRetry}>
                    Retry
                  </Button>
                }
              >
                <Typography variant="body2">
                  {analyticsError?.message || analyticsResult?.error || 'An error occurred'}
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <TikTokAnalyticsTabs
            data={analyticsData}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </Stack>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
