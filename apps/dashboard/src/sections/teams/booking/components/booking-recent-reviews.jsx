'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';
import { BookingReviewCard } from 'src/components/review-card';

// ----------------------------------------------------------------------

export function BookingRecentReviews({ businessProfile }) {
  if (
    !businessProfile?.reviews ||
    !Array.isArray(businessProfile.reviews) ||
    businessProfile.reviews.length === 0
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

  const reviews = businessProfile.reviews;

  // Convert Booking.com review data to ReviewData format
  const convertToReviewData = (review) => ({
    id: review.id || Math.random().toString(),
    name: review.guestName,
    text: review.text,
    publishedAtDate: review.publishedDate,
    bookingRating: review.rating,
    guestType: review.guestType,
    lengthOfStay: review.lengthOfStay,
    roomType: review.roomType,
    nationality: review.nationality,
    isVerifiedStay: review.isVerifiedStay,
    hasOwnerResponse: !!review.ownerResponse,
    subRatings: review.subRatings,
    likedMost: review.likedMost,
    dislikedMost: review.dislikedMost,
    photos: review.images,
    reviewUrl: review.url,
    reviewMetadata: review.reviewMetadata,
  });

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
        <Stack spacing={2}>
          {reviews.map((review) => (
            <BookingReviewCard
              key={review.id || Math.random().toString()}
              review={convertToReviewData(review)}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
