'use client';

import { useParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { useTikTokHeaderData } from 'src/hooks/useLocations';

// ----------------------------------------------------------------------

export function TikTokGeneralInfo() {
  const theme = useTheme();
  const params = useParams();
  const teamSlug = params?.slug as string;
  const locationSlug = params?.locationSlug as string;

  const { data, isLoading, error } = useTikTokHeaderData(teamSlug, locationSlug);

  if (isLoading) {
    return (
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={3} alignItems="center">
          <Skeleton variant="circular" width={80} height={80} />
          <Stack spacing={1} flexGrow={1}>
            <Skeleton variant="text" width={200} height={32} />
            <Skeleton variant="text" width={150} />
          </Stack>
        </Stack>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          {error?.message || 'No general information available. Please try refreshing the data.'}
        </Typography>
      </Alert>
    );
  }

  const { profile, stats } = data;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderDelta = (delta: number) => {
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    const color = isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.secondary';
    const icon = isPositive ? 'eva:trending-up-fill' : isNegative ? 'eva:trending-down-fill' : 'eva:minus-fill';

    return (
      <Tooltip title="Change over the last 30 days" arrow placement="bottom">
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color, mt: 0.5, cursor: 'help' }}>
          <Iconify icon={icon} width={16} />
          <Typography variant="caption" fontWeight="bold">
            {Math.abs(delta)} (30d)
          </Typography>
        </Stack>
      </Tooltip>
    );
  };

  return (
    <Box
      sx={{
        background: `linear-gradient(to right, ${theme.palette.background.default} 25%, ${alpha(theme.palette.primary.dark, 0.88)})`,
        backgroundImage: `url(${CONFIG.assetsDir}/assets/background/background-3.webp)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        pt: 5,
        pb: 5,
        pr: 3,
        gap: 5,
        borderRadius: 2,
        display: 'flex',
        height: { md: 1 },
        position: 'relative',
        pl: { xs: 3, md: 5 },
        alignItems: 'center',
        color: 'common.white',
        textAlign: { xs: 'center', md: 'left' },
        flexDirection: { xs: 'column', md: 'row' },
        border: `solid 1px ${theme.palette.background.default}`,
      }}
    >
      {/* Left Side: Profile Info */}
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-start' },
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 2 }}>
          <Avatar
            src={profile.avatarUrl || ''}
            alt={profile.username}
            imgProps={{
              referrerPolicy: 'no-referrer',
              onError: (e) => {
                e.currentTarget.src = '';
              },
            }}
            sx={{
              width: 96,
              height: 96,
              border: `solid 3px ${theme.palette.common.white}`,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              fontSize: '2rem',
              fontWeight: 'bold',
            }}
          >
            {!profile.avatarUrl && profile.username?.charAt(0).toUpperCase()}
          </Avatar>

          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'common.white' }}>
                @{profile.username}
              </Typography>
              {profile.verified && (
                <Iconify icon="solar:verified-check-bold" width={24} sx={{ color: 'primary.main' }} />
              )}
            </Stack>

            {profile.nickname && (
              <Typography variant="body1" sx={{ color: 'common.white', opacity: 0.9 }}>
                {profile.nickname}
              </Typography>
            )}

            {profile.category && (
              <Typography variant="body2" sx={{ color: 'common.white', opacity: 0.7, mt: 0.5 }}>
                {profile.category}
                {profile.isBusinessAccount && ' • Business Account'}
              </Typography>
            )}
          </Box>
        </Stack>

        {profile.signature && (
          <Typography
            variant="body2"
            sx={{
              color: 'common.white',
              opacity: 0.85,
              maxWidth: 500,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {profile.signature}
          </Typography>
        )}
      </Box>

      {/* Right Side: Stats with Deltas */}
      <Box sx={{ minWidth: 300 }}>
        <Card
          sx={{
            bgcolor: alpha(theme.palette.common.white, 0.15),
            backdropFilter: 'blur(8px)',
            border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
            borderRadius: 2,
            p: 3,
          }}
        >
          <Stack direction="row" spacing={8} justifyContent="center" alignItems="flex-start">
            {/* Followers */}
            <Stack alignItems="center">
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.common.white }}>
                {formatNumber(stats.followers.count)}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.common.white, opacity: 0.8 }}>
                Followers
              </Typography>
              {renderDelta(stats.followers.delta)}
            </Stack>

            {/* Following */}
            <Stack alignItems="center">
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.common.white }}>
                {formatNumber(stats.following.count)}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.common.white, opacity: 0.8 }}>
                Following
              </Typography>
              {renderDelta(stats.following.delta)}
            </Stack>

            {/* Videos */}
            <Stack alignItems="center">
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.common.white }}>
                {formatNumber(stats.videos.count)}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.common.white, opacity: 0.8 }}>
                Videos
              </Typography>
              {renderDelta(stats.videos.delta)}
            </Stack>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
