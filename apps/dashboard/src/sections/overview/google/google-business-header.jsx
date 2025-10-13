'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function GoogleBusinessHeader({ businessProfile }) {
  const theme = useTheme();

  if (!businessProfile) return null;

  const averageRating = businessProfile.rating || 0;
  const totalReviews = businessProfile.userRatingCount || 0;

  return (
    <Card
      sx={{
        mb: 3,
        background: `linear-gradient(135deg, ${theme.palette.grey[600]} 0%, ${theme.palette.grey[700]} 50%, ${theme.palette.grey[800]} 100%)`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 280,
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(255,255,255,0.1) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glassmorphism Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: alpha(theme.palette.common.white, 0.05),
          backdropFilter: 'blur(4px)',
        }}
      />

      <CardContent sx={{ position: 'relative', p: 3 }}>
        {/* Top Bar with Google Branding */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {/* Google G Logo */}
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'white',
                  color: theme.palette.grey[800],
                }}
              >
                <Box
                  component="svg"
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </Box>
              </Avatar>
              <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.9) }}>
                Google Business
              </Typography>
            </Stack>
            <Chip
              label={businessProfile.businessStatus || 'Active'}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.common.white, 0.15),
                color: 'white',
                borderColor: alpha(theme.palette.common.white, 0.3),
                backdropFilter: 'blur(4px)',
              }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            {businessProfile.websiteUri && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:globe-bold" />}
                href={businessProfile.websiteUri}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                  color: 'white',
                  borderColor: alpha(theme.palette.common.white, 0.3),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.white, 0.2),
                    borderColor: alpha(theme.palette.common.white, 0.5),
                  },
                }}
              >
                Visit Website
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Main Content */}
        <Grid container spacing={3} justifyContent="space-between" alignItems="flex-start">
          {/* Business Info */}
          <Grid item xs={12} lg={8}>
            <Stack spacing={2}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                {businessProfile.displayName}
              </Typography>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:map-point-bold" sx={{ color: alpha(theme.palette.common.white, 0.9) }} />
                <Typography variant="body1" sx={{ color: alpha(theme.palette.common.white, 0.9) }}>
                  {businessProfile.formattedAddress}
                </Typography>
              </Stack>

              <Stack direction="row" flexWrap="wrap" gap={1}>
                {businessProfile.primaryTypeDisplayName && (
                  <Chip
                    icon={<Iconify icon="solar:tag-price-bold" />}
                    label={businessProfile.primaryTypeDisplayName}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.common.white, 0.2),
                      color: 'white',
                      borderColor: alpha(theme.palette.common.white, 0.3),
                    }}
                  />
                )}

                {businessProfile.nationalPhoneNumber && (
                  <Chip
                    icon={<Iconify icon="solar:phone-bold" />}
                    label={businessProfile.nationalPhoneNumber}
                    size="small"
                    variant="outlined"
                    sx={{
                      bgcolor: alpha(theme.palette.common.white, 0.15),
                      color: 'white',
                      borderColor: alpha(theme.palette.common.white, 0.3),
                    }}
                  />
                )}
              </Stack>
            </Stack>
          </Grid>

          {/* Rating Card */}
          <Grid item xs={12} lg={4}>
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
                <Typography variant="h2" sx={{ fontWeight: 'bold' }}>
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

                <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.8) }}>
                  Based on {totalReviews} reviews
                </Typography>

                <Box sx={{ width: '100%', pt: 1, borderTop: `1px solid ${alpha(theme.palette.common.white, 0.3)}` }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {businessProfile.overview?.currentResponseRatePercent || 0}%
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
                        Response Rate
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {totalReviews}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
                        Total Reviews
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
