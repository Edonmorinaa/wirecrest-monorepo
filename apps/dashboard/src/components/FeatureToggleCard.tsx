'use client';

import React, { useState, useEffect } from 'react';
import { FeatureKey } from '@wirecrest/feature-flags';

import {
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import {
  Box,
  Card,
  Chip,
  Alert,
  Switch,
  Tooltip,
  CardHeader,
  Typography,
  IconButton,
  CardContent,
  FormControlLabel,
  CircularProgress
} from '@mui/material';

interface FeatureToggleCardProps {
  platform: string;
  features: Array<{
    key: FeatureKey;
    label: string;
    enabled: boolean;
    source: 'plan' | 'override' | 'custom' | 'default';
    metadata?: Record<string, any>;
  }>;
  onFeatureToggle: (featureKey: FeatureKey, enabled: boolean) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export function FeatureToggleCard({
  platform,
  features,
  onFeatureToggle,
  loading = false,
  disabled = false
}: FeatureToggleCardProps) {
  const [localFeatures, setLocalFeatures] = useState(features);
  const [togglingFeatures, setTogglingFeatures] = useState<Set<FeatureKey>>(new Set());

  useEffect(() => {
    setLocalFeatures(features);
  }, [features]);

  const handleToggle = async (featureKey: FeatureKey, enabled: boolean) => {
    if (disabled || loading) return;

    setTogglingFeatures(prev => new Set(prev).add(featureKey));
    
    try {
      await onFeatureToggle(featureKey, enabled);
      setLocalFeatures(prev => 
        prev.map(f => f.key === featureKey ? { ...f, enabled } : f)
      );
    } catch (error) {
      console.error('Error toggling feature:', error);
      // Revert the change on error
      setLocalFeatures(prev => 
        prev.map(f => f.key === featureKey ? { ...f, enabled: !enabled } : f)
      );
    } finally {
      setTogglingFeatures(prev => {
        const newSet = new Set(prev);
        newSet.delete(featureKey);
        return newSet;
      });
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'plan': return 'primary';
      case 'override': return 'warning';
      case 'custom': return 'success';
      case 'default': return 'default';
      default: return 'default';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'plan': return 'Plan Default';
      case 'override': return 'Admin Override';
      case 'custom': return 'Custom Plan';
      case 'default': return 'System Default';
      default: return 'Unknown';
    }
  };

  const enabledCount = localFeatures.filter(f => f.enabled).length;
  const totalCount = localFeatures.length;

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" component="div">
              {platform}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={`${enabledCount}/${totalCount}`}
                size="small"
                color={enabledCount === totalCount ? 'success' : 'default'}
              />
              {enabledCount === totalCount && (
                <CheckIcon color="success" fontSize="small" />
              )}
            </Box>
          </Box>
        }
        action={
          <Tooltip title={`${platform} feature configuration`}>
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <CardContent>
        {localFeatures.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No features available for this platform
          </Alert>
        ) : (
          <Box>
            {localFeatures.map((feature) => {
              const isToggling = togglingFeatures.has(feature.key);
              const isEnabled = feature.enabled;
              
              return (
                <Box
                  key={feature.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' }
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <FormControlLabel
                      control={
                        <Box position="relative">
                          <Switch
                            checked={isEnabled}
                            onChange={(e) => handleToggle(feature.key, e.target.checked)}
                            disabled={disabled || loading || isToggling}
                            color="primary"
                          />
                          {isToggling && (
                            <CircularProgress
                              size={20}
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginTop: '-10px',
                                marginLeft: '-10px',
                              }}
                            />
                          )}
                        </Box>
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={isEnabled ? 600 : 400}>
                            {feature.label}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                            <Chip
                              label={getSourceLabel(feature.source)}
                              size="small"
                              color={getSourceColor(feature.source)}
                              variant="outlined"
                            />
                            {feature.source === 'override' && (
                              <Tooltip title="This feature has been manually overridden">
                                <WarningIcon color="warning" fontSize="small" />
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      }
                      sx={{ margin: 0, width: '100%' }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        
        {loading && (
          <Box display="flex" justifyContent="center" mt={2}>
            <CircularProgress size={24} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default FeatureToggleCard;
