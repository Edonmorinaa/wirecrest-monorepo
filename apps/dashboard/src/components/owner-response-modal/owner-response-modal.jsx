import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Divider,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';

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

// Platform icons mapping
const getPlatformIcon = (platform) => {
  switch (platform) {
    case 'GOOGLE':
      return 'logos:google-icon';
    case 'FACEBOOK':
      return 'logos:facebook';
    case 'TRIPADVISOR':
      return 'simple-icons:tripadvisor';
    case 'BOOKING':
      return 'simple-icons:bookingdotcom';
    default:
      return 'mdi:web';
  }
};

const getPlatformColor = (platform) => {
  switch (platform) {
    case 'GOOGLE':
      return 'primary';
    case 'FACEBOOK':
      return 'info';
    case 'TRIPADVISOR':
      return 'success';
    case 'BOOKING':
      return 'warning';
    default:
      return 'default';
  }
};

export function OwnerResponseModal({
  open,
  onClose,
  review,
  generatedResponse,
  isLoading,
  error,
  onGenerateResponse,
  platform,
}) {
  const [copied, setCopied] = useState(false);

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

  const formatDate = (dateString) => {
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

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <Iconify icon="solar:chat-round-dots-bold" />
          <Typography variant="h6">Generate Owner Response</Typography>
          {platform && (
            <Chip
              icon={<Iconify icon={getPlatformIcon(platform)} />}
              label={platform}
              color={getPlatformColor(platform)}
              size="small"
            />
          )}
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
                  {review?.reviewerName || 'Anonymous'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(review?.publishedDate || review?.reviewDate)}
                </Typography>
              </Box>
              {review?.rating && (
                <Chip
                  label={`${review.rating}/5`}
                  color="primary"
                  size="small"
                  icon={<Iconify icon="solar:star-bold" />}
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
              {review?.text || review?.reviewText || 'No review text available'}
            </Typography>

            {/* Review URL */}
            {review?.reviewUrl && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:link-bold" />}
                onClick={handleOpenReviewUrl}
                sx={{ alignSelf: 'flex-start' }}
              >
                View Original Review
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
            <LoadingScreen />
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
                  textAlign: 'right' 
                }}
              >
                Copied to clipboard!
              </Typography>
            )}
          </StyledResponseBox>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Click "Generate Response" to create an AI-powered owner response
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
            startIcon={<Iconify icon="solar:magic-stick-bold" />}
            disabled={isLoading}
          >
            Generate Response
          </Button>
        )}
        {generatedResponse && (
          <Button
            onClick={handleCopyResponse}
            variant="contained"
            startIcon={<Iconify icon="solar:copy-bold" />}
            color={copied ? 'success' : 'primary'}
          >
            {copied ? 'Copied!' : 'Copy Response'}
          </Button>
        )}
      </DialogActions>
    </StyledDialog>
  );
}

OwnerResponseModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  review: PropTypes.object,
  generatedResponse: PropTypes.string,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onGenerateResponse: PropTypes.func.isRequired,
  platform: PropTypes.oneOf(['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING']),
};
