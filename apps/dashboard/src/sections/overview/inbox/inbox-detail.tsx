import { useState } from 'react';
import { format } from 'date-fns';
import {
  Bot,
  Eye,
  Mail,
  Star,
  Reply,
  EyeOff,
  StarIcon,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

import {
  Box,
  Card,
  Chip,
  Grid,
  Alert,
  Stack,
  Theme,
  Avatar,
  Button,
  SxProps,
  Snackbar,
  IconButton,
  Typography,
  CardContent,
  CircularProgress,
} from '@mui/material';

import { UnifiedReview } from 'src/hooks/use-inbox-reviews';

// ----------------------------------------------------------------------

interface InboxDetailProps {
  review: UnifiedReview | null;
  onUpdateStatus: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
  onOpenReplyModal: (review: UnifiedReview) => void;
  sx?: SxProps<Theme>;
}

// Platform Icon Component
const PlatformIcon = ({ platform }: { platform: string }) => {
  const iconProps = { size: 20 };

  switch (platform) {
    case 'google':
      return (
        <Box
          component="img"
          src="/assets/icons/platforms/google.svg"
          alt="Google"
          sx={{ width: 20, height: 20 }}
        />
      );
    case 'facebook':
      return (
        <Box
          component="img"
          src="/assets/icons/platforms/facebook.svg"
          alt="Facebook"
          sx={{ width: 20, height: 20 }}
        />
      );
    case 'tripadvisor':
      return (
        <Box
          component="img"
          src="/assets/icons/platforms/tripadvisor.svg"
          alt="TripAdvisor"
          sx={{ width: 20, height: 20 }}
        />
      );
    case 'booking':
      return (
        <Box
          component="img"
          src="/assets/icons/platforms/booking.svg"
          alt="Booking.com"
          sx={{ width: 20, height: 20 }}
        />
      );
    default:
      return <MessageSquare {...iconProps} />;
  }
};

export function InboxDetail({ review, onUpdateStatus, onOpenReplyModal, sx }: InboxDetailProps) {
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [generatedReply, setGeneratedReply] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleGenerateAIReply = async () => {
    if (!review) return;

    setIsGeneratingReply(true);
    setGeneratedReply(null);

    try {
      const reviewData = {
        text: review.text || '',
        rating: review.rating,
        reviewerName: review.author || 'Anonymous',
        businessName: 'our business', // This could be passed as a prop or from context
        reviewDate: review.date,
      };

      const response = await fetch('/api/ai/generate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewData,
          platform: review.platform,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate AI reply');
      }

      const data = await response.json();
      setGeneratedReply(data.reply);
      setSnackbarMessage('AI reply generated successfully!');
      setShowSnackbar(true);
    } catch (error) {
      console.error('Error generating AI reply:', error);
      setSnackbarMessage(`Error generating reply: ${error.message}`);
      setShowSnackbar(true);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleUseGeneratedReply = () => {
    if (generatedReply && review) {
      // Open reply modal with the generated reply
      const reviewWithGeneratedReply = { ...review, generatedReply };
      onOpenReplyModal(reviewWithGeneratedReply);
    }
  };

  const handleOpenReplyModal = () => {
    if (review) {
      onOpenReplyModal(review);
    }
  };

  if (!review) {
    return (
      <Card sx={sx}>
        <CardContent
          sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Mail size={64} style={{ color: '#9e9e9e', marginBottom: 16 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Select a review
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a review from the list to view details and take actions
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: string) => format(new Date(date), 'PPP');

  const getSentimentColor = (sentiment?: number) => {
    if (!sentiment) return 'default';
    if (sentiment > 0.1) return 'success';
    if (sentiment < -0.1) return 'error';
    return 'warning';
  };

  const getSentimentLabel = (sentiment?: number) => {
    if (!sentiment) return 'Unknown';
    if (sentiment > 0.1) return 'Positive';
    if (sentiment < -0.1) return 'Negative';
    return 'Neutral';
  };

  return (
    <Card sx={sx}>
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={review.authorImage} alt={review.author || 'Anonymous'} sx={{ width: 48, height: 48 }}>
                {(review.author || 'A').charAt(0).toUpperCase()}
              </Avatar>

              <Box>
                <Typography variant="h6" gutterBottom>
                  {review.author || 'Anonymous'}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        style={{
                          color: i < review.rating ? '#ffc107' : '#e0e0e0',
                          fill: i < review.rating ? '#ffc107' : 'transparent',
                        }}
                      />
                    ))}
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    ({review.rating})
                  </Typography>

                  <Chip
                    size="small"
                    label={review.platform}
                    variant="outlined"
                    icon={<PlatformIcon platform={review.platform} />}
                  />

                  {review.sentiment && (
                    <Chip
                      size="small"
                      label={getSentimentLabel(review.sentiment)}
                      color={getSentimentColor(review.sentiment)}
                    />
                  )}
                </Stack>
              </Box>
            </Box>

            <Stack direction="row" spacing={1}>
              <IconButton
                onClick={() => onUpdateStatus(review.id, 'isRead', !review.isRead)}
                color={review.isRead ? 'default' : 'primary'}
              >
                {review.isRead ? <EyeOff size={20} /> : <Eye size={20} />}
              </IconButton>

              <IconButton
                onClick={() => onUpdateStatus(review.id, 'isImportant', !review.isImportant)}
                color={review.isImportant ? 'warning' : 'default'}
              >
                <StarIcon
                  size={20}
                  style={{
                    color: review.isImportant ? '#ffc107' : '#9e9e9e',
                    fill: review.isImportant ? '#ffc107' : 'transparent',
                  }}
                />
              </IconButton>
            </Stack>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Review Text */}
            {review.text && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Review Text
                </Typography>
                <Alert severity="info" sx={{ bgcolor: 'grey.50' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {review.text}
                  </Typography>
                </Alert>
              </Box>
            )}

            {/* Images */}
            {review.images && review.images.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Images ({review.images.length})
                </Typography>
                <Grid container spacing={1}>
                  {review.images.map((image, index) => (
                    <Grid size={{ xs: 6, sm: 4 }} key={index}>
                      <Box
                        component="img"
                        src={image}
                        alt={`Review image ${index + 1}`}
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'divider',
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Keywords */}
            {review.keywords && review.keywords.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Keywords
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {review.keywords.map((keyword, index) => (
                    <Chip key={index} label={keyword} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}

            {/* AI Reply Generation */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                AI Reply Generation
              </Typography>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Bot size={20} />
                    <Typography variant="body2" color="text.secondary">
                      Generate a professional reply using AI for {review.platform} reviews
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    startIcon={
                      isGeneratingReply ? <CircularProgress size={16} /> : <Bot size={16} />
                    }
                    onClick={handleGenerateAIReply}
                    disabled={isGeneratingReply}
                    size="small"
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {isGeneratingReply ? 'Generating...' : 'Generate AI Reply'}
                  </Button>

                  {generatedReply && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Generated Reply:
                      </Typography>
                      <Alert severity="success" sx={{ bgcolor: 'success.light', mb: 2 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {generatedReply}
                        </Typography>
                      </Alert>
                      <Button
                        variant="contained"
                        startIcon={<Reply size={16} />}
                        onClick={handleUseGeneratedReply}
                        size="small"
                      >
                        Use This Reply
                      </Button>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* Reply */}
            {review.hasReply && review.replyText && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Your Reply
                </Typography>
                <Alert severity="success" sx={{ bgcolor: 'success.light' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {review.replyText}
                  </Typography>
                  {review.replyDate && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: 'block' }}
                    >
                      Replied on {formatDate(review.replyDate)}
                    </Typography>
                  )}
                </Alert>
              </Box>
            )}
          </Stack>
        </Box>

        {/* Actions */}
        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Reviewed on {formatDate(review.date)}
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<ExternalLink size={16} />} size="small">
                View Original
              </Button>

              <Button
                variant="contained"
                startIcon={<Reply size={16} />}
                size="small"
                onClick={handleOpenReplyModal}
              >
                {review.hasReply ? 'Edit Reply' : 'Reply'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </CardContent>

      {/* Snackbar for notifications */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        message={snackbarMessage}
      />
    </Card>
  );
}
