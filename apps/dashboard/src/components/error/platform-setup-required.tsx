/**
 * Platform Setup Required Component
 * 
 * Shows when a platform integration hasn't been set up yet
 */

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

interface PlatformSetupRequiredProps {
  platform: string;
  icon: string;
  description: string;
  setupUrl?: string;
  onSetup?: () => void;
}

export function PlatformSetupRequired({
  platform,
  icon,
  description,
  setupUrl,
  onSetup,
}: PlatformSetupRequiredProps) {
  const handleSetup = () => {
    if (setupUrl) {
      window.location.href = setupUrl;
    } else if (onSetup) {
      onSetup();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Iconify icon={icon} width={40} />
          </Box>

          <Typography variant="h5" gutterBottom>
            Connect {platform}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {description}
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={handleSetup}
          >
            Connect {platform}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

