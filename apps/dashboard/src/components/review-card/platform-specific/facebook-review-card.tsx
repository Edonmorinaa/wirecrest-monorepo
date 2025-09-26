import { useState } from 'react';

import { FacebookOwnerResponseModal } from 'src/components/owner-response-modal';

import { ReviewData, DynamicReviewCard } from '../dynamic-review-card';

// ----------------------------------------------------------------------

export interface FacebookReviewCardProps {
  review: ReviewData;
  searchTerm?: string;
  onImageClick?: (images: string[], startIndex: number) => void;
  onUpdateMetadata?: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
  onRespond?: (review: ReviewData) => void;
  showGenerateAIReply?: boolean;
}

export function FacebookReviewCard({
  review,
  searchTerm,
  onImageClick,
  onUpdateMetadata,
  onRespond,
  showGenerateAIReply = true,
}: FacebookReviewCardProps) {
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
        platform="FACEBOOK"
        searchTerm={searchTerm}
        onImageClick={onImageClick}
        onUpdateMetadata={onUpdateMetadata}
        onGenerateResponse={handleGenerateResponse}
        onRespond={onRespond}
        showGenerateAIReply={showGenerateAIReply}
      />

      {/* Owner Response Modal */}
      <FacebookOwnerResponseModal
        open={isModalOpen}
        onClose={handleCloseModal}
        review={selectedReview}
      />
    </>
  );
}
