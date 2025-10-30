'use client';

import { styled } from '@mui/material/styles';

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

import { Iconify } from 'src/components/iconify';

const GradientCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: theme.shadows[8],
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[12],
  },
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

const statusConfig = {
  not_started: { color: 'default', icon: 'solar:clock-circle-bold', label: 'Not Started' },
  identifier_set: { color: 'info', icon: 'solar:check-circle-bold', label: 'Ready' },
  profile_in_progress: { color: 'warning', icon: 'solar:activity-bold', label: 'Setting Up' },
  profile_completed: { color: 'success', icon: 'solar:check-circle-bold', label: 'Active' },
  completed: { color: 'success', icon: 'solar:check-circle-bold', label: 'Active' },
  failed: { color: 'error', icon: 'solar:close-circle-bold', label: 'Failed' }
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
    <GradientCard>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', width: 56, height: 56 }}>
            <Iconify icon="skill-icons:instagram" width={36} />
          </Avatar>
        }
        action={
          <IconButton onClick={onRefresh} sx={{ color: 'white' }}>
            <Iconify icon="solar:refresh-bold" />
          </IconButton>
        }
        title={
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
              Instagram Analytics
            </Typography>
            <Chip
              size="small"
              icon={<Iconify icon={statusInfo.icon} width={16} />}
              label={statusInfo.label}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Stack>
        }
        subheader={
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Real-time snapshot monitoring
            </Typography>
            {currentStepMessage && (
              <Chip
                size="small"
                icon={<Iconify icon="solar:activity-bold" width={14} />}
                label={currentStepMessage}
                sx={{ 
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                }}
              />
            )}
          </Stack>
        }
      />

      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={3}>
          {/* Username Input */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>
              Profile Configuration
            </Typography>

            <TextField
              fullWidth
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
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
                  color: 'rgba(255,255,255,0.9)',
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      @
                    </Typography>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button
              type="button"
              variant="contained"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSave('INSTAGRAM');
              }}
              disabled={!identifier || loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:diskette-bold" />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.25)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.35)',
                },
                fontWeight: 600,
              }}
            >
              {loading ? 'Saving...' : 'Save Username'}
            </Button>

            {identifier && status !== 'not_started' && (
              <Button
                variant="outlined"
                onClick={() => onAction('INSTAGRAM', 'create_profile')}
                disabled={loading || status === 'profile_in_progress'}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:widget-add-bold" />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.15)',
                  },
                }}
              >
                {loading ? 'Processing...' : 'Setup Profile'}
              </Button>
            )}

            {status === 'completed' && (
              <Button
                variant="outlined"
                onClick={() => onAction('INSTAGRAM', 'get_reviews')}
                disabled={loading}
                startIcon={<Iconify icon="solar:camera-bold" />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.15)',
                  },
                }}
              >
                Take Snapshot
              </Button>
            )}

            {status === 'failed' && (
              <Button
                variant="outlined"
                onClick={() => onAction('INSTAGRAM', 'retry')}
                disabled={loading}
                startIcon={<Iconify icon="solar:restart-bold" />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.15)',
                  },
                }}
              >
                Retry
              </Button>
            )}
          </Stack>

          {/* Analytics Dashboard */}
          {hasSnapshots && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>
                Analytics Overview
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.2)',
                      },
                    }}
                  >
                    <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                      {platformData.reviewsCount || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      Total Snapshots
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.2)',
                      },
                    }}
                  >
                    <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                      {platformData.lastReviewDate
                        ? Math.floor((Date.now() - new Date(platformData.lastReviewDate).getTime()) / (1000 * 60 * 60 * 24))
                        : '--'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      Days Ago
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.2)',
                      },
                    }}
                  >
                    <Iconify icon="solar:verified-check-bold" width={32} sx={{ color: 'white' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, display: 'block', mt: 0.5 }}>
                      Active
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Status Messages */}
          {status === 'profile_in_progress' && (
            <Alert
              severity="info"
              icon={<Iconify icon="solar:hourglass-bold" />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' },
              }}
            >
              Setup in progress. This may take a few minutes.
            </Alert>
          )}

          {status === 'failed' && (
            <Alert
              severity="error"
              icon={<Iconify icon="solar:danger-bold" />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' },
              }}
            >
              Setup failed. Please verify the username and try again.
            </Alert>
          )}

          {status === 'completed' && !hasSnapshots && (
            <Alert
              severity="success"
              icon={<Iconify icon="solar:verified-check-bold" />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' },
              }}
            >
              Profile configured successfully! Ready for monitoring.
            </Alert>
          )}

          {!identifier && (
            <Alert
              severity="warning"
              icon={<Iconify icon="solar:info-circle-bold" />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' },
              }}
            >
              Please enter a valid Instagram username to begin setup.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </GradientCard>
  );
}

