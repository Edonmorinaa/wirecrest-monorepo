import { useState } from 'react';

import { trpc } from 'src/lib/trpc/client';

/**
 * Hook for generating AI owner responses to reviews
 * Migrated to use tRPC instead of direct server action imports
 */
export function useOwnerResponse() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // tRPC mutations for generating responses
  const googleResponseMutation = trpc.ai.generateGoogleResponse.useMutation();
  const facebookResponseMutation = trpc.ai.generateFacebookResponse.useMutation();
  const tripadvisorResponseMutation = trpc.ai.generateTripAdvisorResponse.useMutation();
  const bookingResponseMutation = trpc.ai.generateBookingResponse.useMutation();
  const genericResponseMutation = trpc.ai.generateResponse.useMutation();

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
      // Prepare review data
      const reviewData = {
        text: review.text || review.reviewText || '',
        rating: review.rating || review.stars || 0,
        reviewerName: review.reviewerName || review.name || '',
        businessName: review.businessName || '',
        platform,
        reviewDate: review.publishedDate || review.reviewDate || review.publishedAtDate,
        reviewUrl: review.reviewUrl || '',
        additionalContext: review.additionalContext || '',
      };

      let response;

      // Call the appropriate tRPC mutation based on platform
      switch (platform) {
        case 'GOOGLE':
          response = await googleResponseMutation.mutateAsync({ reviewData, customPrompt });
          break;
        case 'FACEBOOK':
          response = await facebookResponseMutation.mutateAsync({ reviewData, customPrompt });
          break;
        case 'TRIPADVISOR':
          response = await tripadvisorResponseMutation.mutateAsync({ reviewData, customPrompt });
          break;
        case 'BOOKING':
          response = await bookingResponseMutation.mutateAsync({ reviewData, customPrompt });
          break;
        default:
          response = await genericResponseMutation.mutateAsync({ 
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
