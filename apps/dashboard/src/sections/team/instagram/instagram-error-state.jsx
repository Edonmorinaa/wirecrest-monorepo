'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramErrorState() {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSettings = () => {
    // Navigate to settings page - you can customize this
    window.location.href = '/dashboard/teams/settings';
  };

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
              bgcolor: 'error.lighter',
              color: 'error.main',
            }}
          >
            <Iconify icon="solar:instagram-bold" sx={{ fontSize: 48 }} />
          </Box>

          <Stack spacing={2}>
            <Typography variant="h4" sx={{ color: 'text.primary' }}>
              Instagram Profile Not Found
            </Typography>
            
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 400 }}>
              Set up your Instagram business profile to start tracking analytics and performance metrics.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSettings}
              startIcon={<Iconify icon="solar:settings-bold" />}
            >
              Configure Instagram
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={handleRefresh}
              startIcon={<Iconify icon="solar:refresh-bold" />}
            >
              Refresh Page
            </Button>
          </Stack>

          <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, maxWidth: 500 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
              What you'll get with Instagram Analytics:
            </Typography>
            
            <Stack spacing={1} textAlign="left">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                <Typography variant="body2">Real-time follower growth tracking</Typography>
              </Stack>
              
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                <Typography variant="body2">Engagement rate analysis</Typography>
              </Stack>
              
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                <Typography variant="body2">Content performance insights</Typography>
              </Stack>
              
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                <Typography variant="body2">Posting strategy recommendations</Typography>
              </Stack>
              
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                <Typography variant="body2">Historical data trends</Typography>
              </Stack>
            </Stack>
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Need help? Contact our support team for assistance with Instagram setup.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
