import { useState } from 'react';
import { Button, Card, CardContent, Typography, Box, Snackbar, Alert } from '@mui/material';
import { OwnerResponseModal } from './owner-response-modal';
import { useOwnerResponse } from 'src/hooks/useOwnerResponse';

export function TestOwnerResponse() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isLoading, generatedResponse, error, generateResponse, reset, snackbar, hideSnackbar } = useOwnerResponse();

  const sampleReview = {
    id: 'test-1',
    text: 'Amazing service! The staff was very friendly and the food was delicious. I would definitely recommend this place to anyone looking for a great dining experience.',
    rating: 5,
    reviewerName: 'John Doe',
    businessName: 'Sample Restaurant',
    publishedDate: '2024-01-15',
    reviewUrl: 'https://example.com/review/1',
    stars: 5,
    name: 'John Doe',
    publishedAtDate: '2024-01-15',
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    reset();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const handleGenerateResponse = async () => {
    await generateResponse(sampleReview, 'GOOGLE');
  };

  return (
    <>
      <Card sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Owner Response Generator Test (Perplexity AI)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This is a test component to demonstrate the owner response generation functionality using Perplexity AI with Sonar Pro model.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Sample Review:
            </Typography>
            <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              "{sampleReview.text}"
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              By {sampleReview.reviewerName} • Rating: {sampleReview.rating}/5 • {sampleReview.publishedDate}
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={handleOpenModal}
            startIcon={<span>🧪</span>}
          >
            Test Owner Response Generation
          </Button>

          <OwnerResponseModal
            open={isModalOpen}
            onClose={handleCloseModal}
            review={sampleReview}
            generatedResponse={generatedResponse}
            isLoading={isLoading}
            error={error}
            onGenerateResponse={handleGenerateResponse}
            platform="GOOGLE"
          />
        </CardContent>
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={hideSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
