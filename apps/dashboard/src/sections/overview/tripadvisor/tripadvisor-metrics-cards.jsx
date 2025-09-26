import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function TripAdvisorMetricsCards({ metrics }) {
  const theme = useTheme();

  const cards = [
    {
      title: 'Average Rating',
      value: metrics.averageRating?.toFixed(1) || '0.0',
      subtitle: `${metrics.totalReviews || 0} reviews`,
      icon: 'mdi:star',
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.08),
    },
    {
      title: 'Response Rate',
      value: `${metrics.responseRate || 0}%`,
      subtitle: 'Reviews responded to',
      icon: 'eva:message-circle-fill',
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.08),
    },
    {
      title: 'Helpful Votes',
      value: metrics.helpfulVotes || 0,
      subtitle: `Avg: ${metrics.averageHelpfulVotes?.toFixed(1) || '0.0'} per review`,
      icon: 'eva:thumbs-up-fill',
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.08),
    },
    {
      title: 'Reviews with Photos',
      value: metrics.reviewsWithPhotos || 0,
      subtitle: `${metrics.totalReviews > 0 
        ? ((metrics.reviewsWithPhotos / metrics.totalReviews) * 100).toFixed(1)
        : '0'}% of total`,
      icon: 'eva:camera-fill',
      color: theme.palette.secondary.main,
      bgColor: alpha(theme.palette.secondary.main, 0.08),
    },
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card) => (
        <Grid key={card.title} item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 3,
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.customShadows.z24,
              },
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: card.bgColor,
                    color: card.color,
                  }}
                >
                  <Iconify icon={card.icon} width={24} />
                </Avatar>
              </Stack>

              <Box>
                <Typography variant="h3" sx={{ mb: 0.5 }}>
                  {card.value}
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {card.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.subtitle}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
