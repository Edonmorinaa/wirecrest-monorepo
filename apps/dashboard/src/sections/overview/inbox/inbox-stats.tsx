import { Mail, Star, Reply, BarChart3, TrendingUp, MessageSquare } from 'lucide-react';

import { Box, Card, Grid, Theme, SxProps, Typography, CardContent } from '@mui/material';

// ----------------------------------------------------------------------

interface InboxStatsProps {
  stats: {
    total: number;
    unread: number;
    important: number;
    withReply: number;
    averageRating: number;
    platformBreakdown: {
      google: number;
      facebook: number;
      tripadvisor: number;
      booking: number;
    };
  };
  sx?: SxProps<Theme>;
}

export function InboxStats({ stats, sx }: InboxStatsProps) {
  const statCards = [
    {
      title: 'Total Reviews',
      value: stats.total,
      icon: MessageSquare,
      color: 'primary',
    },
    {
      title: 'Unread',
      value: stats.unread,
      icon: Mail,
      color: 'warning',
    },
    {
      title: 'Important',
      value: stats.important,
      icon: Star,
      color: 'error',
    },
    {
      title: 'Replied',
      value: stats.withReply,
      icon: Reply,
      color: 'success',
    },
    {
      title: 'Avg Rating',
      value: stats.averageRating.toFixed(1),
      icon: TrendingUp,
      color: 'info',
    },
    {
      title: 'Platforms',
      value: Object.values(stats.platformBreakdown).reduce((sum, count) => sum + count, 0),
      icon: BarChart3,
      color: 'secondary',
    },
  ];

  return (
    <Box sx={sx}>
      <Grid container spacing={2}>
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={index}>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: `${stat.color}.light`,
                        color: `${stat.color}.main`,
                      }}
                    >
                      <IconComponent size={20} />
                    </Box>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stat.title}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
