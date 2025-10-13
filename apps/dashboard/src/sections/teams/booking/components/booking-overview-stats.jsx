'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

import { BookingWidgetSummary } from 'src/sections/overview/booking';

// ----------------------------------------------------------------------

export function BookingOverviewStats({ overview }) {
  const hasValidData = overview && overview.totalReviews > 0;
  
  const statsCards = [
    {
      title: 'Total Reviews',
      value: overview?.totalReviews || 0,
      subtitle: hasValidData ? 'All time reviews' : 'No reviews yet',
      icon: '📝',
      color: 'primary',
      format: (val) => val.toLocaleString(),
      trend: hasValidData ? '+12%' : null,
      trendDirection: 'up'
    },
    {
      title: 'Average Rating',
      value: overview?.averageRating || 0,
      subtitle: hasValidData ? 'Overall guest satisfaction' : 'Awaiting reviews',
      icon: '⭐',
      color: 'warning',
      format: (val) => val > 0 ? val.toFixed(1) : '—',
      trend: hasValidData ? '+0.2' : null,
      trendDirection: 'up'
    },
    {
      title: 'Response Rate',
      value: overview?.responseRate || 0,
      subtitle: hasValidData ? 'Owner response percentage' : 'No responses yet',
      icon: '💬',
      color: 'success',
      format: (val) => val > 0 ? `${val.toFixed(0)}%` : '0%',
      trend: hasValidData ? '+5%' : null,
      trendDirection: 'up'
    },
    {
      title: 'Avg Stay Length',
      value: overview?.averageLengthOfStay || 0,
      subtitle: hasValidData ? 'Nights per booking' : 'No stay data',
      icon: '🏨',
      color: 'info',
      format: (val) => val > 0 ? `${val.toFixed(1)} nights` : '—',
      trend: hasValidData ? '-0.5' : null,
      trendDirection: 'down'
    },
  ];

  return (
    <Grid container spacing={3}>
      {statsCards.map((stat, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <BookingWidgetSummary
            title={stat.title}
            percent={stat.trend ? parseFloat(stat.trend.replace(/[+-]/g, '')) : 0}
            total={stat.value}
            icon={
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  backgroundColor: `${stat.color}.main`,
                  color: 'white',
                }}
              >
                {stat.icon}
              </Box>
            }
            color={stat.color}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [22, 8, 35, 50, 82, 84, 77, 12],
            }}
          />
        </Grid>
      ))}
    </Grid>
  );
}

BookingOverviewStats.propTypes = {
  overview: PropTypes.object,
};
