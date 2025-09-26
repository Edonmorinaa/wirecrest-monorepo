import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { DashboardContent } from '@/layouts/dashboard';
import { 
  PlayArrow, 
  Pause, 
  Settings, 
  SmartToy, 
  Message, 
  MessageSharp,
  CalendarToday, 
  People, 
  Favorite, 
  Repeat, 
  Close, 
  Person, 
  Notifications,
  AccessTime,
  TrendingUp,
  Bolt,
  Security,
  TrackChanges,
  Refresh,
  CheckCircle,
  Warning,
  Info,
  OpenInNew
} from '@mui/icons-material';

interface TwitterProfile {
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

// Import automation types from @wirecrest/core
import { AutomationConfig } from '@wirecrest/core';

interface AutomationStats {
  totalProfiles: number;
  activeProfiles: number;
  totalActions: number;
  actionsToday: number;
  successRate: number;
  averageResponseTime: number;
  topPerformingProfiles: Array<{
    profileId: string;
    actions: number;
    successRate: number;
  }>;
}

interface ScheduledProfile {
  profileId: string;
  adspowerId: string;
  scheduledTime: string;
  actionType: string;
  timeUntil: {
    hours: number;
    minutes: number;
    totalMinutes: number;
  };
  formattedTime: string;
  persona: string;
  sessionNumber?: number;
  totalSessions?: number;
  isMultiSession?: boolean;
}

interface CompletedProfile {
  profileId: string;
  adspowerId: string;
  actionType: string;
  completedAt: string;
  result: {
    action: string;
    success: boolean;
    comment?: string;
    tweetText?: string;
    sessionDuration?: number;
    engagementsPerformed?: number;
    tweetsProcessed?: number;
    interactionsBreakdown?: {
      likes: number;
      retweets: number;
      bookmarks: number;
    };
    error?: string;
  };
  formattedTime: string;
}

interface ScheduleData {
  upcoming: ScheduledProfile[];
  recent: CompletedProfile[];
  total: number;
  completed: number;
  pending: number;
  failed: number;
}

interface AutomationStatus {
  currentlyExecuting: {
    profileId: string;
    actionType: string;
    startedAt: string;
    status: string;
  } | null;
  lastActivity: string | null;
  status: string;
}

const TwitterAutomationDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<TwitterProfile[]>([]);
  const [config, setConfig] = useState<AutomationConfig>({
    enabled: false,
    schedule: {
      type: 'daily',
      startTime: '09:00',
      endTime: '18:00',
      daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      intervalMinutes: 120,
    },
    actions: {
      like: true,
      retweet: false,
      comment: true,
    },
    limits: {
      maxActionsPerDay: 50,
      maxActionsPerProfile: 10,
      cooldownMinutes: 30,
    },
    targeting: {
      keywords: ['technology', 'AI', 'automation'],
      excludeKeywords: ['spam', 'advertisement'],
      minFollowers: 100,
      maxFollowers: 100000,
      languages: ['en'],
    },
    safety: {
      avoidControversialTopics: true,
      avoidPoliticalContent: true,
      avoidSpamAccounts: true,
      maxActionsPerHour: 5,
    },
  });
  const [stats, setStats] = useState<AutomationStats>({
    totalProfiles: 0,
    activeProfiles: 0,
    totalActions: 0,
    actionsToday: 0,
    successRate: 0,
    averageResponseTime: 0,
    topPerformingProfiles: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus>({
    currentlyExecuting: null,
    lastActivity: null,
    status: 'stopped'
  });
  const [schedule, setSchedule] = useState<ScheduleData>({
    upcoming: [],
    recent: [],
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0
  });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load profiles
      const profilesResponse = await fetch('/api/twitter-profiles/assigned-profiles');
      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json();
        setProfiles(profilesData.profiles || []);
      }

      // Load automation config
      const configResponse = await fetch('/api/twitter-automation/config');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData.config || config);
      }

      // Load automation stats
      const statsResponse = await fetch('/api/twitter-automation/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || stats);
      }

      // Load automation status
      const statusResponse = await fetch('/api/twitter-automation/status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setAutomationStatus({
          currentlyExecuting: null,
          lastActivity: null,
          status: statusData.status || 'stopped'
        });
      }

      // Load schedule data
      const scheduleResponse = await fetch('/api/twitter-automation/schedule');
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        setSchedule(scheduleData.schedule || schedule);
        // Also update automation status from schedule response
        if (scheduleData.automationStatus) {
          setAutomationStatus(scheduleData.automationStatus);
        }
      }

    } catch (err) {
      setError('Failed to load automation data');
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const startAutomation = async () => {
    try {
      setIsStarting(true);
      setError(null);

      const response = await fetch('/api/twitter-automation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        setAutomationStatus({
          currentlyExecuting: null,
          lastActivity: null,
          status: 'running'
        });
        // Show success message (you can implement a toast system)
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start automation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start automation');
    } finally {
      setIsStarting(false);
    }
  };

  const stopAutomation = async () => {
    try {
      setIsStopping(true);
      setError(null);

      const response = await fetch('/api/twitter-automation/stop', {
        method: 'POST',
      });

      if (response.ok) {
        setAutomationStatus({
          currentlyExecuting: null,
          lastActivity: null,
          status: 'stopped'
        });
        // Show success message
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stop automation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop automation');
    } finally {
      setIsStopping(false);
    }
  };

  const saveConfig = async () => {
    try {
      const response = await fetch('/api/twitter-automation/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        setShowConfigModal(false);
        // Show success message
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Failed to save configuration. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <TrendingUp />;
      case 'stopped':
        return <Pause />;
      case 'error':
        return <Warning />;
      default:
        return <Pause />;
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <LinearProgress />
      </Box>
    );
  }

  return (
    <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', lg: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
            Twitter Automation
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Automate human-like Twitter activities across your profiles
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={getStatusIcon(automationStatus.status)}
            label={automationStatus.status.charAt(0).toUpperCase() + automationStatus.status.slice(1)}
            color={getStatusColor(automationStatus.status)}
            variant="outlined"
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<Settings />}
            onClick={() => setShowConfigModal(true)}
          >
            Configure
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TrendingUp />}
            onClick={() => setShowStatsModal(true)}
          >
            Analytics
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Automation Running Alert */}
      {automationStatus.status === 'running' && (
        <Alert severity="info">
          <AlertTitle>Info</AlertTitle>
          Automation is already running
        </Alert>
      )}

      {/* Main Controls */}
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Bolt />
              Automation Controls
            </Box>
          }
          subheader="Start or stop the Twitter automation system"
        />
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              onClick={startAutomation}
              disabled={isStarting || automationStatus.status === 'running'}
              startIcon={isStarting ? <LinearProgress /> : <PlayArrow />}
            >
              {isStarting ? 'Starting...' : 'Start Automation'}
            </Button>
            <Button
              variant="outlined"
              onClick={stopAutomation}
              disabled={isStopping || automationStatus.status === 'stopped'}
              startIcon={isStopping ? <LinearProgress /> : <Pause />}
            >
              {isStopping ? 'Stopping...' : 'Stop Automation'}
            </Button>
            <Button
              variant="outlined"
              onClick={loadData}
              disabled={isLoading}
              startIcon={<Refresh />}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Profiles
                </Typography>
                <People color="action" />
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {stats.totalProfiles}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.activeProfiles} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Actions
                </Typography>
                <TrendingUp color="action" />
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {stats.totalActions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.actionsToday} today
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Success Rate
                </Typography>
                <CheckCircle color="action" />
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {stats.successRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Average performance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Response Time
                </Typography>
                <AccessTime color="action" />
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {stats.averageResponseTime}s
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Average delay
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Currently Executing Profile */}
      {automationStatus.currentlyExecuting && (
        <Card sx={{ border: '1px solid', borderColor: 'success.light', bgcolor: 'success.50' }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.dark' }}>
                <TrendingUp sx={{ animation: 'pulse 2s infinite' }} />
                Currently Executing
              </Box>
            }
            subheader="Profile is actively running automation"
            sx={{ color: 'success.dark' }}
          />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1px solid', borderColor: 'success.light', borderRadius: 1, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.dark' }}>
                    {automationStatus.currentlyExecuting.profileId}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    {automationStatus.currentlyExecuting.actionType.toUpperCase()} action
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.dark' }}>
                  Started: {automationStatus.lastActivity ? new Date(automationStatus.lastActivity).toLocaleTimeString() : 'Unknown'}
                </Typography>
                <Typography variant="caption" color="success.main">
                  Status: Running
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Next Scheduled Runs and Recent Completions */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday />
                    Next Scheduled Runs
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={loadData}
                    disabled={isLoading}
                    startIcon={<Refresh />}
                  >
                    Refresh
                  </Button>
                </Box>
              }
              subheader="Upcoming profile sessions and their scheduled times (multi-session system)"
            />
            <CardContent>
              {schedule.upcoming.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {schedule.upcoming.map((profile, index) => (
                    <Box key={`${profile.profileId}-${profile.scheduledTime}-${index}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {profile.profileId}
                            {profile.isMultiSession && (
                              <Typography component="span" variant="caption" color="primary" sx={{ ml: 0.5 }}>
                                (Session {profile.sessionNumber}/{profile.totalSessions})
                              </Typography>
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {profile.actionType}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {profile.formattedTime}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {profile.timeUntil.hours > 0 
                            ? `${profile.timeUntil.hours}h ${profile.timeUntil.minutes}m`
                            : `${profile.timeUntil.minutes}m`
                          }
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                  <CalendarToday sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
                  <Typography>No upcoming scheduled runs</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle />
                    Recent Completions
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={loadData}
                    disabled={isLoading}
                    startIcon={<Refresh />}
                  >
                    Refresh
                  </Button>
                </Box>
              }
              subheader="Recently completed profile actions"
            />
            <CardContent>
              {schedule.recent.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {schedule.recent.map((profile, index) => (
                    <Box key={`${profile.profileId}-${profile.completedAt}-${index}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {profile.profileId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {profile.actionType}
                          </Typography>
                          {profile.result?.success ? (
                            <Typography variant="caption" color="success.main">✓ Success</Typography>
                          ) : (
                            <Typography variant="caption" color="error.main">✗ Failed</Typography>
                          )}
                          {profile.result?.sessionDuration && (
                            <Typography variant="caption" color="primary.main">
                              {profile.result.sessionDuration}m • {profile.result.engagementsPerformed} engagements
                            </Typography>
                          )}
                          {profile.result?.interactionsBreakdown && (
                            <Typography variant="caption" color="text.secondary">
                              {profile.result.interactionsBreakdown.likes} likes, {profile.result.interactionsBreakdown.retweets} retweets, {profile.result.interactionsBreakdown.bookmarks} bookmarks
                            </Typography>
                          )}
                          {profile.result?.error && (
                            <Typography variant="caption" color="error.main">
                              Error: {profile.result.error}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {profile.formattedTime}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Completed
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                  <CheckCircle sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
                  <Typography>No recent completions</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Profiles and Actions */}
      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label={`Profiles (${profiles.length})`} />
              <Tab label="Recent Actions" />
              <Tab label="Settings" />
            </Tabs>
          </Box>

          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Automation Profiles
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Profiles configured for automated Twitter activities
              </Typography>
              
              {profiles.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Person sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">No profiles configured for automation</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Configure profiles in the Twitter Profiles section first
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {profiles.map((profile) => (
                    <Box
                      key={profile.id}
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, bgcolor: 'primary.100', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Person color="primary" />
                        </Box>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {profile.id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {profile.totalActions} actions • {profile.active ? 'Active' : 'Inactive'}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={profile.active ? 'Active' : 'Inactive'}
                          color={profile.active ? 'primary' : 'default'}
                          size="small"
                        />
                        <Button variant="outlined" size="small">
                          <Settings />
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Recent Actions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Latest automated activities performed by your profiles
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {profiles.flatMap(profile => profile.actions).slice(0, 10).map((action) => (
                  <Box
                    key={action.id}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: action.success ? 'success.100' : 'error.100'
                      }}>
                        {action.action === 'like' && <Favorite color="success" />}
                        {action.action === 'retweet' && <Repeat color="primary" />}
                        {action.action === 'comment' && <MessageSharp color="secondary" />}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', textTransform: 'capitalize' }}>
                          {action.action}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(action.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={action.success ? 'Success' : 'Failed'}
                        color={action.success ? 'success' : 'error'}
                        size="small"
                      />
                      {action.commentUrl && (
                        <Button variant="outlined" size="small" component="a" href={action.commentUrl} target="_blank" rel="noopener noreferrer">
                          <OpenInNew />
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Automation Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure how the automation system behaves
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
                    Enabled Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.actions.like}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              actions: { ...prev.actions, like: e.target.checked }
                            }))
                          }
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Favorite />
                          <span>Like tweets</span>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.actions.retweet}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              actions: { ...prev.actions, retweet: e.target.checked }
                            }))
                          }
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Repeat />
                          <span>Retweet posts</span>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.actions.comment}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              actions: { ...prev.actions, comment: e.target.checked }
                            }))
                          }
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MessageSharp />
                          <span>Comment on tweets</span>
                        </Box>
                      }
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
                    Daily Limits
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Max actions per day"
                        type="number"
                        value={config.limits.maxActionsPerDay}
                        onChange={(e) =>
                          setConfig(prev => ({
                            ...prev,
                            limits: { ...prev.limits, maxActionsPerDay: parseInt(e.target.value) }
                          }))
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Max actions per profile"
                        type="number"
                        value={config.limits.maxActionsPerProfile}
                        onChange={(e) =>
                          setConfig(prev => ({
                            ...prev,
                            limits: { ...prev.limits, maxActionsPerProfile: parseInt(e.target.value) }
                          }))
                        }
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
                    Safety Settings
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.safety.avoidControversialTopics}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              safety: { ...prev.safety, avoidControversialTopics: e.target.checked }
                            }))
                          }
                        />
                      }
                      label="Avoid controversial topics"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.safety.avoidPoliticalContent}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              safety: { ...prev.safety, avoidPoliticalContent: e.target.checked }
                            }))
                          }
                        />
                      }
                      label="Avoid political content"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.safety.avoidSpamAccounts}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              safety: { ...prev.safety, avoidSpamAccounts: e.target.checked }
                            }))
                          }
                        />
                      }
                      label="Avoid spam accounts"
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Configuration Modal */}
      <Dialog open={showConfigModal} onClose={() => setShowConfigModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Automation Configuration</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Configure advanced settings for the Twitter automation system
          </DialogContentText>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Schedule Configuration */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
                Schedule
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    value={config.schedule.startTime}
                    onChange={(e) =>
                      setConfig(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, startTime: e.target.value }
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="End Time"
                    type="time"
                    value={config.schedule.endTime}
                    onChange={(e) =>
                      setConfig(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, endTime: e.target.value }
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Targeting Configuration */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
                Targeting
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Keywords (comma-separated)"
                  value={config.targeting.keywords.join(', ')}
                  onChange={(e) =>
                    setConfig(prev => ({
                      ...prev,
                      targeting: { 
                        ...prev.targeting, 
                        keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                      }
                    }))
                  }
                  placeholder="technology, AI, automation"
                />
                <TextField
                  fullWidth
                  label="Exclude Keywords (comma-separated)"
                  value={config.targeting.excludeKeywords.join(', ')}
                  onChange={(e) =>
                    setConfig(prev => ({
                      ...prev,
                      targeting: { 
                        ...prev.targeting, 
                        excludeKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                      }
                    }))
                  }
                  placeholder="spam, advertisement"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfigModal(false)}>
            Cancel
          </Button>
          <Button onClick={saveConfig} variant="contained">
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Modal */}
      <Dialog open={showStatsModal} onClose={() => setShowStatsModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Automation Analytics</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Detailed statistics and performance metrics
          </DialogContentText>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Performance Overview */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Success Rate
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {stats.successRate}%
                    </Typography>
                    <LinearProgress variant="determinate" value={stats.successRate} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Actions Today
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {stats.actionsToday}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Out of {config.limits.maxActionsPerDay} limit
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Top Performing Profiles */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
                Top Performing Profiles
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {stats.topPerformingProfiles.map((profile, index) => (
                  <Box key={`${profile.profileId}-${index}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 32, height: 32, bgcolor: 'primary.100', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                          {index + 1}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {profile.profileId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {profile.actions} actions • {profile.successRate}% success
                        </Typography>
                      </Box>
                    </Box>
                    <Chip label={`#${index + 1}`} variant="outlined" size="small" />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStatsModal(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      </DashboardContent>
    );
  };

export default TwitterAutomationDashboard;
