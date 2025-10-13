'use client';

import React from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

import {
  Box,
  Card,
  Chip,
  Grid,
  Tooltip,
  CardHeader,
  Typography,
  IconButton,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  Info as InfoIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';

interface FeatureUsageCardProps {
  tenantId: string;
  onRefresh?: () => void;
}

interface FeatureUsage {
  feature: string;
  label: string;
  enabled: boolean;
  usage: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
}

export function FeatureUsageCard({ tenantId, onRefresh }: FeatureUsageCardProps) {
  const { features, loading, error, refresh } = useFeatureFlags(tenantId);

  // Mock feature usage data - in a real app, this would come from analytics
  const featureUsage: FeatureUsage[] = [
    {
      feature: 'google.reviews',
      label: 'Google Reviews',
      enabled: features['google.reviews'] || false,
      usage: 85,
      trend: 'up',
      category: 'Google'
    },
    {
      feature: 'facebook.overview',
      label: 'Facebook Overview',
      enabled: features['facebook.overview'] || false,
      usage: 72,
      trend: 'stable',
      category: 'Facebook'
    },
    {
      feature: 'twitter.alerts',
      label: 'Twitter Alerts',
      enabled: features['twitter.alerts'] || false,
      usage: 45,
      trend: 'down',
      category: 'Twitter'
    },
    {
      feature: 'instagram.engagement',
      label: 'Instagram Engagement',
      enabled: features['instagram.engagement'] || false,
      usage: 90,
      trend: 'up',
      category: 'Instagram'
    },
    {
      feature: 'platform.advancedAnalytics',
      label: 'Advanced Analytics',
      enabled: features['platform.advancedAnalytics'] || false,
      usage: 60,
      trend: 'up',
      category: 'Platform'
    },
    {
      feature: 'automation.scheduledScraping',
      label: 'Scheduled Scraping',
      enabled: features['automation.scheduledScraping'] || false,
      usage: 95,
      trend: 'stable',
      category: 'Automation'
    }
  ];

  const handleRefresh = async () => {
    await refresh();
    onRefresh?.();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" fontSize="small" />;
      case 'down':
        return <TrendingDownIcon color="error" fontSize="small" />;
      default:
        return null;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={2}>
            <Typography variant="body2" color="text.secondary">
              Loading feature usage...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="error">
            Error loading feature usage: {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const enabledFeatures = featureUsage.filter(f => f.enabled);
  const totalUsage = featureUsage.reduce((sum, f) => sum + f.usage, 0);
  const averageUsage = totalUsage / featureUsage.length;

  return (
    <Card>
      <CardHeader
        title="Feature Usage"
        action={
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Feature usage statistics">
              <IconButton size="small">
                <InfoIcon />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Box>
        }
      />
      <CardContent>
        {/* Summary Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {enabledFeatures.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enabled Features
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {Math.round(averageUsage)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Usage
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Feature Usage List */}
        <Box>
          {featureUsage.map((feature) => (
            <Box key={feature.feature} sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight={feature.enabled ? 600 : 400}>
                    {feature.label}
                  </Typography>
                  <Chip
                    label={feature.category}
                    size="small"
                    variant="outlined"
                    color={feature.enabled ? 'primary' : 'default'}
                  />
                  {getTrendIcon(feature.trend)}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {feature.usage}%
                </Typography>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={feature.usage}
                color={feature.enabled ? 'primary' : 'inherit'}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  opacity: feature.enabled ? 1 : 0.5
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Usage Insights */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Usage Insights
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {enabledFeatures.length === 0 
              ? 'No features are currently enabled for this tenant.'
              : `Most used feature: ${featureUsage
                  .filter(f => f.enabled)
                  .sort((a, b) => b.usage - a.usage)[0]?.label || 'N/A'}`
            }
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default FeatureUsageCard;
