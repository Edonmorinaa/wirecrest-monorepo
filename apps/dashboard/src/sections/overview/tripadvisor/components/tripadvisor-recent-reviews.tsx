'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogContent from '@mui/material/DialogContent'; 

import { Iconify } from 'src/components/iconify';
import { ReviewData, TripAdvisorReviewCard } from '@/components/review-card';
import { TripAdvisorReviewWithMetadata } from '@/actions/types';

// ----------------------------------------------------------------------

type TReview = {
  reviewerName?: string;
  publishedDate?: string;
  rating?: number;
  text?: string;
  tripType?: string;
  images?: string[];
};

type TProps = {
  reviews: TripAdvisorReviewWithMetadata[];
};

export function TripAdvisorRecentReviews({ reviews }: TProps) {
  const theme = useTheme();
  const [selectedImage, setSelectedImage] = useState<{ url: string; review: string } | null>(null);

  const reviewData: ReviewData[] = reviews.map((review) => ({
    id: review.id,
    name: review.reviewerName,
    text: review.text,
    publishedAtDate: review.publishedDate.toISOString() as string,
    responseFromOwnerText: review.responseFromOwnerText,
    responseFromOwnerDate: review.responseFromOwnerDate?.toISOString(),
    reviewerPhotoUrl: review.reviewerPhotoUrl,
    reviewUrl: review.reviewUrl,
    reviewImageUrls: review.photos?.map((photo) => photo.url) || [],
    stars: review.rating,
    tripAdvisorRating: review.rating,
    tripType: review.tripType,
    helpfulVotes: review.helpfulVotes,
    visitDate: review.visitDate,
    photos: review.photos?.map((photo) => ({ id: photo.id, url: photo.url })) || [],
    title: review.title,
    reviewMetadata: review.reviewMetadataId,
  }));

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
          subheader={`Showing latest ${reviews.length} reviews`}
        />
        <CardContent>
          <Stack spacing={3}>
            {reviewData.map((review, index) => (
              <TripAdvisorReviewCard key={index} review={review} />
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
