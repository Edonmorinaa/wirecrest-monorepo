import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { Iconify } from 'src/components/iconify';
import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';

// ----------------------------------------------------------------------

export function TikTokSnapshotControls() {
  const { businessProfile, mutateBusinessProfile, takeSnapshot } = useTikTokBusinessProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleTakeSnapshot = async () => {
    if (!businessProfile) return;

    setIsLoading(true);
    try {
      await takeSnapshot();
      setSnackbar({
        open: true,
        message: 'Snapshot taken successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error taking snapshot:', error);
      setSnackbar({
        open: true,
        message: 'Failed to take snapshot. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await mutateBusinessProfile();
      setSnackbar({
        open: true,
        message: 'Data refreshed successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to refresh data. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (!businessProfile) {
    return null;
  }

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Data Controls
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:camera-bold" />}
              onClick={handleTakeSnapshot}
              disabled={isLoading}
            >
              Take Snapshot
            </Button>

            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:refresh-bold" />}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Refresh Data
            </Button>
          </Box>

          {businessProfile.dailySnapshots?.length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Last snapshot: {new Date(businessProfile.dailySnapshots[0].snapshotDate).toLocaleDateString()}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
