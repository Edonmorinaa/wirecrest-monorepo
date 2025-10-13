'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
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
  postsCount?: number;
  postsDelta?: number;
}

interface BusinessProfile {
  id: string;
  username?: string;
  fullName?: string;
  biography?: string;
  profilePictureUrl?: string;
}

interface InstagramGeneralInfoProps {
  data: GeneralData | null;
  businessProfile: BusinessProfile | null;
}

export function InstagramGeneralInfo({ data, businessProfile }: InstagramGeneralInfoProps) {
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
    postsCount: data?.postsCount || 0,
    postsDelta: data?.postsDelta || 0
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
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-start' },
        }}
      >
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Iconify icon="socials:instagram" width={72} height={72} className="" sx={{ fontSize: 72 }} />
            
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }} color="text.primary">
                {businessProfile?.fullName || businessProfile?.username || 'Instagram Profile'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }} color="text.secondary">
                Instagram Business Profile
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Typography variant="h6" sx={{ whiteSpace: 'pre-line', mb: 2 }} color="text.primary">
          Have a look at your Instagram Business Profile
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.64, maxWidth: 360, mb: 3 }} color="text.secondary">
          Get a quick overview of your Instagram followers, engagement, and content performance. Track your social media growth and see how your audience is engaging with your content.
        </Typography>
      </Box>

      {/* Stats Summary */}
      <Box sx={{ maxWidth: 300, width: '100%' }}>
        <Card
          sx={{
            bgcolor: alpha(theme.palette.common.white, 0.15),
            backdropFilter: 'blur(8px)',
            border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
            borderRadius: 2,
            p: 2.5,
          }}
        >
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography variant="h2" sx={{ fontWeight: 'bold', color: theme.palette.common.white }}>
              {formatNumber(safeData.followersCount)}
            </Typography>

            <Typography variant="body2" sx={{ color: theme.palette.common.white }}>
              Followers
            </Typography>

            <Stack direction="row" spacing={1} justifyContent="center">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: theme.palette.common.white }}>
                  {formatNumber(safeData.followingCount)}
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.common.white, opacity: 0.8 }}>
                  Following
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: theme.palette.common.white }}>
                  {formatNumber(safeData.postsCount)}
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.common.white, opacity: 0.8 }}>
                  Posts
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
