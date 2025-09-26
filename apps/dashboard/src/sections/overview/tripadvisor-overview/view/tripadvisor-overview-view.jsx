'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTeamSlug } from '@/hooks/use-subdomain';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useTeamSlug } from '@/hooks/use-subdomain';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fNumber, fPercent } from 'src/utils/format-number';

// ----------------------------------------------------------------------

export function TripAdvisorOverviewView() {
  const params = useParams();
  const theme = useTheme();
  const subdomainTeamSlug = useTeamSlug();
  const slug = subdomainTeamSlug || params.slug;

  const [overviewData, setOverviewData] = useState({
    profile: null,
    metrics: null,
    isLoading: true,
    error: null
  });

  // Mock data for demonstration - replace with actual API call
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setOverviewData({
        profile: {
          name: 'Sample Restaurant',
          url: 'https://www.tripadvisor.com/Restaurant_Review-g12345-d67890',
          rating: 4.2,
          totalReviews: 1250,
          ranking: 15,
          category: 'Restaurant'
        },
        metrics: {
          currentPeriod: {
            totalReviews: 45,
            averageRating: 4.3,
            helpfulVotes: 234,
            photos: 67,
            ownerResponses: 12
          },
          previousPeriod: {
            totalReviews: 38,
            averageRating: 4.1,
            helpfulVotes: 198,
            photos: 52,
            ownerResponses: 8
          },
          ratingDistribution: {
            5: 45,
            4: 35,
            3: 15,
            2: 3,
            1: 2
          },
          tripTypeDistribution: {
            FAMILY: 30,
            COUPLES: 25,
            SOLO: 20,
            BUSINESS: 15,
            FRIENDS: 10
          },
          monthlyTrends: [
            { month: 'Jan', reviews: 12, rating: 4.2 },
            { month: 'Feb', reviews: 15, rating: 4.3 },
            { month: 'Mar', reviews: 18, rating: 4.1 },
            { month: 'Apr', reviews: 22, rating: 4.4 },
            { month: 'May', reviews: 19, rating: 4.2 },
            { month: 'Jun', reviews: 25, rating: 4.3 },
            { month: 'Jul', reviews: 28, rating: 4.5 },
            { month: 'Aug', reviews: 31, rating: 4.4 },
            { month: 'Sep', reviews: 26, rating: 4.3 },
            { month: 'Oct', reviews: 23, rating: 4.2 },
            { month: 'Nov', reviews: 20, rating: 4.1 },
            { month: 'Dec', reviews: 16, rating: 4.3 }
          ]
        },
        isLoading: false,
        error: null
      });
    }, 1000);
  }, [slug]);

  const chartOptions = useChart({
    colors: [theme.palette.primary.main, theme.palette.warning.main],
    xaxis: {
      categories: overviewData.metrics?.monthlyTrends.map(item => item.month) || [],
    },
    stroke: {
      width: [2, 2],
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => fNumber(value),
      },
    },
  });

  const pieChartOptions = useChart({
    colors: [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.info.main,
    ],
    stroke: {
      colors: [theme.palette.background.paper],
    },
    legend: {
      floating: true,
      horizontalAlign: 'center',
      position: 'bottom',
    },
    dataLabels: {
      enabled: true,
      dropShadow: { enabled: false },
    },
    tooltip: {
      fillSeriesColor: false,
      y: {
        formatter: (value) => fNumber(value),
        title: {
          formatter: (seriesName) => `${seriesName}`,
        },
      },
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: false,
          },
        },
      },
    },
  });

  const renderProfileCard = () => (
    <Card sx={{ p: 3, mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Iconify icon="eva:star-fill" width={32} sx={{ color: 'white' }} />
          </Box>
          
          <Box>
            <Typography variant="h5" sx={{ mb: 0.5 }}>
              {overviewData.profile?.name || 'Loading...'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {overviewData.profile?.category || 'Business'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Box textAlign="center">
            <Typography variant="h4" color="primary.main">
              {overviewData.profile?.rating?.toFixed(1) || '0.0'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average Rating
            </Typography>
          </Box>
          
          <Box textAlign="center">
            <Typography variant="h4" color="success.main">
              #{overviewData.profile?.ranking || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ranking
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Card>
  );

  const renderMetricsCards = () => {
    if (!overviewData.metrics) return null;

    const { currentPeriod, previousPeriod } = overviewData.metrics;

    const metrics = [
      {
        title: 'Total Reviews',
        current: currentPeriod.totalReviews,
        previous: previousPeriod.totalReviews,
        icon: 'eva:message-circle-fill',
        color: 'primary',
        format: fNumber
      },
      {
        title: 'Average Rating',
        current: currentPeriod.averageRating,
        previous: previousPeriod.averageRating,
        icon: 'eva:star-fill',
        color: 'warning',
        format: (value) => value.toFixed(1)
      },
      {
        title: 'Helpful Votes',
        current: currentPeriod.helpfulVotes,
        previous: previousPeriod.helpfulVotes,
        icon: 'eva:thumbs-up-fill',
        color: 'success',
        format: fNumber
      },
      {
        title: 'Photos',
        current: currentPeriod.photos,
        previous: previousPeriod.photos,
        icon: 'eva:camera-fill',
        color: 'info',
        format: fNumber
      },
      {
        title: 'Owner Responses',
        current: currentPeriod.ownerResponses,
        previous: previousPeriod.ownerResponses,
        icon: 'eva:message-square-fill',
        color: 'secondary',
        format: fNumber
      },
      {
        title: 'Response Rate',
        current: (currentPeriod.ownerResponses / currentPeriod.totalReviews) * 100,
        previous: (previousPeriod.ownerResponses / previousPeriod.totalReviews) * 100,
        icon: 'eva:trending-up-fill',
        color: 'error',
        format: fPercent
      }
    ];

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metrics.map((metric) => {
          const change = ((metric.current - metric.previous) / metric.previous) * 100;
          const isPositive = change > 0;
          
          return (
            <Grid key={metric.title} item xs={12} sm={6} md={4}>
              <Card sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" sx={{ mb: 0.5 }}>
                      {metric.format(metric.current)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {metric.title}
                    </Typography>
                  </Box>
                  
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: `${metric.color}.lighter`,
                    }}
                  >
                    <Iconify icon={metric.icon} color={`${metric.color}.main`} />
                  </Box>
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
                  <Iconify
                    icon={isPositive ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
                    color={isPositive ? 'success.main' : 'error.main'}
                  />
                  <Typography
                    variant="caption"
                    color={isPositive ? 'success.main' : 'error.main'}
                  >
                    {isPositive ? '+' : ''}{change.toFixed(1)}% from last period
                  </Typography>
                </Stack>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderCharts = () => {
    if (!overviewData.metrics) return null;

    const { monthlyTrends, ratingDistribution, tripTypeDistribution } = overviewData.metrics;

    const reviewSeries = [
      {
        name: 'Reviews',
        data: monthlyTrends.map(item => item.reviews)
      },
      {
        name: 'Rating',
        data: monthlyTrends.map(item => item.rating)
      }
    ];

    const ratingSeries = Object.values(ratingDistribution);
    const tripTypeSeries = Object.values(tripTypeDistribution);

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Monthly Trends
            </Typography>
            <Chart
              type="line"
              series={reviewSeries}
              options={chartOptions}
              height={320}
            />
          </Card>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Rating Distribution
              </Typography>
              <Chart
                type="pie"
                series={ratingSeries}
                options={pieChartOptions}
                height={200}
              />
            </Card>
            
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Trip Type Distribution
              </Typography>
              <Chart
                type="pie"
                series={tripTypeSeries}
                options={pieChartOptions}
                height={200}
              />
            </Card>
          </Stack>
        </Grid>
      </Grid>
    );
  };

  if (overviewData.isLoading) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3 }}>
          <Typography>Loading TripAdvisor overview...</Typography>
        </Box>
      </DashboardContent>
    );
  }

  if (overviewData.error) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3 }}>
          <Typography color="error">Error loading TripAdvisor overview: {overviewData.error}</Typography>
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="TripAdvisor Overview"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Teams', href: paths.dashboard.teams.root },
          { name: slug, href: paths.dashboard.teams.bySlug(slug) },
          { name: 'TripAdvisor Overview' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="eva:refresh-fill" />}
            onClick={() => window.location.reload()}
          >
            Refresh Data
          </Button>
        }
        sx={{ mb: 3 }}
      />

      {renderProfileCard()}
      {renderMetricsCards()}
      {renderCharts()}
    </DashboardContent>
  );
}
