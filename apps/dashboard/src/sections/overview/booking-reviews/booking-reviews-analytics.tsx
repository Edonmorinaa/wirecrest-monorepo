'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface BookingReviewsAnalyticsProps {
  teamSlug: string;
  title?: string;
  subheader?: string;
  sx?: any;
}

export function BookingReviewsAnalytics({
  teamSlug,
  title = 'Reviews Analytics',
  subheader = 'Booking.com reviews trends',
  sx,
  ...other
}: BookingReviewsAnalyticsProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!teamSlug) return;

      setIsLoading(true);
      try {
        // Fetch analytics data from API
        const response = await fetch(`/api/teams/${teamSlug}/booking/reviews/date-range`);
        if (response.ok) {
          const data = await response.json();
          setChartData(data.chartData || []);
        }
      } catch (error) {
        console.error('Error fetching Booking reviews analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [teamSlug]);

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon="solar:chart-line-bold" width={24} height={24} className="" sx={{}} />
            {title}
          </Box>
        }
        subheader={subheader}
      />

      <Box sx={{ p: 3 }}>
        {isLoading ? (
          <Box
            sx={{
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Loading analytics...
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Iconify
                icon="solar:chart-line-bold"
                width={64}
                height={64}
                className=""
                sx={{ mb: 2, opacity: 0.5 }}
              />
              <Typography variant="h6" sx={{ mb: 1 }}>
                Analytics Chart
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chart functionality will be implemented here
              </Typography>
              {chartData.length > 0 && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Found {chartData.length} data points
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Card>
  );
}

export default BookingReviewsAnalytics;
