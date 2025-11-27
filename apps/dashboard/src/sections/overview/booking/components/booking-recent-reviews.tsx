import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  reviews: any[];
};

export function BookingRecentReviews({ reviews }: Props) {
  const theme = useTheme();

  if (!reviews || reviews.length === 0) {
    return (
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:chat-round-dots-bold" />
              <Typography variant="h6">Recent Reviews</Typography>
            </Stack>
          }
          subheader="Showing latest customer reviews"
        />
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'text.secondary',
              py: 4,
            }}
          >
            <Iconify icon="solar:chat-round-dots-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">No recent reviews available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:chat-round-dots-bold" />
            <Typography variant="h6">Recent Reviews</Typography>
          </Stack>
        }
        subheader={`Showing latest ${reviews.length} reviews`}
      />
      <CardContent>
        <Stack spacing={3}>
          {reviews.map((review, index) => (
            <Card
              key={review.id || index}
              sx={{
                p: 2,
                boxShadow: 'none',
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
              }}
            >
              <Stack spacing={2}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar
                    alt={review.reviewerName}
                    sx={{ width: 40, height: 40, bgcolor: theme.palette.primary.main, color: 'white' }}
                  >
                    {review.reviewerName?.charAt(0) || 'A'}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {review.reviewerName || 'Anonymous'}
                      </Typography>
                      {review.isVerifiedStay && (
                        <Iconify icon="solar:verified-check-bold" sx={{ color: 'success.main', width: 16, height: 16 }} />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          label={review.rating?.toFixed(1)}
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {review.publishedDate ? new Date(review.publishedDate).toLocaleDateString() : 'Unknown date'}
                      </Typography>
                      {review.guestType && (
                        <Chip label={review.guestType} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Content */}
                <Stack spacing={1.5}>
                  {review.likedMost && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Iconify icon="eva:plus-circle-fill" sx={{ color: 'success.main', mt: 0.2, flexShrink: 0 }} width={16} />
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {review.likedMost.length > 150 ? `${review.likedMost.substring(0, 150)}...` : review.likedMost}
                      </Typography>
                    </Box>
                  )}

                  {review.dislikedMost && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Iconify icon="eva:minus-circle-fill" sx={{ color: 'error.main', mt: 0.2, flexShrink: 0 }} width={16} />
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {review.dislikedMost.length > 150 ? `${review.dislikedMost.substring(0, 150)}...` : review.dislikedMost}
                      </Typography>
                    </Box>
                  )}

                  {!review.likedMost && !review.dislikedMost && review.text && (
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {review.text.length > 150 ? `${review.text.substring(0, 150)}...` : review.text}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

