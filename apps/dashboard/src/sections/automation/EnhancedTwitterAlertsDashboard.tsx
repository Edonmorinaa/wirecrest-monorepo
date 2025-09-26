import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard/content';
import {
  Zap,
  Eye,
  Play,
  Bell,
  Plus,
  Link,
  Pause,
  Heart,
  Search,
  Trash2,
  Repeat,
  Filter,
  Settings,
  Activity,
  PieChart,
  RefreshCw,
  BarChart3,
  TrendingUp,
  CheckCircle,
  CalendarDays,
  ArrowUpRight,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

interface TwitterAlert {
  id: string;
  keyword: string;
  tweetId: string;
  tweetText: string;
  author: string;
  authorHandle: string;
  timestamp: string; // When the tweet was actually posted
  scrapedAt?: string; // When we found/scraped the tweet
  url: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  status: 'new' | 'processed' | 'ignored';
  verified?: boolean;
  imageCount?: number;
  hasCard?: boolean;
  alertSent?: boolean;
  actions?: {
    like?: {
      completed: boolean;
      timestamp: string;
      profileId?: string;
      profileName?: string;
      engagement?: {
        before: { likes: number; retweets: number; replies: number };
        after: { likes: number; retweets: number; replies: number };
      };
    };
    retweet?: {
      completed: boolean;
      timestamp: string;
      profileId?: string;
      profileName?: string;
      engagement?: {
        before: { likes: number; retweets: number; replies: number };
        after: { likes: number; retweets: number; replies: number };
      };
    };
    comment?: {
      completed: boolean;
      timestamp: string;
      profileId?: string;
      profileName?: string;
      commentText?: string;
      engagement?: {
        before: { likes: number; retweets: number; replies: number };
        after: { likes: number; retweets: number; replies: number };
      };
    };
  };
}

interface AlertStats {
  totalAlerts: number;
  newAlerts: number;
  processedAlerts: number;
  totalKeywords: number;
  lastScan: string;
  nextScan: string;
  apifyStatus: 'connected' | 'disconnected' | 'error';
  scanStatus: 'running' | 'stopped' | 'error';
  engagementStats: {
    totalLikes: number;
    totalRetweets: number;
    totalComments: number;
    engagementRate: number;
    topPerformingKeyword: string;
    mostActiveProfile: string;
  };
}

interface KeywordConfig {
  keyword: string;
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
  maxTweets: number;
  createdAt: string;
  lastFound: string;
  totalFound: number;
}

interface ApifyConfig {
  apiToken: string;
  baseUrl: string;
  actorId: string;
  authToken: string;
  scraper: {
    searchMode: string;
    maxTweets: number;
    maxRequestRetries: number;
    addUserInfo: boolean;
    maxConcurrency: number;
  };
}

const EnhancedTwitterAlertsDashboard: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const params = useParams();
  const teamSlug = params?.slug as string;
  const [alerts, setAlerts] = useState<TwitterAlert[]>([]);
  const [keywords, setKeywords] = useState<KeywordConfig[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    totalAlerts: 0,
    newAlerts: 0,
    processedAlerts: 0,
    totalKeywords: 0,
    lastScan: '',
    nextScan: '',
    apifyStatus: 'disconnected',
    scanStatus: 'stopped',
    engagementStats: {
      totalLikes: 0,
      totalRetweets: 0,
      totalComments: 0,
      engagementRate: 0,
      topPerformingKeyword: '',
      mostActiveProfile: '',
    },
  });
  const [config, setConfig] = useState<ApifyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<TwitterAlert | null>(null);
  const [commentType, setCommentType] = useState<'ai' | 'custom'>('ai');
  const [customComment, setCustomComment] = useState('');

  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<
    'alerts' | 'actions' | 'analytics' | 'calendar' | 'keywords'
  >('alerts');

  // Scan control states
  const [selectedKeywordForScan, setSelectedKeywordForScan] = useState<string>('');
  const [scanInProgress, setScanInProgress] = useState(false);
  const [scanResults, setScanResults] = useState<{ found: number; keyword: string } | null>(null);

  // Comment submission states
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentResult, setCommentResult] = useState<{
    success: boolean;
    message: string;
    commentUrl?: string;
  } | null>(null);

  // Action loading states
  const [processingActions, setProcessingActions] = useState<{ [key: string]: boolean }>({});
  const [keywordSubmitting, setKeywordSubmitting] = useState(false);
  const [configSubmitting, setConfigSubmitting] = useState(false);

  // Form states
  const [newKeyword, setNewKeyword] = useState<{
    keyword: string;
    priority: 'high' | 'medium' | 'low';
    maxTweets: number;
  }>({
    keyword: '',
    priority: 'medium',
    maxTweets: 5,
  });
  const [configForm, setConfigForm] = useState({
    apiToken: '',
    authToken: '',
    maxTweets: 5,
    searchMode: 'live',
  });

  useEffect(() => {
    if (teamSlug) {
      fetchTwitterAlertsData();
    }
  }, [teamSlug]);

  const fetchTwitterAlertsData = async () => {
    try {
      setLoading(true);

      if (!teamSlug) {
        setError('Team slug is required');
        return;
      }

      // Fetch alerts data
      const response = await fetch(`/api/twitter-alerts?teamSlug=${teamSlug}`);
      if (response.ok) {
        const alertsData = await response.json();
        setAlerts((alertsData.alerts || []) as TwitterAlert[]);
        console.log('✅ Loaded alerts from API:', alertsData.alerts?.length || 0);
      } else {
        console.error('Failed to fetch alerts:', response.status);
        setAlerts([]);
      }

      // Fetch keywords data
      const keywordsResponse = await fetch(`/api/twitter-alerts/keywords?teamSlug=${teamSlug}`);
      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json();
        setKeywords((keywordsData.keywords || []) as KeywordConfig[]);
        console.log('✅ Loaded keywords from API:', keywordsData.keywords?.length || 0);
      } else {
        console.error('Failed to fetch keywords:', keywordsResponse.status);
        setKeywords([]);
      }

      // Fetch stats data
      const statsResponse = await fetch(`/api/twitter-alerts/stats?teamSlug=${teamSlug}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData as AlertStats);
        console.log('✅ Loaded stats from API');
      } else {
        console.error('Failed to fetch stats:', statsResponse.status);
        // Set default stats
        setStats({
          totalAlerts: 0,
          newAlerts: 0,
          processedAlerts: 0,
          totalKeywords: 0,
          lastScan: '',
          nextScan: '',
          apifyStatus: 'disconnected',
          scanStatus: 'stopped',
          engagementStats: {
            totalLikes: 0,
            totalRetweets: 0,
            totalComments: 0,
            engagementRate: 0,
            topPerformingKeyword: '',
            mostActiveProfile: '',
          },
        });
      }

      // Fetch engagement history data
      const engagementHistoryResponse = await fetch(
        `/api/twitter-alerts/engagement-history?teamSlug=${teamSlug}`
      );
      if (engagementHistoryResponse.ok) {
        const engagementHistoryData = await engagementHistoryResponse.json();
        setEngagements(engagementHistoryData.engagements || []);
        console.log(
          '✅ Loaded engagement history from API:',
          engagementHistoryData.engagements?.length || 0
        );
      } else {
        console.error('Failed to fetch engagement history:', engagementHistoryResponse.status);
        setEngagements([]);
      }

      // Fetch config data
      const configResponse = await fetch(`/api/twitter-alerts/config?teamSlug=${teamSlug}`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
        console.log('✅ Loaded config from API');
      } else {
        console.error('Failed to fetch config:', configResponse.status);
        setConfig(null);
      }
    } catch (err) {
      console.error('Error fetching Twitter alerts data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMonitoring = async () => {
    try {
      const response = await fetch('/api/twitter-alerts/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamSlug,
          keyword: selectedKeywordForScan === 'all' ? undefined : selectedKeywordForScan,
        }),
      });

      if (response.ok) {
        setStats((prev) => ({ ...prev, scanStatus: 'running' }));
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start monitoring');
      }
    } catch (err) {
      setError('Failed to start monitoring');
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const response = await fetch('/api/twitter-alerts/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamSlug }),
      });

      if (response.ok) {
        setStats((prev) => ({ ...prev, scanStatus: 'stopped' }));
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to stop monitoring');
      }
    } catch (err) {
      setError('Failed to stop monitoring');
    }
  };

  const handleManualScan = async () => {
    try {
      setScanInProgress(true);
      setScanResults(null);
      setError(null);

      const response = await fetch('/api/twitter-alerts/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamSlug,
          keyword: selectedKeywordForScan === 'all' ? undefined : selectedKeywordForScan,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const keyword = selectedKeywordForScan === 'all' ? 'All Keywords' : selectedKeywordForScan;
        const found = data.newAlerts || data.found || data.alerts?.length || 0;

        setScanResults({
          found,
          keyword,
        });

        // Refresh data after scan
        setTimeout(() => {
          fetchTwitterAlertsData();
          // Clear results after 5 seconds
          setTimeout(() => setScanResults(null), 5000);
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to perform manual scan');
      }
    } catch (err) {
      setError('Failed to perform manual scan');
    } finally {
      setScanInProgress(false);
    }
  };

  const handleAddKeyword = async () => {
    try {
      setKeywordSubmitting(true);

      const response = await fetch('/api/twitter-alerts/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...newKeyword, teamSlug }),
      });

      if (response.ok) {
        const result = await response.json();
        setShowKeywordModal(false);
        setNewKeyword({ keyword: '', priority: 'medium', maxTweets: 5 });

        // Only refresh keywords, not the entire data
        const keywordsResponse = await fetch(`/api/twitter-alerts/keywords?teamSlug=${teamSlug}`);
        if (keywordsResponse.ok) {
          const keywordsData = await keywordsResponse.json();
          setKeywords((keywordsData.keywords || []) as KeywordConfig[]);
        }

        // Update stats to reflect new keyword count
        const statsResponse = await fetch(`/api/twitter-alerts/stats?teamSlug=${teamSlug}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData as AlertStats);
        }

        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add keyword');
      }
    } catch (err) {
      setError('Failed to add keyword');
    } finally {
      setKeywordSubmitting(false);
    }
  };

  const handleDeleteKeyword = async (keyword: string) => {
    try {
      const response = await fetch(
        `/api/twitter-alerts/keywords/${encodeURIComponent(keyword)}?teamSlug=${teamSlug}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        // Only refresh keywords, not the entire data
        const keywordsResponse = await fetch(`/api/twitter-alerts/keywords?teamSlug=${teamSlug}`);
        if (keywordsResponse.ok) {
          const keywordsData = await keywordsResponse.json();
          setKeywords((keywordsData.keywords || []) as KeywordConfig[]);
        }

        // Update stats to reflect new keyword count
        const statsResponse = await fetch(`/api/twitter-alerts/stats?teamSlug=${teamSlug}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData as AlertStats);
        }

        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete keyword');
      }
    } catch (err) {
      setError('Failed to delete keyword');
    }
  };

  const handleUpdateConfig = async () => {
    try {
      setConfigSubmitting(true);

      const response = await fetch('/api/twitter-alerts/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...configForm, teamSlug }),
      });

      if (response.ok) {
        setShowConfigModal(false);
        fetchTwitterAlertsData();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update configuration');
      }
    } catch (err) {
      setError('Failed to update configuration');
    } finally {
      setConfigSubmitting(false);
    }
  };

  // Update keywords total found when alerts change
  useEffect(() => {
    const updatedKeywords = keywords.map((keyword) => {
      const keywordAlerts = alerts.filter((alert) => alert.keyword === keyword.keyword);
      return {
        ...keyword,
        totalFound: keywordAlerts.length,
        lastFound:
          keywordAlerts.length > 0
            ? keywordAlerts.sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              )[0].timestamp
            : keyword.lastFound,
      };
    });
    setKeywords(updatedKeywords);
  }, [alerts]);

  const handleProcessAlert = async (
    alertId: string,
    action: 'like' | 'retweet' | 'comment' | 'ignore'
  ) => {
    try {
      // For comment action, show the comment modal first
      if (action === 'comment') {
        const alert = alerts.find((a) => a.id === alertId);
        if (alert) {
          setSelectedAlert(alert);
          setShowCommentModal(true);
        }
        return;
      }

      // Set loading state for this specific action
      setProcessingActions((prev) => ({ ...prev, [`${alertId}-${action}`]: true }));

      const response = await fetch('/api/twitter-alerts/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alertId, action, teamSlug }),
      });

      if (response.ok) {
        // Only refresh alerts data, not everything
        const alertsResponse = await fetch(`/api/twitter-alerts?teamSlug=${teamSlug}`);
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          setAlerts((alertsData.alerts || []) as TwitterAlert[]);
        }

        // Update stats to reflect new processed count
        const statsResponse = await fetch(`/api/twitter-alerts/stats?teamSlug=${teamSlug}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData as AlertStats);
        }

        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to process alert');
      }
    } catch (err) {
      setError('Failed to process alert');
    } finally {
      // Clear loading state
      setProcessingActions((prev) => ({ ...prev, [`${alertId}-${action}`]: false }));
    }
  };

  const handleCommentSubmit = async () => {
    if (!selectedAlert) return;

    try {
      setCommentSubmitting(true);
      setCommentResult(null);

      const body: any = {
        alertId: selectedAlert.id,
        action: 'comment',
        teamSlug,
        customComment: commentType === 'custom' ? customComment : undefined,
      };

      const response = await fetch('/api/twitter-alerts/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        setCommentResult({
          success: true,
          message: result.message || 'Comment posted successfully!',
          commentUrl: result.commentUrl || null,
        });

        // Only refresh alerts data, not everything
        const alertsResponse = await fetch(`/api/twitter-alerts?teamSlug=${teamSlug}`);
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          setAlerts((alertsData.alerts || []) as TwitterAlert[]);
        }

        // Update stats to reflect new processed count
        const statsResponse = await fetch(`/api/twitter-alerts/stats?teamSlug=${teamSlug}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData as AlertStats);
        }

        setError(null);
      } else {
        const errorData = await response.json();
        setCommentResult({
          success: false,
          message: errorData.error || 'Failed to process comment',
        });
        setError(errorData.error || 'Failed to process comment');
      }
    } catch (err) {
      setCommentResult({
        success: false,
        message: 'Failed to process comment',
      });
      setError('Failed to process comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Add a refresh function that can be called when needed
  const refreshData = async () => {
    await fetchTwitterAlertsData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Chip label="Running" color="success" />;
      case 'stopped':
        return <Chip label="Stopped" color="default" />;
      case 'error':
        return <Chip label="Error" color="error" />;
      case 'connected':
        return <Chip label="Connected" color="success" />;
      case 'disconnected':
        return <Chip label="Disconnected" color="warning" />;
      default:
        return <Chip label="Unknown" color="default" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Chip label="High" color="error" />;
      case 'medium':
        return <Chip label="Medium" color="warning" />;
      case 'low':
        return <Chip label="Low" color="success" />;
      default:
        return <Chip label="Unknown" color="default" />;
    }
  };

  // Only apply filters when in alerts view
  const filteredAlerts =
    viewMode === 'alerts'
      ? alerts
          .filter((alert) => {
            if (selectedDate && !alert.timestamp.includes(format(selectedDate, 'yyyy-MM-dd'))) {
              return false;
            }
            if (selectedKeyword !== 'all' && alert.keyword !== selectedKeyword) {
              return false;
            }
            if (selectedStatus !== 'all' && alert.status !== selectedStatus) {
              return false;
            }
            return true;
          })
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort by newest first
      : alerts; // Show all alerts in other views

  // Reset filters when switching away from alerts view
  useEffect(() => {
    if (viewMode !== 'alerts') {
      setSelectedDate(undefined);
      setSelectedKeyword('all');
      setSelectedStatus('all');
    }
  }, [viewMode]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 View mode changed to:', viewMode);
    console.log('🔍 Total alerts:', alerts.length);
    console.log('🔍 Filtered alerts:', filteredAlerts.length);
    console.log('🔍 Selected date:', selectedDate);
    console.log('🔍 Selected keyword:', selectedKeyword);
    console.log('🔍 Selected status:', selectedStatus);
  }, [
    viewMode,
    alerts.length,
    filteredAlerts.length,
    selectedDate,
    selectedKeyword,
    selectedStatus,
  ]);

  const getEngagementChange = (alert: TwitterAlert, action: 'like' | 'retweet' | 'comment') => {
    const actionData = alert.actions?.[action];
    if (!actionData?.engagement) return null;

    const { before, after } = actionData.engagement;
    const change = after.likes - before.likes;
    return change;
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="256px">
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #3B82F6, #8B5CF6)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Twitter Alerts Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Advanced monitoring and engagement tracking with Apify integration
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={fetchTwitterAlertsData}>
            <RefreshCw style={{ width: 16, height: 16, marginRight: 8 }} />
            Refresh
          </Button>
          <Button variant="contained" onClick={() => setShowConfigModal(true)}>
            <Settings style={{ width: 16, height: 16, marginRight: 8 }} />
            Configure
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTriangle style={{ width: 16, height: 16, marginRight: 8 }} />
          {error}
        </Alert>
      )}

      {/* Enhanced Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ borderLeft: '4px solid #3B82F6' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Alerts
                </Typography>
                <Bell style={{ width: 16, height: 16, color: '#3B82F6' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.totalAlerts}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.newAlerts} new alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ borderLeft: '4px solid #10B981' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Engagement Rate
                </Typography>
                <TrendingUp style={{ width: 16, height: 16, color: '#10B981' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.engagementStats.engagementRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.engagementStats.totalLikes +
                  stats.engagementStats.totalRetweets +
                  stats.engagementStats.totalComments}{' '}
                total actions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ borderLeft: '4px solid #8B5CF6' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Active Keywords
                </Typography>
                <Search style={{ width: 16, height: 16, color: '#8B5CF6' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.totalKeywords}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {keywords.filter((k) => k.enabled).length} enabled
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ borderLeft: '4px solid #F59E0B' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Scan Status
                </Typography>
                <Activity style={{ width: 16, height: 16, color: '#F59E0B' }} />
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                {getStatusBadge(stats.scanStatus)}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: 'block' }}
              >
                {stats.lastScan
                  ? `Last: ${new Date(stats.lastScan).toLocaleTimeString()}`
                  : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Control Panel
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Start, stop, or manually trigger Twitter alert scanning
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Keyword Selector */}
            <Box>
              <InputLabel htmlFor="keyword-select">Select Keyword to Scan</InputLabel>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <Select
                  value={selectedKeywordForScan}
                  onChange={(e) => setSelectedKeywordForScan(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">Choose a keyword to scan...</MenuItem>
                  <MenuItem value="all">All Keywords</MenuItem>
                  {keywords.map((keyword) => (
                    <MenuItem key={keyword.keyword} value={keyword.keyword}>
                      {keyword.keyword}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: 'block' }}
              >
                Select which keyword to scan for. Choose &quot;All Keywords&quot; to scan all
                keywords at once.
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              {stats.scanStatus === 'running' ? (
                <Button variant="outlined" onClick={handleStopMonitoring}>
                  <Pause style={{ width: 16, height: 16, marginRight: 8 }} />
                  Stop Monitoring
                </Button>
              ) : (
                <Button variant="contained" onClick={handleStartMonitoring}>
                  <Play style={{ width: 16, height: 16, marginRight: 8 }} />
                  Start Monitoring
                </Button>
              )}

              <Button variant="outlined" onClick={handleManualScan} disabled={scanInProgress}>
                {scanInProgress ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Zap style={{ width: 16, height: 16, marginRight: 8 }} />
                    Manual Scan
                    {selectedKeywordForScan && selectedKeywordForScan !== 'all'
                      ? ` (${selectedKeywordForScan})`
                      : ''}
                  </>
                )}
              </Button>

              <Button variant="outlined" onClick={refreshData} disabled={loading}>
                {loading ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw style={{ width: 16, height: 16, marginRight: 8 }} />
                    Refresh Data
                  </>
                )}
              </Button>

              <Button variant="outlined" onClick={() => setShowKeywordModal(true)}>
                <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
                Add Keyword
              </Button>
            </Box>

            {/* Scan Progress and Results */}
            {scanInProgress && (
              <Alert severity="info">
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <strong>Scan in Progress...</strong> Please wait while we search for tweets matching
                &quot;{selectedKeywordForScan === 'all' ? 'All Keywords' : selectedKeywordForScan}
                &quot;
              </Alert>
            )}

            {scanResults && (
              <Alert severity="success">
                <CheckCircle style={{ width: 16, height: 16, marginRight: 8 }} />
                <strong>Scan Complete!</strong> Found <strong>{scanResults.found}</strong> new
                tweets for &quot;{scanResults.keyword}&quot;
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Box>
        <Tabs value={viewMode} onChange={(e, newValue) => setViewMode(newValue)} sx={{ mb: 3 }}>
          <Tab label={`Alerts (${stats.totalAlerts})`} value="alerts" />
          <Tab label="Actions History" value="actions" />
          <Tab label="Analytics" value="analytics" />
          <Tab label="Calendar" value="calendar" />
          <Tab label={`Keywords (${keywords.length})`} value="keywords" />
        </Tabs>

        {/* Alerts Tab Content */}
        {viewMode === 'alerts' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Filters */}
            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                >
                  <Filter style={{ width: 16, height: 16 }} />
                  Filters
                </Typography>
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">Date:</Typography>
                    <TextField
                      type="date"
                      value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) =>
                        setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)
                      }
                      size="small"
                    />
                  </Box>

                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">Keyword:</Typography>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={selectedKeyword}
                        onChange={(e) => setSelectedKeyword(e.target.value)}
                      >
                        <MenuItem value="all">All Keywords</MenuItem>
                        {keywords.map((keyword) => (
                          <MenuItem key={keyword.keyword} value={keyword.keyword}>
                            {keyword.keyword}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">Status:</Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="new">New</MenuItem>
                        <MenuItem value="processed">Processed</MenuItem>
                        <MenuItem value="ignored">Ignored</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedDate(undefined);
                      setSelectedKeyword('all');
                      setSelectedStatus('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </Box>

                {/* Filter Summary */}
                {(selectedDate || selectedKeyword !== 'all' || selectedStatus !== 'all') && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Active Filters:</strong>
                      {selectedDate && ` Date: ${format(selectedDate, 'MMM dd, yyyy')}`}
                      {selectedKeyword !== 'all' && ` Keyword: ${selectedKeyword}`}
                      {selectedStatus !== 'all' && ` Status: ${selectedStatus}`}
                      {` (Showing ${filteredAlerts.length} of ${alerts.length} alerts)`}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Alerts List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredAlerts.length === 0 ? (
                <Card>
                  <CardContent
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 128,
                    }}
                  >
                    <Box textAlign="center">
                      <Bell
                        style={{
                          width: 32,
                          height: 32,
                          color: 'text.secondary',
                          margin: '0 auto 8px',
                        }}
                      />
                      <Typography color="text.secondary">No alerts found</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Try adjusting your filters or start monitoring
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                filteredAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    sx={{ '&:hover': { boxShadow: 2 }, transition: 'box-shadow 0.2s' }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip label={alert.keyword} variant="outlined" size="small" />
                          {alert.status === 'new' && (
                            <Chip label="New" color="primary" size="small" />
                          )}
                          {alert.actions && Object.keys(alert.actions).length > 0 && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              {alert.actions.like?.completed && (
                                <Heart style={{ width: 12, height: 12, color: '#EF4444' }} />
                              )}
                              {alert.actions.retweet?.completed && (
                                <Repeat style={{ width: 12, height: 12, color: '#10B981' }} />
                              )}
                              {alert.actions.comment?.completed && (
                                <MessageSquare
                                  style={{ width: 12, height: 12, color: '#3B82F6' }}
                                />
                              )}
                            </Box>
                          )}
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="caption" color="text.secondary">
                            Posted: {new Date(alert.timestamp).toLocaleString()}
                            {alert.scrapedAt && (
                              <span
                                style={{ marginLeft: 8, fontSize: '0.75rem', color: '#9CA3AF' }}
                              >
                                (Found: {new Date(alert.scrapedAt).toLocaleString()})
                              </span>
                            )}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setShowAlertModal(true);
                            }}
                          >
                            <Eye style={{ width: 12, height: 12, marginRight: 4 }} />
                            View
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => window.open(alert.url, '_blank')}
                          >
                            <Link style={{ width: 12, height: 12, marginRight: 4 }} />
                            View Tweet
                          </Button>
                        </Box>
                      </Box>

                      <Box display="flex" gap={2} mb={2}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                          {alert.author.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Typography variant="subtitle2" fontWeight="medium">
                              {alert.author}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              @{alert.authorHandle}
                            </Typography>
                            {alert.verified && (
                              <Chip label="Verified" color="primary" size="small" />
                            )}
                          </Box>
                          <Typography variant="body2">{alert.tweetText}</Typography>
                        </Box>
                      </Box>

                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Heart style={{ width: 12, height: 12 }} />
                            <Typography variant="caption">{alert.engagement.likes}</Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Repeat style={{ width: 12, height: 12 }} />
                            <Typography variant="caption">{alert.engagement.retweets}</Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <MessageSquare style={{ width: 12, height: 12 }} />
                            <Typography variant="caption">{alert.engagement.replies}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" gap={1}>
                          {!alert.actions?.like?.completed ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleProcessAlert(alert.id, 'like')}
                              disabled={processingActions[`${alert.id}-like`]}
                            >
                              {processingActions[`${alert.id}-like`] ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Heart style={{ width: 12, height: 12, marginRight: 4 }} />
                              )}
                              Like
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              disabled
                              sx={{
                                bgcolor: '#EF4444',
                                '&:hover': { bgcolor: '#EF4444' },
                                '&:disabled': { bgcolor: '#EF4444', color: 'white' },
                              }}
                            >
                              <Heart
                                style={{ width: 12, height: 12, marginRight: 4, fill: 'white' }}
                              />
                              Liked
                            </Button>
                          )}

                          {!alert.actions?.retweet?.completed ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleProcessAlert(alert.id, 'retweet')}
                              disabled={processingActions[`${alert.id}-retweet`]}
                            >
                              {processingActions[`${alert.id}-retweet`] ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Repeat style={{ width: 12, height: 12, marginRight: 4 }} />
                              )}
                              Retweet
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled
                              sx={{
                                bgcolor: '#10B981',
                                '&:hover': { bgcolor: '#10B981' },
                                '&:disabled': { bgcolor: '#10B981', color: 'white' },
                              }}
                            >
                              <Repeat
                                style={{ width: 12, height: 12, marginRight: 4, fill: 'white' }}
                              />
                              Retweeted
                            </Button>
                          )}

                          {!alert.actions?.comment?.completed ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSelectedAlert(alert);
                                setShowCommentModal(true);
                              }}
                              disabled={processingActions[`${alert.id}-comment`]}
                            >
                              {processingActions[`${alert.id}-comment`] ? (
                                <CircularProgress size={16} />
                              ) : (
                                <MessageSquare style={{ width: 12, height: 12, marginRight: 4 }} />
                              )}
                              Comment
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              disabled
                              sx={{
                                bgcolor: '#3B82F6',
                                '&:hover': { bgcolor: '#3B82F6' },
                                '&:disabled': { bgcolor: '#3B82F6', color: 'white' },
                              }}
                            >
                              <MessageSquare
                                style={{ width: 12, height: 12, marginRight: 4, fill: 'white' }}
                              />
                              Commented
                            </Button>
                          )}
                        </Box>
                      </Box>

                      {/* Engagement Changes */}
                      {alert.actions && Object.keys(alert.actions).length > 0 && (
                        <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider', mt: 1 }}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="caption" color="text.secondary">
                              Engagement Changes:
                            </Typography>
                            {alert.actions.like?.completed && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Heart style={{ width: 12, height: 12, color: '#EF4444' }} />
                                <Typography
                                  variant="caption"
                                  color={
                                    getEngagementChange(alert, 'like')! > 0
                                      ? 'success.main'
                                      : 'error.main'
                                  }
                                >
                                  {getEngagementChange(alert, 'like')! > 0 ? '+' : ''}
                                  {getEngagementChange(alert, 'like')}
                                </Typography>
                              </Box>
                            )}
                            {alert.actions.retweet?.completed && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Repeat style={{ width: 12, height: 12, color: '#10B981' }} />
                                <Typography
                                  variant="caption"
                                  color={
                                    getEngagementChange(alert, 'retweet')! > 0
                                      ? 'success.main'
                                      : 'error.main'
                                  }
                                >
                                  {getEngagementChange(alert, 'retweet')! > 0 ? '+' : ''}
                                  {getEngagementChange(alert, 'retweet')}
                                </Typography>
                              </Box>
                            )}
                            {alert.actions.comment?.completed && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <MessageSquare
                                  style={{ width: 12, height: 12, color: '#3B82F6' }}
                                />
                                <Typography
                                  variant="caption"
                                  color={
                                    getEngagementChange(alert, 'comment')! > 0
                                      ? 'success.main'
                                      : 'error.main'
                                  }
                                >
                                  {getEngagementChange(alert, 'comment')! > 0 ? '+' : ''}
                                  {getEngagementChange(alert, 'comment')}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </Box>
        )}

        {/* Actions History Tab Content */}
        {viewMode === 'actions' && (
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Activity style={{ width: 16, height: 16 }} />
                    Profile Actions History
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track all actions performed by your profiles and view engagement results
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={fetchTwitterAlertsData}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <RefreshCw style={{ width: 16, height: 16 }} />
                  Refresh
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {engagements.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <Activity
                      style={{
                        width: 48,
                        height: 48,
                        color: 'text.secondary',
                        margin: '0 auto 16px',
                      }}
                    />
                    <Typography color="text.secondary">No actions performed yet</Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 2 }}
                    >
                      Start engaging with alerts to see action history here
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Debug Info: {engagements.length} engagements loaded from history
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          fetchTwitterAlertsData();
                        }}
                      >
                        <RefreshCw style={{ width: 12, height: 12, marginRight: 4 }} />
                        Refresh Actions
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  engagements
                    .sort(
                      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )
                    .map((engagement) => (
                      <Card
                        key={engagement.id}
                        sx={{
                          borderLeft: `4px solid ${engagement.success ? '#10B981' : '#EF4444'}`,
                        }}
                      >
                        <CardContent>
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            mb={1}
                          >
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={engagement.details?.keyword || 'Unknown'}
                                variant="outlined"
                                size="small"
                              />
                              <Typography variant="caption" color="text.secondary">
                                Profile: {engagement.profileId}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(engagement.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {engagement.details?.tweetText || 'No tweet text available'}
                          </Typography>

                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1.5,
                              borderRadius: 1,
                              bgcolor:
                                engagement.actionType === 'like'
                                  ? 'error.50'
                                  : engagement.actionType === 'retweet'
                                    ? 'success.50'
                                    : 'primary.50',
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={1.5}>
                              {engagement.actionType === 'like' && (
                                <Heart style={{ width: 20, height: 20, color: '#EF4444' }} />
                              )}
                              {engagement.actionType === 'retweet' && (
                                <Repeat style={{ width: 20, height: 20, color: '#10B981' }} />
                              )}
                              {engagement.actionType === 'comment' && (
                                <MessageSquare
                                  style={{ width: 20, height: 20, color: '#3B82F6' }}
                                />
                              )}
                              <Box>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ textTransform: 'capitalize' }}
                                >
                                  {engagement.actionType} Action
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Profile: {engagement.profileId}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block' }}
                                >
                                  {new Date(engagement.timestamp).toLocaleString()}
                                </Typography>
                                {engagement.details?.customComment && (
                                  <Box
                                    sx={{
                                      mt: 0.5,
                                      p: 1,
                                      bgcolor: 'background.paper',
                                      borderRadius: 1,
                                      border: 1,
                                      borderColor: 'divider',
                                    }}
                                  >
                                    <Typography variant="caption">
                                      &quot;{engagement.details.customComment}&quot;
                                    </Typography>
                                  </Box>
                                )}
                                {engagement.details?.isAI &&
                                  engagement.actionType === 'comment' && (
                                    <Typography
                                      variant="caption"
                                      color="primary.main"
                                      sx={{ mt: 0.5, display: 'block' }}
                                    >
                                      🤖 AI-generated comment
                                    </Typography>
                                  )}
                              </Box>
                            </Box>
                            <Box textAlign="right">
                              <Typography variant="caption">
                                {engagement.success ? (
                                  <Box display="flex" alignItems="center" color="success.main">
                                    <CheckCircle
                                      style={{ width: 16, height: 16, marginRight: 4 }}
                                    />
                                    Success
                                  </Box>
                                ) : (
                                  <Box display="flex" alignItems="center" color="error.main">
                                    <AlertTriangle
                                      style={{ width: 16, height: 16, marginRight: 4 }}
                                    />
                                    Failed
                                  </Box>
                                )}
                              </Typography>
                              {engagement.details?.commentUrl && (
                                <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                  <a
                                    href={engagement.details.commentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#3B82F6', textDecoration: 'none' }}
                                  >
                                    <Link style={{ width: 12, height: 12, marginRight: 4 }} />
                                    View Comment
                                  </a>
                                </Typography>
                              )}
                              {engagement.tweetUrl && (
                                <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                  <a
                                    href={
                                      typeof engagement.tweetUrl === 'string'
                                        ? engagement.tweetUrl
                                        : engagement.tweetUrl.tweetUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#3B82F6', textDecoration: 'none' }}
                                  >
                                    <Link style={{ width: 12, height: 12, marginRight: 4 }} />
                                    View Tweet
                                  </a>
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Analytics Tab Content */}
        {viewMode === 'analytics' && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                  >
                    <BarChart3 style={{ width: 16, height: 16 }} />
                    Engagement Overview
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography>Total Likes</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight="bold">
                          {stats.engagementStats.totalLikes}
                        </Typography>
                        <ArrowUpRight style={{ width: 16, height: 16, color: '#10B981' }} />
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography>Total Retweets</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight="bold">
                          {stats.engagementStats.totalRetweets}
                        </Typography>
                        <ArrowUpRight style={{ width: 16, height: 16, color: '#10B981' }} />
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography>Total Comments</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight="bold">
                          {stats.engagementStats.totalComments}
                        </Typography>
                        <ArrowUpRight style={{ width: 16, height: 16, color: '#10B981' }} />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                  >
                    <PieChart style={{ width: 16, height: 16 }} />
                    Performance Metrics
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography>Engagement Rate</Typography>
                      <Typography fontWeight="bold" color="success.main">
                        {stats.engagementStats.engagementRate.toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography>Top Keyword</Typography>
                      <Typography fontWeight="bold">
                        {stats.engagementStats.topPerformingKeyword || 'N/A'}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography>Most Active Profile</Typography>
                      <Typography fontWeight="bold">
                        {stats.engagementStats.mostActiveProfile || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Calendar Tab Content */}
        {viewMode === 'calendar' && (
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <CalendarDays style={{ width: 16, height: 16 }} />
                Calendar View
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                View alerts by date and track engagement over time
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center" height={256}>
                <TextField
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)
                  }
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Keywords Tab Content */}
        {viewMode === 'keywords' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {keywords.map((keyword) => (
              <Card key={keyword.keyword}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Search style={{ width: 16, height: 16 }} />
                      <Typography variant="h6">{keyword.keyword}</Typography>
                      {getPriorityBadge(keyword.priority)}
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Checkbox
                        checked={keyword.enabled}
                        onChange={async (e) => {
                          // TODO: Implement toggle functionality
                        }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleDeleteKeyword(keyword.keyword)}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </Button>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Max Tweets:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {keyword.maxTweets}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Found:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {keyword.totalFound}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Created:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {new Date(keyword.createdAt).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Last Found:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {keyword.lastFound
                          ? new Date(keyword.lastFound).toLocaleDateString()
                          : 'Never'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Comment Modal */}
      <Dialog
        open={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setCommentSubmitting(false);
          setCommentResult(null);
          setCustomComment('');
          setCommentType('ai');
          setError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Choose how to comment on this tweet
          </Typography>

          {selectedAlert && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {commentSubmitting && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 3,
                    bgcolor: 'primary.50',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'primary.200',
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <CircularProgress size={24} color="primary" />
                    <Box textAlign="center">
                      <Typography variant="body2" fontWeight="medium" color="primary.dark">
                        Executing Comment Action
                      </Typography>
                      <Typography variant="caption" color="primary.main">
                        Please wait while we process your comment...
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              <Box display="flex" gap={1.5}>
                <Avatar sx={{ width: 40, height: 40 }}>
                  {selectedAlert.author.charAt(0).toUpperCase()}
                </Avatar>
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {selectedAlert.author}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      @{selectedAlert.authorHandle}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {selectedAlert.tweetText}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Comment Type
                </Typography>
                <RadioGroup
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value as 'ai' | 'custom')}
                  row
                >
                  <FormControlLabel value="ai" control={<Radio />} label="AI Generated Comment" />
                  <FormControlLabel value="custom" control={<Radio />} label="Custom Comment" />
                </RadioGroup>
              </Box>

              {commentType === 'custom' && (
                <TextField
                  label="Your Comment"
                  placeholder="Enter your custom comment..."
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  multiline
                  rows={3}
                  fullWidth
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {commentResult ? (
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Alert severity={commentResult.success ? 'success' : 'error'}>
                {commentResult.message}
              </Alert>
              {commentResult.success && commentResult.commentUrl && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'primary.50',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'primary.200',
                  }}
                >
                  <Link style={{ width: 16, height: 16, color: '#3B82F6' }} />
                  <a
                    href={commentResult.commentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3B82F6', textDecoration: 'none' }}
                  >
                    View your comment
                  </a>
                </Box>
              )}
              <Button
                variant="outlined"
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentResult(null);
                  setCustomComment('');
                  setCommentType('ai');
                }}
                fullWidth
              >
                Close
              </Button>
            </Box>
          ) : (
            <>
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
                disabled={commentSubmitting}
              >
                {commentSubmitting ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Posting Comment...
                  </>
                ) : (
                  <>
                    <MessageSquare style={{ width: 16, height: 16, marginRight: 8 }} />
                    Post Comment
                  </>
                )}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Keyword Modal */}
      <Dialog
        open={showKeywordModal}
        onClose={() => setShowKeywordModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Keyword</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Add a new keyword to monitor for Twitter alerts
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Keyword"
              placeholder="Enter keyword to monitor..."
              value={newKeyword.keyword}
              onChange={(e) => setNewKeyword((prev) => ({ ...prev, keyword: e.target.value }))}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newKeyword.priority}
                onChange={(e) =>
                  setNewKeyword((prev) => ({
                    ...prev,
                    priority: e.target.value as 'high' | 'medium' | 'low',
                  }))
                }
                label="Priority"
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Max Tweets"
              type="number"
              inputProps={{ min: 1, max: 50 }}
              value={newKeyword.maxTweets}
              onChange={(e) =>
                setNewKeyword((prev) => ({ ...prev, maxTweets: parseInt(e.target.value) || 5 }))
              }
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowKeywordModal(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddKeyword} disabled={keywordSubmitting}>
            {keywordSubmitting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Adding Keyword...
              </>
            ) : (
              <>
                <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
                Add Keyword
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Config Modal */}
      <Dialog
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Configure Twitter Alerts</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Configure your Apify integration settings
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="API Token"
              type="password"
              value={configForm.apiToken}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, apiToken: e.target.value }))}
              fullWidth
              required
            />

            <TextField
              label="Auth Token"
              type="password"
              value={configForm.authToken}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, authToken: e.target.value }))}
              fullWidth
              required
            />

            <TextField
              label="Max Tweets"
              type="number"
              inputProps={{ min: 1, max: 100 }}
              value={configForm.maxTweets}
              onChange={(e) =>
                setConfigForm((prev) => ({ ...prev, maxTweets: parseInt(e.target.value) || 5 }))
              }
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Search Mode</InputLabel>
              <Select
                value={configForm.searchMode}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, searchMode: e.target.value }))}
                label="Search Mode"
              >
                <MenuItem value="live">Live</MenuItem>
                <MenuItem value="recent">Recent</MenuItem>
                <MenuItem value="top">Top</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setShowConfigModal(false)}
            disabled={configSubmitting}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUpdateConfig} disabled={configSubmitting}>
            {configSubmitting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Updating Config...
              </>
            ) : (
              <>
                <Settings style={{ width: 16, height: 16, marginRight: 8 }} />
                Update Configuration
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Detail Modal */}
      <Dialog
        open={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Alert Details</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            View and process this Twitter alert
          </Typography>

          {selectedAlert && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label={selectedAlert.keyword} variant="outlined" />
                {selectedAlert.status === 'new' && <Chip label="New" color="primary" />}
              </Box>

              <Box display="flex" gap={1.5}>
                <Avatar sx={{ width: 40, height: 40 }}>
                  {selectedAlert.author.charAt(0).toUpperCase()}
                </Avatar>
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {selectedAlert.author}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      @{selectedAlert.authorHandle}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {selectedAlert.tweetText}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} sx={{ mt: 1 }}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Heart style={{ width: 12, height: 12 }} />
                      <Typography variant="caption">{selectedAlert.engagement.likes}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Repeat style={{ width: 12, height: 12 }} />
                      <Typography variant="caption">{selectedAlert.engagement.retweets}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <MessageSquare style={{ width: 12, height: 12 }} />
                      <Typography variant="caption">{selectedAlert.engagement.replies}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary">
                <div>Posted: {new Date(selectedAlert.timestamp).toLocaleString()}</div>
                <div>
                  URL:{' '}
                  <a
                    href={selectedAlert.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3B82F6', textDecoration: 'none' }}
                  >
                    {selectedAlert.url}
                  </a>
                </div>
              </Typography>

              <Box display="flex" gap={1}>
                {!selectedAlert.actions?.like?.completed ? (
                  <Button
                    variant="contained"
                    onClick={() => handleProcessAlert(selectedAlert.id, 'like')}
                    disabled={processingActions[`${selectedAlert.id}-like`]}
                  >
                    {processingActions[`${selectedAlert.id}-like`] ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Heart style={{ width: 16, height: 16, marginRight: 8 }} />
                    )}
                    Like
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="error"
                    disabled
                    sx={{
                      bgcolor: '#EF4444',
                      '&:hover': { bgcolor: '#EF4444' },
                      '&:disabled': { bgcolor: '#EF4444', color: 'white' },
                    }}
                  >
                    <Heart style={{ width: 16, height: 16, marginRight: 8, fill: 'white' }} />
                    Liked
                  </Button>
                )}

                {!selectedAlert.actions?.retweet?.completed ? (
                  <Button
                    variant="contained"
                    onClick={() => handleProcessAlert(selectedAlert.id, 'retweet')}
                    disabled={processingActions[`${selectedAlert.id}-retweet`]}
                  >
                    {processingActions[`${selectedAlert.id}-retweet`] ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Repeat style={{ width: 16, height: 16, marginRight: 8 }} />
                    )}
                    Retweet
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    disabled
                    sx={{
                      bgcolor: '#10B981',
                      '&:hover': { bgcolor: '#10B981' },
                      '&:disabled': { bgcolor: '#10B981', color: 'white' },
                    }}
                  >
                    <Repeat style={{ width: 16, height: 16, marginRight: 8, fill: 'white' }} />
                    Retweeted
                  </Button>
                )}

                {!selectedAlert.actions?.comment?.completed ? (
                  <Button
                    variant="contained"
                    onClick={() => {
                      setShowAlertModal(false);
                      setShowCommentModal(true);
                    }}
                    disabled={processingActions[`${selectedAlert.id}-comment`]}
                  >
                    {processingActions[`${selectedAlert.id}-comment`] ? (
                      <CircularProgress size={16} />
                    ) : (
                      <MessageSquare style={{ width: 16, height: 16, marginRight: 8 }} />
                    )}
                    Comment
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    disabled
                    sx={{
                      bgcolor: '#3B82F6',
                      '&:hover': { bgcolor: '#3B82F6' },
                      '&:disabled': { bgcolor: '#3B82F6', color: 'white' },
                    }}
                  >
                    <MessageSquare
                      style={{ width: 16, height: 16, marginRight: 8, fill: 'white' }}
                    />
                    Commented
                  </Button>
                )}
              </Box>

              {selectedAlert.actions && Object.keys(selectedAlert.actions).length > 0 && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" color="success.main">
                    Completed actions:
                  </Typography>
                  {selectedAlert.actions.like?.completed && (
                    <Heart style={{ width: 16, height: 16, color: '#EF4444' }} />
                  )}
                  {selectedAlert.actions.retweet?.completed && (
                    <Repeat style={{ width: 16, height: 16, color: '#10B981' }} />
                  )}
                  {selectedAlert.actions.comment?.completed && (
                    <MessageSquare style={{ width: 16, height: 16, color: '#3B82F6' }} />
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowAlertModal(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
};

export default EnhancedTwitterAlertsDashboard;
