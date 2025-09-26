import { format } from 'date-fns';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// Import platform types and configurations from @wirecrest/core
import { 
  PlatformType, 
  PlatformConfig, 
  PLATFORM_CONFIGS 
} from '@wirecrest/core';

// Review data interface
export interface ReviewData {
  id: string;
  name: string;
  text?: string;
  publishedAtDate: string;
  responseFromOwnerText?: string;
  responseFromOwnerDate?: string;
  reviewerPhotoUrl?: string;
  reviewUrl: string;
  reviewImageUrls?: string[];
  reviewMetadata?: {
    isRead: boolean;
    isImportant: boolean;
    sentiment?: number;
    keywords?: string[];
  };

  // Platform-specific fields
  // Google
  stars?: number;
  reviewerNumberOfReviews?: number;
  isLocalGuide?: boolean;
  visitedIn?: string;
  googleLikesCount?: number;

  // Facebook
  isRecommended?: boolean;
  facebookLikesCount?: number;
  commentsCount?: number;
  photos?: Array<{ id: string; url: string }>;
  tags?: string[];

  // TripAdvisor
  tripAdvisorRating?: number;
  title?: string;

  // Booking
  bookingRating?: number;
  isVerifiedStay?: boolean;

  // Yelp
  yelpRating?: number;
}

// Component props
export interface DynamicReviewCardProps {
  review: ReviewData;
  platform: PlatformType;
  searchTerm?: string;
  onImageClick?: (images: string[], startIndex: number) => void;
  onUpdateMetadata?: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
  onGenerateResponse?: (review: ReviewData) => void;
  onRespond?: (review: ReviewData) => void;
  showGenerateAIReply?: boolean;
}

// Helper functions
const getSentimentLabel = (sentiment: number): string => {
  if (sentiment >= 0.1) return 'Positive';
  if (sentiment <= -0.1) return 'Negative';
  return 'Neutral';
};

const getSentimentColor = (sentiment: number): 'success' | 'error' | 'default' => {
  if (sentiment >= 0.1) return 'success';
  if (sentiment <= -0.1) return 'error';
  return 'default';
};

const highlightSearchTerms = (text: string, searchQuery?: string, theme?: any) => {
  if (!searchQuery || !text) return text;

  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <Box
        key={index}
        component="mark"
        sx={{
          bgcolor: alpha(theme.palette.warning.main, 0.2),
          color: theme.palette.warning.dark,
          px: 0.5,
          borderRadius: 0.5,
        }}
      >
        {part}
      </Box>
    ) : (
      part
    )
  );
};

// Rating component factory
const renderRating = (review: ReviewData, config: PlatformConfig, theme: any) => {
  switch (config.ratingType) {
    case 'stars': {
      const rating = review.stars || review.tripAdvisorRating || review.yelpRating || 0;
      return (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Stack direction="row" spacing={0.5}>
            {[...Array(config.maxRating || 5)].map((_, i) => (
              <Iconify
                key={i}
                icon="solar:star-bold"
                className=""
                height={16}
                sx={{
                  color: i < rating ? theme.palette.warning.main : theme.palette.grey[300],
                  fontSize: 16,
                }}
              />
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            ({rating}/{config.maxRating || 5})
          </Typography>
        </Stack>
      );
    }

    case 'recommendation':
      return (
        <Chip
          label={
            review.isRecommended
              ? config.recommendationLabels?.positive
              : config.recommendationLabels?.negative
          }
          size="small"
          color={review.isRecommended ? 'success' : 'error'}
          variant="outlined"
          icon={
            <Iconify
              icon={review.isRecommended ? 'solar:thumb-up-bold' : 'solar:thumb-down-bold'}
              className=""
              height={16}
              sx={{}}
            />
          }
        />
      );

    case 'numeric': {
      const rating = review.bookingRating || 0;
      return (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" color="primary">
            {rating}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            /{config.maxRating}
          </Typography>
        </Stack>
      );
    }

    default:
      return null;
  }
};

// Main component
export function DynamicReviewCard({
  review,
  platform,
  searchTerm,
  onImageClick,
  onUpdateMetadata,
  onGenerateResponse,
  onRespond,
  showGenerateAIReply = true,
}: DynamicReviewCardProps) {
  const theme = useTheme();
  const config = PLATFORM_CONFIGS[platform];

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme.shadows[2],
          borderColor: theme.palette.primary.main,
        },
      }}
    >
      <Stack spacing={2}>
        {/* Review Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={review.reviewerPhotoUrl} alt={review.name} sx={{ width: 40, height: 40 }}>
              <Iconify icon="solar:user-bold" className="" height={20} sx={{}} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {highlightSearchTerms(review.name, searchTerm, theme)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(review.publishedAtDate), 'MMM dd, yyyy')}
              </Typography>
            </Box>

            {/* Platform-specific badges */}
            {config.hasLocalGuide && review.isLocalGuide && (
              <Chip
                label="Local Guide"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}

            {review.isVerifiedStay && (
              <Chip
                label="Verified Stay"
                size="small"
                color="info"
                variant="outlined"
                icon={<Iconify icon="solar:shield-check-bold" className="" height={16} sx={{}} />}
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            {onUpdateMetadata && (
              <>
                <Tooltip title={review.reviewMetadata?.isRead ? 'Mark as unread' : 'Mark as read'}>
                  <IconButton
                    size="small"
                    onClick={() =>
                      onUpdateMetadata(review.id, 'isRead', !review.reviewMetadata?.isRead)
                    }
                  >
                    <Iconify
                      icon={review.reviewMetadata?.isRead ? 'eva:eye-off-fill' : 'eva:eye-fill'}
                      className=""
                      height={20}
                      sx={{
                        color: review.reviewMetadata?.isRead ? 'text.disabled' : 'primary.main',
                      }}
                    />
                  </IconButton>
                </Tooltip>

                <Tooltip
                  title={
                    review.reviewMetadata?.isImportant
                      ? 'Remove from important'
                      : 'Mark as important'
                  }
                >
                  <IconButton
                    size="small"
                    onClick={() =>
                      onUpdateMetadata(
                        review.id,
                        'isImportant',
                        !review.reviewMetadata?.isImportant
                      )
                    }
                  >
                    <Iconify
                      icon="eva:star-fill"
                      className=""
                      height={20}
                      sx={{
                        color: review.reviewMetadata?.isImportant
                          ? 'warning.main'
                          : 'text.disabled',
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        </Stack>

        {/* Rating */}
        {renderRating(review, config, theme)}

        {/* Additional Info Row */}
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          {config.hasReviewerStats && review.reviewerNumberOfReviews && (
            <Typography variant="body2" color="text.secondary">
              • {review.reviewerNumberOfReviews} reviews
            </Typography>
          )}

          {config.hasVisitedIn && review.visitedIn && (
            <Typography variant="body2" color="text.secondary">
              • Visited in {highlightSearchTerms(review.visitedIn, searchTerm, theme)}
            </Typography>
          )}
        </Stack>

        {/* Review Title (for platforms that have it) */}
        {review.title && (
          <Typography variant="subtitle1" fontWeight={600}>
            {highlightSearchTerms(review.title, searchTerm, theme)}
          </Typography>
        )}

        {/* Review Text */}
        {review.text && (
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            {highlightSearchTerms(review.text, searchTerm, theme)}
          </Typography>
        )}

        {/* Review Images */}
        {(review.reviewImageUrls || review.photos) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Review Images ({(review.reviewImageUrls || review.photos)?.length})
            </Typography>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
              {(review.reviewImageUrls || review.photos?.map((p) => p.url) || []).map(
                (url, imageIndex) => (
                  <Box
                    key={imageIndex}
                    sx={{
                      minWidth: 80,
                      height: 80,
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: `2px solid ${theme.palette.divider}`,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        transform: 'scale(1.05)',
                      },
                    }}
                    onClick={() =>
                      onImageClick?.(
                        review.reviewImageUrls || review.photos?.map((p) => p.url) || [],
                        imageIndex
                      )
                    }
                  >
                    <img
                      src={url}
                      alt={`Review image ${imageIndex + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                )
              )}
            </Stack>
          </Box>
        )}

        {/* Tags (Facebook specific) */}
        {review.tags && review.tags.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {review.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={highlightSearchTerms(tag, searchTerm, theme)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Keywords */}
        {review.reviewMetadata?.keywords && review.reviewMetadata.keywords.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Keywords
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {review.reviewMetadata.keywords.slice(0, 5).map((keyword, index) => (
                <Chip
                  key={index}
                  label={highlightSearchTerms(keyword, searchTerm, theme)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Owner Response */}
        {review.responseFromOwnerText && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: theme.palette.grey[50],
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Iconify
                icon="solar:building-2-bold"
                className=""
                height={20}
                sx={{ color: 'text.secondary' }}
              />
              <Typography variant="caption" fontWeight={600}>
                Response from owner
              </Typography>
              {review.responseFromOwnerDate && (
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(review.responseFromOwnerDate), 'MMM dd, yyyy')}
                </Typography>
              )}
            </Stack>
            <Typography variant="body2">
              {highlightSearchTerms(review.responseFromOwnerText, searchTerm, theme)}
            </Typography>
          </Box>
        )}

        {/* Engagement Metrics (Facebook specific) */}
        {config.hasEngagementMetrics && (review.facebookLikesCount || review.commentsCount) && (
          <Stack direction="row" spacing={3} alignItems="center">
            {review.facebookLikesCount && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="mdi:thumb-up" className="" width={16} height={16} sx={{}} />
                <Typography variant="body2">{review.facebookLikesCount} likes</Typography>
              </Stack>
            )}

            {review.commentsCount && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="mdi:comment" className="" width={16} height={16} sx={{}} />
                <Typography variant="body2">{review.commentsCount} comments</Typography>
              </Stack>
            )}
          </Stack>
        )}

        {/* Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Platform Icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Iconify
                icon={config.icon}
                className=""
                height={16}
                sx={{ color: 'text.secondary' }}
              />
              <Typography variant="caption" color="text.secondary">
                {config.name}
              </Typography>
            </Box>

            {/* Metadata Badges */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {review.reviewMetadata?.sentiment !== undefined && (
                <Chip
                  label={getSentimentLabel(review.reviewMetadata.sentiment)}
                  size="small"
                  color={getSentimentColor(review.reviewMetadata.sentiment)}
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
              {review.reviewMetadata?.isImportant && (
                <Chip
                  label="Important"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
              {!review.reviewMetadata?.isRead && (
                <Chip
                  label="Unread"
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon={config.buttonIcon} className="" height={20} sx={{}} />}
              href={review.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {config.buttonText}
            </Button>

            {showGenerateAIReply && onGenerateResponse && (
              <Button
                variant="contained"
                size="small"
                startIcon={
                  <Iconify icon="solar:magic-stick-bold" className="" height={20} sx={{}} />
                }
                onClick={() => onGenerateResponse(review)}
              >
                Generate AI Reply
              </Button>
            )}

            {onRespond && !review.responseFromOwnerText && (
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  <Iconify icon="eva:corner-up-left-fill" className="" height={20} sx={{}} />
                }
                onClick={() => onRespond(review)}
              >
                Respond
              </Button>
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
