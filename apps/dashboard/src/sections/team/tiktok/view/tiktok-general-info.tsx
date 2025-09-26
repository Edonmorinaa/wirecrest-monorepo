'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface GeneralData {
  profilePicture?: string;
  bio?: string;
  followersCount?: number;
  followersDelta?: number;
  followingCount?: number;
  followingDelta?: number;
  videosCount?: number;
  videosDelta?: number;
}

interface BusinessProfile {
  id: string;
  username?: string;
  fullName?: string;
  biography?: string;
  profilePictureUrl?: string;
}

interface TikTokGeneralInfoProps {
  data: GeneralData | null;
  businessProfile: BusinessProfile | null;
}

export function TikTokGeneralInfo({ data, businessProfile }: TikTokGeneralInfoProps) {
  const theme = useTheme();

  // Handle missing or invalid data
  if (!data) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          No general information available. Please try refreshing the data.
        </Typography>
      </Alert>
    );
  }

  const formatNumber = (num: number | null | undefined): string => {
    if (num == null || isNaN(num)) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Safe data access with fallbacks
  const safeData: Required<GeneralData> = {
    profilePicture: data?.profilePicture || businessProfile?.profilePictureUrl || '',
    bio: data?.bio || businessProfile?.biography || '',
    followersCount: data?.followersCount || 0,
    followersDelta: data?.followersDelta || 0,
    followingCount: data?.followingCount || 0,
    followingDelta: data?.followingDelta || 0,
    videosCount: data?.videosCount || 0,
    videosDelta: data?.videosDelta || 0
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
      {/* Profile Picture */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: { xs: 80, md: 120 },
          height: { xs: 80, md: 120 },
          borderRadius: '50%',
          overflow: 'hidden',
          bgcolor: alpha(theme.palette.common.white, 0.15),
          border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
        }}
      >
        {safeData.profilePicture ? (
          <Box
            component="img"
            src={safeData.profilePicture}
            alt="TikTok Profile"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Iconify icon="eva:person-fill" width={40} height={40} className="" sx={{}} />
        )}
      </Box>

      {/* Profile Information */}
      <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
        <Stack spacing={1}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: theme.palette.common.white }}>
            @{businessProfile?.username || 'username'}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.common.white }}>
            {safeData.bio || 'No bio available'}
          </Typography>
        </Stack>

        {/* Metrics */}
        <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap', gap: 2 }}>
          <Stack spacing={0.5} alignItems={{ xs: 'center', md: 'flex-start' }}>
            <Typography variant="h6" sx={{ color: theme.palette.common.white }}>
              {formatNumber(safeData.followersCount)}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.common.white, opacity: 0.8 }}>
              Followers {safeData.followersDelta >= 0 ? '+' : ''}{safeData.followersDelta}
            </Typography>
          </Stack>

          <Stack spacing={0.5} alignItems={{ xs: 'center', md: 'flex-start' }}>
            <Typography variant="h6" sx={{ color: theme.palette.common.white }}>
              {formatNumber(safeData.followingCount)}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.common.white, opacity: 0.8 }}>
              Following {safeData.followingDelta >= 0 ? '+' : ''}{safeData.followingDelta}
            </Typography>
          </Stack>

          <Stack spacing={0.5} alignItems={{ xs: 'center', md: 'flex-start' }}>
            <Typography variant="h6" sx={{ color: theme.palette.common.white }}>
              {formatNumber(safeData.videosCount)}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.common.white, opacity: 0.8 }}>
              Videos {safeData.videosDelta >= 0 ? '+' : ''}{safeData.videosDelta}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
