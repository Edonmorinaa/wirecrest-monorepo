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

export function GoogleBusinessInfo({ businessProfile }) {
  const theme = useTheme();

  if (!businessProfile) return null;

  const formatPriceLevel = (priceLevel) => {
    if (!priceLevel) return null;
    const level = Number(priceLevel);
    const symbols = '$'.repeat(level);
    const descriptions = {
      1: 'Inexpensive',
      2: 'Moderate',
      3: 'Expensive',
      4: 'Very Expensive',
    };
    return `${symbols} (${descriptions[level] || 'Unknown'})`;
  };

  const formatBusinessStatus = (status) => {
    if (!status) return null;
    return status.replace('_', ' ').toLowerCase();
  };

  const getStatusColor = (status) => {
    if (status === 'OPERATIONAL') return 'success.main';
    if (status === 'CLOSED_TEMPORARILY') return 'warning.main';
    if (status === 'CLOSED_PERMANENTLY') return 'error.main';
    return 'text.secondary';
  };

  const getStatusIcon = (status) => {
    if (status === 'OPERATIONAL') return 'solar:check-circle-bold';
    if (status === 'CLOSED_TEMPORARILY') return 'solar:clock-circle-bold';
    if (status === 'CLOSED_PERMANENTLY') return 'solar:close-circle-bold';
    return 'solar:question-circle-bold';
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
                    {businessProfile.formattedAddress}
                  </Typography>
                </Box>
              </Stack>

              {businessProfile.nationalPhoneNumber && (
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
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      Phone
                    </Typography>
                    <Link
                      href={`tel:${businessProfile.nationalPhoneNumber}`}
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
                      {businessProfile.nationalPhoneNumber}
                    </Link>
                  </Box>
                </Stack>
              )}

              {businessProfile.websiteUri && (
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
                      href={businessProfile.websiteUri}
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
                      {businessProfile.websiteUri.replace(/^https?:\/\//, '')}
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
              {businessProfile.primaryTypeDisplayName && (
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
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      Category
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
                      {businessProfile.primaryTypeDisplayName}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {businessProfile.businessStatus && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette[getStatusColor(businessProfile.businessStatus).split('.')[0]].main, 0.12),
                      color: getStatusColor(businessProfile.businessStatus),
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon={getStatusIcon(businessProfile.businessStatus)} width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      Status
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, textTransform: 'capitalize', fontSize: '0.875rem' }}>
                      {formatBusinessStatus(businessProfile.businessStatus)}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {businessProfile.priceLevel && (
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.12),
                      color: 'info.main',
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Iconify icon="solar:tag-price-bold" width={14} height={14} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      Price Range
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
                      {formatPriceLevel(businessProfile.priceLevel)}
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

          {/* Services & Amenities Column */}
          <Box sx={{ flex: 1, px: 2, py: 1 }}>
            <Stack spacing={3}>
              {/* Services */}
              {(businessProfile.dineIn || businessProfile.takeout || businessProfile.delivery || businessProfile.curbsidePickup) && (
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
                    <Iconify icon="solar:delivery-bold" width={14} height={14} />
                    Services
                  </Typography>
                  
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {businessProfile.dineIn === 'DINE_IN_AVAILABLE' && (
                      <Chip
                        label="Dine-in"
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
                    )}
                    {businessProfile.takeout === 'TAKEOUT_AVAILABLE' && (
                      <Chip
                        label="Takeout"
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
                    )}
                    {businessProfile.delivery === 'DELIVERY_AVAILABLE' && (
                      <Chip
                        label="Delivery"
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
                    )}
                    {businessProfile.curbsidePickup === 'CURBSIDE_PICKUP_AVAILABLE' && (
                      <Chip
                        label="Curbside Pickup"
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
                    )}
                  </Stack>
                </Box>
              )}

              {/* Amenities */}
              {(businessProfile.goodForChildren || businessProfile.goodForGroups || businessProfile.reservable || businessProfile.goodForWatchingSports) && (
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
                    Amenities
                  </Typography>
                  
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {businessProfile.goodForChildren && (
                      <Chip
                        label="Good for children"
                        size="small"
                        icon={<Iconify icon="solar:check-circle-bold" width={12} height={12} />}
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.12),
                          color: 'info.main',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: 24,
                        }}
                      />
                    )}
                    {businessProfile.goodForGroups && (
                      <Chip
                        label="Good for groups"
                        size="small"
                        icon={<Iconify icon="solar:check-circle-bold" width={12} height={12} />}
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.12),
                          color: 'info.main',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: 24,
                        }}
                      />
                    )}
                    {businessProfile.reservable === 'RESERVABLE' && (
                      <Chip
                        label="Reservations"
                        size="small"
                        icon={<Iconify icon="solar:check-circle-bold" width={12} height={12} />}
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.12),
                          color: 'info.main',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: 24,
                        }}
                      />
                    )}
                    {businessProfile.goodForWatchingSports && (
                      <Chip
                        label="Good for watching sports"
                        size="small"
                        icon={<Iconify icon="solar:check-circle-bold" width={12} height={12} />}
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.12),
                          color: 'info.main',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: 24,
                        }}
                      />
                    )}
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
