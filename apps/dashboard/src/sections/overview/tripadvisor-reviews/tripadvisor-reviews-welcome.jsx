import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function TripAdvisorReviewsWelcome({ team, stats, sx, ...other }) {
  const theme = useTheme();

  return (
    <Box
      sx={[
        (theme) => ({
          ...theme.mixins.bgGradient({
            images: [
              `linear-gradient(to right, ${theme.vars.palette.background.default} 25%, ${varAlpha(theme.vars.palette.primary.darkerChannel, 0.88)})`,
              `url(${CONFIG.assetsDir}/assets/background/background-6.webp)`,
            ],
          }),
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
          border: `solid 1px ${theme.vars.palette.background.default}`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
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
            <Iconify icon="simple-icons:tripadvisor" width={72} height={72} />

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }} color="text.primary">
                {team?.name || 'TripAdvisor Reviews'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }} color="text.secondary">
                TripAdvisor Business Profile
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Typography variant="h6" sx={{ whiteSpace: 'pre-line', mb: 2 }} color="text.primary">
          Monitor your TripAdvisor reviews and guest feedback
        </Typography>

        <Typography
          variant="body2"
          sx={{ opacity: 0.64, maxWidth: 360, mb: 3 }}
          color="text.secondary"
        >
          Get insights into your TripAdvisor reviews, helpful votes, and trip types. Track guest
          satisfaction and see how different traveler segments rate your business.
        </Typography>
      </Box>

      {/* Stats Summary */}
      <Box sx={{ maxWidth: 300, width: '100%' }}>
        <Stack spacing={2}>
          <Box
            sx={{
              textAlign: 'center',
              p: 2,
              bgcolor: alpha(theme.palette.common.white, 0.1),
              borderRadius: 2,
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.total || 0}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Total Reviews
            </Typography>
          </Box>

          <Box
            sx={{
              textAlign: 'center',
              p: 2,
              bgcolor: alpha(theme.palette.common.white, 0.1),
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.averageRating?.toFixed(1) || '0.0'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Average Rating
            </Typography>
          </Box>

          <Box
            sx={{
              textAlign: 'center',
              p: 2,
              bgcolor: alpha(theme.palette.common.white, 0.1),
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.totalHelpfulVotes || 0}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Helpful Votes
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
