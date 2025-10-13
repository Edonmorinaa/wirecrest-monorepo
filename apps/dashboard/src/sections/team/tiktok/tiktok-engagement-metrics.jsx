import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function TikTokEngagementMetrics() {
  const { businessProfile } = useTikTokBusinessProfile();

  const metrics = useMemo(() => {
    if (!businessProfile?.dailySnapshots?.length) {
      return {
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalViews: 0,
        totalDownloads: 0,
      };
    }

    const snapshots = businessProfile.dailySnapshots;
    
    return {
      totalLikes: snapshots.reduce((sum, s) => sum + s.totalLikes, 0),
      totalComments: snapshots.reduce((sum, s) => sum + s.totalComments, 0),
      totalShares: snapshots.reduce((sum, s) => sum + s.totalShares, 0),
      totalViews: snapshots.reduce((sum, s) => sum + s.totalViews, 0),
      totalDownloads: snapshots.reduce((sum, s) => sum + s.totalDownloads, 0),
    };
  }, [businessProfile?.dailySnapshots]);

  const metricsData = [
    {
      title: 'Total Likes',
      value: metrics.totalLikes,
      icon: 'solar:heart-bold',
      color: 'error.main',
    },
    {
      title: 'Total Comments',
      value: metrics.totalComments,
      icon: 'solar:chat-round-dots-bold',
      color: 'success.main',
    },
    {
      title: 'Total Shares',
      value: metrics.totalShares,
      icon: 'solar:share-bold',
      color: 'primary.main',
    },
    {
      title: 'Total Views',
      value: metrics.totalViews,
      icon: 'solar:eye-bold',
      color: 'warning.main',
    },
    {
      title: 'Total Downloads',
      value: metrics.totalDownloads,
      icon: 'solar:download-bold',
      color: 'info.main',
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Performance Metrics
        </Typography>

        <Grid container spacing={3}>
          {metricsData.map((metric) => (
            <Grid key={metric.title} size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Iconify
                    icon={metric.icon}
                    width={24}
                    height={24}
                    sx={{ color: metric.color }}
                  />
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  {metric.value.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {metric.title}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
