import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const TRIP_TYPES = [
  {
    type: 'Family',
    emoji: '👨‍👩‍👧‍👦',
    color: 'primary',
    icon: 'eva:people-fill',
  },
  {
    type: 'Couples',
    emoji: '💑',
    color: 'secondary',
    icon: 'eva:heart-fill',
  },
  {
    type: 'Solo',
    emoji: '🧳',
    color: 'warning',
    icon: 'eva:person-fill',
  },
  {
    type: 'Business',
    emoji: '💼',
    color: 'info',
    icon: 'eva:briefcase-fill',
  },
  {
    type: 'Friends',
    emoji: '👥',
    color: 'success',
    icon: 'eva:people-outline',
  },
];

export function TripAdvisorTripTypes({ data }) {
  const theme = useTheme();

  if (!data || data.total === 0) {
    return (
      <Card sx={{ p: 3, height: 400 }}>
        <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
          <Iconify icon="eva:people-fill" width={48} color="text.disabled" />
          <Typography variant="body2" color="text.secondary">
            No trip type data available
          </Typography>
        </Stack>
      </Card>
    );
  }

  const tripTypeData = [
    { type: 'Family', count: data.family },
    { type: 'Couples', count: data.couples },
    { type: 'Solo', count: data.solo },
    { type: 'Business', count: data.business },
    { type: 'Friends', count: data.friends },
  ];

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="eva:people-fill" width={24} />
          <Typography variant="h6">Trip Types</Typography>
        </Stack>

        <Stack spacing={2}>
          {tripTypeData.map((item) => {
            const tripType = TRIP_TYPES.find((t) => t.type === item.type);
            const percentage = data.total > 0 ? (item.count / data.total) * 100 : 0;
            const color = theme.palette[tripType?.color || 'primary'].main;

            return (
              <Box
                key={item.type}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(color, 0.08),
                  border: `1px solid ${alpha(color, 0.12)}`,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    bgcolor: alpha(color, 0.12),
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: alpha(color, 0.12),
                        color,
                        fontSize: '1.5rem',
                      }}
                    >
                      {tripType?.emoji}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {item.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.count} reviews
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color }}>
                      {percentage.toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      of total
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
