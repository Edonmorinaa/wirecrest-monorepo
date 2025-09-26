import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';
import { BookingReviewCard } from 'src/components/review-card';

// ----------------------------------------------------------------------

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  text?: string;
  title?: string;
  publishedDate: string;
  hasOwnerResponse?: boolean;
  ownerResponseText?: string;
  ownerResponseDate?: string;
  guestType?: string;
  roomType?: string;
  lengthOfStay?: number;
  stayDate?: string;
  isVerifiedStay?: boolean;
  reviewerNationality?: string;
  likedMost?: string;
  dislikedMost?: string;
  reviewMetadata?: {
    isRead: boolean;
    isImportant: boolean;
    sentiment?: number;
    keywords?: string[];
  };
}

interface BookingReviewsListProps {
  reviews: Review[];
  pagination: any;
  filters: any;
  isLoading: boolean;
  isError: boolean;
  onPageChange: (page: number) => void;
  onUpdateMetadata: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
  onRefresh: () => void;
}

export function BookingReviewsList({
  reviews,
  pagination,
  filters,
  isLoading,
  isError,
  onPageChange,
  onUpdateMetadata,
  onRefresh,
}: BookingReviewsListProps) {
  if (isLoading) {
    return (
      <Stack spacing={2}>
        {[...Array(5)].map((_, index) => (
          <Card key={index}>
            <CardContent>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Skeleton variant="circular" width={48} height={48} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={60} />
                <Skeleton variant="text" width="80%" />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Iconify
            icon="eva:alert-circle-outline"
            width={64}
            height={64}
            className=""
            sx={{ mb: 2, opacity: 0.5 }}
          />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Error Loading Reviews
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            There was an error loading the reviews. Please try again.
          </Typography>
          <Button variant="outlined" onClick={onRefresh}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Iconify
            icon="eva:message-circle-outline"
            width={64}
            height={64}
            className=""
            sx={{ mb: 2, opacity: 0.5 }}
          />
          <Typography variant="h6" sx={{ mb: 1 }}>
            No Reviews Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No reviews match your current filters. Try adjusting your search criteria.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Reviews List */}
      <Stack spacing={2}>
        {reviews.map((review) => {
          // Convert Booking.com review data to ReviewData format
          const convertToReviewData = (reviewData) => ({
            id: reviewData.id,
            name: reviewData.reviewerName,
            text: reviewData.text,
            title: reviewData.title,
            publishedAtDate: reviewData.publishedDate,
            bookingRating: reviewData.rating,
            guestType: reviewData.guestType,
            lengthOfStay: reviewData.lengthOfStay,
            roomType: reviewData.roomType,
            nationality: reviewData.reviewerNationality,
            isVerifiedStay: reviewData.isVerifiedStay,
            hasOwnerResponse: !!reviewData.ownerResponseText,
            subRatings: reviewData.subRatings,
            likedMost: reviewData.likedMost,
            dislikedMost: reviewData.dislikedMost,
            reviewUrl: reviewData.url,
            reviewMetadata: reviewData.reviewMetadata,
          });

          return (
            <BookingReviewCard
              key={review.id}
              review={convertToReviewData(review)}
              searchTerm={filters.search}
              onUpdateMetadata={onUpdateMetadata}
            />
          );
        })}
      </Stack>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={(_, page) => onPageChange(page)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Stack>
  );
}
