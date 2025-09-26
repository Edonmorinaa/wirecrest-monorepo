'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FacebookRecentActivity({ recentReviews, sx, ...other }) {
  const theme = useTheme();

  if (!recentReviews || recentReviews.length === 0) {
    return (
      <Card sx={sx} {...other}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:trending-up-bold" />
              <Typography variant="h6">Recent Review Activity</Typography>
            </Stack>
          }
          subheader="Latest Facebook review activity"
        />
        <CardContent>
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'text.secondary',
              p: 3,
            }}
          >
            <Iconify icon="solar:trending-up-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">No recent review activity</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:trending-up-bold" />
            <Typography variant="h6">Recent Review Activity</Typography>
          </Stack>
        }
        subheader="Latest Facebook review activity"
      />
      <CardContent>
        <Stack spacing={2}>
          {recentReviews.slice(0, 5).map((review, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.grey[50],
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: theme.shadows[2],
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: review.isRecommended 
                        ? theme.palette.success.lighter 
                        : theme.palette.error.lighter,
                    }}
                  >
                    <Iconify
                      icon={review.isRecommended ? "solar:thumb-up-bold" : "solar:thumb-down-bold"}
                      sx={{
                        color: review.isRecommended 
                          ? theme.palette.success.main 
                          : theme.palette.error.main,
                        fontSize: 16,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {review.isRecommended ? 'Recommended' : 'Not Recommended'}
                    </Typography>
                    {review.sentiment && (
                      <Typography variant="caption" color="text.secondary">
                        Sentiment: {(review.sentiment * 100).toFixed(0)}%
                      </Typography>
                    )}
                  </Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:calendar-bold" sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(review.reviewDate).toLocaleDateString()}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
