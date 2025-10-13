'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TenantQuotas } from '@wirecrest/feature-flags';

import {
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Alert,
  Dialog,
  Button,
  Divider,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';

interface LimitReachedModalProps {
  open: boolean;
  onClose: () => void;
  quotaType: keyof TenantQuotas;
  currentUsage: number;
  limit: number;
  requiredPlan?: string;
  teamSlug?: string;
}

const QUOTA_LABELS: Record<keyof TenantQuotas, string> = {
  seats: 'Team Members',
  locations: 'Business Locations',
  reviewRateLimit: 'Review Scraping',
  apiCalls: 'API Calls',
  dataRetention: 'Data Retention',
  exportLimit: 'Data Exports',
};

const QUOTA_DESCRIPTIONS: Record<keyof TenantQuotas, string> = {
  seats: 'The number of team members who can access your account',
  locations: 'The number of business locations you can monitor',
  reviewRateLimit: 'The number of reviews you can scrape per period',
  apiCalls: 'The number of API requests you can make per period',
  dataRetention: 'How long we retain your historical data',
  exportLimit: 'The number of data exports you can perform per period',
};

const UPGRADE_BENEFITS: Record<keyof TenantQuotas, string[]> = {
  seats: [
    'Add unlimited team members',
    'Advanced role-based permissions',
    'Team activity tracking',
  ],
  locations: [
    'Monitor unlimited business locations',
    'Multi-location analytics',
    'Location comparison reports',
  ],
  reviewRateLimit: [
    'Higher review scraping limits',
    'More frequent updates',
    'Priority scraping queue',
  ],
  apiCalls: [
    'Increased API rate limits',
    'Advanced API features',
    'Dedicated API support',
  ],
  dataRetention: [
    'Extended data history',
    'Advanced trend analysis',
    'Historical comparisons',
  ],
  exportLimit: [
    'Unlimited data exports',
    'Advanced export formats',
    'Scheduled exports',
  ],
};

export function LimitReachedModal({
  open,
  onClose,
  quotaType,
  currentUsage,
  limit,
  requiredPlan = 'Professional',
  teamSlug,
}: LimitReachedModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    // Navigate to billing page
    if (teamSlug) {
      router.push(`/dashboard/teams/${teamSlug}/user/account/billing`);
    } else {
      router.push('/dashboard/user/account/billing');
    }
  };

  const usagePercentage = Math.min((currentUsage / limit) * 100, 100);
  const quotaLabel = QUOTA_LABELS[quotaType] || quotaType;
  const quotaDescription = QUOTA_DESCRIPTIONS[quotaType] || '';
  const benefits = UPGRADE_BENEFITS[quotaType] || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 24,
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" sx={{ fontSize: 28 }} />
          <Typography variant="h6">
            {quotaLabel} Limit Reached
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Alert Banner */}
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          You've reached your {quotaLabel.toLowerCase()} limit. Upgrade your plan to continue.
        </Alert>

        {/* Current Usage Display */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Current Usage
            </Typography>
            <Typography variant="h6" color="warning.main">
              {currentUsage} / {limit}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={usagePercentage}
            color="warning"
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" mt={0.5}>
            {quotaDescription}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Upgrade Benefits */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TrendingUpIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              Upgrade to {requiredPlan} Plan
            </Typography>
            <Chip label="Recommended" color="primary" size="small" />
          </Box>

          <Box display="flex" flexDirection="column" gap={1.5}>
            {benefits.map((benefit, index) => (
              <Box key={index} display="flex" alignItems="flex-start" gap={1}>
                <CheckCircleIcon color="success" sx={{ fontSize: 20, mt: 0.2 }} />
                <Typography variant="body2" color="text.secondary">
                  {benefit}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Additional Info */}
        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="caption" color="text.secondary">
            💡 <strong>Need help?</strong> Contact our support team if you have questions about upgrading your plan.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Not Now
        </Button>
        <Button
          onClick={handleUpgrade}
          variant="contained"
          color="primary"
          startIcon={<TrendingUpIcon />}
        >
          Upgrade Plan
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LimitReachedModal;
