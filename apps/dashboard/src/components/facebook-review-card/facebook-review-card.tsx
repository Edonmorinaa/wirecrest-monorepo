import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface FacebookReviewCardProps {
  review: {
    id: string;
    userName: string;
    userProfilePic?: string;
    text?: string;
    date: string;
    isRecommended: boolean;
    likesCount: number;
    commentsCount: number;
    tags: string[];
    photos?: string[];
    reviewMetadata?: {
      isRead: boolean;
      isImportant: boolean;
      sentiment?: number;
      keywords?: string[];
    };
  };
  searchTerm?: string;
  onImageClick: (images: string[], startIndex: number) => void;
  onUpdateMetadata: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
  onGenerateResponse?: (review: any) => void;
}

export function FacebookReviewCard({
  review,
  searchTerm,
  onImageClick,
  onUpdateMetadata,
  onGenerateResponse,
}: FacebookReviewCardProps) {
  const theme = useTheme();

  const highlightSearchTerms = (text: string, searchTermParam?: string) => {
    if (!searchTermParam || !text) return text;

    const regex = new RegExp(`(${searchTermParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
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

  const getCardSentimentColor = (sentiment?: number) => {
    if (!sentiment) return 'default';
    if (sentiment > 0.1) return 'success';
    if (sentiment < -0.1) return 'error';
    return 'warning';
  };

  const getCardSentimentLabel = (sentiment?: number) => {
    if (!sentiment) return 'Unknown';
    if (sentiment > 0.1) return 'Positive';
    if (sentiment < -0.1) return 'Negative';
    return 'Neutral';
  };

  return (
    <Card
      sx={{
        transition: 'all 0.2s',
        '&:hover': { boxShadow: theme.shadows[8] },
        minHeight: 'auto',
        width: '100%',
        position: 'relative',
        display: 'block',
        mb: 0,
      }}
    >
      <CardContent sx={{ p: 3, position: 'relative' }}>
        <Stack spacing={2}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Avatar
              src={review.userProfilePic}
              alt={review.userName}
              sx={{ width: 48, height: 48 }}
            />

            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {highlightSearchTerms(review.userName, searchTerm)}
                </Typography>
                <Chip
                  label={review.isRecommended ? 'Recommended' : 'Not Recommended'}
                  size="small"
                  color={review.isRecommended ? 'success' : 'error'}
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {new Date(review.date).toLocaleDateString()}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Iconify
                    icon="eva:heart-fill"
                    className=""
                    height={16}
                    sx={{ fontSize: 16, color: 'text.secondary' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {review.likesCount}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Iconify
                    icon="eva:message-circle-fill"
                    className=""
                    height={16}
                    sx={{ fontSize: 16, color: 'text.secondary' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {review.commentsCount}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1}>
              <Tooltip title={review.reviewMetadata?.isRead ? 'Mark as unread' : 'Mark as read'}>
                <IconButton
                  size="small"
                  onClick={() =>
                    onUpdateMetadata(review.id, 'isRead', !review.reviewMetadata?.isRead)
                  }
                >
                  <Iconify
                    icon={review.reviewMetadata?.isRead ? 'eva:eye-off-fill' : 'eva:eye-fill'}
                    width={20}
                    height={20}
                    className=""
                    sx={{ color: review.reviewMetadata?.isRead ? 'text.disabled' : 'primary.main' }}
                  />
                </IconButton>
              </Tooltip>

              <Tooltip
                title={
                  review.reviewMetadata?.isImportant ? 'Remove from important' : 'Mark as important'
                }
              >
                <IconButton
                  size="small"
                  onClick={() =>
                    onUpdateMetadata(review.id, 'isImportant', !review.reviewMetadata?.isImportant)
                  }
                >
                  <Iconify
                    icon="eva:star-fill"
                    width={20}
                    height={20}
                    className=""
                    sx={{
                      color: review.reviewMetadata?.isImportant ? 'warning.main' : 'text.disabled',
                    }}
                  />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Review Text */}
          {review.text && (
            <Box
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
              }}
            >
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {highlightSearchTerms(review.text, searchTerm)}
              </Typography>
            </Box>
          )}

          {/* Review Photos */}
          {review.photos && review.photos.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Photos ({review.photos.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {review.photos.slice(0, 4).map((url, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'inline-block',
                      flexShrink: 0,
                      '&:hover': { opacity: 0.8 },
                    }}
                    onClick={() => onImageClick(review.photos!, index)}
                  >
                    <img
                      src={url}
                      alt={`Review photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {index === 3 && review.photos!.length > 4 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                          +{review.photos!.length - 4}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {review.tags.slice(0, 5).map((tag, index) => (
                  <Chip
                    key={index}
                    label={highlightSearchTerms(tag, searchTerm)}
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
                    label={highlightSearchTerms(keyword, searchTerm)}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Footer */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Metadata Badges */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {review.reviewMetadata?.sentiment !== undefined && (
                  <Chip
                    label={getCardSentimentLabel(review.reviewMetadata.sentiment)}
                    size="small"
                    color={getCardSentimentColor(review.reviewMetadata.sentiment)}
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

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  <Iconify icon="logos:facebook" width={20} height={20} className="" sx={{}} />
                }
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Facebook
              </Button>
              {onGenerateResponse && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={
                    <Iconify
                      icon="solar:magic-stick-bold"
                      width={20}
                      height={20}
                      className=""
                      sx={{}}
                    />
                  }
                  onClick={() => onGenerateResponse(review)}
                >
                  Generate AI Reply
                </Button>
              )}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
