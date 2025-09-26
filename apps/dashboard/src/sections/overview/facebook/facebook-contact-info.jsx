'use client';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FacebookContactInfo({ businessProfile, sx, ...other }) {
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
      {...other}
    >
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.12),
                color: 'success.main',
                width: 40,
                height: 40,
              }}
            >
              <Iconify icon="solar:globe-bold" width={20} height={20} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.25 }}>
                Contact Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Business contact details and links
              </Typography>
            </Box>
          </Stack>
        }
        sx={{ pb: 1.5, px: 2.5 }}
      />
      
      <CardContent sx={{ pt: 0, px: 2.5, pb: 2.5 }}>
        <Stack spacing={2}>
          {businessProfile.phone && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.12),
                  color: 'success.main',
                  width: 32,
                  height: 32,
                }}
              >
                <Iconify icon="solar:phone-bold" width={16} height={16} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
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
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.info.main, 0.12),
                  color: 'info.main',
                  width: 32,
                  height: 32,
                }}
              >
                <Iconify icon="solar:letter-unread-bold" width={16} height={16} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
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

          {businessProfile.websites && businessProfile.websites.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem', mb: 1, display: 'block' }}>
                Websites
              </Typography>
              <Stack spacing={1}>
                {businessProfile.websites.map((website, index) => (
                  <Stack key={index} direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.warning.main, 0.12),
                        color: 'warning.main',
                        width: 32,
                        height: 32,
                      }}
                    >
                      <Iconify icon="solar:globe-bold" width={16} height={16} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Link
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{ 
                          textDecoration: 'none', 
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' },
                          fontSize: '0.875rem',
                        }}
                      >
                        {website.replace(/^https?:\/\//, '')}
                      </Link>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {businessProfile.messenger && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                  width: 32,
                  height: 32,
                }}
              >
                <Iconify icon="solar:chat-round-dots-bold" width={16} height={16} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                  Messenger
                </Typography>
                <Link
                  href={businessProfile.messenger}
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
                  Open Messenger
                </Link>
              </Box>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}