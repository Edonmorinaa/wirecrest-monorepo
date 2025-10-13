'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function TripAdvisorRecentReviews({ businessProfile }) {
  const theme = useTheme();
  const [selectedImage, setSelectedImage] = useState(null);

  if (
    !businessProfile?.overview?.recentReviews ||
    !Array.isArray(businessProfile.overview.recentReviews) ||
    businessProfile.overview.recentReviews.length === 0
  ) {
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

  const reviews = businessProfile.overview.recentReviews;

  return (
    <>
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
              <Box
                key={index}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: theme.shadows[2],
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <Stack spacing={2}>
                  {/* Review Header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 40, height: 40 }}>
                        <Iconify icon="solar:user-bold" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {review.reviewerName || 'Anonymous'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {review.publishedDate
                            ? new Date(review.publishedDate).toLocaleDateString()
                            : 'Date not available'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>

                  {/* Rating */}
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Stack direction="row" spacing={0.5}>
                      {[...Array(5)].map((_, i) => (
                        <Iconify
                          key={i}
                          icon="solar:star-bold"
                          sx={{
                            color:
                              i < (review.rating || 0)
                                ? theme.palette.warning.main
                                : theme.palette.grey[300],
                            fontSize: 16,
                          }}
                        />
                      ))}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      ({review.rating || 0}/5)
                    </Typography>
                  </Stack>

                  {/* Review Text */}
                  {review.text && (
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {review.text}
                    </Typography>
                  )}

                  {/* Trip Type */}
                  {review.tripType && (
                    <Chip
                      label={review.tripType}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem', alignSelf: 'flex-start' }}
                    />
                  )}

                  {/* Review Images */}
                  {review.images && Array.isArray(review.images) && review.images.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mb: 1, display: 'block' }}
                      >
                        Review Images ({review.images.length})
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                        {review.images.map((url, imageIndex) => (
                          <Box
                            key={imageIndex}
                            sx={{
                              minWidth: 80,
                              height: 80,
                              borderRadius: 1,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: `2px solid ${theme.palette.divider}`,
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                borderColor: theme.palette.primary.main,
                                transform: 'scale(1.05)',
                              },
                            }}
                            onClick={() =>
                              setSelectedImage({ url, review: review.reviewerName || 'Anonymous' })
                            }
                          >
                            <img
                              src={url}
                              alt={`Review image ${imageIndex + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Image Dialog */}
      <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0, textAlign: 'center' }}>
          {selectedImage && (
            <img
              src={selectedImage.url}
              alt={`Review image from ${selectedImage.review}`}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedImage(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
