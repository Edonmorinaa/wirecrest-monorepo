'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function GoogleOpeningHours({ businessProfile }) {
  const theme = useTheme();

  // Format opening hours for display
  const formatOpeningHours = useMemo(() => {
    const openingHours = businessProfile?.regularOpeningHours;
    if (!openingHours) return null;

    // Use weekday descriptions if available (they already include day and time)
    if (
      openingHours.weekdayDescriptions &&
      openingHours.weekdayDescriptions.length > 0
    ) {
      // Google's weekdayDescriptions come in Sunday-first order [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
      // We want Monday-first order [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
      const reorderedDescriptions = [
        openingHours.weekdayDescriptions[1], // Monday (index 1)
        openingHours.weekdayDescriptions[2], // Tuesday (index 2)
        openingHours.weekdayDescriptions[3], // Wednesday (index 3)
        openingHours.weekdayDescriptions[4], // Thursday (index 4)
        openingHours.weekdayDescriptions[5], // Friday (index 5)
        openingHours.weekdayDescriptions[6], // Saturday (index 6)
        openingHours.weekdayDescriptions[0], // Sunday (index 0)
      ];

      return reorderedDescriptions.map((description) => ({
        fullDescription: description || 'Closed',
      }));
    }

    const dayNames = {
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
      0: 'Sunday',
    };

    // Fallback to periods if weekday descriptions are not available
    if (openingHours.periods && openingHours.periods.length > 0) {
      const formattedHours = {};

      openingHours.periods.forEach((period) => {
        const dayIndex = period.openDay;
        if (dayIndex === null || dayIndex === undefined) return;

        const openTime =
          period.openHour !== null && period.openMinute !== null
            ? `${period.openHour.toString().padStart(2, '0')}:${period.openMinute.toString().padStart(2, '0')}`
            : null;

        const closeTime =
          period.closeHour !== null && period.closeMinute !== null
            ? `${period.closeHour.toString().padStart(2, '0')}:${period.closeMinute.toString().padStart(2, '0')}`
            : null;

        if (openTime && closeTime) {
          if (!formattedHours[dayIndex]) {
            formattedHours[dayIndex] = [];
          }
          formattedHours[dayIndex].push(`${openTime} - ${closeTime}`);
        }
      });

      // Convert to array format with Monday first
      const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday
      return dayOrder.map((dayIndex) => {
        const dayName = dayNames[dayIndex];
        const hours = formattedHours[dayIndex];

        return {
          fullDescription: `${dayName}: ${hours ? hours.join(', ') : 'Closed'}`,
        };
      });
    }

    return null;
  }, [businessProfile?.regularOpeningHours]);

  // Check if business is currently open
  const isCurrentlyOpen = useMemo(() => {
    let isOpenNow = businessProfile?.regularOpeningHours?.openNow;
    
    if (formatOpeningHours && formatOpeningHours.length > 0) {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const ourArrayIndex = currentDay === 0 ? 6 : currentDay - 1; // Convert to our Monday-first array
      
      if (formatOpeningHours[ourArrayIndex]) {
        const todayHours = formatOpeningHours[ourArrayIndex].fullDescription;
        
        // Check if it contains time information
        const timeMatch = todayHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[\u2013\u2014-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          const [, openHour, openMin, openPeriod, closeHour, closeMin, closePeriod] = timeMatch;
          
          const openTimeString = `${openHour}:${openMin} ${openPeriod.toUpperCase()}`;
          const closeTimeString = `${closeHour}:${closeMin} ${closePeriod.toUpperCase()}`;
          
          const baseDate = new Date();
          baseDate.setHours(0, 0, 0, 0);
          
          const openTime = new Date(baseDate);
          const [openH, openM] = openTimeString.split(' ')[0].split(':');
          openTime.setHours(
            parseInt(openH) + (openTimeString.includes('PM') && parseInt(openH) !== 12 ? 12 : 0),
            parseInt(openM),
            0,
            0
          );
          if (openTimeString.includes('AM') && parseInt(openH) === 12) {
            openTime.setHours(0);
          }
          
          let closeTime = new Date(baseDate);
          const [closeH, closeM] = closeTimeString.split(' ')[0].split(':');
          closeTime.setHours(
            parseInt(closeH) + (closeTimeString.includes('PM') && parseInt(closeH) !== 12 ? 12 : 0),
            parseInt(closeM),
            0,
            0
          );
          if (closeTimeString.includes('AM') && parseInt(closeH) === 12) {
            closeTime.setHours(0);
          }
          
          // Handle overnight hours
          if (closeTime <= openTime) {
            closeTime.setDate(closeTime.getDate() + 1);
          }
          
          isOpenNow = now >= openTime && now <= closeTime;
        } else {
          isOpenNow = !todayHours.toLowerCase().includes('closed');
        }
      }
    }
    
    return isOpenNow;
  }, [businessProfile?.regularOpeningHours?.openNow, formatOpeningHours]);

  if (!formatOpeningHours || formatOpeningHours.length === 0) {
    return (
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:clock-circle-bold" />
              <Typography variant="h6">Opening Hours</Typography>
            </Stack>
          }
          subheader="Regular business hours for this location"
        />
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'text.secondary',
              py: 4,
            }}
          >
            <Iconify icon="solar:clock-circle-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">No opening hours available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:clock-circle-bold" />
            <Typography variant="h6">Opening Hours</Typography>
          </Stack>
        }
        subheader="Regular business hours for this location"
      />
      <CardContent>
        <Stack spacing={2}>
          {formatOpeningHours.map((dayInfo, index) => {
            // Fix current day detection for Monday-first ordering
            const currentDayIndex = new Date().getDay(); // Sunday=0, Monday=1, Tuesday=2, etc.
            const ourArrayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
            const isCurrentDay = ourArrayIndex === index;

            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  transition: 'all 0.3s ease-in-out',
                  ...(isCurrentDay
                    ? {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        transform: 'scale(1.02)',
                        boxShadow: theme.shadows[4],
                      }
                    : {
                        bgcolor: alpha(theme.palette.grey[500], 0.1),
                        border: `1px solid ${theme.palette.divider}`,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.grey[500], 0.2),
                          transform: 'scale(1.01)',
                          boxShadow: theme.shadows[2],
                        },
                      }),
                }}
              >
                {isCurrentDay && (
                  <Stack direction="row" spacing={0.5}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        animation: 'pulse 2s infinite',
                      }}
                    />
                    <Box
                      sx={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.6),
                        animation: 'pulse 2s infinite',
                        animationDelay: '0.2s',
                      }}
                    />
                  </Stack>
                )}

                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontWeight: isCurrentDay ? 600 : 400,
                    color: isCurrentDay ? 'primary.main' : 'text.primary',
                  }}
                >
                  {dayInfo.fullDescription}
                </Typography>

                {isCurrentDay && (
                  <Chip
                    label="Today"
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 500 }}
                  />
                )}
              </Box>
            );
          })}

          {/* Current Status */}
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:clock-circle-bold" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight={500}>
                  Current Status
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isCurrentlyOpen ? 'success.main' : 'error.main',
                    animation: isCurrentlyOpen ? 'pulse 2s infinite' : 'none',
                  }}
                />
                <Chip
                  label={isCurrentlyOpen ? 'Open Now' : 'Closed Now'}
                  size="small"
                  color={isCurrentlyOpen ? 'success' : 'error'}
                  sx={{ fontWeight: 500 }}
                />
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
