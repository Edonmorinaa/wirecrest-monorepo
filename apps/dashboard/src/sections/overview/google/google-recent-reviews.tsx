'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import type { GoogleReview } from '@prisma/client';

import { Iconify } from 'src/components/iconify';
import { GoogleReviewCard, ReviewData } from 'src/components/review-card';

// ----------------------------------------------------------------------

export type GoogleRecentReviewsProps = {
  reviews: GoogleReview[];
};

export function GoogleRecentReviews(props: GoogleRecentReviewsProps) {
  const { reviews } = props;
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

  const reviewData: ReviewData[] = reviews.map((review) => ({
    id: review.id,
    name: review.name,
    text: review.text,
    publishedAtDate: review.publishedAtDate.toISOString() as string,
    responseFromOwnerText: review.responseFromOwnerText,
    responseFromOwnerDate: review.responseFromOwnerDate?.toISOString(),
    reviewerPhotoUrl: review.reviewerPhotoUrl,
    reviewUrl: review.reviewUrl,
    reviewImageUrls: review.reviewImageUrls,
    stars: review.stars,
    reviewerNumberOfReviews: review.reviewerNumberOfReviews,
    isLocalGuide: review.isLocalGuide,
    googleLikesCount: review.likesCount,
  }));

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
            {reviewData.map((review, index) => (
              <GoogleReviewCard
                key={index}
                review={review}
                platform="google"
                onImageClick={(images, startIndex) => {
                  setSelectedImage({ url: images[startIndex], review: review.name });
                }}
              />
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
