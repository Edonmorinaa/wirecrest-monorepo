'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type FacebookRecentReviewsProps = {
  reviews: FacebookReview[];
};

export function FacebookRecentReviews(props: FacebookRecentReviewsProps) {
  const { reviews } = props;
  const theme = useTheme();
  const [selectedImage, setSelectedImage] = useState(null);

  if (
    !reviews ||
    !Array.isArray(reviews) ||
    reviews.length === 0
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
          subheader={`Showing latest ${reviews?.length || 0} reviews`}
        />
        <CardContent>
          <Stack spacing={3}>
            {reviews?.map((review, index) => (
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
                      <Avatar
                        src={review?.userProfilePic}
                        alt={review?.userName}
                        sx={{ width: 40, height: 40 }}
                      >
                        <Iconify icon="solar:user-bold" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {review?.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(review?.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>

                  {/* Recommendation */}
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify
                      icon={review?.isRecommended ? 'solar:like-bold' : 'solar:dislike-bold'}
                      sx={{
                        color: review?.isRecommended
                          ? theme.palette.success.main
                          : theme.palette.error.main,
                        fontSize: 20,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {review.isRecommended ? 'Recommended' : 'Not Recommended'}
                    </Typography>
                  </Stack>

                  {/* Review Text */}
                  {review.text && (
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {review.text}
                    </Typography>
                  )}

                  {/* Comments */}
                  {review.comments && review.comments.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mb: 1, display: 'block' }}
                      >
                        Comments ({review.comments.length})
                      </Typography>
                      <Stack spacing={1}>
                        {review.comments.slice(0, 3).map((comment, commentIndex) => (
                          <Box
                            key={commentIndex}
                            sx={{
                              p: 2,
                              bgcolor: theme.palette.grey[50],
                              borderRadius: 1,
                              border: `1px solid ${theme.palette.divider}`,
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                              <Avatar
                                src={comment.commenterProfilePic}
                                alt={comment.commenterName}
                                sx={{ width: 24, height: 24 }}
                              >
                                <Iconify icon="solar:user-bold" />
                              </Avatar>
                              <Typography variant="caption" fontWeight={600}>
                                {comment.commenterName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(comment.date).toLocaleDateString()}
                              </Typography>
                            </Stack>
                            <Typography variant="body2">{comment.text}</Typography>
                            {comment.likesCount > 0 && (
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                                sx={{ mt: 1 }}
                              >
                                <Iconify
                                  icon="solar:like-bold"
                                  sx={{ fontSize: 14, color: 'text.secondary' }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {comment.likesCount}
                                </Typography>
                              </Stack>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Review Images */}
                  {review.photos && Array.isArray(review.photos) && review.photos.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mb: 1, display: 'block' }}
                      >
                        Review Images ({review.photos.length})
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                        {review.photos.map((photo, imageIndex) => (
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
                              setSelectedImage({ url: photo.url, review: review.userName })
                            }
                          >
                            <img
                              src={photo.url}
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
