import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface Stats {
  total: number;
  averageRating: number;
  verifiedStays: number;
  responseRate: number;
  ratingDistribution?: Record<number, number>;
  withResponse?: number;
  unread?: number;
}

interface BookingReviewsStatsProps {
  stats: Stats;
}

export function BookingReviewsStats({ stats }: BookingReviewsStatsProps) {
  const theme = useTheme();

  const formatRating = (rating: number) => {
    if (rating === null || rating === undefined) return '—';
    return rating.toFixed(1);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'success.main';
    if (rating >= 4.0) return 'warning.main';
    if (rating >= 3.0) return 'info.main';
    return 'error.main';
  };

  const statCards = [
    {
      title: 'Total Reviews',
      value: stats.total || 0,
      icon: 'solar:chat-round-dots-bold',
      color: 'primary.main',
    },
    {
      title: 'Average Rating',
      value: formatRating(stats.averageRating),
      icon: 'solar:star-bold',
      color: getRatingColor(stats.averageRating),
    },
    {
      title: 'Verified Stays',
      value: stats.verifiedStays || 0,
      icon: 'solar:shield-check-bold',
      color: 'success.main',
    },
    {
      title: 'Response Rate',
      value: `${(stats.responseRate || 0).toFixed(1)}%`,
      icon: 'solar:reply-bold',
      color: 'info.main',
    },
  ];

  return (
    <Grid container spacing={3}>
      {statCards.map((stat, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 3,
              textAlign: 'center',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: theme.shadows[8],
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: alpha(
                    theme.palette[stat.color.split('.')[0] as keyof typeof theme.palette]?.main ||
                      theme.palette.primary.main,
                    0.1
                  ),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Iconify icon={stat.icon} width={32} height={32} sx={{ color: stat.color }} />
              </Box>

              <Box>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: stat.color,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {stat.title}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
