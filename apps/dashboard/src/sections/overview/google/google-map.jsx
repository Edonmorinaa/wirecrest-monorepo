'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function GoogleMap({ businessProfile }) {
  const theme = useTheme();

  if (!businessProfile) return null;

  const hasLocation = businessProfile.location?.lat && businessProfile.location?.lng;

  if (!hasLocation) {
    return (
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:map-point-bold" />
              <Typography variant="h6">Location</Typography>
            </Stack>
          }
          subheader="Business location on map"
        />
        <CardContent>
          <Box
            sx={{
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'text.secondary',
              bgcolor: theme.palette.grey[100],
              borderRadius: 1,
            }}
          >
            <Iconify icon="solar:map-point-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">Location data not available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { lat, lng } = businessProfile.location;
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${lat},${lng}&zoom=15`;

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:map-point-bold" />
            <Typography variant="h6">Location</Typography>
          </Stack>
        }
        subheader="Business location on map"
      />
      <CardContent>
        <Box
          sx={{
            height: 300,
            borderRadius: 1,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={mapUrl}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`${businessProfile.displayName} location`}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {businessProfile.formattedAddress}
        </Typography>
      </CardContent>
    </Card>
  );
}
