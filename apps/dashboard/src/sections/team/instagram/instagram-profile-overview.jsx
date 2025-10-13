'use client';

import { format } from 'date-fns';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramProfileOverview() {
  const { businessProfile, isLoading } = useInstagramBusinessProfile();

  if (isLoading || !businessProfile) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar 
              src={businessProfile.profileUrl} 
              alt={businessProfile.username}
              sx={{ width: 64, height: 64 }}
            >
              <Iconify icon="solar:instagram-bold" sx={{ fontSize: 32 }} />
            </Avatar>
            
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h5">@{businessProfile.username}</Typography>
                
                {businessProfile.isVerified && (
                  <Iconify icon="solar:verified-check-bold" sx={{ color: 'primary.main' }} />
                )}
                
                {businessProfile.isBusinessAccount && (
                  <Chip 
                    label="Business" 
                    size="small" 
                    color="secondary" 
                    variant="outlined"
                  />
                )}
              </Stack>
              
              {businessProfile.fullName && (
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  {businessProfile.fullName}
                </Typography>
              )}
              
              {businessProfile.category && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {businessProfile.category}
                </Typography>
              )}
            </Stack>
          </Stack>
        }
        action={
          <Stack spacing={1} alignItems="flex-end">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Last Updated: {businessProfile.lastSnapshotAt 
                ? format(new Date(businessProfile.lastSnapshotAt), 'MMM dd, yyyy') 
                : 'Never'}
            </Typography>
            
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {businessProfile.totalSnapshots} snapshots collected
            </Typography>
          </Stack>
        }
      />
      
      <CardContent>
        {businessProfile.biography && (
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {businessProfile.biography}
          </Typography>
        )}
        
        {businessProfile.website && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Iconify icon="solar:globe-bold" sx={{ color: 'text.secondary' }} />
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
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1} alignItems="center">
              <Typography variant="h4" sx={{ color: 'primary.main' }}>
                {businessProfile.currentFollowersCount?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Followers
              </Typography>
            </Stack>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1} alignItems="center">
              <Typography variant="h4" sx={{ color: 'secondary.main' }}>
                {businessProfile.currentFollowingCount?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Following
              </Typography>
            </Stack>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1} alignItems="center">
              <Typography variant="h4" sx={{ color: 'info.main' }}>
                {businessProfile.currentMediaCount?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Posts
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
