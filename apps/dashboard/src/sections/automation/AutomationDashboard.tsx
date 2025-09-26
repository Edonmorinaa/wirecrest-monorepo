import React, { useState, useEffect } from 'react';
import { Loader2, Play, Pause, Settings, Bot, MessageSquare, Calendar, Users, Heart, Repeat, X, User, Bell } from 'lucide-react';

import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Stack
} from '@mui/material';

interface AutomationTask {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error';
  type: 'telegram' | 'flow' | 'schedule';
  lastRun?: string;
  nextRun?: string;
  actions?: string[];
}

interface AutomationStats {
  totalTasks: number;
  runningTasks: number;
  completedToday: number;
  totalExecutions: number;
}

// URL validation function from the working Telegram bot
function isValidXLink(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Normalize the URL
  let normalizedUrl = url.trim().toLowerCase();
  
  // Add protocol if missing
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  try {
    const urlObj = new URL(normalizedUrl);
    
    // Check if it's a valid X/Twitter domain
    const validDomains = [
      'twitter.com',
      'x.com',
      'www.twitter.com',
      'www.x.com'
    ];
    
    return validDomains.includes(urlObj.hostname) && urlObj.pathname.includes('/status/');
  } catch (error) {
    return false;
  }
}

const AutomationDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [stats, setStats] = useState<AutomationStats>({
    totalTasks: 0,
    runningTasks: 0,
    completedToday: 0,
    totalExecutions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [actionInputs, setActionInputs] = useState({
    comment: '',
    targetUrl: '',
    profileId: '',
    delay: '30'
  });
  const [urlError, setUrlError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchAutomationData();
  }, []);

  const fetchAutomationData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/automation/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch automation data');
      }
      const data = await response.json();
      setTasks(data.tasks);
      setStats(data.stats);
    } catch (err) {
      setError('Failed to load automation data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId: string, actionType?: string) => {
    // For flow automation, show modal for input
    if (actionType) {
      setSelectedAction(actionType);
      setSelectedTaskId(taskId);
      setShowActionModal(true);
      return;
    }

    // For other tasks, execute directly
    try {
      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) return;

      const response = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          taskType: currentTask.type,
          taskId,
          parameters: actionType ? { actionType } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start task');
      }

      // Update local state
      setTasks(prev => prev.map(taskItem => 
        taskItem.id === taskId ? { ...taskItem, status: 'running' as const } : taskItem
      ));
    } catch (err) {
      setError('Failed to start task');
    }
  };

  const validateAndExecuteAction = async () => {
    // Clear previous errors
    setUrlError(null);
    setError(null);

    // Validate URL if provided
    if (actionInputs.targetUrl && !isValidXLink(actionInputs.targetUrl)) {
      setUrlError('Please provide a valid X (Twitter) tweet link that contains "/status/" in the URL. Examples: https://twitter.com/username/status/123456789 or https://x.com/username/status/123456789');
      return;
    }

    // Validate required fields based on action type
    if (selectedAction === 'comment' && !actionInputs.targetUrl) {
      setUrlError('Target URL is required for comment actions');
      return;
    }

    if (selectedAction === 'like' && !actionInputs.targetUrl) {
      setUrlError('Target URL is required for like actions');
      return;
    }

    if (selectedAction === 'retweet' && !actionInputs.targetUrl) {
      setUrlError('Target URL is required for retweet actions');
      return;
    }

    try {
      const selectedTask = tasks.find(t => t.id === selectedTaskId);
      if (!selectedTask) return;

      // Clean the URL before sending
      const cleanUrl = actionInputs.targetUrl.trim();

      const response = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          taskType: selectedTask.type,
          taskId: selectedTaskId,
          parameters: {
            actionType: selectedAction,
            targetUrl: cleanUrl,
            profileId: actionInputs.profileId.trim(),
            delay: actionInputs.delay,
            comment: actionInputs.comment.trim()
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start task');
      }

      // Update local state
      setTasks(prev => prev.map(taskItem => 
        taskItem.id === selectedTaskId ? { ...taskItem, status: 'running' as const } : taskItem
      ));

      // Close modal and reset
      setShowActionModal(false);
      setSelectedAction('');
      setSelectedTaskId('');
      setActionInputs({
        comment: '',
        targetUrl: '',
        profileId: '',
        delay: '30'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start task');
    }
  };

  const handleExecuteAction = async () => {
    await validateAndExecuteAction();
  };

  const handleCancelAction = () => {
    setShowActionModal(false);
    setSelectedAction('');
    setSelectedTaskId('');
    setActionInputs({
      comment: '',
      targetUrl: '',
      profileId: '',
      delay: '30'
    });
    setUrlError(null);
    setError(null);
  };

  const handleStopTask = async (taskId: string) => {
    try {
      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) return;

      const response = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          taskType: currentTask.type,
          taskId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop task');
      }

      // Update local state
      setTasks(prev => prev.map(taskItem => 
        taskItem.id === taskId ? { ...taskItem, status: 'stopped' as const } : taskItem
      ));
    } catch (err) {
      setError('Failed to stop task');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Chip label="Running" color="success" size="small" />;
      case 'stopped':
        return <Chip label="Stopped" color="default" size="small" />;
      case 'error':
        return <Chip label="Error" color="error" size="small" />;
      default:
        return <Chip label="Unknown" color="default" size="small" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'telegram':
        return <MessageSquare className="h-4 w-4" />;
      case 'flow':
        return <Bot className="h-4 w-4" />;
      case 'schedule':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getFilteredTasks = () => {
    switch (tabValue) {
      case 0: // all
        return tasks;
      case 1: // telegram
        return tasks.filter(task => task.type === 'telegram');
      case 2: // flow
        return tasks.filter(task => task.type === 'flow');
      case 3: // schedule
        return tasks.filter(task => task.type === 'schedule');
      default:
        return tasks;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h3" component="h1" fontWeight="bold">
            Automation Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and monitor your automation tasks
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Bell className="h-4 w-4" />}
            onClick={() => window.location.href = '/twitter-alerts'}
          >
            Twitter Alerts
          </Button>
          <Button
            variant="outlined"
            startIcon={<User className="h-4 w-4" />}
            onClick={() => window.location.href = '/twitter-profiles'}
          >
            Twitter Profiles
          </Button>
          <Button
            variant="contained"
            startIcon={<Settings className="h-4 w-4" />}
          >
            Configure
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Total Tasks
              </Typography>
              <Bot className="h-4 w-4" style={{ color: 'text.secondary' }} />
            </Box>
            <Typography variant="h4" component="div" fontWeight="bold">
              {stats.totalTasks}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Running
              </Typography>
              <Play className="h-4 w-4" style={{ color: 'text.secondary' }} />
            </Box>
            <Typography variant="h4" component="div" fontWeight="bold">
              {stats.runningTasks}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Completed Today
              </Typography>
              <Calendar className="h-4 w-4" style={{ color: 'text.secondary' }} />
            </Box>
            <Typography variant="h4" component="div" fontWeight="bold">
              {stats.completedToday}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Total Executions
              </Typography>
              <Users className="h-4 w-4" style={{ color: 'text.secondary' }} />
            </Box>
            <Typography variant="h4" component="div" fontWeight="bold">
              {stats.totalExecutions}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tasks Tabs */}
      <Box>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="All Tasks" />
          <Tab label="Telegram Bot" />
          <Tab label="Flow Automation" />
          <Tab label="Scheduled" />
        </Tabs>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {getFilteredTasks().map((task) => (
            <Card key={task.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTypeIcon(task.type)}
                    <Typography variant="h6" component="h2">
                      {task.name}
                    </Typography>
                  </Box>
                  {getStatusBadge(task.status)}
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {task.description}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    {task.lastRun && (
                      <Typography variant="body2" color="text.secondary">
                        Last run: {new Date(task.lastRun).toLocaleString()}
                      </Typography>
                    )}
                    {task.nextRun && (
                      <Typography variant="body2" color="text.secondary">
                        Next run: {new Date(task.nextRun).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    {task.status === 'running' ? (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Pause className="h-4 w-4" />}
                        onClick={() => handleStopTask(task.id)}
                      >
                        Stop
                      </Button>
                    ) : task.type === 'flow' ? (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<MessageSquare className="h-4 w-4" />}
                          onClick={() => handleStartTask(task.id, 'comment')}
                          sx={{ bgcolor: 'blue.600', '&:hover': { bgcolor: 'blue.700' } }}
                        >
                          Comment
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Heart className="h-4 w-4" />}
                          onClick={() => handleStartTask(task.id, 'like')}
                          sx={{ bgcolor: 'red.600', '&:hover': { bgcolor: 'red.700' } }}
                        >
                          Like
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Repeat className="h-4 w-4" />}
                          onClick={() => handleStartTask(task.id, 'retweet')}
                          sx={{ bgcolor: 'green.600', '&:hover': { bgcolor: 'green.700' } }}
                        >
                          Retweet
                        </Button>
                      </Stack>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Play className="h-4 w-4" />}
                        onClick={() => handleStartTask(task.id)}
                      >
                        Start
                      </Button>
                    )}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Action Input Modal */}
      <Dialog open={showActionModal} onClose={() => setShowActionModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedAction === 'comment' && 'Execute Comment Action'}
          {selectedAction === 'like' && 'Execute Like Action'}
          {selectedAction === 'retweet' && 'Execute Retweet Action'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure the parameters for your {selectedAction} action.
          </Typography>
          
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Target URL *"
              placeholder="https://twitter.com/username/status/123456789"
              value={actionInputs.targetUrl}
              onChange={(e) => {
                setActionInputs(prev => ({ ...prev, targetUrl: e.target.value }));
                // Clear URL error when user starts typing
                if (urlError) setUrlError(null);
              }}
              error={!!urlError}
              helperText={urlError || "Enter a valid X (Twitter) tweet URL. Examples: https://twitter.com/username/status/123456789 or https://x.com/username/status/123456789"}
              fullWidth
            />

            <TextField
              label="Profile ID (Optional)"
              placeholder="profile_kxybe2q"
              value={actionInputs.profileId}
              onChange={(e) => setActionInputs(prev => ({ ...prev, profileId: e.target.value }))}
              helperText="Leave empty to use a random available profile"
              fullWidth
            />

            <TextField
              label="Delay (seconds)"
              type="number"
              inputProps={{ min: 10, max: 300 }}
              value={actionInputs.delay}
              onChange={(e) => setActionInputs(prev => ({ ...prev, delay: e.target.value }))}
              helperText="Time to wait before starting the action (10-300 seconds)"
              fullWidth
            />

            {selectedAction === 'comment' && (
              <TextField
                label="Custom Comment (Optional)"
                placeholder="Enter your custom comment or leave empty for AI-generated comment"
                value={actionInputs.comment}
                onChange={(e) => setActionInputs(prev => ({ ...prev, comment: e.target.value }))}
                multiline
                rows={3}
                helperText="Leave empty to generate an AI-powered comment based on the tweet content"
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelAction}>
            Cancel
          </Button>
          <Button onClick={handleExecuteAction} variant="contained">
            Execute {selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutomationDashboard; 