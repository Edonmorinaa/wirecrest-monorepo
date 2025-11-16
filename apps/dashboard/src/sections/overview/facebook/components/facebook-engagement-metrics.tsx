'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FacebookEngagementMetrics({ overview, sx, ...other }) {
  const theme = useTheme();

  if (!overview) {
    return (
      <Card sx={sx} {...other}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:activity-bold" />
              <Typography variant="h6">Engagement Metrics</Typography>
            </Stack>
          }
          subheader="Facebook-specific engagement analytics"
        />
        <CardContent>
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'text.secondary',
              p: 3,
            }}
          >
            <Iconify icon="solar:activity-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">No engagement metrics available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const engagementMetrics = [
    {
      label: 'Average Likes per Review',
      value: (overview.averageLikesPerReview || 0).toFixed(1),
      icon: 'solar:heart-bold',
      color: 'error',
    },
    {
      label: 'Average Comments per Review',
      value: (overview.averageCommentsPerReview || 0).toFixed(1),
      icon: 'solar:chat-round-dots-bold',
      color: 'info',
    },
    {
      label: 'Virality Score',
      value: overview.viralityScore ? overview.viralityScore.toFixed(1) : 'N/A',
      icon: 'solar:share-bold',
      color: 'secondary',
    },
    {
      label: 'Response Rate',
      value: overview.responseRate ? `${overview.responseRate.toFixed(1)}%` : 'N/A',
      icon: 'solar:reply-bold',
      color: 'success',
    },
  ];

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:activity-bold" />
            <Typography variant="h6">Engagement Metrics</Typography>
          </Stack>
        }
        subheader="Facebook-specific engagement analytics"
      />
      <CardContent>
        <Stack spacing={3}>
          {engagementMetrics.map((metric) => (
            <Stack key={metric.label} direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify 
                  icon={metric.icon} 
                  sx={{ 
                    color: theme.palette[metric.color].main,
                    fontSize: 16 
                  }} 
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {metric.label}
                </Typography>
              </Stack>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 600,
                  color: theme.palette[metric.color].main 
                }}
              >
                {metric.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}