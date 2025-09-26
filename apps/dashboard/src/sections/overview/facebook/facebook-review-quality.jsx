'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FacebookReviewQuality({ reviewQuality, sx, ...other }) {
  const theme = useTheme();

  if (!reviewQuality) {
    return (
      <Card sx={sx} {...other}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:shield-check-bold" />
              <Typography variant="h6">Review Quality</Typography>
            </Stack>
          }
          subheader="Analysis of review quality metrics"
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
            <Iconify icon="solar:shield-check-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">No review quality data available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const qualityMetrics = [
    {
      label: 'Detailed Reviews',
      value: reviewQuality.detailed || 0,
      color: 'success',
      icon: 'solar:document-text-bold',
    },
    {
      label: 'Brief Reviews',
      value: reviewQuality.brief || 0,
      color: 'warning',
      icon: 'solar:document-bold',
    },
    {
      label: 'Spam Reviews',
      value: reviewQuality.spam || 0,
      color: 'error',
      icon: 'solar:shield-cross-bold',
    },
  ];

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:shield-check-bold" />
            <Typography variant="h6">Review Quality</Typography>
          </Stack>
        }
        subheader="Analysis of review quality metrics"
      />
      <CardContent>
        <Stack spacing={3}>
          {qualityMetrics.map((metric) => (
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
              <Chip
                label={metric.value}
                size="small"
                sx={{
                  bgcolor: theme.palette[metric.color].lighter,
                  color: theme.palette[metric.color].darker,
                  fontWeight: 600,
                }}
              />
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}