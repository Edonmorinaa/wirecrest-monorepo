'use client';

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

export function BookingBusinessInfo({ businessProfile }) {
  const theme = useTheme();

  if (!businessProfile) return null;

  const formatPropertyType = (type) => {
    if (!type) return null;
    return type.replace(/_/g, ' ').toLowerCase();
  };

  const formatCurrency = (amount, currency) => {
    if (!amount || !currency) return null;
    return `${amount} ${currency}`;
  };

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
                Property Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Complete property details and booking information
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
                    {businessProfile.address || 'Address not available'}
                  </Typography>
                </Box>
              </Stack>

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

              {businessProfile.email && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.warning.main, 0.12),
                      color: 'warning.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:letter-unread-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      Email
                    </Typography>
                    <Link
                      href={`mailto:${businessProfile.email}`}
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
                      {businessProfile.email}
                    </Link>
                  </Box>
                </Stack>
              )}

              {businessProfile.website && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.12),
                      color: 'info.main',
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
              <Iconify icon="solar:info-circle-bold" width={14} height={14} />
              Property Details
            </Typography>

            <Stack spacing={2}>
              {businessProfile.propertyType && (
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
                      Property Type
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.25, textTransform: 'capitalize', fontSize: '0.875rem' }}
                    >
                      {formatPropertyType(businessProfile.propertyType)}
                    </Typography>
                  </Box>
                </Stack>
              )}

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
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      Star Rating
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
                      {businessProfile.stars} Stars
                    </Typography>
                  </Box>
                </Stack>
              )}

              {businessProfile.checkInTime && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.12),
                      color: 'success.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:login-3-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      Check-in Time
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
                      {businessProfile.checkInTime}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {businessProfile.checkOutTime && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.error.main, 0.12),
                      color: 'error.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:logout-3-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      Check-out Time
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
                      {businessProfile.checkOutTime}
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

          {/* Facilities & Amenities Column */}
          <Box sx={{ flex: 1, px: 2, py: 1 }}>
            <Stack spacing={3}>
              {/* Facilities */}
              {businessProfile.facilities && businessProfile.facilities.length > 0 && (
                <Box>
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
                    Facilities
                  </Typography>

                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {businessProfile.facilities.slice(0, 8).map((facility, index) => (
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
                    {businessProfile.facilities.length > 8 && (
                      <Chip
                        label={`+${businessProfile.facilities.length - 8} more`}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: 24,
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              )}

              {/* Pricing */}
              {businessProfile.priceFrom && (
                <Box>
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
                    <Iconify icon="solar:dollar-minimalistic-bold" width={14} height={14} />
                    Pricing
                  </Typography>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="h6" color="primary.main">
                      {formatCurrency(businessProfile.priceFrom, businessProfile.currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      per night
                    </Typography>
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
