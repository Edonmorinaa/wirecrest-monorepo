import { Stack } from '@mui/material';

import { ReviewData, DynamicReviewCard } from './dynamic-review-card';

// ----------------------------------------------------------------------

// Sample data for different platforms
const sampleGoogleReview: ReviewData = {
  id: '1',
  name: 'John Doe',
  stars: 5,
  text: 'Amazing service! The staff was very friendly and helpful. The food was delicious and the atmosphere was perfect for a family dinner.',
  publishedAtDate: '2024-01-15T10:30:00Z',
  reviewerPhotoUrl: 'https://via.placeholder.com/40',
  reviewerNumberOfReviews: 127,
  isLocalGuide: true,
  visitedIn: 'January 2024',
  googleLikesCount: 8,
  reviewUrl: 'https://google.com/review/1',
  reviewImageUrls: ['https://via.placeholder.com/80x80', 'https://via.placeholder.com/80x80'],
  reviewMetadata: {
    isRead: false,
    isImportant: true,
    sentiment: 0.8,
    keywords: ['friendly', 'delicious', 'family', 'atmosphere'],
  },
};

const sampleFacebookReview: ReviewData = {
  id: '2',
  name: 'Jane Smith',
  isRecommended: true,
  text: 'Great experience! Highly recommend this place to anyone looking for quality service.',
  publishedAtDate: '2024-01-14T15:45:00Z',
  reviewerPhotoUrl: 'https://via.placeholder.com/40',
  facebookLikesCount: 12,
  commentsCount: 3,
  reviewUrl: 'https://facebook.com/review/2',
  photos: [
    { id: '1', url: 'https://via.placeholder.com/80x80' },
    { id: '2', url: 'https://via.placeholder.com/80x80' },
  ],
  tags: ['recommended', 'quality', 'service'],
  reviewMetadata: {
    isRead: true,
    isImportant: false,
    sentiment: 0.6,
  },
};

const sampleTripAdvisorReview: ReviewData = {
  id: '3',
  name: 'Mike Johnson',
  tripAdvisorRating: 4,
  title: 'Good experience overall',
  text: 'The place was nice but could use some improvements. Staff was friendly though.',
  publishedAtDate: '2024-01-13T09:20:00Z',
  reviewerPhotoUrl: 'https://via.placeholder.com/40',
  reviewUrl: 'https://tripadvisor.com/review/3',
  reviewMetadata: {
    isRead: false,
    isImportant: false,
    sentiment: 0.2,
  },
};

const sampleBookingReview: ReviewData = {
  id: '4',
  name: 'Sarah Wilson',
  bookingRating: 9,
  text: 'Excellent hotel with great amenities. The room was clean and comfortable.',
  publishedAtDate: '2024-01-12T14:15:00Z',
  reviewerPhotoUrl: 'https://via.placeholder.com/40',
  isVerifiedStay: true,
  reviewUrl: 'https://booking.com/review/4',
  reviewMetadata: {
    isRead: true,
    isImportant: true,
    sentiment: 0.9,
  },
};

// ----------------------------------------------------------------------

export function DynamicReviewCardDemo() {
  const handleImageClick = (images: string[], startIndex: number) => {
    console.log('Image clicked:', { images, startIndex });
  };

  const handleUpdateMetadata = (
    reviewId: string,
    field: 'isRead' | 'isImportant',
    value: boolean
  ) => {
    console.log('Update metadata:', { reviewId, field, value });
  };

  const handleGenerateResponse = (review: ReviewData) => {
    console.log('Generate response for:', review);
  };

  const handleRespond = (review: ReviewData) => {
    console.log('Respond to:', review);
  };

  return (
    <Stack spacing={3}>
      <DynamicReviewCard
        review={sampleGoogleReview}
        platform="GOOGLE"
        searchTerm=""
        onImageClick={handleImageClick}
        onUpdateMetadata={handleUpdateMetadata}
        onGenerateResponse={handleGenerateResponse}
        onRespond={handleRespond}
      />

      <DynamicReviewCard
        review={sampleFacebookReview}
        platform="FACEBOOK"
        searchTerm=""
        onImageClick={handleImageClick}
        onUpdateMetadata={handleUpdateMetadata}
        onGenerateResponse={handleGenerateResponse}
        onRespond={handleRespond}
      />

      <DynamicReviewCard
        review={sampleTripAdvisorReview}
        platform="TRIPADVISOR"
        searchTerm=""
        onImageClick={handleImageClick}
        onUpdateMetadata={handleUpdateMetadata}
        onGenerateResponse={handleGenerateResponse}
        onRespond={handleRespond}
      />

      <DynamicReviewCard
        review={sampleBookingReview}
        platform="BOOKING"
        searchTerm=""
        onImageClick={handleImageClick}
        onUpdateMetadata={handleUpdateMetadata}
        onGenerateResponse={handleGenerateResponse}
        onRespond={handleRespond}
      />
    </Stack>
  );
}
