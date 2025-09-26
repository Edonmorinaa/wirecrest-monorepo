import React, { useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';

import {
  Info,
  Add as Plus,
  Person as User,
  Delete as Trash2,
  Refresh as RefreshCw,
  OpenInNew as ExternalLink,
  CalendarToday as Calendar,
  ChatBubble as MessageSquare,
  ChatBubbleOutline as MessageCircle,
} from '@mui/icons-material';
import {
  Tab,
  Box,
  Card,
  Tabs,
  Chip,
  Radio,
  Alert,
  Button,
  Dialog,
  Snackbar,
  TextField,
  CardHeader,
  RadioGroup,
  IconButton,
  Typography,
  CardContent,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  TextareaAutosize,
  CircularProgress,
  DialogContentText,
  Alert as MuiAlert,
} from '@mui/material';

interface TwitterProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  profileUrl: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  profileImageUrl: string;
  createdAt: string;
  lastUpdated: string;
  customBio?: string; // Custom bio field for additional context
}

interface ProfileTweet {
  id: string;
  text: string;
  url: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  hasMedia: boolean;
  mediaUrls: string[];
}

interface ProfileAction {
  id: string;
  action: string;
  tweetUrl: string;
  tweetText: string;
  timestamp: string;
  success: boolean;
  commentUrl?: string;
  customComment?: string;
  isAI?: boolean;
}

interface AssignedProfile {
  id: string;
  adspowerId: string;
  persona: string;
  active: boolean;
  delayRange: {
    min: number;
    max: number;
  };
  actions: ProfileAction[];
  totalActions: number;
}

const TwitterProfilesDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<TwitterProfile[]>([]);
  const [profileTweets, setProfileTweets] = useState<Record<string, ProfileTweet[]>>({});
  const [assignedProfiles, setAssignedProfiles] = useState<AssignedProfile[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshingProfiles, setRefreshingProfiles] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [showBioModal, setShowBioModal] = useState<string | null>(null);
  const [customBios, setCustomBios] = useState<Record<string, string>>({});
  const [expandedActions, setExpandedActions] = useState<Record<string, boolean>>({});

  // Comment functionality
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState<ProfileTweet | null>(null);
  const [commentType, setCommentType] = useState<'ai' | 'custom'>('ai');
  const [customComment, setCustomComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentResult, setCommentResult] = useState<{
    success: boolean;
    message: string;
    commentUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  // Toast state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Load profiles on component mount
  useEffect(() => {
    loadProfiles();
    loadAssignedProfiles();
    loadCustomBios();
  }, []);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      // Get team slug from URL
      const pathParts = window.location.pathname.split('/');
      const teamSlug = pathParts[3]; // /dashboard/teams/[slug]/automation/twitter/profiles

      if (!teamSlug) {
        throw new Error('Team slug not found in URL');
      }

      const response = await fetch(`/api/teams/${teamSlug}/twitter/profiles`);
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
        setProfileTweets(data.tweets || {});
        // Set config from the profiles API response
        if (data.config) {
          setConfig(data.config);
        }
      } else {
        console.error('Failed to load profiles');
      }
    } catch (loadError) {
      console.error('Error loading profiles:', loadError);
      setToast({
        open: true,
        message: 'Failed to load Twitter profiles',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignedProfiles = async () => {
    try {
      const response = await fetch('/api/twitter-profiles/assigned-profiles');
      if (response.ok) {
        const data = await response.json();
        setAssignedProfiles(data.profiles || []);
      } else {
        console.error('Failed to load assigned profiles');
      }
    } catch (loadAssignedError) {
      console.error('Error loading assigned profiles:', loadAssignedError);
      setToast({
        open: true,
        message: 'Failed to load assigned profiles',
        severity: 'error',
      });
    }
  };

  const loadCustomBios = async () => {
    try {
      const response = await fetch('/api/twitter-profiles/custom-bios');
      if (response.ok) {
        const data = await response.json();
        setCustomBios(data.customBios || {});
      } else {
        console.error('Failed to load custom bios');
      }
    } catch (loadBiosError) {
      console.error('Error loading custom bios:', loadBiosError);
      setToast({
        open: true,
        message: 'Failed to load custom bios',
        severity: 'error',
      });
    }
  };

  const addProfile = async () => {
    if (!newUsername.trim()) {
      setToast({
        open: true,
        message: 'Please enter a username',
        severity: 'error',
      });
      return;
    }

    // Clean username - remove @, URLs, and extract just the username
    let cleanUsername = newUsername.trim();

    // Remove @ if present
    cleanUsername = cleanUsername.replace(/^@/, '');

    // If it's a URL, extract username from it
    if (
      cleanUsername.includes('http') ||
      cleanUsername.includes('x.com') ||
      cleanUsername.includes('twitter.com')
    ) {
      const urlMatch = cleanUsername.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
      if (urlMatch) {
        cleanUsername = urlMatch[1];
      } else {
        setToast({
          open: true,
          message: 'Please enter a valid Twitter username or URL',
          severity: 'error',
        });
        return;
      }
    }

    // Remove any trailing slashes or query parameters
    cleanUsername = cleanUsername.split('/')[0].split('?')[0];

    // Validate username format
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanUsername)) {
      setToast({
        open: true,
        message:
          'Please enter a valid Twitter username (1-15 characters, letters, numbers, and underscores only)',
        severity: 'error',
      });
      return;
    }

    if (profiles.length >= 5) {
      setToast({
        open: true,
        message: 'You can only track up to 5 profiles',
        severity: 'error',
      });
      return;
    }

    if (profiles.some((p) => p.username.toLowerCase() === cleanUsername.toLowerCase())) {
      setToast({
        open: true,
        message: 'This profile is already being tracked',
        severity: 'error',
      });
      return;
    }

    try {
      setIsAddingProfile(true);
      // Get team slug from URL
      const pathParts = window.location.pathname.split('/');
      const teamSlug = pathParts[3]; // /dashboard/teams/[slug]/automation/twitter/profiles

      if (!teamSlug) {
        throw new Error('Team slug not found in URL');
      }

      const response = await fetch(`/api/teams/${teamSlug}/twitter/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: cleanUsername }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles((prev) => [...prev, data.profile]);
        setProfileTweets((prev) => ({
          ...prev,
          [data.profile.id]: data.tweets || [],
        }));
        // Update config if provided
        if (data.config) {
          setConfig(data.config);
        }
        setNewUsername('');
        setToast({
          open: true,
          message: `Added @${cleanUsername} to tracking`,
          severity: 'success',
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add profile');
      }
    } catch (error) {
      console.error('Error adding profile:', error);
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to add profile',
        severity: 'error',
      });
    } finally {
      setIsAddingProfile(false);
    }
  };

  const removeProfile = async (profileId: string) => {
    try {
      // Get team slug from URL
      const pathParts = window.location.pathname.split('/');
      const teamSlug = pathParts[3]; // /dashboard/teams/[slug]/automation/twitter/profiles

      if (!teamSlug) {
        throw new Error('Team slug not found in URL');
      }

      const response = await fetch(`/api/teams/${teamSlug}/twitter/profiles/${profileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== profileId));
        setProfileTweets((prev) => {
          const newTweets = { ...prev };
          delete newTweets[profileId];
          return newTweets;
        });
        setToast({
          open: true,
          message: 'Profile removed from tracking',
          severity: 'success',
        });
      } else {
        throw new Error('Failed to remove profile');
      }
    } catch (error) {
      console.error('Error removing profile:', error);
      setToast({
        open: true,
        message: 'Failed to remove profile',
        severity: 'error',
      });
    }
  };

  const refreshProfile = async (profileId: string) => {
    try {
      // Set loading state for this specific profile
      setRefreshingProfiles((prev) => ({ ...prev, [profileId]: true }));

      // Show loading toast
      setToast({
        open: true,
        message: 'Please wait while gathering new tweets...',
        severity: 'info',
      });

      // Get team slug from URL
      const pathParts = window.location.pathname.split('/');
      const teamSlug = pathParts[3]; // /dashboard/teams/[slug]/automation/twitter/profiles

      if (!teamSlug) {
        throw new Error('Team slug not found in URL');
      }

      const response = await fetch(`/api/teams/${teamSlug}/twitter/profiles/${profileId}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles((prev) => prev.map((p) => (p.id === profileId ? data.profile : p)));
        setProfileTweets((prev) => ({
          ...prev,
          [profileId]: data.tweets || [],
        }));
        // Update config if provided
        if (data.config) {
          setConfig(data.config);
        }
        setToast({
          open: true,
          message: 'Profile data refreshed successfully',
          severity: 'success',
        });
      } else {
        throw new Error('Failed to refresh profile');
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setToast({
        open: true,
        message: 'Failed to refresh profile',
        severity: 'error',
      });
    } finally {
      // Clear loading state for this specific profile
      setRefreshingProfiles((prev) => ({ ...prev, [profileId]: false }));
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const saveCustomBio = async (profileId: string, bio: string) => {
    try {
      const response = await fetch('/api/twitter-profiles/custom-bios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileId, bio }),
      });

      if (response.ok) {
        const data = await response.json();
        setCustomBios(data.customBios || {});
        setShowBioModal(null);
        setToast({
          open: true,
          message: data.message || 'Bio information saved',
          severity: 'success',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save bio');
      }
    } catch (error) {
      console.error('Error saving custom bio:', error);
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save bio',
        severity: 'error',
      });
    }
  };

  const toggleActions = (profileId: string) => {
    setExpandedActions((prev) => ({
      ...prev,
      [profileId]: !prev[profileId],
    }));
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'comment':
      case 'ai_comment':
        return '💬';
      case 'like':
        return '❤️';
      case 'retweet':
        return '🔄';
      default:
        return '📝';
    }
  };

  const getActionStatusIcon = (success: boolean) => (success ? '✅' : '❌');

  const openCommentModal = (tweet: ProfileTweet) => {
    setSelectedTweet(tweet);
    setShowCommentModal(true);
    setCommentType('ai');
    setCustomComment('');
    setCommentResult(null);
    setError(null);
  };

  const handleCommentSubmit = async () => {
    if (!selectedTweet) return;

    // Reset previous results and start loading
    setCommentResult(null);
    setCommentSubmitting(true);
    setError(null);

    try {
      const action = commentType === 'ai' ? 'ai_comment' : 'comment';
      const body: any = {
        tweetId: selectedTweet.id,
        tweetUrl: selectedTweet.url,
        tweetText: selectedTweet.text,
        action,
        commentType,
      };

      if (commentType === 'custom' && customComment.trim()) {
        body.customComment = customComment.trim();
      }

      const response = await fetch('/api/twitter-profiles/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      if (response.ok) {
        // Success
        setCommentResult({
          success: true,
          message: responseData.message || 'Comment posted successfully!',
          commentUrl: responseData.commentUrl || null,
        });

        // Show success toast
        setToast({
          open: true,
          message: responseData.message || 'Your comment has been posted to the tweet.',
          severity: 'success',
        });

        // Close modal after a short delay
        setTimeout(() => {
          setShowCommentModal(false);
          setCustomComment('');
          setCommentType('ai');
          setCommentResult(null);
        }, 2000);
      } else {
        // Error
        const errorMessage = responseData.error || 'Failed to process comment';
        setCommentResult({
          success: false,
          message: errorMessage,
        });
        setError(errorMessage);

        // Show error toast
        setToast({
          open: true,
          message: errorMessage,
          severity: 'error',
        });
      }
    } catch (err) {
      const errorMessage = 'Failed to process comment. Please try again.';
      setCommentResult({
        success: false,
        message: errorMessage,
      });
      setError(errorMessage);

      // Show error toast
      setToast({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
            Twitter Profiles
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track up to 5 Twitter profiles and monitor their latest tweets
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={loadProfiles}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshCw />}
        >
          Refresh
        </Button>
      </Box>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label={`Profiles (${profiles.length}/${config?.maxProfiles || 5})`} />
            <Tab label={`Profiles Assigned (${assignedProfiles.length})`} />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Configuration Status */}
            {!config && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Alert severity="warning">
                    Configuration not available. Using default settings.
                  </Alert>
                </CardContent>
              </Card>
            )}
            {config && (
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title="Configuration Status"
                  subheader="Current team settings for Twitter profiles"
                />
                <CardContent>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Max Profiles
                      </Typography>
                      <Typography variant="h6">{config.maxProfiles || 5}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Profile Creation
                      </Typography>
                      <Chip
                        label={config.allowProfileCreation ? 'Enabled' : 'Disabled'}
                        color={config.allowProfileCreation ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Profile Deletion
                      </Typography>
                      <Chip
                        label={config.allowProfileDeletion ? 'Enabled' : 'Disabled'}
                        color={config.allowProfileDeletion ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Profile Refresh
                      </Typography>
                      <Chip
                        label={config.allowProfileRefresh ? 'Enabled' : 'Disabled'}
                        color={config.allowProfileRefresh ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Auto Sync
                      </Typography>
                      <Chip
                        label={config.autoSyncEnabled ? 'Enabled' : 'Disabled'}
                        color={config.autoSyncEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Max Tweets per Profile
                      </Typography>
                      <Typography variant="h6">{config.maxTweetsPerProfile || 10}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Add Profile Section */}
            <Card>
              <CardHeader
                title="Add New Profile"
                subheader="Enter a Twitter username to start tracking their profile and tweets"
              />
              <CardContent>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Enter username (e.g., elonmusk)"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addProfile()}
                    disabled={
                      isAddingProfile ||
                      (config && !config.allowProfileCreation) ||
                      profiles.length >= (config?.maxProfiles || 5)
                    }
                  />
                  <Button
                    variant="contained"
                    onClick={addProfile}
                    disabled={
                      isAddingProfile ||
                      (config && !config.allowProfileCreation) ||
                      profiles.length >= (config?.maxProfiles || 5) ||
                      !newUsername.trim()
                    }
                    startIcon={isAddingProfile ? <CircularProgress size={16} /> : <Plus />}
                  >
                    Add Profile
                  </Button>
                </Box>
                {profiles.length >= (config?.maxProfiles || 5) && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    You have reached the maximum limit of {config?.maxProfiles || 5} profiles.
                    Remove a profile to add a new one.
                  </Alert>
                )}
                {config && !config.allowProfileCreation && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Profile creation is disabled for this team. Contact your administrator to enable
                    it.
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Profiles List */}
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              }}
            >
              {profiles.map((profile) => {
                const tweets = profileTweets[profile.id] || [];
                return (
                  <Box key={profile.id} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Profile Card */}
                    <Card>
                      <CardHeader
                        action={
                          <IconButton
                            onClick={() => removeProfile(profile.id)}
                            disabled={config && !config.allowProfileDeletion}
                            sx={{ color: 'error.main' }}
                          >
                            <Trash2 />
                          </IconButton>
                        }
                        title={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6">{profile.displayName}</Typography>
                            {profile.verified && (
                              <Chip label="Verified" size="small" variant="outlined" />
                            )}
                            <IconButton
                              size="small"
                              onClick={() => setShowBioModal(profile.id)}
                              sx={{
                                color: customBios[profile.id] ? 'success.main' : 'primary.main',
                                '&:hover': {
                                  color: customBios[profile.id] ? 'success.dark' : 'primary.dark',
                                },
                              }}
                              title={customBios[profile.id] ? 'Edit Bio' : 'Add Bio'}
                            >
                              <Info sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        }
                        subheader={`@${profile.username}`}
                        avatar={
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              bgcolor: 'grey.200',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {profile.profileImageUrl ? (
                              <img
                                src={profile.profileImageUrl}
                                alt={profile.displayName}
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <User sx={{ fontSize: 24, color: 'grey.500' }} />
                            )}
                          </Box>
                        }
                      />
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {profile.bio && (
                          <Typography variant="body2" color="text.secondary">
                            {profile.bio}
                          </Typography>
                        )}

                        {customBios[profile.id] && (
                          <Box
                            sx={{
                              bgcolor: 'primary.50',
                              border: 1,
                              borderColor: 'primary.200',
                              borderRadius: 1,
                              p: 1.5,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 'medium', mb: 0.5, color: 'primary.800' }}
                            >
                              Who is this person:
                            </Typography>
                            <Typography variant="body2" color="primary.700">
                              {customBios[profile.id]}
                            </Typography>
                          </Box>
                        )}

                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            fontSize: '0.875rem',
                            color: 'text.secondary',
                          }}
                        >
                          <Box>
                            <Typography component="span" sx={{ fontWeight: 'medium' }}>
                              {formatNumber(profile.followersCount)}
                            </Typography>{' '}
                            followers
                          </Box>
                          <Box>
                            <Typography component="span" sx={{ fontWeight: 'medium' }}>
                              {formatNumber(profile.followingCount)}
                            </Typography>{' '}
                            following
                          </Box>
                          <Box>
                            <Typography component="span" sx={{ fontWeight: 'medium' }}>
                              {formatNumber(profile.tweetsCount)}
                            </Typography>{' '}
                            tweets
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => refreshProfile(profile.id)}
                            disabled={
                              refreshingProfiles[profile.id] ||
                              (config && !config.allowProfileRefresh)
                            }
                            sx={{ flex: 1 }}
                            startIcon={
                              refreshingProfiles[profile.id] ? (
                                <CircularProgress size={16} />
                              ) : (
                                <RefreshCw />
                              )
                            }
                          >
                            {refreshingProfiles[profile.id] ? 'Refreshing...' : 'Refresh'}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => window.open(profile.profileUrl, '_blank')}
                            disabled={refreshingProfiles[profile.id]}
                          >
                            <ExternalLink />
                          </Button>
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          Last updated: {formatDate(profile.lastUpdated)}
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* Tweets Feed */}
                    <Card>
                      <CardHeader
                        title={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MessageSquare sx={{ fontSize: 20 }} />
                            <Typography variant="h6">Latest Tweets</Typography>
                          </Box>
                        }
                      />
                      <CardContent>
                        {tweets.length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <MessageSquare sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              No tweets found. Try refreshing the profile.
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              maxHeight: 384,
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1.5,
                              pr: 1,
                            }}
                          >
                            {tweets.map((tweet) => (
                              <Box
                                key={tweet.id}
                                sx={{
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  p: 1.5,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 1,
                                  '&:hover': { bgcolor: 'grey.50' },
                                  transition: 'background-color 0.2s',
                                }}
                              >
                                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                  {tweet.text}
                                </Typography>

                                {tweet.hasMedia && tweet.mediaUrls.length > 0 && (
                                  <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                                    {tweet.mediaUrls.map((url, index) => (
                                      <img
                                        key={index}
                                        src={url}
                                        alt={`Media ${index + 1}`}
                                        style={{
                                          width: 64,
                                          height: 64,
                                          objectFit: 'cover',
                                          borderRadius: 4,
                                          flexShrink: 0,
                                        }}
                                      />
                                    ))}
                                  </Box>
                                )}

                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                    color: 'text.secondary',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <span style={{ color: '#ef4444' }}>❤️</span>
                                      {formatNumber(tweet.likes)}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <span style={{ color: '#22c55e' }}>🔄</span>
                                      {formatNumber(tweet.retweets)}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <span style={{ color: '#3b82f6' }}>💬</span>
                                      {formatNumber(tweet.replies)}
                                    </Box>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Calendar sx={{ fontSize: 12 }} />
                                    {formatDate(tweet.createdAt)}
                                  </Box>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => openCommentModal(tweet)}
                                    sx={{ flex: 1, fontSize: '0.75rem' }}
                                    startIcon={<MessageCircle sx={{ fontSize: 12 }} />}
                                  >
                                    Comment
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => window.open(tweet.url, '_blank')}
                                    sx={{ fontSize: '0.75rem' }}
                                  >
                                    <ExternalLink sx={{ fontSize: 12 }} />
                                  </Button>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                );
              })}
            </Box>

            {profiles.length === 0 && (
              <Card>
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 6,
                  }}
                >
                  <User sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    No profiles tracked
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Add a Twitter profile above to start tracking their tweets and profile
                    information.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {assignedProfiles.length === 0 ? (
              <Card>
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 6,
                  }}
                >
                  <User sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    No assigned profiles found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    No active profiles are available for commenting.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                }}
              >
                {assignedProfiles.map((profile) => (
                  <Card key={profile.id}>
                    <CardHeader
                      avatar={
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            bgcolor: 'primary.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <User sx={{ fontSize: 24, color: 'primary.600' }} />
                        </Box>
                      }
                      title={profile.id}
                      subheader={`ID: ${profile.adspowerId}`}
                      action={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={profile.active ? 'Active' : 'Inactive'}
                            color={profile.active ? 'success' : 'default'}
                            size="small"
                          />
                          <Chip
                            label={`Delay: ${profile.delayRange.min}-${profile.delayRange.max}s`}
                            variant="outlined"
                            size="small"
                          />
                          <Chip
                            label={`${profile.totalActions} Actions`}
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      }
                    />
                    <CardContent>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 'medium', color: 'text.primary', mb: 1 }}
                          >
                            Persona & Bio
                          </Typography>
                          <Box
                            sx={{
                              mt: 1,
                              p: 1.5,
                              bgcolor: 'grey.50',
                              borderRadius: 1,
                              maxHeight: 192,
                              overflowY: 'auto',
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ lineHeight: 1.6 }}
                            >
                              {profile.persona}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Actions Section */}
                        <Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 'medium', color: 'text.primary' }}
                            >
                              Actions History
                            </Typography>
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => toggleActions(profile.id)}
                              sx={{ height: 24, px: 1, fontSize: '0.75rem' }}
                            >
                              {expandedActions[profile.id] ? 'Hide' : 'Show'} Actions
                            </Button>
                          </Box>

                          {expandedActions[profile.id] && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {profile.actions.length === 0 ? (
                                <Box
                                  sx={{
                                    textAlign: 'center',
                                    py: 2,
                                    fontSize: '0.875rem',
                                    color: 'text.secondary',
                                  }}
                                >
                                  No actions performed yet
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    maxHeight: 256,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                    pr: 1,
                                  }}
                                >
                                  {profile.actions
                                    .sort(
                                      (a, b) =>
                                        new Date(b.timestamp).getTime() -
                                        new Date(a.timestamp).getTime()
                                    )
                                    .map((action) => (
                                      <Box
                                        key={action.id}
                                        sx={{
                                          border: 1,
                                          borderColor: 'divider',
                                          borderRadius: 1,
                                          p: 1,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 0.5,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                          }}
                                        >
                                          <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                          >
                                            <span style={{ fontSize: '0.875rem' }}>
                                              {getActionIcon(action.action)}
                                            </span>
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                fontWeight: 'medium',
                                                textTransform: 'capitalize',
                                              }}
                                            >
                                              {action.action.replace('_', ' ')}
                                            </Typography>
                                            {action.isAI && (
                                              <Chip label="AI" variant="outlined" size="small" />
                                            )}
                                          </Box>
                                          <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                          >
                                            <span style={{ fontSize: '0.75rem' }}>
                                              {getActionStatusIcon(action.success)}
                                            </span>
                                            <Typography variant="caption" color="text.secondary">
                                              {formatDate(action.timestamp)}
                                            </Typography>
                                          </Box>
                                        </Box>

                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {action.tweetText.substring(0, 80)}...
                                        </Typography>

                                        {action.commentUrl && (
                                          <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                          >
                                            <a
                                              href={action.commentUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{
                                                fontSize: '0.75rem',
                                                color: '#2563eb',
                                                textDecoration: 'underline',
                                              }}
                                            >
                                              View Comment →
                                            </a>
                                          </Box>
                                        )}
                                      </Box>
                                    ))}
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>

                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                          }}
                        >
                          <span>Profile ID: {profile.id}</span>
                          <span>AdsPower: {profile.adspowerId}</span>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Bio Modal */}
      {showBioModal && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
        >
          <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
            <CardHeader
              title="Add/Edit Bio"
              action={
                <IconButton onClick={() => setShowBioModal(null)} size="small">
                  ✕
                </IconButton>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    Who is this person?
                  </Typography>
                  <TextareaAutosize
                    style={{
                      width: '100%',
                      height: 128,
                      padding: 12,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.875rem',
                    }}
                    placeholder="Add context about who this person is, their background, what they do, etc..."
                    value={customBios[showBioModal] || ''}
                    onChange={(e) =>
                      setCustomBios((prev) => ({ ...prev, [showBioModal]: e.target.value }))
                    }
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={() => setShowBioModal(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => saveCustomBio(showBioModal, customBios[showBioModal] || '')}
                  >
                    Save Bio
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Comment Modal */}
      <Dialog
        open={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {selectedTweet && (
              <Box sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Replying to:
                </Typography>
                <Typography variant="body2">
                  {selectedTweet.text.substring(0, 100)}
                  {selectedTweet.text.length > 100 ? '...' : ''}
                </Typography>
              </Box>
            )}
          </DialogContentText>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <RadioGroup
              value={commentType}
              onChange={(e) => setCommentType(e.target.value as 'ai' | 'custom')}
            >
              <FormControlLabel value="ai" control={<Radio />} label="AI-Generated Comment" />
              <FormControlLabel value="custom" control={<Radio />} label="Custom Comment" />
            </RadioGroup>

            {commentType === 'custom' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Your Comment
                </Typography>
                <TextareaAutosize
                  style={{
                    width: '100%',
                    minHeight: 100,
                    padding: 12,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.875rem',
                  }}
                  placeholder="Enter your comment..."
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                />
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {commentResult && (
              <Alert severity={commentResult.success ? 'success' : 'error'}>
                {commentResult.message}
                {commentResult.success && commentResult.commentUrl && (
                  <Box sx={{ mt: 1 }}>
                    <a
                      href={commentResult.commentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'underline' }}
                    >
                      View Comment →
                    </a>
                  </Box>
                )}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setShowCommentModal(false)}
            disabled={commentSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCommentSubmit}
            disabled={commentSubmitting || (commentType === 'custom' && !customComment.trim())}
            startIcon={commentSubmitting ? <CircularProgress size={16} /> : undefined}
          >
            {commentSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast/Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      >
        <MuiAlert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </MuiAlert>
      </Snackbar>
    </DashboardContent>
  );
};

export default TwitterProfilesDashboard;
