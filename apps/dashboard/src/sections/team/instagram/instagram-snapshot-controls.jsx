'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { trpc } from 'src/lib/trpc/client';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramSnapshotControls({ teamSlug, locationSlug, profile, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const triggerSnapshotMutation = trpc.platforms.triggerInstagramSnapshot.useMutation({
    onSuccess: async () => {
      if (onUpdate) await onUpdate();
      setSnackbar({
        open: true,
        message: 'Snapshot taken successfully!',
        severity: 'success',
      });
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Failed to trigger snapshot:', error);
      setSnackbar({
        open: true,
        message: 'Failed to take snapshot. Please try again.',
        severity: 'error',
      });
      setIsLoading(false);
    },
  });

  const handleTakeSnapshot = async () => {
    if (!teamSlug || !locationSlug) return;
    setIsLoading(true);
    try {
      await triggerSnapshotMutation.mutateAsync({ slug: teamSlug, locationSlug });
    } catch (error) {
      console.error('Error taking snapshot:', error);
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!onUpdate) return;
    setIsLoading(true);
    try {
      await onUpdate();
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

  if (!profile) {
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

          {profile.lastSnapshotAt && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Last snapshot: {new Date(profile.lastSnapshotAt).toLocaleDateString()}
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
