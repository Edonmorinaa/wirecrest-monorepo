import type { SxProps, Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  businessProfile: any;
  sx?: SxProps<Theme>;
};

export function BookingBusinessInfo({ businessProfile, sx }: Props) {
  return (
    <Card sx={sx}>
      <CardHeader title="Business Information" />
      <Box sx={{ p: 3 }}>
        {businessProfile ? (
          <Box>
            <Typography variant="body2">
              Name: {businessProfile.hotelName || businessProfile.name || 'N/A'}
            </Typography>
            <Typography variant="body2">
              Rating: {businessProfile.rating || 'N/A'}
            </Typography>
            <Typography variant="body2">
              Reviews: {businessProfile.numberOfReviews || 'N/A'}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No business profile data available
          </Typography>
        )}
      </Box>
    </Card>
  );
}

