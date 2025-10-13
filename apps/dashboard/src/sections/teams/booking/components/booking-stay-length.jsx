'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { ChartBar } from 'src/components/chart';

// ----------------------------------------------------------------------

export function BookingStayLength({ overview }) {
  const hasStayData = overview && (
    overview.shortStays > 0 ||
    overview.mediumStays > 0 ||
    overview.longStays > 0 ||
    overview.averageLengthOfStay > 0
  );

  if (!hasStayData) {
    return (
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  backgroundColor: 'info.main',
                  color: 'white',
                }}
              >
                🏨
              </Box>
              <Box>
                <Typography variant="h6">Stay Length Analysis</Typography>
                <Typography variant="body2" color="text.secondary">
                  Guest stay duration patterns
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Stay Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Stay length data will appear here once reviews include stay duration information.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const stayData = [
    {
      name: 'Short Stays (1-2 nights)',
      value: overview.shortStays || 0,
      color: '#8884d8',
      icon: '🌅'
    },
    {
      name: 'Medium Stays (3-6 nights)',
      value: overview.mediumStays || 0,
      color: '#82ca9d',
      icon: '🌤️'
    },
    {
      name: 'Long Stays (7+ nights)',
      value: overview.longStays || 0,
      color: '#ffc658',
      icon: '🌙'
    },
  ].filter(item => item.value > 0);

  const chartData = {
    categories: stayData.map(item => item.name),
    series: [{ data: stayData.map(item => item.value) }],
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                backgroundColor: 'info.main',
                color: 'white',
              }}
            >
              🏨
            </Box>
            <Box>
              <Typography variant="h6">Stay Length Analysis</Typography>
              <Typography variant="body2" color="text.secondary">
                Guest stay duration patterns
              </Typography>
            </Box>
          </Box>
        }
      />
      <CardContent>
        <Box sx={{ height: 300, mb: 2 }}>
          <ChartBar
            series={chartData.series}
            categories={chartData.categories}
            colors={stayData.map(item => item.color)}
            sx={{ height: 300 }}
          />
        </Box>
        
        <Grid container spacing={2}>
          {stayData.map((item, index) => (
            <Grid key={index} size={4}>
              <Box sx={{ 
                textAlign: 'center',
                p: 2, 
                borderRadius: 1,
                backgroundColor: 'background.neutral'
              }}>
                <Box sx={{ fontSize: '2rem', mb: 1 }}>{item.icon}</Box>
                <Typography variant="h6" fontWeight="bold" color={item.color}>
                  {item.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.name}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        
        {overview.averageLengthOfStay > 0 && (
          <Box sx={{ mt: 3, textAlign: 'center', p: 2, backgroundColor: 'primary.light', borderRadius: 1 }}>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              {overview.averageLengthOfStay.toFixed(1)} nights
            </Typography>
            <Typography variant="body2" color="primary.dark">
              Average Length of Stay
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

BookingStayLength.propTypes = {
  overview: PropTypes.object,
};
