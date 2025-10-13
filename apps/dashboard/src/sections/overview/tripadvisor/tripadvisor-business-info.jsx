'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function TripAdvisorBusinessInfo({ businessProfile }) {
  const theme = useTheme();

  if (!businessProfile) return null;

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
      }}
    >
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
                width: 40,
                height: 40,
              }}
            >
              <Iconify icon="solar:building-2-bold" width={20} height={20} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.25 }}>
                Business Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Complete business details and service information
              </Typography>
            </Box>
          </Stack>
        }
        sx={{ pb: 1.5, px: 2.5 }}
      />

      <CardContent sx={{ pt: 0, px: 2.5, pb: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 0 }}>
          {/* Contact Information Column */}
          <Box sx={{ flex: 1, px: 2, py: 1, position: 'relative' }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 2,
                fontWeight: 600,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '0.875rem',
              }}
            >
              <Iconify icon="solar:phone-bold" width={14} height={14} />
              Contact Information
            </Typography>

            <Stack spacing={2}>
              {businessProfile.address && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.12),
                      color: 'info.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:map-point-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      Address
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.25, lineHeight: 1.4, fontSize: '0.875rem' }}
                    >
                      {businessProfile.address}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {businessProfile.phone && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.12),
                      color: 'success.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:phone-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      Phone
                    </Typography>
                    <Link
                      href={`tel:${businessProfile.phone}`}
                      variant="body2"
                      sx={{
                        textDecoration: 'none',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' },
                        mt: 0.25,
                        display: 'block',
                        fontSize: '0.875rem',
                      }}
                    >
                      {businessProfile.phone}
                    </Link>
                  </Box>
                </Stack>
              )}

              {businessProfile.website && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.warning.main, 0.12),
                      color: 'warning.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:globe-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      Website
                    </Typography>
                    <Link
                      href={businessProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{
                        textDecoration: 'none',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' },
                        mt: 0.25,
                        display: 'block',
                        fontSize: '0.875rem',
                      }}
                    >
                      {businessProfile.website.replace(/^https?:\/\//, '')}
                    </Link>
                  </Box>
                </Stack>
              )}
            </Stack>

            {/* Vertical Divider for Desktop */}
            <Divider
              orientation="vertical"
              sx={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 1,
                borderColor: alpha(theme.palette.divider, 0.3),
                display: { xs: 'none', lg: 'block' },
                '&::before, &::after': {
                  borderColor: alpha(theme.palette.divider, 0.3),
                },
              }}
            />

            {/* Horizontal Divider for Mobile */}
            <Divider
              orientation="horizontal"
              sx={{
                mt: 3,
                mb: 2,
                borderColor: alpha(theme.palette.divider, 0.3),
                display: { xs: 'block', lg: 'none' },
                '&::before, &::after': {
                  borderColor: alpha(theme.palette.divider, 0.3),
                },
              }}
            />
          </Box>

          {/* Business Details Column */}
          <Box sx={{ flex: 1, px: 2, py: 1, position: 'relative' }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 2,
                fontWeight: 600,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '0.875rem',
              }}
            >
              <Iconify icon="solar:info-circle-bold" width={14} height={14} />
              Business Details
            </Typography>

            <Stack spacing={2}>
              {businessProfile.type && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.secondary.main, 0.12),
                      color: 'secondary.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:tag-price-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      Category
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
                      {businessProfile.type}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {businessProfile.rankingPosition && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.warning.main, 0.12),
                      color: 'warning.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:award-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      Ranking
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
                      #{businessProfile.rankingPosition}
                      {businessProfile.rankingString && ` ${businessProfile.rankingString}`}
                    </Typography>
                  </Box>
                </Stack>
              )}
            </Stack>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
