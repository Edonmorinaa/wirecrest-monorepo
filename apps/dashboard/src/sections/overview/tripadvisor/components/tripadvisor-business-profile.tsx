import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type TProps = {
  name: string;
  address?: string | null;
  locationString?: string | null;
  tripAdvisorUrl?: string | null;
  type?: string | null;
  category?: string | null;
  rankingPosition?: number | null;
  rankingString?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  hotelClass?: string | null;
  priceLevel?: string | null;
  numberOfRooms?: number | null;
};

export function TripAdvisorBusinessProfileCard(props: TProps) {
  const theme = useTheme();
  
  const {
    name,
    address,
    locationString,
    tripAdvisorUrl,
    type,
    category,
    rankingPosition,
    rankingString,
    phone,
    website,
    email,
    hotelClass,
    priceLevel,
    numberOfRooms,
  } = props;

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
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {address || locationString}
            </Typography>
          </Box>

          {tripAdvisorUrl && (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:external-link-fill" />}
              href={tripAdvisorUrl}
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
            {type && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Label sx={{ color: 'primary.main' }} variant="soft" color="primary">
                  <Iconify icon="mdi:tag" width={16} sx={{ mr: 0.5 }} />
                  {type}
                </Label>
              </Box>
            )}
            
            {category && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Label sx={{ color: 'secondary.main' }} variant="soft" color="secondary">
                  {category}
                </Label>
              </Box>
            )}

            {rankingPosition && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Label sx={{ color: 'warning.main' }} variant="soft" color="warning">
                  <Iconify icon="mdi:trophy" width={16} sx={{ mr: 0.5 }} />
                  #{rankingPosition}
                  {rankingString && ` ${rankingString}`}
                </Label>
              </Box>
            )}
          </Stack>

          {/* Contact Information */}
          <Stack direction="row" alignItems="center" spacing={3}>
            {phone && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="eva:phone-fill" width={16} color="text.secondary" />
                <Typography variant="body2" color="text.secondary">
                  {phone}
                </Typography>
              </Stack>
            )}

            {website && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="eva:globe-fill" width={16} color="text.secondary" />
                <Typography variant="body2" color="text.secondary">
                  {website.replace(/^https?:\/\//, '')}
                </Typography>
              </Stack>
            )}

            {email && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="eva:email-fill" width={16} color="text.secondary" />
                <Typography variant="body2" color="text.secondary">
                  {email}
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Additional Details */}
          {(hotelClass || priceLevel || numberOfRooms) && (
            <Stack direction="row" alignItems="center" spacing={3}>
              {hotelClass && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="mdi:star" width={16} color="text.secondary" />
                  <Typography variant="body2" color="text.secondary">
                    {hotelClass} Stars
                  </Typography>
                </Stack>
              )}

              {priceLevel && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="mdi:currency-usd" width={16} color="text.secondary" />
                  <Typography variant="body2" color="text.secondary">
                    {priceLevel}
                  </Typography>
                </Stack>
              )}

              {numberOfRooms && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="mdi:bed" width={16} color="text.secondary" />
                  <Typography variant="body2" color="text.secondary">
                    {numberOfRooms} Rooms
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
