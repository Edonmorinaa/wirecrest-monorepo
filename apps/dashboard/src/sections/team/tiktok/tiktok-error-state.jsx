import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function TikTokErrorState() {
  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            textAlign: 'center',
          }}
        >
          <Iconify
            icon="solar:bell-bold"
            width={64}
            height={64}
            sx={{ color: 'error.main', mb: 2 }}
          />

          <Typography variant="h5" sx={{ mb: 1 }}>
            TikTok Profile Not Found
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Set up your TikTok business profile to start tracking analytics.
          </Typography>

          <Button
            variant="contained"
            onClick={() => window.location.href = '/dashboard/teams/settings'}
            startIcon={<Iconify icon="solar:settings-bold" />}
          >
            Configure TikTok
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
