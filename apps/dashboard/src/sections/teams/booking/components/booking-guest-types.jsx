'use client';

import PropTypes from 'prop-types';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

import { ChartPie } from 'src/components/chart';

// ----------------------------------------------------------------------

export function BookingGuestTypes({ overview }) {
  const hasGuestData = overview && (
    overview.soloTravelers > 0 ||
    overview.couples > 0 ||
    overview.familiesWithYoungChildren > 0 ||
    overview.familiesWithOlderChildren > 0 ||
    overview.groupsOfFriends > 0 ||
    overview.businessTravelers > 0
  );

  if (!hasGuestData) {
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
                  backgroundColor: 'primary.main',
                  color: 'white',
                }}
              >
                👥
              </Box>
              <Box>
                <Typography variant="h6">Guest Type Distribution</Typography>
                <Typography variant="body2" color="text.secondary">
                  Breakdown of guests by travel type
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Guest Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Guest type distribution will appear here once reviews include traveler information.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const guestTypeData = [
    {
      name: 'Couples',
      value: overview.couples || 0,
      fill: '#8884d8',
      icon: '💕'
    },
    {
      name: 'Solo Travelers',
      value: overview.soloTravelers || 0,
      fill: '#82ca9d',
      icon: '👤'
    },
    {
      name: 'Families (Young)',
      value: overview.familiesWithYoungChildren || 0,
      fill: '#ffc658',
      icon: '👶'
    },
    {
      name: 'Families (Older)',
      value: overview.familiesWithOlderChildren || 0,
      fill: '#ff7300',
      icon: '👨‍👩‍👧‍👦'
    },
    {
      name: 'Group of Friends',
      value: overview.groupsOfFriends || 0,
      fill: '#ff0000',
      icon: '👥'
    },
    {
      name: 'Business',
      value: overview.businessTravelers || 0,
      fill: '#00ff00',
      icon: '💼'
    },
  ].filter(item => item.value > 0);

  const chartData = guestTypeData.map(item => ({
    label: item.name,
    value: item.value,
    fill: item.fill,
  }));

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
                backgroundColor: 'primary.main',
                color: 'white',
              }}
            >
              👥
            </Box>
            <Box>
              <Typography variant="h6">Guest Type Distribution</Typography>
              <Typography variant="body2" color="text.secondary">
                Breakdown of guests by travel type
              </Typography>
            </Box>
          </Box>
        }
      />
      <CardContent>
        <Box sx={{ height: 300, mb: 2 }}>
          <ChartPie
            series={chartData.map(item => item.value)}
            labels={chartData.map(item => item.label)}
            colors={chartData.map(item => item.fill)}
            sx={{ height: 300 }}
          />
        </Box>
        
        <Grid container spacing={2}>
          {guestTypeData.map((item, index) => (
            <Grid key={index} size={6}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                p: 1, 
                borderRadius: 1,
                backgroundColor: 'background.neutral'
              }}>
                <Box sx={{ fontSize: '1.2rem' }}>{item.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.name}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {item.value}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

BookingGuestTypes.propTypes = {
  overview: PropTypes.object,
};
