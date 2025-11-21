'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Grid,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  RateReview as ReviewIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';

import {
  useGoogleProfile,
  useGoogleAnalytics,
  useGoogleReviews,
  useGoogleEnhancedGraph,
} from 'src/hooks/useLocations';

// ----------------------------------------------------------------------

interface GooglePlatformViewProps {
  locationId: string;
}

export function GooglePlatformView({ locationId }: GooglePlatformViewProps) {
  const [dateRange, setDateRange] = useState('30d');
  
  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '365d':
        start.setDate(end.getDate() - 365);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [dateRange]);

  // Fetch data
  const { profile, isLoading: profileLoading } = useGoogleProfile(locationId);
  const { analytics, isLoading: analyticsLoading } = useGoogleAnalytics(
    locationId,
    startDate,
    endDate
  );
  const { reviews, pagination, aggregates } = useGoogleReviews(
    locationId,
    {},
    { page: 1, limit: 10 }
  );
  const { daily, overview, trends } = useGoogleEnhancedGraph(
    locationId,
    startDate,
    endDate
  );

  if (profileLoading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box>
        <Typography variant="h5">{profile?.displayName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {profile?.formattedAddress}
        </Typography>
      </Box>

      {/* Date Range Selector */}
      <FormControl size="small" sx={{ maxWidth: 200 }}>
        <InputLabel>Date Range</InputLabel>
        <Select
          value={dateRange}
          label="Date Range"
          onChange={(e) => setDateRange(e.target.value)}
        >
          <MenuItem value="7d">Last 7 days</MenuItem>
          <MenuItem value="30d">Last 30 days</MenuItem>
          <MenuItem value="90d">Last 90 days</MenuItem>
          <MenuItem value="365d">Last 365 days</MenuItem>
        </Select>
      </FormControl>

      {/* Analytics Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Total Reviews
                </Typography>
                <ReviewIcon sx={{ color: 'primary.main' }} />
              </Box>
              <Typography variant="h3">
                {analyticsLoading ? '...' : analytics?.reviewCount || 0}
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Average Rating
                </Typography>
                <StarIcon sx={{ color: 'warning.main' }} />
              </Box>
              <Typography variant="h3">
                {analyticsLoading ? '...' : analytics?.averageRating?.toFixed(1) || 'N/A'}
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Response Rate
                </Typography>
                <ReplyIcon sx={{ color: 'success.main' }} />
              </Box>
              <Typography variant="h3">
                {analyticsLoading ? '...' : `${analytics?.responseRate?.toFixed(0) || 0}%`}
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Positive Sentiment
                </Typography>
                <TrendingUpIcon sx={{ color: 'success.main' }} />
              </Box>
              <Typography variant="h3">
                {analyticsLoading
                  ? '...'
                  : analytics?.sentiment?.total
                  ? `${((analytics.sentiment.positive / analytics.sentiment.total) * 100).toFixed(0)}%`
                  : 'N/A'}
              </Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Rating Distribution */}
      {analytics?.ratingDistribution && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Rating Distribution
          </Typography>
          <Stack spacing={1}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <Box key={rating} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ minWidth: 60 }}>
                  {rating} stars
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: 24,
                    bgcolor: 'grey.200',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${((analytics.ratingDistribution[rating as 1 | 2 | 3 | 4 | 5] || 0) / (analytics.reviewCount || 1)) * 100}%`,
                      height: '100%',
                      bgcolor: 'primary.main',
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
                  {analytics.ratingDistribution[rating as 1 | 2 | 3 | 4 | 5] || 0}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Card>
      )}

      {/* Sentiment Analysis */}
      {analytics?.sentiment && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Sentiment Analysis
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {analytics.sentiment.positive}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Positive
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {analytics.sentiment.neutral}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Neutral
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {analytics.sentiment.negative}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Negative
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Recent Reviews */}
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Recent Reviews ({reviews.length})
        </Typography>
        <Stack spacing={2}>
          {reviews.slice(0, 5).map((review) => (
            <Box
              key={review.id}
              sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle2">{review.reviewerDisplayName}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {[...Array(review.stars)].map((_, i) => (
                    <StarIcon key={i} sx={{ fontSize: 16, color: 'warning.main' }} />
                  ))}
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {review.text?.substring(0, 200)}
                {(review.text?.length || 0) > 200 && '...'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(review.publishedAtDate).toLocaleDateString()}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Card>

      {/* Trend Graph Placeholder */}
      {daily && daily.length > 0 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Review Trends
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {daily.length} days of data available
            {overview && ` • Total: ${overview.totalReviews} reviews`}
            {overview?.averageRating && ` • Avg: ${overview.averageRating.toFixed(1)} ⭐`}
          </Typography>
          {/* Integrate your chart component here */}
        </Card>
      )}
    </Stack>
  );
}

