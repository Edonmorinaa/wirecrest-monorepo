'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import useTeam from '@/hooks/useTeam';

import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

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
  
  const { team } = useTeam(teamSlug);
  const { businessProfile, isLoading: profileLoading } = useTikTokBusinessProfile(teamSlug);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
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

  const fetchAnalyticsData = useCallback(async () => {
    if (!businessProfile?.id) {
      console.log('No business profile available for analytics:', { businessProfile });
      setAnalyticsError('No business profile available');
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      console.log('Fetching analytics with:', {
        businessProfileId: businessProfile?.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        businessProfileExists: !!businessProfile
      });

      const analyticsParams = new URLSearchParams({
        businessProfileId: businessProfile.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/tiktok/analytics?${analyticsParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch analytics data';
        
        if (response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view this data.';
        } else if (response.status === 404) {
          errorMessage = 'Analytics data not found. Please check your date range.';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        if (!result.data || result.data === null) {
          setAnalyticsError('No data available for the selected date range');
          setToast({
            open: true,
            message: result.message || 'No analytics data found for the selected period',
            severity: 'warning'
          });
        } else {
          setAnalyticsData(result.data);
          setToast({
            open: true,
            message: 'Analytics data loaded successfully',
            severity: 'success'
          });
        }
      } else {
        throw new Error(result.error || 'Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalyticsError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to fetch analytics data',
        severity: 'error'
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [businessProfile, startDate, endDate]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleRetry = () => {
    fetchAnalyticsData();
  };

  const handleDateRangeChange = (newStartDate: Date | null, newEndDate: Date | null) => {
    if (newStartDate && newEndDate) {
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    }
  };

  if (profileLoading) {
    return (
      <DashboardContent maxWidth="xl" disablePadding={false} sx={{}} className="">
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="rectangular" height={400} />
        </Stack>
      </DashboardContent>
    );
  }

  if (!businessProfile && !profileLoading) {
    return (
      <DashboardContent maxWidth="xl" disablePadding={false} sx={{}} className="">
        <Alert severity="error">
          <Typography variant="body2">
            No TikTok business profile found. Please set up your TikTok business profile first.
          </Typography>
        </Alert>
      </DashboardContent>
    );
  }

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
        <TikTokGeneralInfo 
          data={analyticsData?.general} 
          businessProfile={businessProfile} 
        />

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
                  {analyticsError}
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
