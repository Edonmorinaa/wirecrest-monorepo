/**
 * Sync Status Indicator Component
 * Shows the current sync status for a platform
 * Used during initial data scraping to provide user feedback
 */

'use client';

import { useSyncStatus } from 'src/hooks/useSyncStatus';
import { CircularProgress, Chip, Box, Typography } from '@mui/material';
import { CheckCircle, Sync, Error as ErrorIcon, Schedule } from '@mui/icons-material';

interface SyncStatusIndicatorProps {
  /**
   * Team ID to monitor
   */
  teamId: string;
  
  /**
   * Platform to show status for (optional)
   * If not provided, shows overall sync status
   */
  platform?: string;
  
  /**
   * Compact mode (just icon and text)
   * @default false
   */
  compact?: boolean;
}

export function SyncStatusIndicator({
  teamId,
  platform,
  compact = false,
}: SyncStatusIndicatorProps) {
  const { syncStatus, isLoading, hasActiveSyncs, isInitialSyncComplete, getPlatformSyncStatus } = useSyncStatus({
    teamId,
    refreshInterval: 5000, // Poll every 5 seconds
    onlyPollWhenActive: true,
  });

  // If platform is specified, get platform-specific status
  const platformStatus = platform ? getPlatformSyncStatus(platform) : null;

  // Determine status
  const isActive = platformStatus?.isActive ?? hasActiveSyncs;
  const hasCompleted = platformStatus?.lastSync ?? isInitialSyncComplete;

  // Loading state
  if (isLoading) {
    return compact ? (
      <Chip
        size="small"
        icon={<CircularProgress size={16} />}
        label="Checking..."
        color="default"
        variant="outlined"
      />
    ) : (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Checking sync status...
        </Typography>
      </Box>
    );
  }

  // Active sync
  if (isActive) {
    return compact ? (
      <Chip
        size="small"
        icon={<Sync className="animate-spin" />}
        label="Syncing..."
        color="primary"
        variant="outlined"
      />
    ) : (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Sync color="primary" className="animate-spin" />
        <Box>
          <Typography variant="body2" fontWeight={500}>
            Data syncing in progress
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {platform ? `${platform} data is being fetched...` : 'Fetching platform data...'}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Completed
  if (hasCompleted) {
    const reviewsNew = platformStatus?.reviewsNew ?? 0;
    return compact ? (
      <Chip
        size="small"
        icon={<CheckCircle />}
        label="Synced"
        color="success"
        variant="outlined"
      />
    ) : (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircle color="success" />
        <Box>
          <Typography variant="body2" fontWeight={500}>
            Data synced successfully
          </Typography>
          {reviewsNew > 0 && (
            <Typography variant="caption" color="text.secondary">
              {reviewsNew} new reviews imported
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Waiting for initial sync
  return compact ? (
    <Chip
      size="small"
      icon={<Schedule />}
      label="Pending"
      color="warning"
      variant="outlined"
    />
  ) : (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Schedule color="warning" />
      <Box>
        <Typography variant="body2" fontWeight={500}>
          Waiting for initial sync
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Data will appear once syncing starts
        </Typography>
      </Box>
    </Box>
  );
}

