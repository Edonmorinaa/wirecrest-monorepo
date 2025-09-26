import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import { Iconify } from 'src/components/iconify';
import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';

// ----------------------------------------------------------------------

export function TikTokBusinessInfo() {
  const { businessProfile } = useTikTokBusinessProfile();

  if (!businessProfile) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Business Information
        </Typography>

        <Box sx={{ space: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Account Type
            </Typography>
            <Chip
              label={businessProfile.isBusinessAccount ? 'Business' : 'Personal'}
              color={businessProfile.isBusinessAccount ? 'primary' : 'default'}
              size="small"
            />
          </Box>

          {businessProfile.category && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Category
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {businessProfile.category}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Verified
            </Typography>
            <Chip
              label={businessProfile.verified ? 'Yes' : 'No'}
              color={businessProfile.verified ? 'success' : 'default'}
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Private Account
            </Typography>
            <Chip
              label={businessProfile.privateAccount ? 'Yes' : 'No'}
              color={businessProfile.privateAccount ? 'error' : 'default'}
              size="small"
            />
          </Box>

          {businessProfile.username && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Username
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                @{businessProfile.username}
              </Typography>
            </Box>
          )}

          {businessProfile.displayName && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Display Name
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {businessProfile.displayName}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
