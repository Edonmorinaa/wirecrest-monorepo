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
import { FacebookReviewCard } from 'src/components/facebook-review-card/facebook-review-card';

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
  photos?: string[];
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
  isLoading: boolean;
  isError: boolean;
  onPageChange: (page: number) => void;
  onUpdateMetadata: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
  onRefresh: () => void;
}

export function FacebookReviewsList({
  reviews,
  pagination,
  filters,
  isLoading,
  isError,
  onPageChange,
  onUpdateMetadata,
  onRefresh,
}: FacebookReviewsListProps) {
  // Prepare slides for lightbox
  const allImages = reviews
    .filter((review) => review.photos && review.photos.length > 0)
    .flatMap((review) => review.photos!);

  const slides = allImages.map((src) => ({ src }));
  const { selected, open, onOpen, onClose } = useLightbox(slides);

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
    <>
      <Stack spacing={3}>
        {/* Reviews List */}
        <Stack spacing={2}>
          {reviews.map((review) => (
            <FacebookReviewCard
              key={review.id}
              review={review}
              searchTerm={filters.search}
              onImageClick={(images, startIndex) => {
                // Find the index of the clicked image in the global image array
                const globalIndex = allImages.findIndex((img) => img === images[startIndex]);
                console.log('Opening lightbox:', { images, startIndex, globalIndex, allImages });
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
