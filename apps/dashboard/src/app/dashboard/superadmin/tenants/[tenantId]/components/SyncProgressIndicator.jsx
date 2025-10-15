'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

/**
 * SyncProgressIndicator Component
 * Displays detailed sync progress for a platform
 * Shows active syncing state with progress indicators
 */
export default function SyncProgressIndicator({ syncStatus, platform }) {
  if (!syncStatus?.isActive) return null;

  const { reviewsNew = 0, reviewsDuplicate = 0, reviewsUpdated = 0 } = syncStatus;

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 1.5,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        transition: 'all 0.3s ease',
      }}
    >
      <Stack spacing={1.5}>
        {/* Header with spinner */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={16} thickness={4} />
          <Typography variant="body2" fontWeight={600} color="primary.main">
            Syncing {platform} data...
          </Typography>
        </Stack>

        {/* Progress bar */}
        <LinearProgress
          variant="indeterminate"
          sx={{
            borderRadius: 1,
            height: 6,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 1,
            },
          }}
        />

        {/* Stats */}
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {reviewsNew > 0 && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify icon="solar:add-circle-bold" width={14} color="success.main" />
              <Typography variant="caption" color="text.secondary">
                {reviewsNew} new
              </Typography>
            </Stack>
          )}
          
          {reviewsUpdated > 0 && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify icon="solar:refresh-bold" width={14} color="info.main" />
              <Typography variant="caption" color="text.secondary">
                {reviewsUpdated} updated
              </Typography>
            </Stack>
          )}
          
          {reviewsDuplicate > 0 && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify icon="solar:copy-bold" width={14} color="warning.main" />
              <Typography variant="caption" color="text.secondary">
                {reviewsDuplicate} duplicates
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

