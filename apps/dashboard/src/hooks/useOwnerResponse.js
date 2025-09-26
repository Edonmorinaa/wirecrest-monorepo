import { useState } from 'react';

export function useOwnerResponse() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const generateResponse = async (review, platform, customPrompt) => {
    setIsLoading(true);
    setError('');
    setGeneratedResponse('');

    try {
      // Import the appropriate server action based on platform
      let generateAction;
      
      switch (platform) {
        case 'GOOGLE':
          generateAction = (await import('src/actions/admin')).generateGoogleOwnerResponse;
          break;
        case 'FACEBOOK':
          generateAction = (await import('src/actions/admin')).generateFacebookOwnerResponse;
          break;
        case 'TRIPADVISOR':
          generateAction = (await import('src/actions/admin')).generateTripAdvisorOwnerResponse;
          break;
        case 'BOOKING':
          generateAction = (await import('src/actions/admin')).generateBookingOwnerResponse;
          break;
        default:
          generateAction = (await import('src/actions/admin')).generateOwnerResponseAction;
      }

      // Prepare review data
      const reviewData = {
        text: review.text || review.reviewText || '',
        rating: review.rating || review.stars || 0,
        reviewerName: review.reviewerName || review.name || '',
        businessName: review.businessName || '',
        platform: platform,
        reviewDate: review.publishedDate || review.reviewDate || review.publishedAtDate,
        reviewUrl: review.reviewUrl || '',
        additionalContext: review.additionalContext || '',
      };

      // Call the appropriate action
      let response;
      if (platform === 'GOOGLE' || platform === 'FACEBOOK' || platform === 'TRIPADVISOR' || platform === 'BOOKING') {
        response = await generateAction({ reviewData, customPrompt });
      } else {
        response = await generateAction({ 
          reviewData, 
          customPrompt,
          tone: 'professional',
          language: 'English'
        });
      }

      setGeneratedResponse(response);
      showSnackbar('Owner response generated successfully!', 'success');
    } catch (err) {
      console.error('Error generating owner response:', err);
      const errorMessage = err.message || 'Failed to generate owner response';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setIsLoading(false);
    setGeneratedResponse('');
    setError('');
  };

  return {
    isLoading,
    generatedResponse,
    error,
    generateResponse,
    reset,
    snackbar,
    hideSnackbar
  };
}
