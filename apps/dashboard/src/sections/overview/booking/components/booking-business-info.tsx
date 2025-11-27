import type { SxProps, Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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

type Props = {
  businessProfile: any;
  sx?: SxProps<Theme>;
};

export function BookingBusinessInfo({ businessProfile, sx }: Props) {
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
        ...sx,
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
              <Iconify icon="logos:booking" width={20} height={20} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.25 }}>
                Property Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Details from Booking.com listing
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
              <Iconify icon="solar:map-point-bold" width={14} height={14} />
              Location & Contact
            </Typography>

            <Stack spacing={2}>
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
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                    Address
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25, lineHeight: 1.4, fontSize: '0.875rem' }}>
                    {[businessProfile.address, businessProfile.city, businessProfile.country].filter(Boolean).join(', ')}
                  </Typography>
                </Box>
              </Stack>

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
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
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
                      Visit Website
                    </Link>
                  </Box>
                </Stack>
              )}

              {businessProfile.bookingUrl && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="logos:booking" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      Booking.com Listing
                    </Typography>
                    <Link
                      href={businessProfile.bookingUrl}
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
                      View Listing
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
                }
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
                }
              }}
            />
          </Box>

          {/* Property Details Column */}
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
              <Iconify icon="solar:home-bold" width={14} height={14} />
              Property Details
            </Typography>

            <Stack spacing={2}>
              {businessProfile.stars && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.warning.main, 0.12),
                      color: 'warning.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:star-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      Rating
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {businessProfile.stars}-Star Property
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              )}

              {(businessProfile.checkInTime || businessProfile.checkOutTime) && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.12),
                      color: 'success.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:clock-circle-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      Check-in / Check-out
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
                      In: {businessProfile.checkInTime || 'N/A'} / Out: {businessProfile.checkOutTime || 'N/A'}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {businessProfile.propertyType && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.12),
                      color: 'info.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:buildings-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      Property Type
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                      {businessProfile.propertyType.replace(/_/g, ' ').toLowerCase()}
                    </Typography>
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
                }
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
                }
              }}
            />
          </Box>

          {/* Amenities Column */}
          <Box sx={{ flex: 1, px: 2, py: 1 }}>
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
              <Iconify icon="solar:star-bold" width={14} height={14} />
              Amenities & Features
            </Typography>

            <Stack spacing={2}>
              {businessProfile.popularFacilities && businessProfile.popularFacilities.length > 0 ? (
                <Box>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {businessProfile.popularFacilities.slice(0, 6).map((facility: string, index: number) => (
                      <Chip
                        key={index}
                        label={facility}
                        size="small"
                        icon={<Iconify icon="solar:check-circle-bold" width={12} height={12} />}
                        sx={{
                          bgcolor: alpha(theme.palette.success.main, 0.12),
                          color: 'success.main',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: 24,
                        }}
                      />
                    ))}
                    {businessProfile.popularFacilities.length > 6 && (
                      <Chip
                        label={`+${businessProfile.popularFacilities.length - 6} more`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', height: 24 }}
                      />
                    )}
                  </Stack>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  No amenities listed
                </Typography>
              )}

              {businessProfile.languagesSpoken && businessProfile.languagesSpoken.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem', mb: 1, display: 'block' }}>
                    Languages Spoken
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {businessProfile.languagesSpoken.slice(0, 4).map((lang: string, index: number) => (
                      <Chip
                        key={index}
                        label={lang}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', height: 24 }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

