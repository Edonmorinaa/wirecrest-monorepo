'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function BookingErrorState({ error, onRefresh, onSettings }) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  const handleSettings = () => {
    if (onSettings) {
      onSettings();
    } else {
      // Navigate to settings page - you can customize this
      window.location.href = '/dashboard/teams/settings';
    }
  };

  // Determine error type and message
  const getErrorInfo = (errorObj) => {
    if (!errorObj) {
      return {
        title: 'Unknown Error',
        message: 'An unexpected error occurred while loading booking data.',
        icon: 'solar:bell-bold',
        color: 'error.main',
        bgColor: 'error.lighter',
      };
    }

    // Handle different error types
    if (errorObj.status === 401) {
      return {
        title: 'Authentication Required',
        message: 'Please log in again to access booking data.',
        icon: 'solar:lock-bold',
        color: 'warning.main',
        bgColor: 'warning.lighter',
      };
    }

    if (errorObj.status === 403) {
      return {
        title: 'Access Denied',
        message: 'You do not have permission to view this team&apos;s booking data.',
        icon: 'solar:shield-cross-bold',
        color: 'error.main',
        bgColor: 'error.lighter',
      };
    }

    if (errorObj.status === 404) {
      if (errorObj.message?.includes('identifier not found')) {
        return {
          title: 'Booking.com Not Configured',
          message: 'Your team needs to set up a Booking.com business identifier to start tracking analytics and reviews.',
          icon: 'solar:building-bold',
          color: 'info.main',
          bgColor: 'info.lighter',
        };
      }
      
      if (errorObj.message?.includes('business profile not found')) {
        return {
          title: 'Business Profile Not Found',
          message: 'Your Booking.com business profile has not been created yet. Please contact your administrator to set up the integration.',
          icon: 'solar:user-id-bold',
          color: 'warning.main',
          bgColor: 'warning.lighter',
        };
      }
      
      if (errorObj.message?.includes('overview data not found')) {
        return {
          title: 'Data Not Available',
          message: 'Booking.com overview data is not available yet. This usually means the initial data collection is still in progress.',
          icon: 'solar:database-bold',
          color: 'info.main',
          bgColor: 'info.lighter',
        };
      }

      return {
        title: 'Data Not Found',
        message: 'The requested booking data could not be found.',
        icon: 'solar:search-bold',
        color: 'warning.main',
        bgColor: 'warning.lighter',
      };
    }

    // Generic error
    return {
      title: 'Error Loading Data',
      message: errorObj.message || 'An error occurred while loading booking data. Please try again or contact support.',
      icon: 'solar:bell-bold',
      color: 'error.main',
      bgColor: 'error.lighter',
    };
  };

  const errorInfo = getErrorInfo(error);

  return (
    <Card sx={{ bgcolor: 'background.neutral' }}>
      <CardContent>
        <Stack spacing={3} alignItems="center" textAlign="center" sx={{ py: 8 }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: errorInfo.bgColor,
              color: errorInfo.color,
            }}
          >
            <Iconify icon={errorInfo.icon} sx={{ fontSize: 48 }} />
          </Box>

          <Stack spacing={2}>
            <Typography variant="h4" sx={{ color: 'text.primary' }}>
              {errorInfo.title}
            </Typography>
            
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 400 }}>
              {errorInfo.message}
            </Typography>
          </Stack>

          {/* Show specific instructions for setup errors */}
          {(error?.status === 404 && error?.message?.includes('identifier not found')) && (
            <Alert severity="info" sx={{ maxWidth: 500 }}>
              <AlertTitle>Setup Required</AlertTitle>
              To get started with Booking.com analytics, your team administrator needs to:
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                <li>Add a Booking.com business identifier in team settings</li>
                <li>Configure the integration with your Booking.com property</li>
                <li>Wait for initial data collection to complete</li>
              </Box>
            </Alert>
          )}

          <Stack direction="row" spacing={2}>
            {(error?.status === 404 && error?.message?.includes('identifier not found')) && (
              <Button
                variant="contained"
                size="large"
                onClick={handleSettings}
                startIcon={<Iconify icon="solar:settings-bold" />}
              >
                Configure Booking.com
              </Button>
            )}
            
            <Button
              variant="outlined"
              size="large"
              onClick={handleRefresh}
              startIcon={<Iconify icon="solar:refresh-bold" />}
            >
              Refresh Page
            </Button>
          </Stack>

          {/* Show benefits for setup errors */}
          {(error?.status === 404 && error?.message?.includes('identifier not found')) && (
            <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, maxWidth: 500 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
                What you&apos;ll get with Booking.com Analytics:
              </Typography>
              
              <Stack spacing={1} textAlign="left">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                  <Typography variant="body2">Real-time booking performance tracking</Typography>
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                  <Typography variant="body2">Customer review analysis and sentiment</Typography>
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                  <Typography variant="body2">Revenue and occupancy insights</Typography>
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                  <Typography variant="body2">Competitive analysis and market trends</Typography>
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                  <Typography variant="body2">Historical data and performance trends</Typography>
                </Stack>
              </Stack>
            </Box>
          )}

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Need help? Contact your team administrator or our support team for assistance with Booking.com setup.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
