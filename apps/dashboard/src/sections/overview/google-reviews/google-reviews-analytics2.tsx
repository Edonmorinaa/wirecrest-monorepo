import type { GoogleReview, ReviewMetadata } from '@prisma/client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Rating from '@mui/material/Rating';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import { Alert, Snackbar } from '@mui/material';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useOwnerResponse } from 'src/hooks/useOwnerResponse';

import { fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Lightbox, useLightbox } from 'src/components/lightbox';
import { Chart, useChart, ChartLegends } from 'src/components/chart';
import { OwnerResponseModal } from 'src/components/owner-response-modal/owner-response-modal';

// ----------------------------------------------------------------------

interface GoogleReviewsAnalytics2Props {
  teamSlug: string;
  title?: string;
  subheader?: string;
  sx?: any;
}

interface ChartDataPoint {
  date: string;
  dateEnd?: string;
  dateDisplay?: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
}

// Extend Prisma types for our use case
type GoogleReviewWithMetadata = GoogleReview & {
  reviewMetadata: ReviewMetadata;
};

// Use the extended type as our main Review interface
type Review = GoogleReviewWithMetadata;

interface DateRangeConstraints {
  minDate: Date | null;
  maxDate: Date | null;
  totalReviews: number;
}

interface CustomDateRange {
  from: Date;
  to: Date;
  aggregation: number;
}

interface TimeRangeOption {
  value: string;
  label: string;
  days: number;
}

interface DateReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  dateEnd?: string | null;
  teamSlug: string;
  sentiment?: string | null;
}

interface AnalyticsStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<string, number>;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  responseRate: number;
  recentReviews: number;
}


// Enhanced Date Range Picker Component
function EnhancedDateRangePicker({ 
  value, 
  onChange, 
  minDate, 
  maxDate, 
  disabled 
}: {
  value?: CustomDateRange;
  onChange: (value: CustomDateRange) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}) {
  const [fromDate, setFromDate] = useState<Date | null>(value?.from || null);
  const [toDate, setToDate] = useState<Date | null>(value?.to || null);
  const [aggregation, setAggregation] = useState<number>(value?.aggregation || 1);

  const handleFromDateChange = (date: Date | null) => {
    setFromDate(date);
    if (date && toDate) {
      onChange({ from: date, to: toDate, aggregation });
    }
  };

  const handleToDateChange = (date: Date | null) => {
    setToDate(date);
    if (fromDate && date) {
      onChange({ from: fromDate, to: date, aggregation });
    }
  };

  const handleAggregationChange = (newValue: number) => {
    setAggregation(newValue);
    if (fromDate && toDate) {
      onChange({ from: fromDate, to: toDate, aggregation: newValue });
    }
  };

  const aggregationOptions = useMemo(() => [
    { value: 1, label: 'Daily (1 day)' },
    { value: 2, label: '2-day periods' },
    { value: 3, label: '3-day periods' },
    { value: 4, label: '4-day periods' },
    { value: 7, label: 'Weekly (7 days)' },
    { value: 14, label: 'Bi-weekly (14 days)' },
    { value: 30, label: 'Monthly (30 days)' },
    { value: 90, label: 'Quarterly (90 days)' },
  ], []);

  return (
    <Card sx={{ 
      p: 3, 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      color: 'white',
      borderRadius: 2,
      boxShadow: 3
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Iconify icon="eva:calendar-fill" width={24} height={24} className="" sx={{ color: 'white' }} />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
          Custom Date Range
        </Typography>
      </Box>
      
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, 
        gap: 3,
        alignItems: 'end'
      }}>
        <TextField
          label="From Date"
          type="date"
          value={fromDate ? fromDate.toISOString().split('T')[0] : ''}
          onChange={(e) => handleFromDateChange(e.target.value ? new Date(e.target.value) : null)}
          disabled={disabled}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          inputProps={{
            min: minDate?.toISOString().split('T')[0],
            max: toDate?.toISOString().split('T')[0] || maxDate?.toISOString().split('T')[0],
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(0, 0, 0, 0.6)',
              '&.Mui-focused': {
                color: 'rgba(0, 0, 0, 0.8)',
              },
            },
          }}
        />
        
        <TextField
          label="To Date"
          type="date"
          value={toDate ? toDate.toISOString().split('T')[0] : ''}
          onChange={(e) => handleToDateChange(e.target.value ? new Date(e.target.value) : null)}
          disabled={disabled}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          inputProps={{
            min: fromDate?.toISOString().split('T')[0] || minDate?.toISOString().split('T')[0],
            max: maxDate?.toISOString().split('T')[0],
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(0, 0, 0, 0.6)',
              '&.Mui-focused': {
                color: 'rgba(0, 0, 0, 0.8)',
              },
            },
          }}
        />
        
        <FormControl fullWidth size="small" disabled={disabled}>
          <InputLabel sx={{ 
            color: 'rgba(0, 0, 0, 0.6)',
            '&.Mui-focused': {
              color: 'rgba(0, 0, 0, 0.8)',
            },
          }}>
            Aggregation Period
          </InputLabel>
          <Select
            value={aggregation}
            onChange={(e) => handleAggregationChange(e.target.value as number)}
            label="Aggregation Period"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.8)',
              },
            }}
          >
            {aggregationOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {/* Date range summary */}
      {fromDate && toDate && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
            <strong>Selected Range:</strong> {fromDate.toLocaleDateString()} to {toDate.toLocaleDateString()}
            {' • '}
            <strong>Period:</strong> {aggregationOptions.find(opt => opt.value === aggregation)?.label}
          </Typography>
        </Box>
      )}
    </Card>
  );
}

// ReviewCard Component (extracted from google-reviews-list.tsx)
interface ReviewCardProps {
  review: Review;
  searchTerm?: string;
  onImageClick: (images: string[], startIndex: number) => void;
  onUpdateMetadata: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
  onGenerateResponse: (review: Review) => void;
}

function ReviewCard({ review, searchTerm, onImageClick, onUpdateMetadata, onGenerateResponse }: ReviewCardProps) {
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
      ) : part
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
    <Card sx={{ 
      transition: 'all 0.2s', 
      '&:hover': { boxShadow: theme.shadows[8] },
      minHeight: 'auto',
      width: '100%',
      position: 'relative',
      display: 'block',
      mb: 0
    }}>
      <CardContent sx={{ p: 3, position: 'relative' }}>
        <Stack spacing={2}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Avatar
              src={review.reviewerPhotoUrl}
              alt={review.name}
              sx={{ width: 48, height: 48 }}
            />
            
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {highlightSearchTerms(review.name, searchTerm)}
                </Typography>
                {review.isLocalGuide && (
                  <Chip
                    label="Local Guide"
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Rating value={review.stars} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  {review.reviewerNumberOfReviews} reviews
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(review.publishedAtDate).toLocaleDateString()}
                </Typography>
                {review.visitedIn && (
                  <Typography variant="body2" color="text.secondary">
                    Visited in {highlightSearchTerms(review.visitedIn, searchTerm)}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1}>
              <Tooltip title={review.reviewMetadata?.isRead ? 'Mark as unread' : 'Mark as read'}>
                <IconButton
                  size="small"
                  onClick={() => onUpdateMetadata(review.id, 'isRead', !review.reviewMetadata?.isRead)}
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
              
              <Tooltip title={review.reviewMetadata?.isImportant ? 'Remove from important' : 'Mark as important'}>
                <IconButton
                  size="small"
                  onClick={() => onUpdateMetadata(review.id, 'isImportant', !review.reviewMetadata?.isImportant)}
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

          {/* Review Images */}
          {review.reviewImageUrls && review.reviewImageUrls.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Images ({review.reviewImageUrls.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {review.reviewImageUrls.slice(0, 4).map((url, index) => (
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
                    onClick={() => onImageClick(review.reviewImageUrls!, index)}
                  >
                    <img
                      src={url}
                      alt={`Review image ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {index === 3 && review.reviewImageUrls!.length > 4 && (
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
                          +{review.reviewImageUrls!.length - 4}
                        </Typography>
                      </Box>
                    )}
                  </Box>
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

          {/* Owner Response */}
          {review.responseFromOwnerText && (
            <Box
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Iconify icon="eva:business-fill" className="" height={20} sx={{ color: 'primary.main' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Response from owner
                </Typography>
                {review.responseFromOwnerDate && (
                  <Typography variant="caption" color="text.secondary">
                    {new Date(review.responseFromOwnerDate).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {highlightSearchTerms(review.responseFromOwnerText, searchTerm)}
              </Typography>
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Iconify icon="eva:heart-fill" className="" height={16} sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {review.likesCount}
                </Typography>
              </Box>
              
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
                startIcon={<Iconify icon="eva:external-link-fill" width={20} height={20} className="" sx={{}} />}
                href={review.reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Google
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<Iconify icon="solar:magic-stick-bold" width={20} height={20} className="" sx={{}} />}
                onClick={() => onGenerateResponse(review)}
              >
                Generate AI Reply
              </Button>
              {!review.responseFromOwnerText && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Iconify icon="eva:corner-up-left-fill" width={20} height={20} className="" sx={{}} />}
                >
                  Respond
                </Button>
              )}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Enhanced Date Reviews Modal Component
function EnhancedDateReviewsModal({ isOpen, onClose, date, dateEnd, teamSlug, sentiment }: DateReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Owner response modal state
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const { isLoading: isGenerating, generatedResponse, error: responseError, generateResponse, reset, snackbar, hideSnackbar } = useOwnerResponse();
  
  // Prepare slides for lightbox - memoized to prevent state issues
  const allImages = useMemo(() => 
    reviews
      .filter(review => review.reviewImageUrls && review.reviewImageUrls.length > 0)
      .flatMap(review => review.reviewImageUrls!),
    [reviews]
  );
  
  const slides = useMemo(() => 
    allImages.map(src => ({ src })),
    [allImages]
  );
  
  const { selected, open, onOpen, onClose: onCloseLightbox } = useLightbox(slides);

  const handleGenerateResponse = (review: Review) => {
    setSelectedReview(review);
    setIsResponseModalOpen(true);
    reset();
  };

  const handleCloseResponseModal = () => {
    setIsResponseModalOpen(false);
    setSelectedReview(null);
    reset();
  };

  const handleGenerateResponseInModal = async () => {
    if (selectedReview) {
      await generateResponse(selectedReview, 'GOOGLE');
    }
  };

  const handleUpdateMetadata = async (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => {
    try {
      const response = await fetch(`/api/teams/${teamSlug}/google/reviews/${reviewId}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error('Failed to update review');

      // Update the local state
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId 
            ? {
                ...review,
                reviewMetadata: {
                  ...review.reviewMetadata,
                  [field]: value
                }
              }
            : review
        )
      );
    } catch (updateError) {
      console.error('Error updating review metadata:', updateError);
    }
  };

  const fetchDateReviews = useCallback(async () => {
    if (!date || !teamSlug) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: date,
        endDate: dateEnd || date,
        limit: '100'
      });

      console.log('Modal fetching reviews with params:', { date, dateEnd, teamSlug, params: params.toString() });
      const response = await fetch(`/api/teams/${teamSlug}/google/reviews?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');

      const data = await response.json();
      console.log('Modal API response:', data);
      console.log('Reviews data:', data.data?.reviews);
      console.log('Reviews count:', data.data?.reviews?.length);
      const allReviews = data.data?.reviews || [];
      
      // Filter reviews by sentiment on the frontend
      let filteredReviews = allReviews;
      if (sentiment && sentiment !== 'all') {
        filteredReviews = allReviews.filter((review: Review) => {
          const reviewSentiment = review.reviewMetadata?.sentiment;
          if (!reviewSentiment) return false;
          
          switch (sentiment) {
            case 'positive':
              return reviewSentiment > 0.1;
            case 'negative':
              return reviewSentiment < -0.1;
            case 'neutral':
              return reviewSentiment >= -0.1 && reviewSentiment <= 0.1;
            default:
              return true;
          }
        });
      }
      
      console.log('Filtered reviews by sentiment:', sentiment, 'Count:', filteredReviews.length);
      setReviews(filteredReviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  }, [date, dateEnd, teamSlug, sentiment]);

  useEffect(() => {
    if (isOpen) {
      fetchDateReviews();
    } else {
      // Reset states when modal closes
      setReviews([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, fetchDateReviews]);

  // Debug: Monitor reviews state changes
  useEffect(() => {
    console.log('Reviews state changed:', reviews.length, 'reviews');
  }, [reviews]);

  // Cleanup lightbox state when modal closes
  useEffect(() => {
    if (!isOpen && open) {
      console.log('Modal closed, cleaning up lightbox state');
      onCloseLightbox();
    }
  }, [isOpen, open, onCloseLightbox]);

  const getFormattedDateRange = () => {
    if (!date) return '';
    
    if (dateEnd && dateEnd !== date) {
      const startDate = new Date(date);
      const endDate = new Date(dateEnd);
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
    
    return new Date(date).toLocaleDateString();
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen={false}
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh',
          width: '95vw',
          maxWidth: '1200px',
          zIndex: 1300
        }
      }}
      BackdropProps={{
        sx: {
          zIndex: 1299
        }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Iconify icon="eva:calendar-fill" className="" height={20} sx={{}} />
          <Typography variant="h6">
            Reviews for {getFormattedDateRange()}
          </Typography>
          
          {/* Sentiment Filter Indicator */}
          {sentiment && sentiment !== 'all' && (
            <Chip
              label={`${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} sentiment`}
              size="small"
              sx={{
                backgroundColor: sentiment === 'positive' ? 'success.main' : 
                                sentiment === 'negative' ? 'error.main' : 
                                'warning.main',
                color: 'white',
                fontWeight: 600
              }}
            />
          )}
          
          {reviews.length > 0 && (
            <Chip 
              label={`${reviews.length} reviews`} 
              size="small" 
              color="primary" 
            />
          )}
        </Stack>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, minHeight: '60vh' }}>
        {isLoading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>Loading reviews...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : reviews.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No reviews found for this period</Typography>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Found {reviews.length} reviews for this period
            </Typography>
            <Box sx={{ maxHeight: '60vh', overflow: 'auto', pr: 1 }}>
              {reviews.map((review, index) => (
                <Box 
                  key={review.id} 
                  sx={{ 
                    mb: 3,
                    '&:last-child': { mb: 0 },
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  <ReviewCard
                    review={review}
                    onImageClick={(images, startIndex) => {
                      const globalIndex = allImages.findIndex(img => img === images[startIndex]);
                      if (globalIndex !== -1) {
                        onOpen(images[startIndex]);
                      }
                    }}
                    onUpdateMetadata={handleUpdateMetadata}
                    onGenerateResponse={handleGenerateResponse}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Owner Response Modal */}
      <OwnerResponseModal
        open={isResponseModalOpen}
        onClose={handleCloseResponseModal}
        review={selectedReview}
        generatedResponse={generatedResponse}
        isLoading={isGenerating}
        error={responseError}
        onGenerateResponse={handleGenerateResponseInModal}
        platform="GOOGLE"
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={hideSnackbar} severity={snackbar.severity as any} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Lightbox for Images */}
      {open && (
        <Lightbox
          open={open}
          onClose={() => {
            console.log('Closing lightbox');
            onCloseLightbox();
            // Force a small delay to ensure cleanup
            setTimeout(() => {
              console.log('Lightbox cleanup completed');
            }, 100);
          }}
          slides={slides}
          selected={selected}
          disableZoom={false}
          disableVideo
          disableTotal={false}
          disableCaptions
          disableSlideshow={false}
          disableThumbnails={false}
          disableFullscreen={false}
          onGetCurrentIndex={() => {}}
          className=""
          sx={{
            zIndex: 9999,
            '& .MuiBackdrop-root': {
              zIndex: 9998
            }
          }}
        />
      )}
    </Dialog>
  );
}

export function GoogleReviewsAnalytics2({ 
  teamSlug, 
  title = "Enhanced Reviews Analytics", 
  subheader,
  sx,
  ...other 
}: GoogleReviewsAnalytics2Props) {
  console.log('GoogleReviewsAnalytics2 rendered with teamSlug:', teamSlug, 'at:', new Date().toISOString());
  
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [constraints, setConstraints] = useState<DateRangeConstraints>({
    minDate: null,
    maxDate: null,
    totalReviews: 0
  });
  const [isLoadingConstraints, setIsLoadingConstraints] = useState(true);
  
  // Chart series selection state
  const [selectedSeries, setSelectedSeries] = useState('all');
  
  // Ensure chartData is always an array
  const safeChartData = useMemo(() => Array.isArray(chartData) ? chartData : [], [chartData]);
  
  // Modal state for showing reviews for a specific date
  const [dateModal, setDateModal] = useState<{
    isOpen: boolean;
    date: string | null;
    dateEnd: string | null;
    sentiment: string | null;
  }>({
    isOpen: false,
    date: null,
    dateEnd: null,
    sentiment: null
  });

  // Get state from URL - memoized to prevent infinite loops
  const timeRange = useMemo(() => searchParams.get('timeRange') || '90d', [searchParams]);

  const customRange = useMemo(() => {
    const customFrom = searchParams.get('customFrom');
    const customTo = searchParams.get('customTo');
    const customAgg = searchParams.get('customAgg');
    
    if (customFrom && customTo && customAgg) {
      return {
        from: new Date(customFrom),
        to: new Date(customTo),
        aggregation: parseInt(customAgg)
      };
    }
    return null;
  }, [searchParams]);

  const timeRanges: TimeRangeOption[] = useMemo(() => [
    { value: "7d", label: "Last 7 days", days: 7 },
    { value: "30d", label: "Last 30 days", days: 30 },
    { value: "90d", label: "Last 3 months", days: 90 },
    { value: "365d", label: "Last year", days: 365 },
    { value: "1825d", label: "Last 5 years", days: 1825 },
    { value: "custom", label: "Custom Range", days: 0 },
  ], []);

  // Fetch date range constraints
  const fetchConstraints = useCallback(async () => {
    if (!teamSlug) {
      console.log('No teamSlug available for fetchConstraints');
      return;
    }
    
    console.log('Fetching date range constraints for team:', teamSlug);
    setIsLoadingConstraints(true);
    try {
      const apiUrl = `/api/teams/${teamSlug}/google/reviews/date-range`;
      console.log('Calling API:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('Date range API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {
          errorText = 'Unable to read error response';
        }
        
        console.warn('Date range API error response:', {
          status: response.status,
          statusText: response.statusText,
          url: apiUrl,
          errorText
        });
        
        setConstraints({
          minDate: null,
          maxDate: null,
          totalReviews: 0
        });
        return;
      }
      
      const result = await response.json();
      console.log('Date range API result:', result);
      
      if (result.data) {
        setConstraints({
          minDate: result.data.oldestDate ? new Date(result.data.oldestDate) : null,
          maxDate: result.data.newestDate ? new Date(result.data.newestDate) : null,
          totalReviews: result.data.totalReviews
        });
      } else {
        setConstraints({
          minDate: null,
          maxDate: null,
          totalReviews: 0
        });
      }
    } catch (error) {
      console.warn('Error fetching date range constraints:', error);
      setConstraints({
        minDate: null,
        maxDate: null,
        totalReviews: 0
      });
    } finally {
      setIsLoadingConstraints(false);
    }
  }, [teamSlug]);

  // Enhanced fetch function with analytics stats
  const debouncedFetchReviewsData = useCallback(async () => {
    if (!teamSlug) return;
    
    setIsLoading(true);
    try {
      let apiUrl = `/api/google/${teamSlug}/reviews/analytics`;
      
      if (timeRange === 'custom' && customRange) {
        const fromDate = customRange.from.toISOString().split('T')[0];
        const toDate = customRange.to.toISOString().split('T')[0];
        apiUrl += `?startDate=${fromDate}&endDate=${toDate}&aggregation=${customRange.aggregation}`;
        console.log('Fetching custom range analytics:', { 
          fromDate, 
          toDate, 
          aggregation: customRange.aggregation,
          timeRange,
          apiUrl
        });
      } else {
        apiUrl += `?period=${timeRange}`;
        console.log('Fetching analytics data for period:', timeRange, 'URL:', apiUrl);
      }
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {
          errorText = 'Unable to read error response';
        }
        
        console.warn('Analytics API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: apiUrl,
          errorText
        });
        
        setChartData([]);
        return;
      }
      
      const data = await response.json();
      console.log('Analytics data received:', data.data?.length, 'data points');
      
      setChartData(data.data || []);
      
      // Fetch analytics stats separately
      try {
        const statsResponse = await fetch(`/api/teams/${teamSlug}/google/reviews/analytics`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setAnalyticsStats(statsData.data);
        }
      } catch (statsError) {
        console.warn('Error fetching analytics stats:', statsError);
      }
      
    } catch (error) {
      console.warn('Error fetching reviews analytics:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Network error - check if the API endpoint is accessible');
      }
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamSlug, timeRange, customRange]);

  // Debounced version of the fetch function
  const debouncedFetch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        debouncedFetchReviewsData();
      }, 500);
    };
  }, [debouncedFetchReviewsData]);

  // Load constraints on mount
  useEffect(() => {
    fetchConstraints();
  }, [fetchConstraints]);

  // Handle URL parameter changes
  useEffect(() => {
    console.log('URL parameters changed - timeRange:', timeRange, 'customRange:', customRange);
  }, [timeRange, customRange]);

  // Load data when parameters change
  useEffect(() => {
    console.log('useEffect triggered for data fetching - timeRange:', timeRange, 'customRange:', customRange);
    debouncedFetch();
    
    return () => {
      // The debounced function will handle its own cleanup
    };
  }, [debouncedFetch, timeRange, customRange]);

  const updateURL = useCallback((updates: { 
    timeRange?: string; 
    customRange?: CustomDateRange | null; 
  }) => {
    const params = new URLSearchParams(searchParams);
    
    if (updates.timeRange !== undefined) {
      params.set('timeRange', updates.timeRange);
    }
    
    if (updates.customRange) {
      params.set('customFrom', updates.customRange.from.toISOString().split('T')[0]);
      params.set('customTo', updates.customRange.to.toISOString().split('T')[0]);
      params.set('customAgg', updates.customRange.aggregation.toString());
    } else if (updates.customRange === null) {
      params.delete('customFrom');
      params.delete('customTo');
      params.delete('customAgg');
    }
    
    // Use router.replace with shallow routing to prevent full page reload
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    const currentCustomFrom = searchParams.get('customFrom');
    const currentCustomTo = searchParams.get('customTo');
    const currentCustomAgg = searchParams.get('customAgg');
    
    const currentCustomRange = currentCustomFrom && currentCustomTo && currentCustomAgg ? {
      from: new Date(currentCustomFrom),
      to: new Date(currentCustomTo),
      aggregation: parseInt(currentCustomAgg)
    } : null;

    updateURL({ 
      timeRange: newTimeRange,
      customRange: newTimeRange !== 'custom' ? null : currentCustomRange
    });
  }, [updateURL, searchParams]);

  const handleCustomRangeChange = useCallback((newCustomRange: CustomDateRange) => {
    updateURL({ customRange: newCustomRange });
  }, [updateURL]);

  const handleDataPointClick = useCallback((data: ChartDataPoint) => {
    console.log('Chart data point clicked:', data);
    
    if (data.total > 0) {
      setDateModal({
        isOpen: true,
        date: data.date,
        dateEnd: data.dateEnd || null,
        sentiment: selectedSeries !== 'all' ? selectedSeries : null
      });
    }
  }, [selectedSeries]);

  const closeDateModal = useCallback(() => {
    setDateModal({
      isOpen: false,
      date: null,
      dateEnd: null,
      sentiment: null
    });
  }, []);

  const handleChangeSeries = useCallback((newValue: string) => {
    setSelectedSeries(newValue);
  }, []);

  // Get the appropriate description based on time range
  const getChartDescription = useCallback(() => {
    if (timeRange === 'custom' && customRange) {
      return `Showing ${customRange.aggregation}-day aggregation for your custom date range. Click on a data point to see reviews for that period.`;
    }

    const days = timeRanges.find(range => range.value === timeRange)?.days || 90;
    
    if (days <= 7) {
      return 'Showing daily review data. Click on a data point to see reviews for that specific day.';
    } else if (days <= 30) {
      return 'Showing 4-day period review data. Click on a data point to see reviews for that 4-day period.';
    } else if (days <= 90) {
      return 'Showing 7-day period review data. Click on a data point to see reviews for that 7-day period.';
    } else if (days <= 365) {
      return 'Showing 7-day period review data. Click on a data point to see reviews for that 7-day period.';
    } else {
      return 'Showing 30-day period review data. Click on a data point to see reviews for that 30-day period.';
    }
  }, [timeRange, customRange, timeRanges]);

  // Dynamic chart colors based on selected sentiment
  const getChartColors = useMemo(() => {
    if (selectedSeries === 'positive') {
      return [theme.palette.success.main]; // Only green for positive
    } else if (selectedSeries === 'neutral') {
      return [theme.palette.warning.main]; // Only yellow for neutral
    } else if (selectedSeries === 'negative') {
      return [theme.palette.error.main]; // Only red for negative
    } else {
      // All sentiments - show all colors
      return [
        theme.palette.success.main, // Positive - Green
        theme.palette.warning.main, // Neutral - Yellow/Orange
        theme.palette.error.main,   // Negative - Red
      ];
    }
  }, [selectedSeries, theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main]);

  // Enhanced chart options with better interactivity
  const chartOptions = useChart({
    colors: getChartColors,
    chart: {
      stacked: false,
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
      events: {
        click: (event, chartContext, config) => {
          if (config.dataPointIndex !== undefined) {
            const dataPoint = chartData[config.dataPointIndex];
            if (dataPoint) {
              handleDataPointClick(dataPoint);
            }
          }
        },
        dataPointSelection: (event, chartContext, config) => {
          const dataPoint = chartData[config.dataPointIndex];
          if (dataPoint) {
            handleDataPointClick(dataPoint);
          }
        },
      },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      animations: {
        enabled: true,
        speed: 300,
      },
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 4,
      hover: {
        size: 8,
      },
    },
    states: {
      hover: {
        filter: {
          type: 'lighten',
          value: 0.1,
        },
      },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.6,
        opacityTo: 0.1,
      },
    },
    xaxis: {
      categories: safeChartData.map(item => item.dateDisplay || item.date),
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
      },
    },
    tooltip: {
      theme: theme.palette.mode,
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => `${value} reviews`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: theme.palette.text.primary,
      },
    },
    plotOptions: {
      area: {
        fillTo: 'origin',
      },
    }
  });

  // Enhanced series with filtering capability
  const allSeries = useMemo(() => [
    {
      name: 'Positive',
      data: safeChartData.map(item => item.positive),
    },
    {
      name: 'Neutral',
      data: safeChartData.map(item => item.neutral),
    },
    {
      name: 'Negative',
      data: safeChartData.map(item => item.negative),
    },
  ], [safeChartData]);

  const currentSeries = useMemo(() => 
    selectedSeries === 'all' 
      ? allSeries 
      : allSeries.filter(series => series.name.toLowerCase() === selectedSeries.toLowerCase()), 
    [selectedSeries, allSeries]
  );

  const seriesOptions = ['all', 'positive', 'neutral', 'negative'];
  
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return theme.palette.success.main;
      case 'neutral': return theme.palette.warning.main;
      case 'negative': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  };
  
  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'all': return 'All Sentiments';
      case 'positive': return 'Positive';
      case 'neutral': return 'Neutral';
      case 'negative': return 'Negative';
      default: return sentiment;
    }
  };

  // Show loading state while constraints are loading
  if (isLoadingConstraints) {
    return (
      <Box sx={{ space: 2 }}>
        <Skeleton variant="rectangular" height={32} width={256} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} width="100%" />
      </Box>
    );
  }

  return (
    <>
      <Card sx={sx} {...other}>
        <CardHeader
          title={title}
          subheader={subheader || getChartDescription()}
          action={
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  onChange={(e) => handleTimeRangeChange(e.target.value)}
                  label="Time Range"
                >
                  {timeRanges.map((range) => (
                    <MenuItem key={range.value} value={range.value}>
                      {range.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={selectedSeries}
                  onChange={(e) => handleChangeSeries(e.target.value)}
                  displayEmpty
                  renderValue={(value) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {value !== 'all' && (
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: getSentimentColor(value),
                          }}
                        />
                      )}
                      <Typography variant="body2">
                        {getSentimentLabel(value)}
                      </Typography>
                    </Box>
                  )}
                  sx={{
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    },
                  }}
                >
                  {seriesOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {option !== 'all' && (
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: getSentimentColor(option),
                            }}
                          />
                        )}
                        <Typography variant="body2">
                          {getSentimentLabel(option)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          }
        />

        <CardContent>
          {isLoading ? (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Loading analytics...
              </Typography>
            </Box>
          ) : safeChartData.length > 0 ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Click on any data point to view detailed reviews for that period
              </Typography>
              
              <ChartLegends
                colors={getChartColors}
                labels={currentSeries.map(series => series.name)}
                values={currentSeries.map(series => 
                  fShortenNumber(series.data.reduce((sum, val) => sum + val, 0))
                )}
                sx={{ px: 3, gap: 3, mb: 2 }}
                className=""
                slotProps={{}}
              />
              
              <Chart
                type="area"
                series={currentSeries}
                options={chartOptions}
                // height={400}
                sx={{
                  '& .apexcharts-canvas': {
                    cursor: 'pointer',
                  },
                  '& .apexcharts-series': {
                    cursor: 'pointer',
                  },
                  height: 350,
                }}
                slotProps={{}}
                className=""
              />
            </Box>
          ) : (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stack spacing={2} alignItems="center">
                <Iconify icon="eva:bar-chart-2-outline" className="" height={48} sx={{ opacity: 0.5 }} />
                <Typography variant="body2" color="text.secondary">
                  No analytics data available
                </Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Custom Date Range Picker */}
      {timeRange === 'custom' && (
        <Box sx={{ mt: 2 }}>
          <EnhancedDateRangePicker
            value={customRange || undefined}
            onChange={handleCustomRangeChange}
            minDate={constraints.minDate || undefined}
            maxDate={constraints.maxDate || undefined}
            disabled={constraints.totalReviews === 0}
          />
          
          {constraints.totalReviews === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              No reviews available for custom date range selection.
            </Typography>
          )}
        </Box>
      )}

      {/* Enhanced Date Reviews Modal */}
      <EnhancedDateReviewsModal
        isOpen={dateModal.isOpen}
        onClose={closeDateModal}
        date={dateModal.date}
        dateEnd={dateModal.dateEnd}
        teamSlug={teamSlug}
        sentiment={dateModal.sentiment}
      />
    </>
  );
}
