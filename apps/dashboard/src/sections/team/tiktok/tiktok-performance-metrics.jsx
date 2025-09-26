import { useMemo } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';

import { Iconify } from 'src/components/iconify';
import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';

// ----------------------------------------------------------------------

export function TikTokPerformanceMetrics() {
  const { businessProfile } = useTikTokBusinessProfile();

  const metrics = useMemo(() => {
    if (!businessProfile?.dailySnapshots?.length) {
      return {
        likeRate: 0,
        commentRate: 0,
        shareRate: 0,
        downloadRate: 0,
      };
    }

    const snapshots = businessProfile.dailySnapshots;
    const totalLikes = snapshots.reduce((sum, s) => sum + s.totalLikes, 0);
    const totalComments = snapshots.reduce((sum, s) => sum + s.totalComments, 0);
    const totalShares = snapshots.reduce((sum, s) => sum + s.totalShares, 0);
    const totalViews = snapshots.reduce((sum, s) => sum + s.totalViews, 0);
    const totalDownloads = snapshots.reduce((sum, s) => sum + s.totalDownloads, 0);

    const safeDiv = (num, denom) => denom === 0 ? 0 : num / denom;

    return {
      likeRate: safeDiv(totalLikes * 100, totalViews),
      commentRate: safeDiv(totalComments * 100, totalViews),
      shareRate: safeDiv(totalShares * 100, totalViews),
      downloadRate: safeDiv(totalDownloads * 100, totalViews),
    };
  }, [businessProfile?.dailySnapshots]);

  const metricsData = [
    {
      title: 'Like Rate',
      value: metrics.likeRate,
      icon: 'solar:heart-bold',
      color: 'error.main',
      unit: '%',
    },
    {
      title: 'Comment Rate',
      value: metrics.commentRate,
      icon: 'solar:chat-round-dots-bold',
      color: 'success.main',
      unit: '%',
    },
    {
      title: 'Share Rate',
      value: metrics.shareRate,
      icon: 'solar:share-bold',
      color: 'primary.main',
      unit: '%',
    },
    {
      title: 'Download Rate',
      value: metrics.downloadRate,
      icon: 'solar:download-bold',
      color: 'warning.main',
      unit: '%',
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Engagement Rates (per views)
        </Typography>

        <Grid container spacing={2}>
          {metricsData.map((metric) => (
            <Grid key={metric.title} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                  <Iconify
                    icon={metric.icon}
                    width={20}
                    height={20}
                    sx={{ color: metric.color }}
                  />
                </Box>
                <Typography variant="h5" sx={{ mb: 0.5 }}>
                  {metric.value.toFixed(2)}{metric.unit}
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
