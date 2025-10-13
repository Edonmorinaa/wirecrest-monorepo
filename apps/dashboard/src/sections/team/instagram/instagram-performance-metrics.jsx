'use client';

import { format } from 'date-fns';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramPerformanceMetrics() {
  const { businessProfile, isLoading } = useInstagramBusinessProfile();

  if (isLoading || !businessProfile) {
    return null;
  }

  const accountAge = businessProfile.createdAt 
    ? Math.floor((Date.now() - new Date(businessProfile.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const trackingDuration = businessProfile.firstSnapshotAt 
    ? Math.floor((Date.now() - new Date(businessProfile.firstSnapshotAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const snapshotFrequency = businessProfile.totalSnapshots > 1 && businessProfile.firstSnapshotAt
    ? (businessProfile.totalSnapshots / Math.max(1, Math.floor((Date.now() - new Date(businessProfile.firstSnapshotAt).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)
    : 'Daily';

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:target-bold" />
            <Typography variant="h6">Performance Metrics</Typography>
          </Stack>
        }
        action={
          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              // TODO: Add info modal
              console.log('Show performance metrics details');
            }}
          >
            <Iconify icon="solar:info-circle-bold" />
          </Button>
        }
      />
      
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Account Age</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {accountAge ? `${accountAge} days` : 'Unknown'}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Tracking Duration</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {trackingDuration ? `${trackingDuration} days` : 'Not started'}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Snapshot Frequency</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {snapshotFrequency} per day
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Account Status</Typography>
            <Chip
              label={businessProfile.isActive ? 'Active' : 'Inactive'}
              color={businessProfile.isActive ? 'success' : 'default'}
              size="small"
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Last Update</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {businessProfile.updatedAt 
                ? format(new Date(businessProfile.updatedAt), 'MMM dd, HH:mm')
                : 'Never'}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Total Snapshots</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {businessProfile.totalSnapshots.toLocaleString()}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Last Snapshot</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {businessProfile.lastSnapshotAt 
                ? format(new Date(businessProfile.lastSnapshotAt), 'MMM dd, HH:mm')
                : 'Never'}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
