'use client';

import { format } from 'date-fns';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';



import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramPerformanceMetrics({ profile }) {
  if (!profile) {
    return null;
  }

  const accountAge = profile.createdAt
    ? Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const trackingDuration = profile.firstSnapshotAt
    ? Math.floor((Date.now() - new Date(profile.firstSnapshotAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const snapshotFrequency = profile.totalSnapshots > 1 && profile.firstSnapshotAt
    ? (profile.totalSnapshots / Math.max(1, Math.floor((Date.now() - new Date(profile.firstSnapshotAt).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)
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
              label={profile.isActive ? 'Active' : 'Inactive'}
              color={profile.isActive ? 'success' : 'default'}
              size="small"
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Last Update</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {profile.updatedAt
                ? format(new Date(profile.updatedAt), 'MMM dd, HH:mm')
                : 'Never'}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Total Snapshots</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {profile.totalSnapshots.toLocaleString()}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Last Snapshot</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {profile.lastSnapshotAt
                ? format(new Date(profile.lastSnapshotAt), 'MMM dd, HH:mm')
                : 'Never'}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
