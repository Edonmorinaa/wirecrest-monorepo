'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface UnifiedStatsProps {
  stats: {
    totalReviews: number;
    unreadReviews: number;
    repliedReviews: number;
    averageRating: number;
    responseRate: number;
  };
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  isLoading?: boolean;
}

function StatCard({ title, value, icon, color, isLoading }: StatCardProps) {
  const theme = useTheme();

  const colorConfig = {
    primary: theme.palette.primary,
    success: theme.palette.success,
    warning: theme.palette.warning,
    error: theme.palette.error,
    info: theme.palette.info,
  };

  const selectedColor = colorConfig[color];

  if (isLoading) {
    return (
      <Card sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Skeleton variant="circular" width={56} height={56} />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </Stack>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        p: 3,
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: theme.shadows[8],
          transform: 'translateY(-4px)',
        },
      }}
    >
      <Stack spacing={2}>
        <Box
          sx={{
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            bgcolor: alpha(selectedColor.main, 0.16),
            color: selectedColor.main,
          }}
        >
          <Iconify icon={icon} width={32} />
        </Box>

        <Box>
          <Typography variant="h3">{value}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {title}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function UnifiedStats({ stats, isLoading }: UnifiedStatsProps) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Total Reviews"
          value={stats.totalReviews.toLocaleString()}
          icon="solar:chat-round-bold"
          color="primary"
          isLoading={isLoading}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Unread Reviews"
          value={stats.unreadReviews.toLocaleString()}
          icon="solar:inbox-bold"
          color="warning"
          isLoading={isLoading}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Average Rating"
          value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
          icon="solar:star-bold"
          color="success"
          isLoading={isLoading}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Response Rate"
          value={stats.responseRate > 0 ? `${stats.responseRate.toFixed(0)}%` : '-'}
          icon="solar:chart-2-bold"
          color="info"
          isLoading={isLoading}
        />
      </Grid>
    </Grid>
  );
}

