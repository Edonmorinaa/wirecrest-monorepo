import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';
import { Lightbox, useLightbox } from 'src/components/lightbox';
import { TripAdvisorReviewCard } from 'src/components/review-card/platform-specific/tripadvisor-review-card';

// ----------------------------------------------------------------------

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  text?: string;
  title?: string;
  publishedDate: string;
  visitDate?: string;
  tripType?: string;
  helpfulVotes?: number;
  reviewerPhotoUrl?: string;
  reviewUrl?: string;
  responseFromOwnerText?: string;
  responseFromOwnerDate?: string;
  photos?: Array<{ id: string; url: string }>;
  reviewMetadata?: {
    isRead: boolean;
    isImportant: boolean;
    sentiment?: number;
    keywords?: string[];
  };
}

interface TripAdvisorReviewsListProps {
  reviews: Review[];
  pagination: any;
  filters: any;
  onPageChange: (page: number) => void;
  onUpdateMetadata: (reviewId: string, updates: any) => void;
  onRefresh: () => void;
}

export function TripAdvisorReviewsList({
  reviews,
  pagination,
  filters,
  onPageChange,
  onUpdateMetadata,
  onRefresh,
}: TripAdvisorReviewsListProps) {
  // Data transformation for TripAdvisor reviews to match ReviewData interface
  const convertTripAdvisorReviewToReviewData = (review: Review) => ({
    id: review.id,
    name: review.reviewerName,
    text: review.text,
    title: review.title,
    publishedAtDate: review.publishedDate,
    responseFromOwnerText: review.responseFromOwnerText,
    responseFromOwnerDate: review.responseFromOwnerDate,
    reviewerPhotoUrl: review.reviewerPhotoUrl,
    reviewUrl: review.reviewUrl,
    reviewMetadata: review.reviewMetadata,
    // TripAdvisor-specific fields
    tripAdvisorRating: review.rating,
    tripType: review.tripType,
    helpfulVotes: review.helpfulVotes,
    visitDate: review.visitDate,
    photos: review.photos,
  });

  // Prepare slides for lightbox
  const allImages = reviews
    .filter((review) => review.photos && review.photos.length > 0)
    .flatMap((review) => review.photos?.map((photo) => photo.url) || []);

  const slides = allImages.map((src) => ({ src }));
  const { selected, open, onOpen, onClose } = useLightbox(slides);

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
    <>
      <Stack spacing={3}>
        {/* Reviews List */}
        <Stack spacing={2}>
          {reviews.map((review) => (
            <TripAdvisorReviewCard
              key={review.id}
              review={convertTripAdvisorReviewToReviewData(review)}
              searchTerm={filters.search}
              onImageClick={(images, startIndex) => {
                // Find the index of the clicked image in the global image array
                const globalIndex = allImages.findIndex((img) => img === images[startIndex]);
                if (globalIndex !== -1) {
                  onOpen(images[startIndex]);
                }
              }}
              onUpdateMetadata={onUpdateMetadata}
            />
          ))}
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

      {/* Lightbox for Images */}
      <Lightbox
        open={open}
        onClose={() => {
          onClose();
        }}
        slides={slides}
        selected={selected}
        disableZoom={false}
        disableVideo
        disableTotal={false}
        disableCaptions
        disableSlideshow={false}
        disableThumbnails={false}
        disableFullscreen={false}
        onGetCurrentIndex={() => {}}
        className=""
      />
    </>
  );
}
