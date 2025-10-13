'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Rating from '@mui/material/Rating';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export function BookingOverviewDashboard({ data, isLoading }) {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Chart options must be defined before any early returns
  const chartOptions = useChart({
    colors: ['#00AB55', '#FFC107', '#FF4842'],
    chart: {
      stacked: false,
      zoom: { enabled: false },
    },
    xaxis: {
      categories: [],
    },
    yaxis: [
      {
        title: { text: 'Rating' },
        min: 0,
        max: 5,
      },
      {
        opposite: true,
        title: { text: 'Reviews' },
        min: 0,
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
  });

  if (isLoading) {
    return <BookingOverviewSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { businessProfile, overview, ratingDistribution, periodicalMetrics, topKeywords } = data;
  const { sentimentAnalysis } = overview || {};

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '—';
    return num.toLocaleString();
  };

  const formatPercentage = (num) => {
    if (num === null || num === undefined) return '—';
    return `${num.toFixed(1)}%`;
  };

  const formatRating = (num) => {
    if (num === null || num === undefined) return '—';
    return num.toFixed(1);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'success.main';
    if (rating >= 4.0) return 'warning.main';
    if (rating >= 3.0) return 'info.main';
    return 'error.main';
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'success.main';
      case 'neutral': return 'warning.main';
      case 'negative': return 'error.main';
      default: return 'text.secondary';
    }
  };

  // Chart data for ratings over time
  const chartData = periodicalMetrics?.map(metric => ({
    period: metric.periodLabel,
    rating: metric.averageRating,
    reviews: metric.reviewCount,
  })) || [];

  // Update chart options with actual data
  chartOptions.xaxis.categories = chartData.map(item => item.period);

  const chartSeries = [
    {
      name: 'Average Rating',
      type: 'line',
      data: chartData.map(item => item.rating),
    },
    {
      name: 'Review Count',
      type: 'column',
      data: chartData.map(item => item.reviews),
    },
  ];

  return (
    <Box>
      {/* Property Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
            <Avatar
              src={businessProfile.mainImage}
              alt={businessProfile.name}
              sx={{ width: 80, height: 80 }}
            >
              <Iconify icon="solar:building-bold" />
            </Avatar>
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" gutterBottom>
                {businessProfile.name}
              </Typography>
              
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Chip 
                  label={businessProfile.propertyType} 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label={`${businessProfile.stars || 0} Stars`} 
                  color="warning" 
                  variant="outlined" 
                />
                <Chip 
                  label={`${businessProfile.city}, ${businessProfile.country}`} 
                  color="info" 
                  variant="outlined" 
                />
              </Stack>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Rating 
                value={overview?.averageRating || 0} 
                precision={0.1} 
                readOnly 
                size="large"
              />
              <Typography variant="h6" sx={{ color: getRatingColor(overview?.averageRating) }}>
                {formatRating(overview?.averageRating)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatNumber(overview?.totalReviews)} reviews
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:star-bold" sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" color="warning.main" gutterBottom>
                {formatRating(overview?.averageRating)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Rating
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:chat-round-dots-bold" sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary.main" gutterBottom>
                {formatNumber(overview?.totalReviews)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Reviews
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:reply-bold" sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" color="success.main" gutterBottom>
                {formatPercentage(overview?.responseRate)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Response Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:calendar-bold" sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" color="info.main" gutterBottom>
                {formatRating(overview?.averageLengthOfStay)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg. Stay (nights)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Rating Distribution */}
      {ratingDistribution && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Rating Distribution
            </Typography>
            
            <Grid container spacing={2}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingDistribution[`${stars === 5 ? 'five' : stars === 4 ? 'four' : stars === 3 ? 'three' : stars === 2 ? 'two' : 'one'}Star`] || 0;
                const percentage = overview?.totalReviews ? (count / overview.totalReviews) * 100 : 0;
                
                return (
                  <Grid key={stars} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Rating value={stars} readOnly size="small" />
                      <Box sx={{ flexGrow: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
                        {count} ({percentage.toFixed(1)}%)
                      </Typography>
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Guest Types */}
      {overview && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Guest Types
            </Typography>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Couples</Typography>
                  <Typography variant="h6">{formatNumber(overview.couples)}</Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Families with Young Children</Typography>
                  <Typography variant="h6">{formatNumber(overview.familiesWithYoungChildren)}</Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Business Travelers</Typography>
                  <Typography variant="h6">{formatNumber(overview.businessTravelers)}</Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Solo Travelers</Typography>
                  <Typography variant="h6">{formatNumber(overview.soloTravelers)}</Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Groups of Friends</Typography>
                  <Typography variant="h6">{formatNumber(overview.groupsOfFriends)}</Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Families with Older Children</Typography>
                  <Typography variant="h6">{formatNumber(overview.familiesWithOlderChildren)}</Typography>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Sentiment Analysis */}
      {sentimentAnalysis && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sentiment Analysis
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Stack alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'success.lighter',
                      color: 'success.main',
                    }}
                  >
                    <Typography variant="h4">{sentimentAnalysis.positiveCount}</Typography>
                  </Box>
                  <Typography variant="body2" color="success.main">Positive</Typography>
                </Stack>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 4 }}>
                <Stack alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'warning.lighter',
                      color: 'warning.main',
                    }}
                  >
                    <Typography variant="h4">{sentimentAnalysis.neutralCount}</Typography>
                  </Box>
                  <Typography variant="body2" color="warning.main">Neutral</Typography>
                </Stack>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 4 }}>
                <Stack alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'error.lighter',
                      color: 'error.main',
                    }}
                  >
                    <Typography variant="h4">{sentimentAnalysis.negativeCount}</Typography>
                  </Box>
                  <Typography variant="body2" color="error.main">Negative</Typography>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Top Keywords */}
      {topKeywords && topKeywords.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Keywords
            </Typography>
            
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {topKeywords.map((keyword, index) => (
                <Chip
                  key={keyword.id}
                  label={`${keyword.keyword} (${keyword.count})`}
                  color={index < 3 ? 'primary' : 'default'}
                  variant={index < 3 ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Ratings Over Time Chart */}
      {chartData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ratings & Reviews Over Time
            </Typography>
            
            <Chart
              type="line"
              series={chartSeries}
              options={chartOptions}
              height={320}
            />
          </CardContent>
        </Card>
      )}

      {/* Property Details */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Property Details
          </Typography>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Property Type</Typography>
                  <Typography variant="body2">{businessProfile.propertyType}</Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography variant="body2">{businessProfile.phone || '—'}</Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{businessProfile.email || '—'}</Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Website</Typography>
                  <Typography variant="body2">{businessProfile.website || '—'}</Typography>
                </Stack>
              </Stack>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Check-in Time</Typography>
                  <Typography variant="body2">{businessProfile.checkInTime || '—'}</Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Check-out Time</Typography>
                  <Typography variant="body2">{businessProfile.checkOutTime || '—'}</Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Currency</Typography>
                  <Typography variant="body2">{businessProfile.currency || '—'}</Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Price From</Typography>
                  <Typography variant="body2">
                    {businessProfile.priceFrom ? `${businessProfile.priceFrom} ${businessProfile.currency}` : '—'}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

function BookingOverviewSkeleton() {
  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
            <Skeleton variant="circular" width={80} height={80} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="60%" height={40} />
              <Stack direction="row" spacing={2}>
                <Skeleton variant="rectangular" width={100} height={32} />
                <Skeleton variant="rectangular" width={100} height={32} />
                <Skeleton variant="rectangular" width={100} height={32} />
              </Stack>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Skeleton variant="rectangular" width={120} height={32} />
              <Skeleton variant="text" width={60} height={24} />
              <Skeleton variant="text" width={80} height={16} />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[...Array(4)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Skeleton variant="circular" width={32} height={32} sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="80%" height={16} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {[...Array(5)].map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Skeleton variant="rectangular" width={80} height={16} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="rectangular" width="100%" height={8} />
                  </Box>
                  <Skeleton variant="text" width={60} height={16} />
                </Stack>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
