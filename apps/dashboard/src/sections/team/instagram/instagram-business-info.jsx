'use client';

import { format } from 'date-fns';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';

// ----------------------------------------------------------------------

export function InstagramBusinessInfo() {
  const { businessProfile, isLoading } = useInstagramBusinessProfile();

  if (isLoading || !businessProfile) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:building-bold" />
            <Typography variant="h6">Business Information</Typography>
          </Stack>
        }
        action={
          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              // TODO: Add info modal
              console.log('Show business info details');
            }}
          >
            <Iconify icon="solar:info-circle-bold" />
          </Button>
        }
      />
      
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify 
              icon={businessProfile.isVerified ? 'solar:verified-check-bold' : 'solar:verified-check-bold'} 
              sx={{ 
                color: businessProfile.isVerified ? 'primary.main' : 'text.disabled',
                fontSize: 16
              }} 
            />
            <Typography variant="body2">
              {businessProfile.isVerified ? 'Verified Account' : 'Not Verified'}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify 
              icon="solar:building-bold" 
              sx={{ 
                color: businessProfile.isBusinessAccount ? 'success.main' : 'text.disabled',
                fontSize: 16
              }} 
            />
            <Typography variant="body2">
              {businessProfile.isBusinessAccount ? 'Business Account' : 'Personal Account'}
            </Typography>
          </Stack>

          {businessProfile.category && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:tag-bold" sx={{ color: 'text.secondary', fontSize: 16 }} />
              <Typography variant="body2">{businessProfile.category}</Typography>
            </Stack>
          )}

          {businessProfile.contactEmail && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:letter-bold" sx={{ color: 'text.secondary', fontSize: 16 }} />
              <Typography variant="body2">{businessProfile.contactEmail}</Typography>
            </Stack>
          )}

          {businessProfile.contactPhone && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:phone-bold" sx={{ color: 'text.secondary', fontSize: 16 }} />
              <Typography variant="body2">{businessProfile.contactPhone}</Typography>
            </Stack>
          )}

          {businessProfile.contactAddress && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:map-pin-bold" sx={{ color: 'text.secondary', fontSize: 16 }} />
              <Typography variant="body2">{businessProfile.contactAddress}</Typography>
            </Stack>
          )}

          {businessProfile.website && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:globe-bold" sx={{ color: 'text.secondary', fontSize: 16 }} />
              <Button
                href={businessProfile.website}
                target="_blank"
                rel="noopener noreferrer"
                variant="text"
                size="small"
                sx={{ p: 0, minWidth: 'auto', textTransform: 'none' }}
              >
                {businessProfile.website}
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
