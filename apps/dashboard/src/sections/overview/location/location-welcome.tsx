'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface LocationWelcomeProps {
  locationName: string;
  address: string;
  stats: {
    totalReviews: number;
    averageRating: number;
    responseRate: number;
  };
  isLoading?: boolean;
}

export function LocationWelcome({ locationName, address, stats, isLoading }: LocationWelcomeProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card>
        <Box sx={{ p: 5 }}>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="40%" height={24} sx={{ mt: 1 }} />
          <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
            <Skeleton variant="rectangular" width={120} height={60} />
            <Skeleton variant="rectangular" width={120} height={60} />
            <Skeleton variant="rectangular" width={120} height={60} />
          </Stack>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)}, ${alpha(theme.palette.primary.main, 0.7)})`,
        backgroundImage: 'url(/assets/background/overlay_2.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: theme.palette.primary.contrastText,
      }}
    >
      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h3" gutterBottom>
              Welcome to {locationName}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              <Iconify icon="solar:map-point-bold" sx={{ mr: 1, verticalAlign: 'middle' }} />
              {address}
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            sx={{
              pt: 3,
              borderTop: `1px dashed ${alpha(theme.palette.common.white, 0.24)}`,
            }}
          >
            <Box>
              <Typography variant="h4">{stats.totalReviews.toLocaleString()}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Total Reviews
              </Typography>
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="h4">
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
                </Typography>
                {stats.averageRating > 0 && (
                  <Iconify icon="solar:star-bold" width={24} sx={{ color: 'warning.main' }} />
                )}
              </Stack>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Average Rating
              </Typography>
            </Box>

            <Box>
              <Typography variant="h4">
                {stats.responseRate > 0 ? `${stats.responseRate.toFixed(0)}%` : '-'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Response Rate
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
}

