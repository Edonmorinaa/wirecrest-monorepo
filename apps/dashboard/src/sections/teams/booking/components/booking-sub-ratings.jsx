'use client';

import PropTypes from 'prop-types';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';

// ----------------------------------------------------------------------

export function BookingSubRatings({ overview }) {
  const hasSubRatings = overview && (
    overview.averageCleanlinessRating > 0 ||
    overview.averageComfortRating > 0 ||
    overview.averageLocationRating > 0 ||
    overview.averageFacilitiesRating > 0 ||
    overview.averageStaffRating > 0 ||
    overview.averageValueForMoneyRating > 0 ||
    overview.averageWifiRating > 0
  );

  const subRatings = [
    { 
      label: 'Cleanliness', 
      rating: overview?.averageCleanlinessRating || 0, 
      icon: '🧹',
      color: 'success.main',
      bgColor: 'success.light'
    },
    { 
      label: 'Comfort', 
      rating: overview?.averageComfortRating || 0, 
      icon: '🛏️',
      color: 'primary.main',
      bgColor: 'primary.light'
    },
    { 
      label: 'Location', 
      rating: overview?.averageLocationRating || 0, 
      icon: '📍',
      color: 'error.main',
      bgColor: 'error.light'
    },
    { 
      label: 'Facilities', 
      rating: overview?.averageFacilitiesRating || 0, 
      icon: '🏢',
      color: 'secondary.main',
      bgColor: 'secondary.light'
    },
    { 
      label: 'Staff', 
      rating: overview?.averageStaffRating || 0, 
      icon: '👥',
      color: 'info.main',
      bgColor: 'info.light'
    },
    { 
      label: 'Value', 
      rating: overview?.averageValueForMoneyRating || 0, 
      icon: '💰',
      color: 'success.main',
      bgColor: 'success.light'
    },
    { 
      label: 'WiFi', 
      rating: overview?.averageWifiRating || 0, 
      icon: '📶',
      color: 'primary.main',
      bgColor: 'primary.light'
    },
  ].filter(rating => rating.rating > 0);

  if (!hasSubRatings) {
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
                  backgroundColor: 'warning.main',
                  color: 'white',
                }}
              >
                ⭐
              </Box>
              <Box>
                <Typography variant="h6">Sub-Ratings Performance</Typography>
                <Typography variant="body2" color="text.secondary">
                  Detailed ratings across service aspects
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Sub-Ratings Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sub-ratings data will appear here once guests start leaving detailed reviews with category-specific ratings.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

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
                backgroundColor: 'warning.main',
                color: 'white',
              }}
            >
              ⭐
            </Box>
            <Box>
              <Typography variant="h6">Sub-Ratings Performance</Typography>
              <Typography variant="body2" color="text.secondary">
                Average ratings across {subRatings.length} service aspects
              </Typography>
            </Box>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          {subRatings.map((rating, index) => {
            const percentage = (rating.rating / 10) * 100;
            
            return (
              <Grid key={index} size={12}>
                <Box sx={{ p: 2, borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        backgroundColor: rating.bgColor,
                        color: rating.color,
                      }}
                    >
                      {rating.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {rating.label}
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight="bold">
                      {rating.rating.toFixed(1)}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {percentage.toFixed(0)}% satisfaction
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
}

BookingSubRatings.propTypes = {
  overview: PropTypes.object,
};
