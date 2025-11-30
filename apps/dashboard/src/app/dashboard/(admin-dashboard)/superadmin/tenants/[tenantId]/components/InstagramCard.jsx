'use client';

import { format, formatDistanceToNow } from 'date-fns';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

const statusConfig = {
  not_started: {
    color: 'default',
    icon: 'solar:clock-circle-bold',
    label: 'Not Started',
    description: 'Configure username to begin'
  },
  identifier_set: {
    color: 'info',
    icon: 'solar:check-circle-bold',
    label: 'Configured',
    description: 'Ready for setup'
  },
  profile_in_progress: {
    color: 'warning',
    icon: 'solar:activity-bold',
    label: 'Processing',
    description: 'Creating business profile'
  },
  profile_completed: {
    color: 'success',
    icon: 'solar:check-circle-bold',
    label: 'Profile Ready',
    description: 'Profile created successfully'
  },
  completed: {
    color: 'success',
    icon: 'solar:check-circle-bold',
    label: 'Active',
    description: 'All data synced'
  },
  failed: {
    color: 'error',
    icon: 'solar:close-circle-bold',
    label: 'Failed',
    description: 'Setup encountered an error'
  }
};

export default function InstagramCard({
  identifier,
  status,
  platformData,
  currentStepMessage,
  loading,
  onIdentifierChange,
  onSave,
  onAction,
  onRefresh
}) {
  const statusInfo = statusConfig[status] || statusConfig.not_started;
  const hasSnapshots = platformData && platformData.reviewsCount > 0;

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <CardHeader
        avatar={
          <Avatar
            sx={{
              bgcolor: '#E1306C',
              width: 48,
              height: 48,
            }}
          >
            <Iconify icon="skill-icons:instagram" width={28} />
          </Avatar>
        }
        action={
          <IconButton onClick={onRefresh} disabled={loading}>
            <Iconify icon="solar:refresh-bold" />
          </IconButton>
        }
        title={
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h6">Instagram</Typography>
            <Chip
              size="small"
              icon={<Iconify icon={statusInfo.icon} width={16} />}
              label={statusInfo.label}
              color={statusInfo.color}
              variant="outlined"
            />
          </Stack>
        }
        subheader={
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Instagram Username
            </Typography>
            {currentStepMessage && (
              <Chip
                size="small"
                icon={<Iconify icon="solar:activity-bold" width={14} />}
                label={currentStepMessage}
                color="primary"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
          </Stack>
        }
      />

      <CardContent>
        <Stack spacing={2.5}>
          {/* Username Input */}
          <TextField
            fullWidth
            size="medium"
            label="Instagram Username"
            value={identifier}
            onChange={(e) => onIdentifierChange('INSTAGRAM', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (identifier && !loading) {
                  onSave('INSTAGRAM');
                }
              }
            }}
            placeholder="@username"
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography variant="body2" color="text.secondary">
                    @
                  </Typography>
                </InputAdornment>
              ),
            }}
          />

          {/* Action Buttons */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSave('INSTAGRAM');
              }}
              disabled={!identifier || loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:diskette-bold" />}
              sx={{ minWidth: 120 }}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>

            {identifier && status !== 'not_started' && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => onAction('INSTAGRAM', 'create_profile')}
                disabled={loading || status === 'profile_in_progress'}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:widget-add-bold" />}
              >
                {loading ? 'Processing...' : 'Setup'}
              </Button>
            )}

            {status === 'completed' && (
              <Button
                variant="outlined"
                color="success"
                onClick={() => onAction('INSTAGRAM', 'take_snapshot')}
                disabled={loading}
                startIcon={<Iconify icon="solar:camera-bold" />}
              >
                Take Snapshot
              </Button>
            )}

            {status === 'failed' && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => onAction('INSTAGRAM', 'retry')}
                disabled={loading}
                startIcon={<Iconify icon="solar:restart-bold" />}
              >
                Retry
              </Button>
            )}
          </Stack>

          {/* Statistics */}
          {hasSnapshots && (
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Stack alignItems="center">
                    <Typography variant="h4" color="primary.main">
                      {platformData.reviewsCount || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Snapshots
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6}>
                  <Stack alignItems="center">
                    <Typography variant="h6" color="text.primary">
                      {platformData.lastReviewDate
                        ? format(new Date(platformData.lastReviewDate), 'MMM d')
                        : 'Never'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last Activity
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Status Messages */}
          {status === 'profile_in_progress' && (
            <Alert severity="info" icon={<Iconify icon="solar:hourglass-bold" />}>
              Setup in progress. This may take a few minutes.
            </Alert>
          )}

          {status === 'failed' && (
            <Alert severity="error" icon={<Iconify icon="solar:danger-bold" />}>
              Setup failed. Please verify the username and try again.
            </Alert>
          )}

          {status === 'completed' && !hasSnapshots && (
            <Alert severity="success" icon={<Iconify icon="solar:verified-check-bold" />}>
              Profile configured successfully!
            </Alert>
          )}

          {!identifier && (
            <Alert severity="warning" icon={<Iconify icon="solar:info-circle-bold" />}>
              Please enter an Instagram username to get started.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
