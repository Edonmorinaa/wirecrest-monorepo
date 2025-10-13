'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FacebookEmotionalAnalysis({ emotionalAnalysis, sx, ...other }) {
  const theme = useTheme();

  const emotions = useMemo(() => {
    if (!emotionalAnalysis) return [];

    const emotionData = [
      { key: 'joy', label: 'Joy', value: emotionalAnalysis.joy || 0, color: theme.palette.success.main },
      { key: 'anger', label: 'Anger', value: emotionalAnalysis.anger || 0, color: theme.palette.error.main },
      { key: 'sadness', label: 'Sadness', value: emotionalAnalysis.sadness || 0, color: theme.palette.info.main },
      { key: 'fear', label: 'Fear', value: emotionalAnalysis.fear || 0, color: theme.palette.warning.main },
      { key: 'surprise', label: 'Surprise', value: emotionalAnalysis.surprise || 0, color: theme.palette.secondary.main },
    ];

    const maxValue = Math.max(...emotionData.map(emotion => emotion.value));
    
    return emotionData.map(emotion => ({
      ...emotion,
      percentage: maxValue > 0 ? (emotion.value / maxValue) * 100 : 0,
    }));
  }, [emotionalAnalysis, theme.palette]);

  if (!emotionalAnalysis || emotions.length === 0) {
    return (
      <Card sx={sx} {...other}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:star-bold" />
              <Typography variant="h6">Emotional Analysis</Typography>
            </Stack>
          }
          subheader="Analysis of emotional content in reviews"
        />
        <CardContent>
          <Box
            sx={{
              height: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'text.secondary',
              p: 3,
            }}
          >
            <Iconify icon="solar:star-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">No emotional analysis data available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:star-bold" />
            <Typography variant="h6">Emotional Analysis</Typography>
          </Stack>
        }
        subheader="Analysis of emotional content in reviews"
      />
      <CardContent>
        <Stack spacing={3}>
          {emotions.map((emotion) => (
            <Box key={emotion.key}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                  {emotion.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {emotion.value}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={emotion.percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    bgcolor: emotion.color,
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}