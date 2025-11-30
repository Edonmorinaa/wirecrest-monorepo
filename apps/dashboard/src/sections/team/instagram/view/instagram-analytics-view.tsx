'use client';

import useTeam from '@/hooks/useTeam';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

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

import { useInstagramProfile, useInstagramAnalytics } from 'src/hooks/useLocations';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { InstagramGeneralInfo } from './instagram-general-info';
import { InstagramAnalyticsTabs } from './instagram-analytics-tabs';

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

export function InstagramAnalyticsView() {
  const params = useParams();
  const teamSlug = params?.slug as string;
  const locationSlug = params?.locationSlug as string;

  const { team } = useTeam(teamSlug);

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

  // Get Instagram profile using new hook
  const { profile: businessProfile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useInstagramProfile(
    locationSlug,
    teamSlug,
    !!teamSlug && !!locationSlug
  );

  // Get analytics data using new hook
  const { analytics: analyticsData, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useInstagramAnalytics(
    teamSlug,
    locationSlug,
    startDateISO,
    endDateISO,
    !!businessProfile
  );

  // Show toast on errors or success
  useMemo(() => {
    if (profileError) {
      setToast({
        open: true,
        message: 'Failed to load Instagram profile',
        severity: 'error'
      });
    } else if (analyticsError) {
      setToast({
        open: true,
        message: 'Failed to load analytics data',
        severity: 'error'
      });
    } else if (analyticsData && !analyticsLoading) {
      setToast({
        open: true,
        message: 'Analytics data loaded successfully',
        severity: 'success'
      });
    }
  }, [profileError, analyticsError, analyticsData, analyticsLoading]);

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
          heading="Instagram Analytics"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || 'Team', href: paths.dashboard.teams.bySlug(teamSlug) },
            { name: 'Instagram Analytics', href: '#' },
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
        <InstagramGeneralInfo
          data={analyticsData?.data?.general}
          businessProfile={businessProfile || undefined}
        />

        {/* Analytics Tabs */}
        {(profileLoading || analyticsLoading) ? (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Skeleton variant="rectangular" height={60} />
                <Skeleton variant="rectangular" height={400} />
              </Stack>
            </CardContent>
          </Card>
        ) : (profileError || analyticsError) ? (
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
                  {profileError ? 'Failed to load Instagram profile' : (analyticsData?.error || 'An error occurred')}
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <InstagramAnalyticsTabs
            data={analyticsData?.data}
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
