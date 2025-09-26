import { useState } from 'react';

import { TripAdvisorOwnerResponseModal } from 'src/components/owner-response-modal';

import { ReviewData, DynamicReviewCard } from '../dynamic-review-card';

// ----------------------------------------------------------------------

export interface TripAdvisorReviewCardProps {
  review: ReviewData;
  searchTerm?: string;
  onImageClick?: (images: string[], startIndex: number) => void;
  onUpdateMetadata?: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
  onRespond?: (review: ReviewData) => void;
  showGenerateAIReply?: boolean;
}

export function TripAdvisorReviewCard({
  review,
  searchTerm,
  onImageClick,
  onUpdateMetadata,
  onRespond,
  showGenerateAIReply = true,
}: TripAdvisorReviewCardProps) {
  // Owner response modal state
  const [selectedReview, setSelectedReview] = useState<ReviewData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGenerateResponse = (reviewData: ReviewData) => {
    setSelectedReview(reviewData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  return (
    <>
      <DynamicReviewCard
        review={review}
        platform="TRIPADVISOR"
        searchTerm={searchTerm}
        onImageClick={onImageClick}
        onUpdateMetadata={onUpdateMetadata}
        onGenerateResponse={handleGenerateResponse}
        onRespond={onRespond}
        showGenerateAIReply={showGenerateAIReply}
      />

      {/* Owner Response Modal */}
      <TripAdvisorOwnerResponseModal
        open={isModalOpen}
        onClose={handleCloseModal}
        review={selectedReview}
      />
    </>
  );
}
