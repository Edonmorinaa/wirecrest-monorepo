'use client';

import { useState, useMemo } from 'react';
import { Box, Card, Grid, Stack, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { ThumbUp, Comment, Recommend } from '@mui/icons-material';

import { useFacebookProfile, useFacebookAnalytics } from 'src/hooks/useLocations';

interface FacebookPlatformViewProps {
  locationId: string;
}

export function FacebookPlatformView({ locationId }: FacebookPlatformViewProps) {
  const [dateRange, setDateRange] = useState('30d');
  
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [dateRange]);

  const { profile } = useFacebookProfile(locationId);
  const { analytics } = useFacebookAnalytics(locationId, startDate, endDate);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">{profile?.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {profile?.followers} followers • {profile?.likes} likes
        </Typography>
      </Box>

      <FormControl size="small" sx={{ maxWidth: 200 }}>
        <InputLabel>Date Range</InputLabel>
        <Select value={dateRange} label="Date Range" onChange={(e) => setDateRange(e.target.value)}>
          <MenuItem value="7d">Last 7 days</MenuItem>
          <MenuItem value="30d">Last 30 days</MenuItem>
          <MenuItem value="90d">Last 90 days</MenuItem>
        </Select>
      </FormControl>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Reviews</Typography>
                <Comment sx={{ color: 'primary.main' }} />
              </Box>
              <Typography variant="h3">{analytics?.reviewCount || 0}</Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Recommendation Rate</Typography>
                <Recommend sx={{ color: 'success.main' }} />
              </Box>
              <Typography variant="h3">{analytics?.recommendations?.recommendationRate?.toFixed(0) || 0}%</Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Total Likes</Typography>
                <ThumbUp sx={{ color: 'info.main' }} />
              </Box>
              <Typography variant="h3">{analytics?.engagement?.totalLikes || 0}</Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Engagement Rate</Typography>
                <Comment sx={{ color: 'warning.main' }} />
              </Box>
              <Typography variant="h3">{analytics?.engagement?.engagementRate?.toFixed(0) || 0}%</Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

