import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TablePaginationCustom } from 'src/components/table';
import { BookingReviewCard } from 'src/components/review-card';

// ----------------------------------------------------------------------

export function BookingReviewsList({
  reviews,
  pagination,
  filters,
  isLoading,
  isError,
  onUpdateMetadata,
  onPageChange,
  onRefresh,
}) {
  if (isLoading) {
    return (
      <Card>
        <Scrollbar>
          <Box sx={{ p: 2 }}>
            {[...Array(5)].map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Skeleton variant="rectangular" height={200} />
              </Box>
            ))}
          </Box>
        </Scrollbar>
      </Card>
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
            sx={{ mb: 2, opacity: 0.5, color: 'error.main' }}
          />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Failed to Load Reviews
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            There was an error loading the reviews. Please try again.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <button
              onClick={onRefresh}
              style={{
                background: 'none',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </Box>
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
            subRatings: {
              cleanliness: reviewData.cleanlinessRating,
              comfort: reviewData.comfortRating,
              location: reviewData.locationRating,
              facilities: reviewData.facilitiesRating,
              staff: reviewData.staffRating,
              valueForMoney: reviewData.valueForMoneyRating,
              wifi: reviewData.wifiRating,
            },
            likedMost: reviewData.likedMost,
            dislikedMost: reviewData.dislikedMost,
            reviewUrl: reviewData.url,
            reviewMetadata: reviewData.reviewMetadata,
            ownerResponse: reviewData.ownerResponseText
              ? {
                  text: reviewData.ownerResponseText,
                  date: reviewData.ownerResponseDate,
                }
              : null,
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
          <TablePaginationCustom
            count={pagination.total}
            page={pagination.page - 1}
            rowsPerPage={pagination.limit}
            onPageChange={(_, newPage) => onPageChange(newPage + 1)}
            onRowsPerPageChange={() => {
              // You might want to add a callback for this
              // const newLimit = parseInt(event.target.value, 10);
              // onLimitChange(newLimit);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Stack>
  );
}
