'use client';

import { format } from 'date-fns';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramSnapshotControls() {
  const { businessProfile, isLoading } = useInstagramBusinessProfile();

  if (isLoading || !businessProfile) {
    return null;
  }

  const snapshotSchedule = businessProfile.snapshotSchedule;

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:clock-circle-bold" />
            <Typography variant="h6">Automatic Snapshots</Typography>
          </Stack>
        }
        subheader="Configure automatic daily snapshots with rate limiting and time gaps"
      />
      
      <CardContent>
        <Stack spacing={3}>
          {/* Snapshot Status */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'background.neutral',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: snapshotSchedule?.isEnabled ? 'success.main' : 'text.disabled',
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {snapshotSchedule?.isEnabled ? 'Automatic Snapshots Enabled' : 'Automatic Snapshots Disabled'}
              </Typography>
            </Stack>
            <Chip
              label={snapshotSchedule?.isEnabled ? 'Active' : 'Inactive'}
              color={snapshotSchedule?.isEnabled ? 'success' : 'default'}
              size="small"
            />
          </Box>

          {/* Snapshot Schedule Info */}
          {snapshotSchedule && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Snapshot Time
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {snapshotSchedule.snapshotTime}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Timezone
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {snapshotSchedule.timezone}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Last Success
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {snapshotSchedule.lastSuccessAt 
                    ? format(new Date(snapshotSchedule.lastSuccessAt), 'MMM dd, HH:mm')
                    : 'Never'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Failures
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {snapshotSchedule.consecutiveFailures || 0}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Rate Limiting Info */}
          <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">Rate Limiting</Typography>
              <Stack spacing={0.25}>
                <Typography variant="caption">• Maximum 2 snapshots per day</Typography>
                <Typography variant="caption">• Minimum 6-hour gap between snapshots</Typography>
                <Typography variant="caption">• Automatic retry on failure (max 3 attempts)</Typography>
                <Typography variant="caption">• Snapshots taken at scheduled time only</Typography>
              </Stack>
            </Stack>
          </Alert>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            {snapshotSchedule?.isEnabled ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:bell-off-bold" />}
                onClick={() => {
                  // TODO: Implement disable snapshots
                  console.log('Disable automatic snapshots');
                }}
                sx={{ flex: 1 }}
              >
                Disable Snapshots
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                startIcon={<Iconify icon="solar:bell-bold" />}
                onClick={() => {
                  // TODO: Implement enable snapshots
                  console.log('Enable automatic snapshots');
                }}
                sx={{ flex: 1 }}
              >
                Enable Snapshots
              </Button>
            )}
            
            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:settings-bold" />}
              onClick={() => {
                // TODO: Implement settings modal
                console.log('Open snapshot settings');
              }}
            >
              Settings
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
