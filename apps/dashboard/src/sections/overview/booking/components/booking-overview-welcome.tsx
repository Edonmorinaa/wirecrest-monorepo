import type { SxProps, Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  displayName?: string;
  averageRating?: number;
  totalReviews?: number;
  sx?: SxProps<Theme>;
};

export function BookingOverviewWelcome({ displayName, averageRating, totalReviews, sx }: Props) {
  return (
    <Card sx={{ p: 3, ...sx }}>
      <Stack spacing={2}>
        <Typography variant="h4">{displayName || 'Booking.com Overview'}</Typography>
        <Stack direction="row" spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:star-bold" width={24} sx={{ color: 'warning.main' }} />
            <Typography variant="h6">{averageRating?.toFixed(1) || '0.0'}</Typography>
            <Typography variant="body2" color="text.secondary">
              / 10
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:chat-round-dots-bold" width={24} sx={{ color: 'info.main' }} />
            <Typography variant="h6">{totalReviews || 0}</Typography>
            <Typography variant="body2" color="text.secondary">
              reviews
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

