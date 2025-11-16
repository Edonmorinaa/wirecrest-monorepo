import type { Prisma } from '@prisma/client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';
import { Lightbox, useLightbox } from 'src/components/lightbox';
import { TripAdvisorReviewCard } from 'src/components/review-card/platform-specific/tripadvisor-review-card';

import type { PaginationInfo, TripAdvisorReviewWithRelations } from 'src/hooks/use-tripadvisor-reviews';

// ----------------------------------------------------------------------

/**
 * Converted review data interface for TripAdvisorReviewCard
 */
export interface ConvertedReviewData {
  id: string;
  name: string;
  text?: string | null;
  title?: string | null;
  publishedAtDate: string;
  responseFromOwnerText?: string | null;
  responseFromOwnerDate?: string | null;
  reviewerPhotoUrl?: string | null;
  reviewUrl?: string | null;
  reviewMetadata?: Prisma.ReviewMetadataGetPayload<{}> | null;
  tripAdvisorRating: number;
  tripType?: string | null;
  helpfulVotes?: number;
  visitDate?: string | null;
  photos?: Array<{ id: string; url: string }>;
}

export interface LightboxSlide {
  src: string;
}

export type TProps = {
  reviews: TripAdvisorReviewWithRelations[];
  pagination: PaginationInfo;
  searchTerm?: string;
  allImageUrls: string[];
  lightboxSlides: LightboxSlide[];
  convertedReviews: ConvertedReviewData[];
  onPageChange: (page: number) => void;
  onUpdateMetadata: (reviewId: string, updates: Partial<Prisma.ReviewMetadataGetPayload<{}>>) => Promise<void>;
  onImageClick: (imageUrl: string) => void;
};

/**
 * Dumb component for displaying the list of TripAdvisor reviews
 * Only receives data and handlers, no internal logic
 */
export function TripAdvisorReviewsList({
  reviews,
  pagination,
  searchTerm,
  allImageUrls,
  lightboxSlides,
  convertedReviews,
  onPageChange,
  onUpdateMetadata,
  onImageClick,
}: TProps): JSX.Element {
  const { selected, open, onOpen, onClose } = useLightbox(lightboxSlides);

  const handleImageClick = (images: string[], startIndex: number): void => {
    const imageUrl = images[startIndex];
    const globalIndex = allImageUrls.findIndex((img) => img === imageUrl);
    if (globalIndex !== -1) {
      onImageClick(imageUrl);
      onOpen(imageUrl);
    }
  };

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
          {convertedReviews.map((review) => (
            <TripAdvisorReviewCard
              key={review.id}
              review={review}
              searchTerm={searchTerm}
              onImageClick={handleImageClick}
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
        onClose={onClose}
        slides={lightboxSlides}
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
