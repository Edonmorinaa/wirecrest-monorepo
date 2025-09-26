import { format } from 'date-fns';
import { Star, MessageSquare, Mail, Camera, Reply, StarIcon } from 'lucide-react';

import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Skeleton,
  Alert,
  Button,
  Stack,
  Pagination,
  Divider,
  SxProps,
  Theme,
} from '@mui/material';

import { UnifiedReview } from 'src/hooks/use-inbox-reviews';

// ----------------------------------------------------------------------

interface InboxListProps {
  reviews: UnifiedReview[];
  selectedReview: UnifiedReview | null;
  onSelectReview: (review: UnifiedReview) => void;
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  onPageChange: (event: React.ChangeEvent<unknown>, page: number) => void;
  sx?: SxProps<Theme>;
}

// Platform Icon Component
const PlatformIcon = ({ platform }: { platform: string }) => {
  const iconProps = { size: 16 };

  switch (platform) {
    case 'google':
      return (
        <Box
          component="img"
          src="/assets/icons/platforms/google.svg"
          alt="Google"
          sx={{ width: 16, height: 16 }}
        />
      );
    case 'facebook':
      return (
        <Box
          component="img"
          src="/assets/icons/platforms/facebook.svg"
          alt="Facebook"
          sx={{ width: 16, height: 16 }}
        />
      );
    case 'tripadvisor':
      return (
        <Box
          component="img"
          src="/assets/icons/platforms/tripadvisor.svg"
          alt="TripAdvisor"
          sx={{ width: 16, height: 16 }}
        />
      );
    case 'booking':
      return (
        <Box
          component="img"
          src="/assets/icons/platforms/booking.svg"
          alt="Booking.com"
          sx={{ width: 16, height: 16 }}
        />
      );
    default:
      return <MessageSquare {...iconProps} />;
  }
};

const ReviewListItem = ({
  review,
  isSelected,
  onSelect,
}: {
  review: UnifiedReview;
  isSelected: boolean;
  onSelect: (review: UnifiedReview) => void;
}) => {
  const formatDate = (date: string) => format(new Date(date), 'MMM d, yyyy');

  const getSentimentColor = (sentiment?: number) => {
    if (!sentiment) return 'default';
    if (sentiment > 0.1) return 'success';
    if (sentiment < -0.1) return 'error';
    return 'warning';
  };

  const getSentimentEmoji = (sentiment?: number) => {
    if (!sentiment) return '😐';
    if (sentiment > 0.1) return '😊';
    if (sentiment < -0.1) return '😞';
    return '😐';
  };

  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={isSelected}
        onClick={() => onSelect(review)}
        sx={{
          borderLeft: isSelected ? 4 : 0,
          borderLeftColor: isSelected ? 'primary.main' : 'transparent',
          bgcolor: !review.isRead ? 'action.hover' : 'transparent',
          '&:hover': {
            bgcolor: 'action.selected',
          },
        }}
      >
        <ListItemAvatar>
          <Avatar src={review.authorImage} alt={review.author} sx={{ width: 40, height: 40 }}>
            {review.author.charAt(0).toUpperCase()}
          </Avatar>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle2" noWrap>
                {review.author}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    style={{
                      color: i < review.rating ? '#ffc107' : '#e0e0e0',
                      fill: i < review.rating ? '#ffc107' : 'transparent',
                    }}
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                ({review.rating})
              </Typography>
            </Box>
          }
          secondary={
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: 1,
                }}
              >
                {review.text || 'No review text'}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(review.date)}
                </Typography>

                <PlatformIcon platform={review.platform} />

                {review.sentiment && (
                  <Chip
                    size="small"
                    label={getSentimentEmoji(review.sentiment)}
                    color={getSentimentColor(review.sentiment)}
                    variant="outlined"
                    sx={{ minWidth: 'auto', px: 0.5 }}
                  />
                )}

                {review.images && review.images.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Camera size={12} />
                    <Typography variant="caption" color="text.secondary">
                      {review.images.length}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          }
        />

        {/* Status Indicators */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          {!review.isRead && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
              }}
            />
          )}
          {review.isImportant && (
            <StarIcon size={16} style={{ color: '#ffc107', fill: '#ffc107' }} />
          )}
          {review.hasReply && <Reply size={16} style={{ color: '#4caf50' }} />}
        </Box>
      </ListItemButton>
    </ListItem>
  );
};

export function InboxList({
  reviews,
  selectedReview,
  onSelectReview,
  isLoading,
  isError,
  onRefresh,
  pagination,
  onPageChange,
  sx,
}: InboxListProps) {
  // Calculate review range for display
  const getReviewRange = () => {
    if (pagination.total === 0) return '0 of 0';
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `${start}-${end} of ${pagination.total}`;
  };

  if (isLoading) {
    return (
      <Card sx={sx}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Reviews
          </Typography>
          <Stack spacing={1}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={80} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card sx={sx}>
        <CardContent>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={onRefresh}>
                Retry
              </Button>
            }
          >
            Error loading reviews. Please try again.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card sx={sx}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Mail size={48} style={{ color: '#9e9e9e', marginBottom: 16 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No reviews found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No reviews match your current filters
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={sx}>
      <CardContent sx={{ p: 0 }}>
        {/* Header with count and pagination */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">Reviews ({reviews.length})</Typography>
            <Typography variant="body2" color="text.secondary">
              {getReviewRange()}
            </Typography>
          </Box>

          {/* Top Pagination */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={onPageChange}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>

        {/* Reviews List */}
        <Box sx={{ maxHeight: { xs: '60vh', lg: '70vh' }, overflow: 'auto' }}>
          <List disablePadding>
            {reviews.map((review) => (
              <ReviewListItem
                key={review.id}
                review={review}
                isSelected={selectedReview?.id === review.id}
                onSelect={onSelectReview}
              />
            ))}
          </List>
        </Box>

        {/* Bottom Pagination */}
        {pagination.totalPages > 1 && (
          <>
            <Divider />
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={onPageChange}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
