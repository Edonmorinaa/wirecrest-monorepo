import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { useOwnerResponse } from 'src/hooks/useOwnerResponse';

import { ReviewData } from 'src/components/review-card';

import { DynamicOwnerResponseModal } from '../dynamic-owner-response-modal';

// ----------------------------------------------------------------------

export interface GoogleOwnerResponseModalProps {
  open: boolean;
  onClose: () => void;
  review: ReviewData | null;
}

export function GoogleOwnerResponseModal({ open, onClose, review }: GoogleOwnerResponseModalProps) {
  const {
    isLoading: isGenerating,
    generatedResponse,
    error,
    generateResponse,
    reset,
    snackbar,
    hideSnackbar,
  } = useOwnerResponse();

  const handleClose = () => {
    onClose();
    reset();
  };

  const handleGenerateResponse = async () => {
    if (review) {
      await generateResponse(review, 'GOOGLE');
    }
  };

  return (
    <>
      <DynamicOwnerResponseModal
        open={open}
        onClose={handleClose}
        review={review}
        generatedResponse={generatedResponse}
        isLoading={isGenerating}
        error={error}
        onGenerateResponse={handleGenerateResponse}
        platform="GOOGLE"
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={hideSnackbar} severity={snackbar.severity as any} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
