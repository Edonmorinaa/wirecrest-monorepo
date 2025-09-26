'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';

import {
  Box,
  Grid,
  Card,
  Chip,
  Alert,
  Switch,
  Button,
  Tooltip,
  Snackbar,
  TextField,
  FormGroup,
  FormLabel,
  Accordion,
  Typography,
  CardHeader,
  IconButton,
  FormControl,
  FormControlLabel,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  Sync as SyncIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  AdminPanelSettings as AdminIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

interface TwitterConfig {
  id: string;
  teamId: string;
  maxProfiles: number;
  allowProfileCreation: boolean;
  allowProfileDeletion: boolean;
  allowProfileRefresh: boolean;
  autoSyncEnabled: boolean;
  syncIntervalHours: number;
  maxTweetsPerProfile: number;
  includeReplies: boolean;
  includeRetweets: boolean;
  includeMediaOnly: boolean;
  notifyOnNewTweets: boolean;
  notifyOnProfileUpdate: boolean;
  notificationChannels: string[];
  allowCustomBios: boolean;
  requireApproval: boolean;
  customApifyConfig: any;
  rateLimitPerHour: number;
  rateLimitPerDay: number;
  createdAt: string;
  updatedAt: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface TwitterConfigManagementProps {
  tenantId: string;
}

export default function TwitterConfigManagement({ tenantId }: TwitterConfigManagementProps) {
  const [config, setConfig] = useState<TwitterConfig | null>({
    id: '',
    teamId: tenantId,
    maxProfiles: 5,
    allowProfileCreation: true,
    allowProfileDeletion: true,
    allowProfileRefresh: true,
    autoSyncEnabled: false,
    syncIntervalHours: 24,
    maxTweetsPerProfile: 10,
    includeReplies: false,
    includeRetweets: false,
    includeMediaOnly: false,
    notifyOnNewTweets: false,
    notifyOnProfileUpdate: false,
    notificationChannels: [],
    allowCustomBios: true,
    requireApproval: false,
    customApifyConfig: null,
    rateLimitPerHour: 100,
    rateLimitPerDay: 10000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  useEffect(() => {
    loadConfig();
  }, [tenantId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/tenants/${tenantId}/twitter-config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setTenant(data.tenant);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load configuration');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to load configuration',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/superadmin/tenants/${tenantId}/twitter-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setToast({
          open: true,
          message: 'Configuration saved successfully',
          severity: 'success',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save configuration',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/superadmin/tenants/${tenantId}/twitter-config`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setToast({
          open: true,
          message: 'Configuration reset to defaults',
          severity: 'success',
        });
        await loadConfig();
      } else {
        throw new Error('Failed to reset configuration');
      }
    } catch (error) {
      console.error('Error resetting config:', error);
      setToast({
        open: true,
        message: 'Failed to reset configuration',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (field: keyof TwitterConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const handleNotificationChannelToggle = (channel: string) => {
    if (!config) return;
    const channels = config.notificationChannels.includes(channel)
      ? config.notificationChannels.filter((c) => c !== channel)
      : [...config.notificationChannels, channel];
    setConfig({ ...config, notificationChannels: channels });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading configuration...</Typography>
      </Box>
    );
  }

  if (!config || !tenant) {
    return (
      <Alert severity="error">
        Failed to load Twitter profile configuration. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with tenant info */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<AdminIcon color="primary" />}
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5">Twitter Profile Configuration</Typography>
              <Chip label="Super Admin" color="primary" size="small" />
            </Box>
          }
          subheader={
            <Box>
              <Typography variant="body2" color="text.secondary">
                Managing configuration for: <strong>{tenant.name}</strong> ({tenant.slug})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date(config.updatedAt).toLocaleString()}
              </Typography>
            </Box>
          }
          action={
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                component={Link}
                href="/twitter-configs"
              >
                Back to List
              </Button>
              <Tooltip title="Refresh Configuration">
                <IconButton onClick={loadConfig} disabled={saving}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveConfig}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          }
        />
      </Card>

      {/* Super Admin Notice */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          <strong>Super Admin Access:</strong> You are managing Twitter profile configuration for
          this tenant. Changes will affect all team members and override any team-level settings.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Profile Management Settings */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Profile Management
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Maximum Profiles"
                    type="number"
                    value={config.maxProfiles || 5}
                    onChange={(e) =>
                      handleConfigChange('maxProfiles', parseInt(e.target.value) || 5)
                    }
                    inputProps={{ min: 1, max: 50 }}
                    helperText="Maximum number of Twitter profiles per team (1-50)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Tweets Per Profile"
                    type="number"
                    value={config.maxTweetsPerProfile || 10}
                    onChange={(e) =>
                      handleConfigChange('maxTweetsPerProfile', parseInt(e.target.value) || 10)
                    }
                    inputProps={{ min: 1, max: 100 }}
                    helperText="Maximum tweets to fetch per profile (1-100)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.allowProfileCreation}
                          onChange={(e) =>
                            handleConfigChange('allowProfileCreation', e.target.checked)
                          }
                        />
                      }
                      label="Allow Profile Creation"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.allowProfileDeletion}
                          onChange={(e) =>
                            handleConfigChange('allowProfileDeletion', e.target.checked)
                          }
                        />
                      }
                      label="Allow Profile Deletion"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.allowProfileRefresh}
                          onChange={(e) =>
                            handleConfigChange('allowProfileRefresh', e.target.checked)
                          }
                        />
                      }
                      label="Allow Profile Refresh"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Sync Settings */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                <SyncIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Sync Settings
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.autoSyncEnabled}
                        onChange={(e) => handleConfigChange('autoSyncEnabled', e.target.checked)}
                      />
                    }
                    label="Enable Auto Sync"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Sync Interval (Hours)"
                    type="number"
                    value={config.syncIntervalHours || 24}
                    onChange={(e) =>
                      handleConfigChange('syncIntervalHours', parseInt(e.target.value) || 24)
                    }
                    inputProps={{ min: 1, max: 168 }}
                    disabled={!config.autoSyncEnabled}
                    helperText="How often to automatically sync profiles (1-168 hours)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.includeReplies}
                          onChange={(e) => handleConfigChange('includeReplies', e.target.checked)}
                        />
                      }
                      label="Include Replies in Tweets"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.includeRetweets}
                          onChange={(e) => handleConfigChange('includeRetweets', e.target.checked)}
                        />
                      }
                      label="Include Retweets"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.includeMediaOnly}
                          onChange={(e) => handleConfigChange('includeMediaOnly', e.target.checked)}
                        />
                      }
                      label="Include Media Only Tweets"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Notifications
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.notifyOnNewTweets}
                          onChange={(e) =>
                            handleConfigChange('notifyOnNewTweets', e.target.checked)
                          }
                        />
                      }
                      label="Notify on New Tweets"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.notifyOnProfileUpdate}
                          onChange={(e) =>
                            handleConfigChange('notifyOnProfileUpdate', e.target.checked)
                          }
                        />
                      }
                      label="Notify on Profile Updates"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Notification Channels</FormLabel>
                    <FormGroup row>
                      {['email', 'slack', 'webhook'].map((channel) => (
                        <FormControlLabel
                          key={channel}
                          control={
                            <Switch
                              checked={config.notificationChannels.includes(channel)}
                              onChange={() => handleNotificationChannelToggle(channel)}
                            />
                          }
                          label={channel.charAt(0).toUpperCase() + channel.slice(1)}
                        />
                      ))}
                    </FormGroup>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Custom Bio Settings */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                <HelpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Custom Bio Settings
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.allowCustomBios}
                          onChange={(e) => handleConfigChange('allowCustomBios', e.target.checked)}
                        />
                      }
                      label="Allow Custom Bios"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.requireApproval}
                          onChange={(e) => handleConfigChange('requireApproval', e.target.checked)}
                          disabled={!config.allowCustomBios}
                        />
                      }
                      label="Require Approval for Custom Bios"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Rate Limiting */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Rate Limiting
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Rate Limit Per Hour"
                    type="number"
                    value={config.rateLimitPerHour || 100}
                    onChange={(e) =>
                      handleConfigChange('rateLimitPerHour', parseInt(e.target.value) || 100)
                    }
                    inputProps={{ min: 1, max: 1000 }}
                    helperText="Maximum API calls per hour (1-1000)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Rate Limit Per Day"
                    type="number"
                    value={config.rateLimitPerDay || 10000}
                    onChange={(e) =>
                      handleConfigChange('rateLimitPerDay', parseInt(e.target.value) || 10000)
                    }
                    inputProps={{ min: 1, max: 10000 }}
                    helperText="Maximum API calls per day (1-10000)"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      <Box mt={4} display="flex" justifyContent="space-between" alignItems="center">
        <Button variant="outlined" color="warning" onClick={resetConfig} disabled={saving}>
          Reset to Defaults
        </Button>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={loadConfig} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
