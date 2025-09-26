import { useState, useEffect } from 'react';
import { X, Bot, Send, AlertCircle } from 'lucide-react';

import {
  Box,
  Alert,
  Stack,
  Button,
  Dialog,
  TextField,
  IconButton,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import { UnifiedReview } from 'src/hooks/use-inbox-reviews';

// ----------------------------------------------------------------------

interface ReplyModalProps {
  open: boolean;
  onClose: () => void;
  review: UnifiedReview | null;
  onSendReply: (replyText: string) => void;
  isSubmitting?: boolean;
}

export function ReplyModal({
  open,
  onClose,
  review,
  onSendReply,
  isSubmitting = false,
}: ReplyModalProps) {
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize with generated reply if available
  useEffect(() => {
    if (review?.generatedReply) {
      setReplyText(review.generatedReply);
    } else if (review?.replyText) {
      // If editing an existing reply
      setReplyText(review.replyText);
    } else {
      setReplyText('');
    }
    // Clear error when review changes
    setError(null);
  }, [review?.generatedReply, review?.replyText]);

  const handleSend = async () => {
    if (!replyText.trim()) {
      setError('Please enter a reply message');
      return;
    }

    setError(null);
    try {
      await onSendReply(replyText.trim());
      // Modal will be closed by parent component
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply. Please try again.');
    }
  };

  const handleClose = () => {
    setReplyText('');
    setError(null);
    onClose();
  };

  if (!review) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bot size={20} />
            <Typography variant="h6">Reply to {review.author}</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Original Review */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Original Review:
            </Typography>
            <Alert severity="info" sx={{ bgcolor: 'grey.50' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {review.text || 'No review text available'}
              </Typography>
            </Alert>
          </Box>

          {/* Reply Text Field */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Your Reply:
            </Typography>
            <TextField
              multiline
              rows={8}
              fullWidth
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply here..."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                },
              }}
            />

            {/* Error display */}
            {error && (
              <Alert severity="error" icon={<AlertCircle size={20} />}>
                <Typography variant="body2">{error}</Typography>
              </Alert>
            )}
          </Box>

          {/* Platform-specific tips */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Tips for {review.platform} replies:
            </Typography>
            <Alert severity="info" sx={{ bgcolor: 'info.light' }}>
              <Typography variant="body2">
                {review.platform === 'google' &&
                  'Google reviews are highly visible. Keep responses professional and helpful.'}
                {review.platform === 'facebook' &&
                  'Facebook is social - you can be slightly more personal while staying professional.'}
                {review.platform === 'tripadvisor' &&
                  'TripAdvisor users expect detailed responses. Address specific aspects mentioned.'}
                {review.platform === 'booking' &&
                  'Focus on accommodation experience. Mention specific amenities or improvements.'}
              </Typography>
            </Alert>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          startIcon={
            isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />
          }
          disabled={!replyText.trim() || isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send Reply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
