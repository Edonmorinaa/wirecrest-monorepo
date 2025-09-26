import { useState } from 'react';

import { alpha, styled } from '@mui/material/styles';
import {
  Box,
  Chip,
  Stack,
  Alert,
  Dialog,
  Button,
  Divider,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { ReviewData, PlatformType } from 'src/components/review-card';

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: 600,
    width: '100%',
  },
}));

const StyledResponseBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.primary.main, 0.04),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
  borderRadius: theme.shape.borderRadius,
  position: 'relative',
  marginTop: theme.spacing(2),
}));

const StyledReviewBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.grey[500], 0.04),
  border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
}));

const CopyButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
  },
}));

// Platform configuration for the modal
interface PlatformModalConfig {
  icon: string;
  color: 'primary' | 'info' | 'success' | 'warning' | 'default';
  name: string;
  buttonText: string;
  buttonIcon: string;
}

const PLATFORM_MODAL_CONFIGS: Record<PlatformType, PlatformModalConfig> = {
  GOOGLE: {
    icon: 'logos:google-icon',
    color: 'primary',
    name: 'Google',
    buttonText: 'View on Google',
    buttonIcon: 'logos:google-icon',
  },
  FACEBOOK: {
    icon: 'logos:facebook',
    color: 'info',
    name: 'Facebook',
    buttonText: 'View on Facebook',
    buttonIcon: 'logos:facebook',
  },
  TRIPADVISOR: {
    icon: 'simple-icons:tripadvisor',
    color: 'success',
    name: 'TripAdvisor',
    buttonText: 'View on TripAdvisor',
    buttonIcon: 'simple-icons:tripadvisor',
  },
  BOOKING: {
    icon: 'simple-icons:bookingdotcom',
    color: 'warning',
    name: 'Booking.com',
    buttonText: 'View on Booking.com',
    buttonIcon: 'simple-icons:bookingdotcom',
  },
  YELP: {
    icon: 'simple-icons:yelp',
    color: 'default',
    name: 'Yelp',
    buttonText: 'View on Yelp',
    buttonIcon: 'simple-icons:yelp',
  },
};

// Component props
export interface DynamicOwnerResponseModalProps {
  open: boolean;
  onClose: () => void;
  review: ReviewData | null;
  generatedResponse: string;
  isLoading: boolean;
  error: string;
  onGenerateResponse: () => void;
  platform: PlatformType;
}

// Helper function to format dates
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Unknown date';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
};

// Helper function to get rating display
const getRatingDisplay = (review: ReviewData): string | null => {
  if (review.stars) return `${review.stars}/5`;
  if (review.tripAdvisorRating) return `${review.tripAdvisorRating}/5`;
  if (review.bookingRating) return `${review.bookingRating}/10`;
  if (review.yelpRating) return `${review.yelpRating}/5`;
  return null;
};

export function DynamicOwnerResponseModal({
  open,
  onClose,
  review,
  generatedResponse,
  isLoading,
  error,
  onGenerateResponse,
  platform,
}: DynamicOwnerResponseModalProps) {
  const [copied, setCopied] = useState(false);
  const config = PLATFORM_MODAL_CONFIGS[platform];

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(generatedResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleOpenReviewUrl = () => {
    if (review?.reviewUrl) {
      window.open(review.reviewUrl, '_blank');
    }
  };

  const ratingDisplay = review ? getRatingDisplay(review) : null;

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <Iconify icon="solar:chat-round-dots-bold" className="" height={20} sx={{}} />
          <Typography variant="h6">Generate Owner Response</Typography>
          <Chip
            icon={<Iconify icon={config.icon} className="" height={16} sx={{}} />}
            label={config.name}
            color={config.color}
            size="small"
          />
        </Stack>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Original Review Section */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Original Review
        </Typography>

        <StyledReviewBox>
          <Stack spacing={2}>
            {/* Review Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {review?.name || 'Anonymous'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(review?.publishedAtDate)}
                </Typography>
              </Box>
              {ratingDisplay && (
                <Chip
                  label={ratingDisplay}
                  color="primary"
                  size="small"
                  icon={<Iconify icon="solar:star-bold" className="" height={16} sx={{}} />}
                />
              )}
            </Stack>

            {/* Review Title */}
            {review?.title && (
              <Typography variant="h6" gutterBottom>
                {review.title}
              </Typography>
            )}

            {/* Review Text */}
            <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
              {review?.text || 'No review text available'}
            </Typography>

            {/* Review URL */}
            {review?.reviewUrl && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Iconify icon={config.buttonIcon} className="" height={16} sx={{}} />}
                onClick={handleOpenReviewUrl}
                sx={{ alignSelf: 'flex-start' }}
              >
                {config.buttonText}
              </Button>
            )}
          </Stack>
        </StyledReviewBox>

        <Divider sx={{ my: 2 }} />

        {/* Generated Response Section */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Generated Owner Response
        </Typography>

        {isLoading ? (
          <Box sx={{ py: 4 }}>
            <LoadingScreen portal={false} slots={{}} slotsProps={{}} sx={{}} />
          </Box>
        ) : generatedResponse ? (
          <StyledResponseBox>
            <CopyButton
              onClick={handleCopyResponse}
              size="small"
              color={copied ? 'success' : 'default'}
            >
              <Iconify
                icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'}
                className=""
                height={16}
                sx={{}}
              />
            </CopyButton>

            <Typography variant="body1" sx={{ lineHeight: 1.6, pr: 6 }}>
              {generatedResponse}
            </Typography>

            {copied && (
              <Typography
                variant="caption"
                color="success.main"
                sx={{
                  display: 'block',
                  mt: 1,
                  textAlign: 'right',
                }}
              >
                Copied to clipboard!
              </Typography>
            )}
          </StyledResponseBox>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Click &quot;Generate Response&quot; to create an AI-powered owner response
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        {!generatedResponse && !isLoading && (
          <Button
            onClick={onGenerateResponse}
            variant="contained"
            startIcon={<Iconify icon="solar:magic-stick-bold" className="" height={16} sx={{}} />}
            disabled={isLoading}
          >
            Generate Response
          </Button>
        )}
        {generatedResponse && (
          <Button
            onClick={handleCopyResponse}
            variant="contained"
            startIcon={<Iconify icon="solar:copy-bold" className="" height={16} sx={{}} />}
            color={copied ? 'success' : 'primary'}
          >
            {copied ? 'Copied!' : 'Copy Response'}
          </Button>
        )}
      </DialogActions>
    </StyledDialog>
  );
}
