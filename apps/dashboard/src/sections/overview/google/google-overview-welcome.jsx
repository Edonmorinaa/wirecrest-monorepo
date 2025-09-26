import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';


// ----------------------------------------------------------------------

export function GoogleOverviewWelcome({ displayName, averageRating, totalReviews, sx, ...other }) {
  const theme = useTheme();

  return (
    <Box
      sx={[
        (theme) => ({
          ...theme.mixins.bgGradient({
            images: [
              `linear-gradient(to right, ${theme.vars.palette.background.default} 25%, ${varAlpha(theme.vars.palette.primary.darkerChannel, 0.88)})`,
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
            <Iconify icon="socials:google" width={72} height={72} />
            
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }} color="text.primary">
                {/* Google Overview */}
                {displayName || 'Business Profile'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }} color="text.secondary">
                Business Profile
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Typography variant="h6" sx={{ whiteSpace: 'pre-line', mb: 2 }} color="text.primary">
          Have a look at your Google Business Profile
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.64, maxWidth: 360, mb: 3 }} color="text.secondary">
        Get a quick overview of your Google reviews, ratings, and customer feedback. Track your business reputation and see how customers are engaging with your profile.
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
                <Typography variant="h2" sx={{ fontWeight: 'bold', color: theme.palette.common.white }} >
                  {averageRating.toFixed(1)}
                </Typography>

                <Stack direction="row" spacing={0.5}>
                  {[...Array(5)].map((_, i) => (
                    <Iconify
                      key={i}
                      icon="solar:star-bold"
                      sx={{
                        color: i < Math.round(averageRating) ? theme.palette.warning.main : alpha(theme.palette.common.white, 0.4),
                        fontSize: 16,
                      }}
                    />
                  ))}
                </Stack>

                <Typography variant="body2" sx={{ color: theme.palette.common.white }}>
                  Based on {totalReviews} reviews
                </Typography>
              </Stack>
            </Card>
      </Box>
    </Box>
  );
}
