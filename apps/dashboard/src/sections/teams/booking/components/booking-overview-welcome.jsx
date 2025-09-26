import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function BookingOverviewWelcome({
  businessProfile,
  averageRating,
  totalReviews,
  sx,
  ...other
}) {
  const theme = useTheme();

  return (
    <Box
      sx={[
        (themeInstance) => ({
          ...themeInstance.mixins.bgGradient({
            images: [
              `linear-gradient(to right, ${themeInstance.vars.palette.background.default} 25%, ${varAlpha(themeInstance.vars.palette.primary.darkerChannel, 0.88)})`,
              `url(${CONFIG.assetsDir}/assets/background/background-3.webp)`,
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
          border: `solid 1px ${themeInstance.vars.palette.background.default}`,
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
            <Iconify icon="simple-icons:bookingdotcom" width={72} height={72} />

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }} color="text.primary">
                {businessProfile?.name || 'Booking.com Property'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }} color="text.secondary">
                Property Overview
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Typography variant="h6" sx={{ whiteSpace: 'pre-line', mb: 2 }} color="text.primary">
          Monitor your Booking.com property performance
        </Typography>

        <Typography
          variant="body2"
          sx={{ opacity: 0.64, maxWidth: 360, mb: 3 }}
          color="text.secondary"
        >
          Track your property ratings, guest reviews, and booking metrics. Analyze guest feedback
          and optimize your property&apos;s performance on Booking.com.
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
            <Typography variant="h3" sx={{ color: 'common.white', fontWeight: 'bold' }}>
              {averageRating ? averageRating.toFixed(1) : '—'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'common.white', opacity: 0.8 }}>
              Average Rating
            </Typography>
            <Typography variant="body2" sx={{ color: 'common.white', opacity: 0.6 }}>
              {totalReviews ? `${totalReviews.toLocaleString()} reviews` : 'No reviews yet'}
            </Typography>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
