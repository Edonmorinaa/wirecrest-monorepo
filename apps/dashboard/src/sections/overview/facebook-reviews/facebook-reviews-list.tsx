import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';
import { Lightbox, useLightbox } from 'src/components/lightbox';
import { ReviewData } from 'src/components/review-card/dynamic-review-card';
import { FacebookReviewCard } from 'src/components/review-card/platform-specific/facebook-review-card';

// ----------------------------------------------------------------------

interface Review {
  id: string;
  userName: string;
  userProfilePic?: string;
  text?: string;
  date: string;
  isRecommended: boolean;
  likesCount: number;
  commentsCount: number;
  tags: string[];
  photos?: Array<{ id?: string; url: string }>;
  url?: string;
  reviewMetadata?: {
    isRead: boolean;
    isImportant: boolean;
    sentiment?: number;
    keywords?: string[];
  };
}

interface FacebookReviewsListProps {
  reviews: Review[];
  pagination: any;
  filters: any;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onUpdateMetadata: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
  onRefresh: () => void;
}

// Skeleton component for loading state
function ReviewCardSkeleton() {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={48} height={48} />
            <Box>
              <Skeleton variant="text" width={140} height={24} />
              <Skeleton variant="text" width={100} height={20} sx={{ mt: 0.5 }} />
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
          </Stack>
        </Stack>

        {/* Recommendation chip */}
        <Skeleton variant="rectangular" width={120} height={24} sx={{ borderRadius: 1 }} />

        {/* Review Text */}
        <Stack spacing={1}>
          <Skeleton variant="text" width="100%" height={16} />
          <Skeleton variant="text" width="95%" height={16} />
          <Skeleton variant="text" width="85%" height={16} />
        </Stack>

        {/* Images placeholder */}
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rectangular" width={80} height={80} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={80} height={80} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={80} height={80} sx={{ borderRadius: 1 }} />
        </Stack>

        {/* Footer */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2}>
            <Skeleton variant="rectangular" width={60} height={20} />
            <Skeleton variant="rectangular" width={60} height={20} />
          </Stack>
          <Skeleton variant="rectangular" width={140} height={32} sx={{ borderRadius: 1 }} />
        </Stack>
      </Stack>
    </Box>
  );
}

export function FacebookReviewsList({
  reviews,
  pagination,
  filters,
  isLoading = false,
  onPageChange,
  onUpdateMetadata,
  onRefresh,
}: FacebookReviewsListProps) {
  // Helper function to convert review data to generic ReviewData format
  const convertToReviewData = (review: Review): ReviewData => ({
    id: review.id,
    name: review.userName,
    text: review.text,
    publishedAtDate: review.date,
    reviewerPhotoUrl: review.userProfilePic,
    reviewUrl: review.url || `https://facebook.com`,
    isRecommended: review.isRecommended,
    facebookLikesCount: review.likesCount,
    commentsCount: review.commentsCount,
    tags: review.tags,
    photos: review.photos?.map((p, idx) => ({
      id: p.id || `photo-${idx}`,
      url: typeof p === 'string' ? p : p.url,
    })),
    reviewImageUrls: review.photos?.map((p) => (typeof p === 'string' ? p : p.url)),
    reviewMetadata: review.reviewMetadata,
  });

  // Prepare slides for lightbox
  const allImages = reviews
    .filter((review) => review.photos && review.photos.length > 0)
    .flatMap((review) => 
      review.photos!.map((p) => (typeof p === 'string' ? p : p.url))
    );

  const slides = allImages.map((src) => ({ src }));
  const { selected, open, onOpen, onClose } = useLightbox(slides);

  // Show loading skeleton
  if (isLoading) {
    return (
      <Stack spacing={2}>
        {Array.from({ length: 3 }).map((_, index) => (
          <ReviewCardSkeleton key={`skeleton-${index}`} />
        ))}
      </Stack>
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
    <>
      <Stack spacing={3}>
        {/* Reviews List */}
        <Stack spacing={2}>
          {reviews.map((review) => (
            <FacebookReviewCard
              key={review.id}
              review={convertToReviewData(review)}
              searchTerm={filters.search}
              onImageClick={(images, startIndex) => {
                // Find the index of the clicked image in the global image array
                const globalIndex = allImages.findIndex((img) => img === images[startIndex]);
                if (globalIndex !== -1) {
                  onOpen(images[startIndex]);
                }
              }}
              onUpdateMetadata={onUpdateMetadata}
              showGenerateAIReply
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
          console.log('Closing lightbox');
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
