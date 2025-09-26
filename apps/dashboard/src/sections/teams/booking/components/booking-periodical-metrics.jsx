'use client';

import PropTypes from 'prop-types';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { ChartLine } from 'src/components/chart';

// ----------------------------------------------------------------------

export function BookingPeriodicalMetrics({ periodicalMetrics }) {
  if (!periodicalMetrics || periodicalMetrics.length === 0) {
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
                📈
              </Box>
              <Box>
                <Typography variant="h6">Periodical Metrics</Typography>
                <Typography variant="body2" color="text.secondary">
                  Performance over time
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Periodical Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Periodical metrics will appear here once data is collected over time.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const chartData = {
    categories: periodicalMetrics.map(item => item.periodKey),
    series: [
      {
        name: 'Reviews',
        data: periodicalMetrics.map(item => item.reviewsCount || 0),
      },
      {
        name: 'Average Rating',
        data: periodicalMetrics.map(item => item.averageRating || 0),
      },
    ],
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
              📈
            </Box>
            <Box>
              <Typography variant="h6">Periodical Metrics</Typography>
              <Typography variant="body2" color="text.secondary">
                Performance over time
              </Typography>
            </Box>
          </Box>
        }
      />
      <CardContent>
        <Box sx={{ height: 300 }}>
          <ChartLine
            series={chartData.series}
            categories={chartData.categories}
            sx={{ height: 300 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

BookingPeriodicalMetrics.propTypes = {
  periodicalMetrics: PropTypes.array,
};
