import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function TikTokProfileOverview() {
  const { businessProfile } = useTikTokBusinessProfile();

  if (!businessProfile) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Profile Overview
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ space: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="solar:users-group-rounded-bold" width={20} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Followers
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {businessProfile.followerCount?.toLocaleString() || '0'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="solar:users-group-rounded-bold" width={20} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Following
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {businessProfile.followingCount?.toLocaleString() || '0'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="solar:video-library-bold" width={20} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Videos
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {businessProfile.videoCount?.toLocaleString() || '0'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="solar:heart-bold" width={20} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Hearts
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {businessProfile.heartCount?.toLocaleString() || '0'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ space: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Account Type
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {businessProfile.isBusinessAccount ? 'Business' : 'Personal'}
                </Typography>
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
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {businessProfile.verified ? 'Yes' : 'No'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Private
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {businessProfile.privateAccount ? 'Yes' : 'No'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
