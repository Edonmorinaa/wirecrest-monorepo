'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@wirecrest/auth';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

import { format } from 'date-fns';

import { RoleGuard } from 'src/components/guards';
import { SuperRole } from '@prisma/client';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { useSuperAdminTenant } from '@/hooks/useSuperAdminTenant';
import { 
  executePlatformAction,
  createOrUpdateMarketIdentifierEnhanced,
  deletePlatformData
} from '@/actions/admin';

const statusColors = {
  not_started: 'default',
  identifier_set: 'default',
  profile_in_progress: 'primary',
  profile_completed: 'success',
  reviews_in_progress: 'primary',
  completed: 'success',
  failed: 'error'
};

const statusIcons = {
  not_started: 'solar:clock-circle-bold',
  identifier_set: 'solar:check-circle-bold',
  profile_in_progress: 'solar:activity-bold',
  profile_completed: 'solar:check-circle-bold',
  reviews_in_progress: 'solar:activity-bold',
  completed: 'solar:check-circle-bold',
  failed: 'solar:close-circle-bold'
};

// Import platform display configurations from @wirecrest/core
import { PLATFORM_DISPLAY_CONFIGS } from '@wirecrest/core';

const platformConfig = PLATFORM_DISPLAY_CONFIGS;

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const InstagramCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
    pointerEvents: 'none',
  },
}));

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tenant-tabpanel-${index}`}
      aria-labelledby={`tenant-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SuperAdminTenantDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id;

  const [tabValue, setTabValue] = useState(0);
  const [marketIdentifiers, setMarketIdentifiers] = useState({});
  const [platformStates, setPlatformStates] = useState({});
  const [platformLoadingStates, setPlatformLoadingStates] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePlatform, setDeletePlatform] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const {
    data,
    tenant,
    platforms,
    recentActivity,
    stats,
    isLoading,
    error,
    refresh
  } = useSuperAdminTenant(tenantId);

  // Initialize market identifiers and platform states when data loads
  useEffect(() => {
    if (data?.tenant && platforms) {
      const newMarketIdentifiers = { ...marketIdentifiers };
      const newPlatformStates = { ...platformStates };

      // Map frontend platform keys to backend platform keys
      const platformMapping = {
        'GOOGLE': 'google',
        'FACEBOOK': 'facebook', 
        'TRIPADVISOR': 'tripadvisor',
        'BOOKING': 'booking',
        'INSTAGRAM': 'instagram',
        'TIKTOK': 'tiktok'
      };

      ['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING', 'INSTAGRAM', 'TIKTOK'].forEach(platform => {
        const platformKey = platformMapping[platform];
        const platformData = platforms[platformKey];
        
        if (platformData?.identifier) {
          newMarketIdentifiers[platform] = platformData.identifier;
        }

        // Update platform state with real database data from API
        if (platformData) {
          newPlatformStates[platform] = {
            identifier: platformData.identifier || null,
            hasProfile: !!platformData.profile,
            profileStatus: platformData.status,
            reviewsStatus: platformData.status === 'completed' ? 'completed' : 'not_started',
            reviewsCount: platformData.reviewsCount || 0,
            lastReviewDate: platformData.lastReviewDate ? new Date(platformData.lastReviewDate) : null,
            currentStep: platformData.currentStep || null,
            canCreateProfile: platformData.canCreateProfile,
            canGetReviews: platformData.canGetReviews,
            canRetry: platformData.canRetry,
            isProcessing: platformData.isProcessing
          };
        }
      });

      setMarketIdentifiers(newMarketIdentifiers);
      setPlatformStates(newPlatformStates);
    }
  }, [data, platforms]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMarketIdentifierChange = (platform, value) => {
    setMarketIdentifiers(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  const handleSaveMarketIdentifier = async (platform) => {
    const identifier = marketIdentifiers[platform];
    if (!identifier) return;

    // Set loading state for this specific platform
    setPlatformLoadingStates(prev => ({
      ...prev,
      [platform]: true
    }));
    
    try {
      // Map frontend platform names to backend platform names
      const platformMapping = {
        'GOOGLE': 'GOOGLE_MAPS',
        'FACEBOOK': 'FACEBOOK',
        'TRIPADVISOR': 'TRIPADVISOR',
        'BOOKING': 'BOOKING',
        'INSTAGRAM': 'INSTAGRAM',
        'TIKTOK': 'TIKTOK'
      };
      
      const backendPlatform = platformMapping[platform] || platform.toUpperCase();
      
      await createOrUpdateMarketIdentifierEnhanced({
        teamId: tenantId,
        platform: backendPlatform,
        identifier
      });

      // Refresh data
      await refresh();
    } catch (error) {
      console.error('Error saving market identifier:', error);
      alert(`Error saving ${platform} identifier: ${error.message}`);
    } finally {
      // Clear loading state for this specific platform
      setPlatformLoadingStates(prev => ({
        ...prev,
        [platform]: false
      }));
    }
  };

  const handlePlatformAction = async (platform, action, options = {}) => {
    // Set loading state for this specific platform
    setPlatformLoadingStates(prev => ({
      ...prev,
      [platform]: true
    }));
    
    try {
      // Map frontend platform names to backend platform names
      const platformMapping = {
        'GOOGLE': 'GOOGLE_MAPS',
        'FACEBOOK': 'FACEBOOK',
        'TRIPADVISOR': 'TRIPADVISOR',
        'BOOKING': 'BOOKING',
        'INSTAGRAM': 'INSTAGRAM',
        'TIKTOK': 'TIKTOK'
      };
      
      const backendPlatform = platformMapping[platform] || platform.toUpperCase();
      
      await executePlatformAction({
        teamId: tenantId,
        platform: backendPlatform,
        action,
        options
      });
      
      // Refresh data
      setTimeout(() => refresh(), 1000);
    } catch (error) {
      console.error('Error performing platform action:', error);
      alert(`${platform} ${action.replace('_', ' ')} failed: ${error.message}`);
    } finally {
      // Clear loading state for this specific platform
      setPlatformLoadingStates(prev => ({
        ...prev,
        [platform]: false
      }));
    }
  };

  const handleDeletePlatformData = async (platform) => {
    setDeletePlatform(platform);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePlatformData = async () => {
    if (!deletePlatform) return;

    try {
      // Set loading state for this specific platform
      setPlatformLoadingStates(prev => ({
        ...prev,
        [deletePlatform]: true
      }));
      
      await deletePlatformData({
        teamId: tenantId,
        platform: deletePlatform
      });

      // Clear the identifier from local state
      setMarketIdentifiers(prev => ({
        ...prev,
        [deletePlatform]: ''
      }));

      // Refresh data
      await refresh();
    } catch (error) {
      console.error('Error deleting platform data:', error);
      alert(`Error deleting ${deletePlatform} data: ${error.message}`);
    } finally {
      // Clear loading state for this specific platform
      setPlatformLoadingStates(prev => ({
        ...prev,
        [deletePlatform]: false
      }));
      setDeleteDialogOpen(false);
      setDeletePlatform(null);
    }
  };

  const handleMenuOpen = (event, platform) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlatform(platform);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPlatform(null);
  };

  const getPlatformStatus = (platform) => {
    if (!platforms) return 'not_started';
    const platformKey = platform.toLowerCase();
    return platforms[platformKey]?.status || 'not_started';
  };

  const getPlatformLoadingState = (platform) => {
    return platformLoadingStates[platform] || false;
  };

  const getPlatformChip = (status) => {
    return (
      <Chip
        icon={<Iconify icon={statusIcons[status]} />}
        label={status.replace('_', ' ')}
        color={statusColors[status]}
        size="small"
        variant="outlined"
      />
    );
  };

  const getCurrentStepMessage = (platform) => {
    if (!platforms) return null;
    const platformKey = platform.toLowerCase();
    const platformData = platforms[platformKey];
    
    if (!platformData?.currentStep) return null;

    switch (platformData.currentStep) {
      case 'CREATING_PROFILE':
        return platform === 'TIKTOK' ? 'Creating TikTok profile...' : 'Creating business profile...';
      case 'FETCHING_REVIEWS':
        return 'Fetching reviews...';
      case 'FETCHING_SNAPSHOTS':
        return 'Taking snapshots...';
      default:
        return `Processing: ${platformData.currentStep}`;
    }
  };

  const renderInstagramAnalyticsCard = () => {
    const config = platformConfig.INSTAGRAM;
    const status = getPlatformStatus('INSTAGRAM');
    const identifier = marketIdentifiers.INSTAGRAM || '';
    const platformData = platforms?.instagram;
    const currentStepMessage = getCurrentStepMessage('INSTAGRAM');

    return (
      <InstagramCard sx={{ mb: 3 }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
              <Iconify icon={config.icon} />
            </Avatar>
          }
          title={
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                {config.name}
              </Typography>
              {getPlatformChip(status)}
              {currentStepMessage && (
                <Chip
                  icon={<Iconify icon="solar:activity-bold" />}
                  label={currentStepMessage}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              )}
            </Stack>
          }
          subheader={
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Real-time snapshot monitoring
            </Typography>
          }
          action={
            <Box>
              <IconButton
                onClick={() => refresh()}
                sx={{ color: 'white' }}
              >
                <Iconify icon="solar:refresh-bold" />
              </IconButton>
            </Box>
          }
        />
        <CardContent sx={{ color: 'white' }}>
          <Stack spacing={3}>
            {/* Profile Configuration */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'rgba(255,255,255,0.9)' }}>
                Profile Configuration
              </Typography>
              
              <TextField
                fullWidth
                label="Instagram Username"
                value={identifier}
                onChange={(e) => handleMarketIdentifierChange('INSTAGRAM', e.target.value)}
                placeholder="@username"
                disabled={getPlatformLoadingState('INSTAGRAM')}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255,255,255,0.8)',
                  },
                  '& .MuiInputBase-input': {
                    color: 'white',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        @
                      </Typography>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => handleSaveMarketIdentifier('INSTAGRAM')}
                disabled={!identifier || getPlatformLoadingState('INSTAGRAM')}
                startIcon={
                  getPlatformLoadingState('INSTAGRAM') ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Iconify icon="solar:save-bold" />
                  )
                }
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                }}
              >
                {getPlatformLoadingState('INSTAGRAM') ? 'Saving...' : 'Save Username'}
              </Button>

              {identifier && status !== 'not_started' && (
                <Button
                  variant="outlined"
                  onClick={() => handlePlatformAction('INSTAGRAM', 'create_profile')}
                  disabled={getPlatformLoadingState('INSTAGRAM') || status === 'profile_in_progress'}
                  startIcon={
                    getPlatformLoadingState('INSTAGRAM') ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Iconify icon="solar:play-bold" />
                    )
                  }
                  sx={{ 
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: 'white',
                    '&:hover': { 
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  {getPlatformLoadingState('INSTAGRAM') ? 'Processing...' : 'Setup Profile'}
                </Button>
              )}

              {status === 'completed' && (
                <Button
                  variant="outlined"
                  onClick={() => handlePlatformAction('INSTAGRAM', 'get_reviews')}
                  disabled={getPlatformLoadingState('INSTAGRAM')}
                  startIcon={<Iconify icon="solar:download-bold" />}
                  sx={{ 
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: 'white',
                    '&:hover': { 
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Take Snapshot
                </Button>
              )}

              {status === 'failed' && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handlePlatformAction('INSTAGRAM', 'retry')}
                  disabled={getPlatformLoadingState('INSTAGRAM')}
                  startIcon={<Iconify icon="solar:refresh-bold" />}
                  sx={{ 
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: 'white',
                    '&:hover': { 
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Retry
                </Button>
              )}
            </Stack>

            {/* Analytics Dashboard - Only shown when profile is active */}
            {status === 'completed' && platformData && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'rgba(255,255,255,0.9)' }}>
                  Analytics Dashboard
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.1)' }}>
                      <Typography variant="h4" sx={{ color: 'white' }}>
                        {platformData.reviewsCount || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        Total Snapshots
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.1)' }}>
                      <Typography variant="h4" sx={{ color: 'white' }}>
                        {platformData.lastReviewDate 
                          ? Math.floor((Date.now() - new Date(platformData.lastReviewDate).getTime()) / (1000 * 60 * 60 * 24))
                          : '--'
                        }d
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        Days Ago
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.1)' }}>
                      <Typography variant="h4" sx={{ color: 'white' }}>
                        {platformData.reviewsStatus === 'completed' ? '✓' : '⏸'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        Status
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Status Messages */}
            {status === 'profile_in_progress' && (
              <Alert severity="info" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                <AlertTitle>Setup in Progress</AlertTitle>
                Instagram profile setup is currently being processed. This may take a few minutes.
              </Alert>
            )}

            {status === 'failed' && (
              <Alert severity="error" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                <AlertTitle>Setup Failed</AlertTitle>
                The Instagram profile setup failed. Please check the username and try again.
              </Alert>
            )}

            {status === 'completed' && (
              <Alert severity="success" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                <AlertTitle>Setup Complete</AlertTitle>
                Instagram profile has been successfully configured and is ready for analytics.
              </Alert>
            )}

            {!identifier && (
              <Alert severity="warning" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                <AlertTitle>Username Required</AlertTitle>
                Please enter a valid Instagram username to begin setup.
              </Alert>
            )}
          </Stack>
        </CardContent>
      </InstagramCard>
    );
  };

  const renderPlatformSetupCard = (platform) => {
    const config = platformConfig[platform];
    const status = getPlatformStatus(platform);
    const identifier = marketIdentifiers[platform] || '';
    const platformData = platforms?.[platform.toLowerCase()];
    const currentStepMessage = getCurrentStepMessage(platform);

    return (
      <StyledCard key={platform} sx={{ mb: 3 }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: config.color, color: 'white' }}>
              <Iconify icon={config.icon} />
            </Avatar>
          }
          title={
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h6">{config.name}</Typography>
              {getPlatformChip(status)}
              {currentStepMessage && (
                <Chip
                  icon={<Iconify icon="solar:activity-bold" />}
                  label={currentStepMessage}
                  size="small"
                  color="primary"
                />
              )}
            </Stack>
          }
          subheader={`Configure ${config.name} integration`}
          action={
            <Box>
              <IconButton
                onClick={(e) => handleMenuOpen(e, platform)}
                disabled={getPlatformLoadingState(platform)}
              >
                <Iconify icon="solar:menu-dots-bold" />
              </IconButton>
            </Box>
          }
        />
        <CardContent>
          <Stack spacing={3}>
            {/* Identifier Input */}
            <TextField
              fullWidth
              label={config.identifierLabel}
              value={identifier}
              onChange={(e) => handleMarketIdentifierChange(platform, e.target.value)}
              placeholder={config.identifierPlaceholder}
              disabled={getPlatformLoadingState(platform)}
              InputProps={{
                startAdornment: config.identifierPrefix && (
                  <InputAdornment position="start">
                    <Typography variant="body2">{config.identifierPrefix}</Typography>
                  </InputAdornment>
                ),
              }}
            />

            {/* Action Buttons */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => handleSaveMarketIdentifier(platform)}
                disabled={!identifier || getPlatformLoadingState(platform)}
                startIcon={
                  getPlatformLoadingState(platform) ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Iconify icon="solar:save-bold" />
                  )
                }
                sx={{ bgcolor: config.color, '&:hover': { bgcolor: config.color } }}
              >
                {getPlatformLoadingState(platform) ? 'Saving...' : 'Save Identifier'}
              </Button>

              {identifier && status !== 'not_started' && (
                <Button
                  variant="outlined"
                  onClick={() => handlePlatformAction(platform, 'create_profile')}
                  disabled={getPlatformLoadingState(platform) || status === 'profile_in_progress'}
                  startIcon={
                    getPlatformLoadingState(platform) ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Iconify icon="solar:play-bold" />
                    )
                  }
                >
                  {getPlatformLoadingState(platform) ? 'Processing...' : 'Setup Profile'}
                </Button>
              )}

              {status === 'completed' && (
                <Button
                  variant="outlined"
                  onClick={() => handlePlatformAction(platform, 'get_reviews')}
                  disabled={getPlatformLoadingState(platform)}
                  startIcon={<Iconify icon="solar:download-bold" />}
                >
                  Get Reviews
                </Button>
              )}

              {status === 'failed' && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handlePlatformAction(platform, 'retry')}
                  disabled={getPlatformLoadingState(platform)}
                  startIcon={<Iconify icon="solar:refresh-bold" />}
                >
                  Retry
                </Button>
              )}
            </Stack>

            {/* Platform Stats */}
            {platformData && (platformData.reviewsCount > 0 || platformData.lastReviewDate) && (
              <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Platform Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Reviews: {platformData.reviewsCount || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Last Activity: {platformData.lastReviewDate 
                        ? format(new Date(platformData.lastReviewDate), 'MMM d, yyyy')
                        : 'Never'
                      }
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Status Messages */}
            {status === 'profile_in_progress' && (
              <Alert severity="info">
                <AlertTitle>Setup in Progress</AlertTitle>
                {config.name} profile setup is currently being processed. This may take a few minutes.
              </Alert>
            )}

            {status === 'failed' && (
              <Alert severity="error">
                <AlertTitle>Setup Failed</AlertTitle>
                The {config.name} profile setup failed. Please check the identifier and try again.
              </Alert>
            )}

            {status === 'completed' && (
              <Alert severity="success">
                <AlertTitle>Setup Complete</AlertTitle>
                {config.name} profile has been successfully configured and is ready to use.
              </Alert>
            )}

            {!identifier && (
              <Alert severity="warning">
                <AlertTitle>Identifier Required</AlertTitle>
                Please enter a valid {config.identifierLabel} to begin setup.
              </Alert>
            )}
          </Stack>
        </CardContent>
      </StyledCard>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth="xl">
          <Stack spacing={3}>
            <Skeleton variant="text" width={300} height={40} />
            <Skeleton variant="rectangular" height={200} />
            <Skeleton variant="rectangular" height={400} />
          </Stack>
        </DashboardContent>
      </RoleGuard>
    );
  }

  // Show error state
  if (error) {
    return (
      <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth="xl">
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            Failed to load tenant: {error?.message || 'Unknown error'}
          </Alert>
        </DashboardContent>
      </RoleGuard>
    );
  }

  if (!tenant) {
    return (
      <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth="xl">
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            Tenant not found
          </Alert>
        </DashboardContent>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requireRole={SuperRole.ADMIN}>
      <DashboardContent maxWidth="xl">
        {/* Breadcrumbs */}
        <CustomBreadcrumbs
          heading={`Tenant: ${tenant.name}`}
          links={[
            { name: 'Dashboard', href: '/' },
            { name: 'Tenants', href: '/tenants' },
            { name: tenant.name },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        {/* Header */}
        <Stack
          spacing={2}
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          sx={{ mb: { xs: 3, md: 5 } }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              {tenant.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{tenant.slug}
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2}>
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
              startIcon={<Iconify icon="solar:pen-bold" />}
              onClick={() => router.push(`/tenants/${tenantId}/edit`)}
            >
              Edit Tenant
            </Button>
          </Stack>
        </Stack>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StyledCard>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Members
                  </Typography>
                  <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }}>
                    <Iconify icon="solar:users-group-rounded-bold" />
                  </Avatar>
                </Stack>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  {tenant.members?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Team members
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StyledCard>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Reviews
                  </Typography>
                  <Avatar sx={{ bgcolor: 'info.lighter', color: 'info.main' }}>
                    <Iconify icon="solar:star-bold" />
                  </Avatar>
                </Stack>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  {stats.totalReviews}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total reviews
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StyledCard>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Progress
                  </Typography>
                  <Avatar sx={{ bgcolor: 'success.lighter', color: 'success.main' }}>
                    <Iconify icon="solar:trending-up-bold" />
                  </Avatar>
                </Stack>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  {Math.round(stats.completionPercentage)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.completionPercentage} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StyledCard>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Active Tasks
                  </Typography>
                  <Avatar sx={{ bgcolor: 'warning.lighter', color: 'warning.main' }}>
                    <Iconify icon="solar:activity-bold" />
                  </Avatar>
                </Stack>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  {stats.activeTasksCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In progress
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Platform Setup" />
              <Tab label="Members" />
              <Tab label="Activity" />
            </Tabs>
          </Box>

          {/* Platform Setup Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Platform Integrations
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure and manage platform integrations for {tenant.name}
            </Typography>

            {/* Instagram Analytics Card */}
            {renderInstagramAnalyticsCard()}

            {/* Regular Platform Cards */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                {renderPlatformSetupCard('GOOGLE')}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderPlatformSetupCard('FACEBOOK')}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderPlatformSetupCard('TRIPADVISOR')}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderPlatformSetupCard('BOOKING')}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderPlatformSetupCard('TIKTOK')}
              </Grid>
            </Grid>
          </TabPanel>

          {/* Members Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Team Members
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Members of {tenant.name}
            </Typography>

            {tenant.members && tenant.members.length > 0 ? (
              <List>
                {tenant.members.map((member) => (
                  <ListItem key={member.id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Iconify icon="solar:user-bold" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.user.name}
                      secondary={member.user.email}
                    />
                    <Chip label={member.role} size="small" />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                <AlertTitle>No Members</AlertTitle>
                This tenant has no members yet.
              </Alert>
            )}
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Latest platform integration activities and status updates
            </Typography>

            {recentActivity.length === 0 ? (
              <Alert severity="info">
                <AlertTitle>No Recent Activity</AlertTitle>
                No recent activity has been recorded for this tenant.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {recentActivity.map((activity, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ 
                          bgcolor: activity.type === 'task_completed' ? 'success.lighter' : 
                                   activity.type === 'task_failed' ? 'error.lighter' : 'info.lighter',
                          color: activity.type === 'task_completed' ? 'success.main' : 
                                 activity.type === 'task_failed' ? 'error.main' : 'info.main'
                        }}>
                          <Iconify icon={
                            activity.type === 'task_completed' ? 'solar:check-circle-bold' :
                            activity.type === 'task_failed' ? 'solar:close-circle-bold' :
                            'solar:activity-bold'
                          } />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {activity.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.platform} • {format(new Date(activity.timestamp), 'MMM d, yyyy HH:mm')}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </TabPanel>
        </Card>

        {/* Platform Menu Popover */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={() => {
            if (selectedPlatform) {
              handleDeletePlatformData(selectedPlatform);
            }
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </ListItemIcon>
            <ListItemText primary="Delete Platform Data" />
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            Delete Platform Data
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              Are you sure you want to delete all {deletePlatform} data? This will remove the business profile and all reviews for this platform.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmDeletePlatformData} 
              color="error" 
              variant="contained"
              disabled={deletePlatform ? getPlatformLoadingState(deletePlatform) : false}
            >
              {deletePlatform && getPlatformLoadingState(deletePlatform) ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </DashboardContent>
    </RoleGuard>
  );
}
