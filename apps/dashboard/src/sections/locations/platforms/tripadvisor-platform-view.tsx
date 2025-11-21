'use client';

import { useState, useMemo } from 'react';
import { Box, Card, Grid, Stack, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Star, RateReview, TrendingUp } from '@mui/icons-material';

import { useTripAdvisorProfile, useTripAdvisorAnalytics } from 'src/hooks/useLocations';

interface TripAdvisorPlatformViewProps {
  locationId: string;
}

export function TripAdvisorPlatformView({ locationId }: TripAdvisorPlatformViewProps) {
  const [dateRange, setDateRange] = useState('30d');
  
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [dateRange]);

  const { profile } = useTripAdvisorProfile(locationId);
  const { analytics } = useTripAdvisorAnalytics(locationId, startDate, endDate);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">{profile?.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {profile?.rating?.toFixed(1)} ⭐ • {profile?.numberOfReviews} reviews
          {profile?.rankingPosition && ` • Rank #${profile.rankingPosition}`}
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
                <RateReview sx={{ color: 'primary.main' }} />
              </Box>
              <Typography variant="h3">{analytics?.reviewCount || 0}</Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Average Rating</Typography>
                <Star sx={{ color: 'warning.main' }} />
              </Box>
              <Typography variant="h3">{analytics?.averageRating?.toFixed(1) || 'N/A'}</Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Response Rate</Typography>
                <TrendingUp sx={{ color: 'success.main' }} />
              </Box>
              <Typography variant="h3">{analytics?.responseRate?.toFixed(0) || 0}%</Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Positive</Typography>
                <TrendingUp sx={{ color: 'success.main' }} />
              </Box>
              <Typography variant="h3">
                {analytics?.sentiment?.total
                  ? `${((analytics.sentiment.positive / analytics.sentiment.total) * 100).toFixed(0)}%`
                  : 'N/A'}
              </Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {analytics?.tripTypes && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Trip Types</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4}><Typography>Family: {analytics.tripTypes.family}</Typography></Grid>
            <Grid item xs={6} sm={4}><Typography>Couple: {analytics.tripTypes.couple}</Typography></Grid>
            <Grid item xs={6} sm={4}><Typography>Solo: {analytics.tripTypes.solo}</Typography></Grid>
            <Grid item xs={6} sm={4}><Typography>Business: {analytics.tripTypes.business}</Typography></Grid>
            <Grid item xs={6} sm={4}><Typography>Friends: {analytics.tripTypes.friends}</Typography></Grid>
          </Grid>
        </Card>
      )}
    </Stack>
  );
}

