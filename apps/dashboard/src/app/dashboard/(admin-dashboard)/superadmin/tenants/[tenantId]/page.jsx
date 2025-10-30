'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { SuperRole } from '@prisma/client';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContentText from '@mui/material/DialogContentText';

import { PLATFORM_DISPLAY_CONFIGS, SOCIAL_PLATFORM_DISPLAY_CONFIGS } from '@wirecrest/core';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { RoleGuard } from 'src/components/guards';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useSuperAdminTenant } from '@/hooks/useSuperAdminTenant';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import {
  deletePlatformData,
  executePlatformAction,
  createOrUpdateMarketIdentifierEnhanced
} from '@/actions/admin';

import ActivityTab from './components/ActivityTab';
import StatsCard from './components/StatsCard';
import PlatformCard from './components/PlatformCard';
import InstagramCard from './components/InstagramCard';
import TenantMembersTab from './components/TenantMembersTab';

const platformConfig = PLATFORM_DISPLAY_CONFIGS;
const socialPlatformConfig = SOCIAL_PLATFORM_DISPLAY_CONFIGS;

// Platform mapping for backend API calls
const PLATFORM_MAPPING = {
  GOOGLE: 'GOOGLE_MAPS',
  FACEBOOK: 'FACEBOOK',
  TRIPADVISOR: 'TRIPADVISOR',
  BOOKING: 'BOOKING',
  INSTAGRAM: 'INSTAGRAM',
  TIKTOK: 'TIKTOK'
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tenant-tabpanel-${index}`}
      aria-labelledby={`tenant-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

export default function SuperAdminTenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId;

  const [tabValue, setTabValue] = useState(0);
  const [marketIdentifiers, setMarketIdentifiers] = useState({});
  const [platformLoadingStates, setPlatformLoadingStates] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePlatform, setDeletePlatform] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const {
    tenant,
    platforms,
    recentActivity,
    stats,
    isLoading,
    error,
    refresh
  } = useSuperAdminTenant(tenantId);

  // Use sync status hook for real-time updates
  const { syncStatus, getPlatformSyncStatus } = useSyncStatus({
    teamId: tenantId,
    refreshInterval: 5000, // Poll every 5 seconds
    onlyPollWhenActive: true,
  });

  // Initialize market identifiers when data loads
  useEffect(() => {
    if (platforms) {
      const identifiers = {};
      ['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING', 'INSTAGRAM', 'TIKTOK'].forEach(platform => {
        const platformKey = platform.toLowerCase();
        const platformData = platforms[platformKey];
        if (platformData?.identifier) {
          identifiers[platform] = platformData.identifier;
        }
      });
      setMarketIdentifiers(identifiers);
    }
  }, [platforms]);

  const handleIdentifierChange = useCallback((platform, value) => {
    setMarketIdentifiers(prev => ({
      ...prev,
      [platform]: value
    }));
  }, []);

  const handleSaveIdentifier = useCallback(async (platform) => {
    const identifier = marketIdentifiers[platform];
    if (!identifier) return;

    setPlatformLoadingStates(prev => ({ ...prev, [platform]: true }));

    try {
      await createOrUpdateMarketIdentifierEnhanced({
        teamId: tenantId,
        platform: PLATFORM_MAPPING[platform] || platform.toUpperCase(),
        identifier
      });
      await refresh();
    } catch (err) {
      console.error('Error saving identifier:', err);
      alert(`Error saving ${platform} identifier: ${err.message}`);
    } finally {
      setPlatformLoadingStates(prev => ({ ...prev, [platform]: false }));
    }
  }, [marketIdentifiers, tenantId, refresh]);

  const handlePlatformAction = useCallback(async (platform, action) => {
    setPlatformLoadingStates(prev => ({ ...prev, [platform]: true }));

    try {
      await executePlatformAction({
        teamId: tenantId,
        platform: PLATFORM_MAPPING[platform] || platform.toUpperCase(),
        action,
        options: {}
      });
      setTimeout(() => refresh(), 1000);
    } catch (err) {
      console.error('Error performing action:', err);
      alert(`${platform} ${action.replace('_', ' ')} failed: ${err.message}`);
    } finally {
      setPlatformLoadingStates(prev => ({ ...prev, [platform]: false }));
    }
  }, [tenantId, refresh]);

  const handleDeletePlatformData = useCallback((platform) => {
    setDeletePlatform(platform);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeletePlatformData = useCallback(async () => {
    if (!deletePlatform) return;

    setPlatformLoadingStates(prev => ({ ...prev, [deletePlatform]: true }));

    try {
      await deletePlatformData({
        teamId: tenantId,
        platform: deletePlatform
      });
      setMarketIdentifiers(prev => ({ ...prev, [deletePlatform]: '' }));
      await refresh();
    } catch (err) {
      console.error('Error deleting platform data:', err);
      alert(`Error deleting ${deletePlatform} data: ${err.message}`);
    } finally {
      setPlatformLoadingStates(prev => ({ ...prev, [deletePlatform]: false }));
      setDeleteDialogOpen(false);
      setDeletePlatform(null);
    }
  }, [deletePlatform, tenantId, refresh]);

  const handleMenuOpen = useCallback((event, platform) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlatform(platform);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedPlatform(null);
  }, []);

  const getPlatformStatus = useCallback((platform) => {
    if (!platforms) return 'not_started';
    const platformKey = platform.toLowerCase();
    return platforms[platformKey]?.status || 'not_started';
  }, [platforms]);

  const getCurrentStepMessage = useCallback((platform) => {
    if (!platforms) return null;
    const platformKey = platform.toLowerCase();
    const platformData = platforms[platformKey];

    if (!platformData?.currentStep) return null;

    switch (platformData.currentStep) {
      case 'CREATING_PROFILE':
        return platform === 'TIKTOK' ? 'Creating TikTok profile...' : 'Creating profile...';
      case 'FETCHING_REVIEWS':
        return 'Fetching reviews...';
      case 'FETCHING_SNAPSHOTS':
        return 'Taking snapshots...';
      default:
        return `Processing: ${platformData.currentStep}`;
    }
  }, [platforms]);

  // Loading state
  if (isLoading) {
    return (
      <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth={false}>
          <Stack spacing={3}>
            <Skeleton variant="text" width={300} height={50} />
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Stack>
        </DashboardContent>
      </RoleGuard>
    );
  }

  // Error state
  if (error || !tenant) {
    return (
      <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth={false}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error?.message || 'Tenant not found'}
          </Alert>
        </DashboardContent>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requireRole={SuperRole.ADMIN}>
      <DashboardContent maxWidth="xl">
        <Grid container spacing={3}>
          {/* Breadcrumbs */}
          <Grid size={{ xs: 12 }}>
            <CustomBreadcrumbs
              heading={tenant.name}
              links={[
                { name: 'Dashboard', href: '/dashboard/superadmin' },
                { name: 'Tenants', href: '/tenants' },
                { name: tenant.name },
              ]}
              sx={{ mb: 3 }}
            />
          </Grid>

          {/* Header */}
          <Grid size={{ xs: 12 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={2}
              sx={{ mb: 4 }}
            >
              <Box>
                <Typography variant="h4" gutterBottom>
                  {tenant.name}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:link-bold" width={16} sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    @{tenant.slug}
                  </Typography>
                </Stack>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:arrow-left-bold" />}
                  onClick={() => router.back()}
                >
                  Back
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:refresh-bold" />}
                  onClick={() => refresh()}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:settings-bold" />}
                  onClick={() => router.push(`/tenants/${tenantId}/custom-plan`)}
                >
                  Manage Plan
                </Button>
              </Stack>
            </Stack>
          </Grid>

          {/* Stats Cards */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatsCard
              title="Members"
              value={tenant.members?.length || 0}
              subtitle="Team members"
              icon="solar:users-group-rounded-bold"
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatsCard
              title="Reviews"
              value={stats.totalReviews}
              subtitle="Total reviews"
              icon="solar:star-bold"
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatsCard
              title="Progress"
              value={`${Math.round(stats.completionPercentage)}%`}
              subtitle="Setup completion"
              icon="solar:chart-bold"
              color="success"
              showProgress
              progressValue={stats.completionPercentage}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatsCard
              title="Active Tasks"
              value={stats.activeTasksCount}
              subtitle="In progress"
              icon="solar:pulse-bold"
              color="info"
            />
          </Grid>

          {/* Tabs */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ borderRadius: 2 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                  <Tab
                    label="Platform Setup"
                    icon={<Iconify icon="solar:widget-5-bold" />}
                    iconPosition="start"
                  />
                  <Tab
                    label={`Members (${tenant.members?.length || 0})`}
                    icon={<Iconify icon="solar:users-group-rounded-bold" />}
                    iconPosition="start"
                  />
                  <Tab
                    label="Activity"
                    icon={<Iconify icon="solar:history-bold" />}
                    iconPosition="start"
                  />
                </Tabs>
              </Box>

              {/* Platform Setup Tab */}
              <TabPanel value={tabValue} index={0}>
                <Box sx={{ p: 3 }}>
                  <Stack spacing={2} sx={{ mb: 4 }}>
                    <Typography variant="h6">Platform Integrations</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configure and manage platform integrations for {tenant.name}
                    </Typography>
                  </Stack>

                  {/* Instagram Card (Featured) */}
                  <Grid size={{ xs: 12 }} sx={{ mb: 4 }}>
                    <InstagramCard
                      identifier={marketIdentifiers.INSTAGRAM || ''}
                      status={getPlatformStatus('INSTAGRAM')}
                      platformData={platforms?.instagram}
                      currentStepMessage={getCurrentStepMessage('INSTAGRAM')}
                      loading={platformLoadingStates.INSTAGRAM || false}
                      onIdentifierChange={handleIdentifierChange}
                      onSave={handleSaveIdentifier}
                      onAction={handlePlatformAction}
                      onRefresh={refresh}
                    />
                  </Grid>

                  {/* Regular Platform Cards */}
                  <Grid container spacing={3}>
                    {['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING', 'TIKTOK'].map((platform) => {
                      const platformKey = PLATFORM_MAPPING[platform] || platform;
                      return (
                        <Grid size={{ xs: 12, md: 6 }} key={platform}>
                          <PlatformCard
                            platform={platform}
                            config={
                              ['INSTAGRAM', 'TIKTOK'].includes(platform)
                                ? socialPlatformConfig[platform]
                                : platformConfig[platform]
                            }
                            identifier={marketIdentifiers[platform] || ''}
                            status={getPlatformStatus(platform)}
                            syncStatus={getPlatformSyncStatus(platformKey.toLowerCase())}
                            platformData={platforms?.[platform.toLowerCase()]}
                            currentStepMessage={getCurrentStepMessage(platform)}
                            loading={platformLoadingStates[platform] || false}
                            isLoadingData={isLoading}
                            onIdentifierChange={handleIdentifierChange}
                            onSave={handleSaveIdentifier}
                            onAction={handlePlatformAction}
                            onMenuOpen={handleMenuOpen}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              </TabPanel>

              {/* Members Tab */}
              <TabPanel value={tabValue} index={1}>
                <TenantMembersTab tenant={tenant} />
              </TabPanel>

              {/* Activity Tab */}
              <TabPanel value={tabValue} index={2}>
                <ActivityTab recentActivity={recentActivity} />
              </TabPanel>
            </Card>
          </Grid>
        </Grid>

        {/* Platform Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              if (selectedPlatform) handleDeletePlatformData(selectedPlatform);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <Iconify icon="solar:trash-bin-trash-bold" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText primary="Delete Platform Data" />
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Platform Data</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete all {deletePlatform} data? This will remove the business profile
              and all reviews for this platform. This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={confirmDeletePlatformData}
              color="error"
              variant="contained"
              disabled={deletePlatform ? platformLoadingStates[deletePlatform] : false}
              startIcon={
                deletePlatform && platformLoadingStates[deletePlatform] ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Iconify icon="solar:trash-bin-trash-bold" />
                )
              }
            >
              {deletePlatform && platformLoadingStates[deletePlatform] ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </DashboardContent>
    </RoleGuard>
  );
}

