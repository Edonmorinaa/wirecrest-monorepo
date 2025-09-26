import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export function TripAdvisorBusinessProfile({ businessProfile }) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        p: 3,
        mb: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
      }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: theme.palette.primary.main,
            }}
          >
            <Iconify icon="mdi:tripadvisor" width={32} />
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" sx={{ mb: 0.5 }}>
              {businessProfile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {businessProfile.address || businessProfile.locationString}
            </Typography>
          </Box>

          {businessProfile.tripAdvisorUrl && (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:external-link-fill" />}
              href={businessProfile.tripAdvisorUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on TripAdvisor
            </Button>
          )}
        </Stack>

        <Divider />

        {/* Business Details */}
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {businessProfile.type && (
              <Label variant="soft" color="primary">
                <Iconify icon="mdi:tag" width={16} sx={{ mr: 0.5 }} />
                {businessProfile.type}
              </Label>
            )}
            
            {businessProfile.category && (
              <Label variant="soft" color="secondary">
                {businessProfile.category}
              </Label>
            )}

            {businessProfile.rankingPosition && (
              <Label variant="soft" color="warning">
                <Iconify icon="mdi:trophy" width={16} sx={{ mr: 0.5 }} />
                #{businessProfile.rankingPosition}
                {businessProfile.rankingString && ` ${businessProfile.rankingString}`}
              </Label>
            )}
          </Stack>

          {/* Contact Information */}
          <Stack direction="row" alignItems="center" spacing={3}>
            {businessProfile.phone && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="eva:phone-fill" width={16} color="text.secondary" />
                <Typography variant="body2" color="text.secondary">
                  {businessProfile.phone}
                </Typography>
              </Stack>
            )}

            {businessProfile.website && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="eva:globe-fill" width={16} color="text.secondary" />
                <Typography variant="body2" color="text.secondary">
                  {businessProfile.website.replace(/^https?:\/\//, '')}
                </Typography>
              </Stack>
            )}

            {businessProfile.email && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="eva:email-fill" width={16} color="text.secondary" />
                <Typography variant="body2" color="text.secondary">
                  {businessProfile.email}
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Additional Details */}
          {(businessProfile.hotelClass || businessProfile.priceLevel || businessProfile.numberOfRooms) && (
            <Stack direction="row" alignItems="center" spacing={3}>
              {businessProfile.hotelClass && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="mdi:star" width={16} color="text.secondary" />
                  <Typography variant="body2" color="text.secondary">
                    {businessProfile.hotelClass} Stars
                  </Typography>
                </Stack>
              )}

              {businessProfile.priceLevel && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="mdi:currency-usd" width={16} color="text.secondary" />
                  <Typography variant="body2" color="text.secondary">
                    {businessProfile.priceLevel}
                  </Typography>
                </Stack>
              )}

              {businessProfile.numberOfRooms && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="mdi:bed" width={16} color="text.secondary" />
                  <Typography variant="body2" color="text.secondary">
                    {businessProfile.numberOfRooms} Rooms
                  </Typography>
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
