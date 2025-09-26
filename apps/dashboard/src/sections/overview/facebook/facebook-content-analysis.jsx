'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FacebookContentAnalysis({ contentLength, sx, ...other }) {
  const theme = useTheme();

  if (!contentLength) {
    return (
      <Card sx={sx} {...other}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:chart-2-bold" />
              <Typography variant="h6">Content Analysis</Typography>
            </Stack>
          }
          subheader="Analysis of review content length and structure"
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
            <Iconify icon="solar:chart-2-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">No content analysis data available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const contentMetrics = [
    {
      label: 'Average Length',
      value: `${Math.round(contentLength.avgLength || 0)} characters`,
      icon: 'solar:ruler-bold',
    },
    {
      label: 'Short Reviews',
      value: contentLength.shortReviews || 0,
      icon: 'solar:document-bold',
    },
    {
      label: 'Long Reviews',
      value: contentLength.longReviews || 0,
      icon: 'solar:document-text-bold',
    },
  ];

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:chart-2-bold" />
            <Typography variant="h6">Content Analysis</Typography>
          </Stack>
        }
        subheader="Analysis of review content length and structure"
      />
      <CardContent>
        <Stack spacing={3}>
          {contentMetrics.map((metric) => (
            <Stack key={metric.label} direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify 
                  icon={metric.icon} 
                  sx={{ 
                    color: theme.palette.primary.main,
                    fontSize: 16 
                  }} 
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {metric.label}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {metric.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}