'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

// import { SuperRole } from '@prisma/client';
import { PLATFORM_DISPLAY_CONFIGS, SOCIAL_PLATFORM_DISPLAY_CONFIGS } from '@wirecrest/core';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
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

import {
  deletePlatformData,
  executePlatformAction,
  createOrUpdateMarketIdentifierEnhanced,
} from '@/actions/admin';
import { useSuperAdminTenant } from '@/hooks/useSuperAdminTenant';
import { useSyncStatus } from '@/hooks/useSyncStatus';

import { trpc } from 'src/lib/trpc/client';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
// import { RoleGuard } from 'src/components/guards';
import { Iconify } from 'src/components/iconify';
import { LocationSelector } from 'src/components/superadmin/LocationSelector';

import { DashboardContent } from 'src/layouts/dashboard';

import ActivityTab from './components/ActivityTab';
import InstagramCard from './components/InstagramCard';
import PlatformCard from './components/PlatformCard';
import StatsCard from './components/StatsCard';
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
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [marketIdentifiers, setMarketIdentifiers] = useState({});
  const [platformLoadingStates, setPlatformLoadingStates] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePlatform, setDeletePlatform] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const {
    tenant,
    locations,
    selectedLocation,
    socialPlatforms,
    platforms,
    recentActivity,
    stats,
    isLoading,
    error,
    refresh
  } = useSuperAdminTenant(tenantId, selectedLocationId);

  // Fetch location-specific platform data including market identifiers
  const { data: locationPlatformData, refetch: refetchLocationData } = trpc.superadmin.getLocationPlatformData.useQuery(
    {
      teamId: tenantId,
      locationId: selectedLocationId || '',
    },
    {
      enabled: !!tenantId && !!selectedLocationId,
      refetchInterval: 10000,
    }
  );

  // Use sync status hook for real-time updates
  const { getPlatformSyncStatus } = useSyncStatus({
    teamId: tenantId,
    refreshInterval: 5000, // Poll every 5 seconds
    onlyPollWhenActive: true,
  });

  // Set first location as selected by default
  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  // Auto-fill market identifiers when location data loads
  useEffect(() => {
    if (!selectedLocationId) {
      // Reset when no location is selected
      setMarketIdentifiers({});
      setPlatformLoadingStates({});
      return;
    }

    // Extract identifiers from location platform data
    const newIdentifiers = {};
    
    if (locationPlatformData?.platforms) {
      Object.entries(locationPlatformData.platforms).forEach(([key, platformData]) => {
        const platform = key.toUpperCase();
        if (platformData?.identifier) {
          newIdentifiers[platform] = platformData.identifier;
        }
      });
    }
    
    setMarketIdentifiers(prev => ({
      ...prev,
      ...newIdentifiers,
    }));
    setPlatformLoadingStates({});
  }, [selectedLocationId, locationPlatformData]);

  // Keep social platform identifiers in sync
  useEffect(() => {
    if (!socialPlatforms) return;
    
    const socialIdentifiers = {};
    if (socialPlatforms.instagram?.identifier) {
      socialIdentifiers.INSTAGRAM = socialPlatforms.instagram.identifier;
    }
    if (socialPlatforms.tiktok?.identifier) {
      socialIdentifiers.TIKTOK = socialPlatforms.tiktok.identifier;
        }
    
    setMarketIdentifiers(prev => ({
      ...prev,
      ...socialIdentifiers,
    }));
  }, [socialPlatforms]);

  const handleLocationChange = useCallback((location) => {
    setSelectedLocationId(location.id);
    // Clear current state immediately for better UX
    setMarketIdentifiers({});
    setPlatformLoadingStates({});
    // Trigger refetch of location data
    refetchLocationData();
  }, [refetchLocationData]);

  const handleIdentifierChange = useCallback((platform, value) => {
    setMarketIdentifiers(prev => ({
      ...prev,
      [platform]: value
    }));
  }, []);

  const handleSaveIdentifier = useCallback(async (platform) => {
    const identifier = marketIdentifiers[platform];
    if (!identifier) return;

    // Business platforms require a selected location
    const isBusinessPlatform = ['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING'].includes(platform);
    
    if (isBusinessPlatform && !selectedLocationId) {
      alert('Please select a location first to configure business platforms.');
      return;
    }

    setPlatformLoadingStates(prev => ({ ...prev, [platform]: true }));

    try {
      await createOrUpdateMarketIdentifierEnhanced({
        locationId: selectedLocationId, // Changed from teamId to locationId
        platform: PLATFORM_MAPPING[platform] || platform.toUpperCase(),
        identifier
      });
      await refresh();
      // Also refetch location data to get updated identifiers
      if (isBusinessPlatform) {
        await refetchLocationData();
      }
    } catch (err) {
      console.error('Error saving identifier:', err);
      alert(`Error saving ${platform} identifier: ${err.message}`);
    } finally {
      setPlatformLoadingStates(prev => ({ ...prev, [platform]: false }));
    }
  }, [marketIdentifiers, selectedLocationId, refresh, refetchLocationData]);

  const handlePlatformAction = useCallback(async (platform, action) => {
    setPlatformLoadingStates(prev => ({ ...prev, [platform]: true }));

    try {
      // For business platforms, require locationId
      const platformKey = PLATFORM_MAPPING[platform] || platform.toUpperCase();
      const isBusinessPlatform = ['GOOGLE_MAPS', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING'].includes(platformKey);
      
      if (isBusinessPlatform && !selectedLocationId) {
        alert('Please select a location first');
        return;
      }

      await executePlatformAction({
        teamId: tenantId,
        locationId: selectedLocationId,
        platform: platformKey,
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
  }, [tenantId, selectedLocationId, refresh]);

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
        locationId: selectedLocationId,
        platform:  deletePlatform
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
  }, [deletePlatform, tenantId, selectedLocationId, refresh]);

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
    const platformData = platforms[platformKey];
    
    // Check if we have an identifier saved for this platform
    const hasIdentifier = !!marketIdentifiers[platform];
    
    // If we have identifier but no profile, show identifier_set
    if (hasIdentifier && !platformData?.profile) {
      return 'identifier_set';
    }
    
    // Otherwise use the status from platform data
    return platformData?.status || 'not_started';
  }, [platforms, marketIdentifiers]);

  const getSocialPlatformStatus = useCallback((platform) => {
    if (!socialPlatforms) return 'not_started';
    const platformKey = platform.toLowerCase();
    const platformData = socialPlatforms[platformKey];
    
    // Check if we have an identifier saved
    const hasIdentifier = !!marketIdentifiers[platform];
    
    // If we have identifier but no profile, show identifier_set
    if (hasIdentifier && !platformData?.profile) {
      return 'identifier_set';
    }
    
    // Otherwise use the status from platform data
    return platformData?.status || 'not_started';
  }, [socialPlatforms, marketIdentifiers]);

  const getSocialPlatformCurrentStepMessage = useCallback((platform) => {
    if (!socialPlatforms) return null;
    const platformKey = platform.toLowerCase();
    const platformData = socialPlatforms[platformKey];

    if (!platformData?.currentStep) return null;

    switch (platformData.currentStep) {
      case 'CREATING_PROFILE':
        return platform === 'TIKTOK' ? 'Creating TikTok profile...' : 'Creating profile...';
      case 'FETCHING_SNAPSHOTS':
        return 'Taking snapshots...';
      default:
        return `Processing: ${platformData.currentStep}`;
    }
  }, [socialPlatforms]);

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
      // <RoleGuard requireRole={SuperRole.ADMIN}>
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
      // </RoleGuard>
    );
  }

  // Error state
  if (error || !tenant) {
    return (
      // <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth={false}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error?.message || 'Tenant not found'}
          </Alert>
        </DashboardContent>
      // </RoleGuard>
    );
  }

  return (
    //  <RoleGuard requireRole={SuperRole.ADMIN}>
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

              <Stack direction="row" spacing={1.5} alignItems="center">
                <LocationSelector
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onLocationChange={handleLocationChange}
                  onAddLocation={() => {
                    // TODO: Implement add location modal/page
                    console.log('Add location clicked');
                  }}
                  isLoading={isLoading}
                />
                
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                
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
              subtitle={selectedLocation ? `From ${selectedLocation.name}` : 'Total reviews'}
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
                  {/* Social Platforms Section (Team-level) */}
                  <Stack spacing={2} sx={{ mb: 4 }}>
                    <Typography variant="h6">Social Media Platforms</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Team-level social media integrations for {tenant.name}
                    </Typography>
                  </Stack>

                  <Grid container spacing={3} sx={{ mb: 6 }}>
                  {/* Instagram Card (Featured) */}
                    <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
                    <InstagramCard
                      identifier={marketIdentifiers.INSTAGRAM || ''}
                        status={getSocialPlatformStatus('INSTAGRAM')}
                        platformData={socialPlatforms?.instagram}
                        currentStepMessage={getSocialPlatformCurrentStepMessage('INSTAGRAM')}
                      loading={platformLoadingStates.INSTAGRAM || false}
                      onIdentifierChange={handleIdentifierChange}
                      onSave={handleSaveIdentifier}
                      onAction={handlePlatformAction}
                      onRefresh={refresh}
                    />
                  </Grid>

                    {/* TikTok Card */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <PlatformCard
                        platform="TIKTOK"
                        config={socialPlatformConfig.TIKTOK}
                        identifier={marketIdentifiers.TIKTOK || ''}
                        status={getSocialPlatformStatus('TIKTOK')}
                        syncStatus={getPlatformSyncStatus('tiktok')}
                        platformData={socialPlatforms?.tiktok}
                        currentStepMessage={getSocialPlatformCurrentStepMessage('TIKTOK')}
                        loading={platformLoadingStates.TIKTOK || false}
                        isLoadingData={isLoading}
                        onIdentifierChange={handleIdentifierChange}
                        onSave={handleSaveIdentifier}
                        onAction={handlePlatformAction}
                        onMenuOpen={handleMenuOpen}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 4 }} />

                  {/* Business Platforms Section (Location-level) */}
                  <Stack spacing={2} sx={{ mb: 4 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="h6">Business Platforms</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Location-specific business platform integrations
                          {selectedLocation && ` for ${selectedLocation.name}`}
                        </Typography>
                      </Box>
                      
                      {selectedLocation && (
                        <Chip
                          icon={<Iconify icon="mdi:map-marker" />}
                          label={selectedLocation.name}
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Stack>

                  {selectedLocation ? (
                  <Grid container spacing={3}>
                      {['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING'].map((platform) => {
                      const platformKey = PLATFORM_MAPPING[platform] || platform;
                      return (
                        <Grid size={{ xs: 12, md: 6 }} key={platform}>
                          <PlatformCard
                            platform={platform}
                              config={platformConfig[platform]}
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
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <AlertTitle>No Location Selected</AlertTitle>
                      {locations.length > 0
                        ? 'Please select a location from the dropdown above to manage business platforms.'
                        : 'No locations found. Add a location to start configuring business platforms.'}
                    </Alert>
                  )}
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
    // </RoleGuard>
  );
}

