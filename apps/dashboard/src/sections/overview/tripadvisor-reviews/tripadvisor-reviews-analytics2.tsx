import type { ReviewMetadata, TripAdvisorReview, TripAdvisorReviewPhoto } from '@prisma/client';

import dayjs from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

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

import { useTripAdvisorReviews, useTripAdvisorEnhancedGraph, useUpdateTripAdvisorReviewMetadata } from 'src/hooks/useLocations';

import { fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Lightbox, useLightbox } from 'src/components/lightbox';
import { Chart, useChart, ChartLegends } from 'src/components/chart';
import { CustomDateRangePicker } from 'src/components/custom-date-range-picker';

// ----------------------------------------------------------------------

interface TripAdvisorReviewsAnalytics2Props {
  teamSlug: string;
  locationId?: string;
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
type TripAdvisorReviewWithMetadata = TripAdvisorReview & {
  reviewMetadata?: ReviewMetadata | null;
  photos?: TripAdvisorReviewPhoto[];
};

// Use the extended type as our main Review interface
type Review = TripAdvisorReviewWithMetadata;

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
  locationId?: string;
  sentiment?: string | null;
}

// ReviewCard Component
interface ReviewCardProps {
  review: Review;
  searchTerm?: string;
  onImageClick: (images: string[], startIndex: number) => void;
  onUpdateMetadata: (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => void;
}

function ReviewCard({ review, searchTerm, onImageClick, onUpdateMetadata }: ReviewCardProps) {
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
    if (!sentiment && sentiment !== 0) return 'default';
    if (sentiment > 0.1) return 'success';
    if (sentiment < -0.1) return 'error';
    return 'warning';
  };

  const getCardSentimentLabel = (sentiment?: number) => {
    if (!sentiment && sentiment !== 0) return 'Unknown';
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
              alt={review.reviewerName}
              sx={{ width: 48, height: 48 }}
            />

            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {highlightSearchTerms(review.reviewerName, searchTerm)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Rating value={review.rating} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  {new Date(review.publishedDate).toLocaleDateString()}
                </Typography>
                {review.tripType && (
                  <Chip label={review.tripType} size="small" variant="outlined" />
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

          {/* Review Title */}
          {review.title && (
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {highlightSearchTerms(review.title, searchTerm)}
            </Typography>
          )}

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
          {review.photos && review.photos.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Images ({review.photos.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {review.photos.slice(0, 4).map((photo, index) => (
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
                    onClick={() => onImageClick(review.photos!.map(p => p.url), index)}
                  >
                    <img
                      src={photo.url}
                      alt={`Review image ${index + 1}`}
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Iconify icon="eva:heart-fill" className="" height={16} sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {review.helpfulVotes || 0}
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
                View on TripAdvisor
              </Button>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Enhanced Date Reviews Modal Component
function EnhancedDateReviewsModal({ isOpen, onClose, date, dateEnd, teamSlug, locationId, sentiment }: DateReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mutation for updating review metadata
  const updateMetadataMutation = useUpdateTripAdvisorReviewMetadata();

  // Prepare slides for lightbox - memoized to prevent state issues
  const allImages = useMemo(() =>
    reviews
      .filter(review => review.photos && review.photos.length > 0)
      .flatMap(review => review.photos!.map(photo => photo.url)),
    [reviews]
  );

  const slides = useMemo(() =>
    allImages.map(src => ({ src })),
    [allImages]
  );

  const { selected, open, onOpen, onClose: onCloseLightbox } = useLightbox(slides);

  const handleUpdateMetadata = async (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => {
    if (!locationId) {
      console.error('LocationId is required to update metadata');
      return;
    }

    try {
      await updateMetadataMutation.mutateAsync({
        locationId,
        platform: 'tripadvisor' as const,
        reviewId,
        metadata: { [field]: value },
      });

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

  // Calculate date range for the query
  const dateRangeForQuery = useMemo(() => {
    if (!date) return null;

    const startDate = new Date(date);
    const endDate = dateEnd ? new Date(dateEnd) : new Date(date);

    // Set time to start and end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [date, dateEnd]);

  // Use useTripAdvisorReviews hook to fetch reviews for this specific date
  const {
    reviews: fetchedReviews,
    isLoading: isFetchingReviews,
    error: fetchError
  } = useTripAdvisorReviews(
    locationId || '',
    {
      startDate: dateRangeForQuery?.startDate,
      endDate: dateRangeForQuery?.endDate,
    },
    {
      page: 1,
      limit: 100
    },
    isOpen && !!locationId && !!dateRangeForQuery
  );

  // Memoize filtered reviews to prevent unnecessary recalculations
  const filteredReviews = useMemo(() => {
    if (!fetchedReviews || fetchedReviews.length === 0) {
      return [];
    }

    // Cast to Review type
    let filtered = fetchedReviews as unknown as Review[];

    // Filter by sentiment if specified
    if (sentiment && sentiment !== 'all') {
      filtered = filtered.filter((review) => {
        const reviewSentiment = review.reviewMetadata?.sentiment;

        // If no sentiment data, classify by star rating
        if (reviewSentiment === null || reviewSentiment === undefined) {
          switch (sentiment) {
            case 'positive':
              return review.rating >= 4;
            case 'negative':
              return review.rating <= 2;
            case 'neutral':
              return review.rating === 3;
            default:
              return true;
          }
        }

        // Use sentiment score
        switch (sentiment) {
          case 'positive':
            return reviewSentiment >= 0.5;
          case 'negative':
            return reviewSentiment < -0.5;
          case 'neutral':
            return reviewSentiment >= -0.5 && reviewSentiment < 0.5;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [fetchedReviews, sentiment]);

  // Track previous filtered reviews to prevent unnecessary state updates
  const prevFilteredReviewsRef = useRef<string>('');

  // Update reviews state only when filtered reviews actually change
  useEffect(() => {
    const currentKey = filteredReviews.map(r => r.id).join(',');

    if (prevFilteredReviewsRef.current !== currentKey) {
      prevFilteredReviewsRef.current = currentKey;

      console.log('Modal reviews filtered:', {
        total: fetchedReviews?.length || 0,
        filtered: filteredReviews.length,
        sentiment,
        dateRange: dateRangeForQuery
      });

      setReviews(filteredReviews);
    }
  }, [filteredReviews, fetchedReviews?.length, sentiment, dateRangeForQuery]);

  // Update loading and error states
  useEffect(() => {
    setIsLoading(isFetchingReviews);
  }, [isFetchingReviews]);

  useEffect(() => {
    if (fetchError) {
      setError(typeof fetchError === 'string' ? fetchError : fetchError.message || 'Failed to fetch reviews');
    } else {
      setError(null);
    }
  }, [fetchError]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReviews([]);
      setError(null);
      setIsLoading(false);
      prevFilteredReviewsRef.current = '';
    }
  }, [isOpen]);

  // Cleanup lightbox state when modal closes
  useEffect(() => {
    if (!isOpen && open) {
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
        <Stack spacing={2}>
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
                label={`${reviews.length} ${sentiment ? 'filtered' : 'total'} reviews`}
                size="small"
                color="primary"
              />
            )}
          </Stack>
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
              {reviews.map((review) => (
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

      {/* Lightbox for Images */}
      {open && (
        <Lightbox
          open={open}
          onClose={() => {
            onCloseLightbox();
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
          onGetCurrentIndex={() => { }}
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

export function TripAdvisorReviewsAnalytics2({
  teamSlug,
  locationId,
  title = "Review Analytics",
  subheader,
  sx,
  ...other
}: TripAdvisorReviewsAnalytics2Props) {
  console.log('TripAdvisorReviewsAnalytics2 rendered with teamSlug:', teamSlug, 'locationId:', locationId, 'at:', new Date().toISOString());

  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  // Custom date picker dialog state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempFromDate, setTempFromDate] = useState<Date | null>(null);
  const [tempToDate, setTempToDate] = useState<Date | null>(null);

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

  // Calculate date range based on timeRange or customRange
  const { startDate, endDate } = useMemo(() => {
    if (timeRange === 'custom' && customRange) {
      return {
        startDate: customRange.from.toISOString(),
        endDate: customRange.to.toISOString(),
      };
    }

    // Calculate date range based on timeRange
    const now = new Date();
    const end = now.toISOString();
    const selectedRange = timeRanges.find((r) => r.value === timeRange);
    const days = selectedRange?.days || 90;

    const start = new Date();
    start.setDate(start.getDate() - days);

    return {
      startDate: start.toISOString(),
      endDate: end,
    };
  }, [timeRange, customRange, timeRanges]);

  const { daily: analyticsData, isLoading: isFetchingAnalytics, error: analyticsError } = useTripAdvisorEnhancedGraph(locationId, startDate, endDate);

  // Helper function to aggregate data by periods (similar to Google and Facebook)
  const aggregateDataByPeriod = useCallback((dailyData: any[], periodDays: number, rangeStart: Date, rangeEnd: Date) => {
    if (!dailyData || dailyData.length === 0) {
      const periods: ChartDataPoint[] = [];
      const currentDate = new Date(rangeStart);
      currentDate.setHours(0, 0, 0, 0);

      const rangeEndDate = new Date(rangeEnd);
      rangeEndDate.setHours(0, 0, 0, 0);

      while (currentDate <= rangeEndDate) {
        const periodStart = new Date(currentDate);
        const periodEnd = new Date(currentDate);
        periodEnd.setDate(periodEnd.getDate() + Math.min(periodDays - 1, Math.floor((rangeEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))));

        let dateDisplay: string;
        if (periodDays === 1) {
          dateDisplay = periodStart.toLocaleDateString();
        } else if (periodDays === 7) {
          dateDisplay = `Week of ${periodStart.toLocaleDateString()}`;
        } else if (periodDays === 30) {
          dateDisplay = periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else if (periodDays === 14) {
          dateDisplay = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
        } else if (periodDays >= 90) {
          dateDisplay = `${periodStart.toLocaleDateString('en-US', { month: 'short' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
        } else {
          dateDisplay = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
        }

        periods.push({
          date: periodStart.toISOString().split('T')[0],
          dateEnd: periodEnd.toISOString().split('T')[0],
          dateDisplay,
          total: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
        });

        currentDate.setDate(currentDate.getDate() + periodDays);
      }

      return periods;
    }

    if (periodDays <= 1) {
      const periods: ChartDataPoint[] = [];
      const dataMap = new Map(dailyData.map(d => [d.date, d]));

      const currentDate = new Date(rangeStart);
      currentDate.setHours(0, 0, 0, 0);

      const rangeEndDate = new Date(rangeEnd);
      rangeEndDate.setHours(0, 0, 0, 0);

      while (currentDate <= rangeEndDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const dayData = dataMap.get(dateKey);

        periods.push({
          date: dateKey,
          dateEnd: dateKey,
          dateDisplay: currentDate.toLocaleDateString(),
          total: dayData?.count || 0,
          positive: dayData?.positiveCount || dayData?.positive || 0,
          negative: dayData?.negativeCount || dayData?.negative || 0,
          neutral: dayData?.neutralCount || dayData?.neutral || 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return periods;
    }

    // Create a map for quick lookup
    const dataMap = new Map(dailyData.map(d => [d.date, d]));

    // Group data into fixed periods
    const periods: ChartDataPoint[] = [];
    let currentDate = new Date(rangeStart);
    currentDate.setHours(0, 0, 0, 0);

    const rangeEndDate = new Date(rangeEnd);
    rangeEndDate.setHours(0, 0, 0, 0);

    while (currentDate <= rangeEndDate) {
      const periodStart = new Date(currentDate);
      const periodEnd = new Date(currentDate);
      periodEnd.setDate(periodEnd.getDate() + periodDays - 1);

      if (periodEnd > rangeEndDate) {
        periodEnd.setTime(rangeEndDate.getTime());
      }

      let total = 0;
      let positive = 0;
      let negative = 0;
      let neutral = 0;

      const checkDate = new Date(periodStart);
      while (checkDate <= periodEnd && checkDate <= rangeEndDate) {
        const dateKey = checkDate.toISOString().split('T')[0];
        const dayData = dataMap.get(dateKey);

        if (dayData) {
          total += dayData.count || 0;
          positive += dayData.positiveCount || dayData.positive || 0;
          negative += dayData.negativeCount || dayData.negative || 0;
          neutral += dayData.neutralCount || dayData.neutral || 0;
        }

        checkDate.setDate(checkDate.getDate() + 1);
      }

      let dateDisplay: string;
      if (periodDays === 1) {
        dateDisplay = periodStart.toLocaleDateString();
      } else if (periodDays === 7) {
        dateDisplay = `Week of ${periodStart.toLocaleDateString()}`;
      } else if (periodDays === 30) {
        dateDisplay = periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else if (periodDays === 14) {
        dateDisplay = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
      } else if (periodDays >= 90) {
        dateDisplay = `${periodStart.toLocaleDateString('en-US', { month: 'short' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      } else {
        dateDisplay = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
      }

      periods.push({
        date: periodStart.toISOString().split('T')[0],
        dateEnd: periodEnd.toISOString().split('T')[0],
        dateDisplay,
        total,
        positive,
        negative,
        neutral,
      });

      currentDate.setDate(currentDate.getDate() + periodDays);
    }

    return periods;
  }, []);

  // Get aggregation period based on time range
  const getAggregationPeriod = useCallback(() => {
    if (timeRange === 'custom' && customRange) {
      return customRange.aggregation;
    }

    const selectedRange = timeRanges.find(r => r.value === timeRange);
    const days = selectedRange?.days || 90;

    if (days <= 7) {
      return 1;
    } else if (days <= 30) {
      return 4;
    } else if (days <= 90) {
      return 7;
    } else if (days <= 365) {
      return 7;
    } else {
      return 30;
    }
  }, [timeRange, customRange, timeRanges]);

  // Transform analytics data to chart format
  useEffect(() => {
    if (!analyticsData) {
      setChartData([]);
      return;
    }

    console.log('Analytics data received from tRPC:', analyticsData);

    const aggregationPeriod = getAggregationPeriod();
    console.log('Aggregating data by period:', aggregationPeriod, 'days');

    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);

    const aggregatedData = aggregateDataByPeriod(analyticsData, aggregationPeriod, rangeStart, rangeEnd);

    console.log('Aggregated chart data:', aggregatedData);
    setChartData(aggregatedData);
  }, [analyticsData, startDate, endDate]); // Removed aggregateDataByPeriod and getAggregationPeriod as they're useCallback

  // Update loading state
  useEffect(() => {
    setIsLoading(isFetchingAnalytics);
  }, [isFetchingAnalytics]);

  // Handle errors
  useEffect(() => {
    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError);
      setChartData([]);
    }
  }, [analyticsError]);

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
    const aggregationPeriod = getAggregationPeriod();

    if (timeRange === 'custom' && customRange) {
      if (aggregationPeriod === 1) {
        return 'Showing daily review data for your custom date range. Click on a data point to see reviews for that specific day.';
      }
      return `Showing ${aggregationPeriod}-day period review data for your custom date range. Click on a data point to see reviews for that period.`;
    }

    if (aggregationPeriod === 1) {
      return 'Showing daily review data. Click on a data point to see reviews for that specific day.';
    } else if (aggregationPeriod === 4) {
      return 'Showing 4-day period review data. Click on a data point to see reviews for that 4-day period.';
    } else if (aggregationPeriod === 7) {
      return 'Showing weekly review data (7-day periods). Click on a data point to see reviews for that week.';
    } else if (aggregationPeriod === 30) {
      return 'Showing monthly review data (30-day periods). Click on a data point to see reviews for that month.';
    } else {
      return `Showing ${aggregationPeriod}-day period review data. Click on a data point to see reviews for that period.`;
    }
  }, [timeRange, customRange, getAggregationPeriod]);

  // Dynamic chart colors based on selected sentiment
  const getChartColors = useMemo(() => {
    if (selectedSeries === 'positive') {
      return [theme.palette.success.main];
    } else if (selectedSeries === 'neutral') {
      return [theme.palette.warning.main];
    } else if (selectedSeries === 'negative') {
      return [theme.palette.error.main];
    } else {
      return [
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
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
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const dataPoint = safeChartData[dataPointIndex];
        if (!dataPoint) return '';

        const date = dataPoint.dateDisplay || new Date(dataPoint.date).toLocaleDateString();
        const total = dataPoint.total || 0;
        const positive = dataPoint.positive || 0;
        const neutral = dataPoint.neutral || 0;
        const negative = dataPoint.negative || 0;

        return `
          <div style="padding: 12px; min-width: 200px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">
              ${date}
            </div>
            <div style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #666; font-size: 12px;">Total Reviews:</span>
                <span style="font-weight: 600; font-size: 12px;">${total}</span>
              </div>
              ${selectedSeries === 'all' || selectedSeries === 'positive' ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; align-items: center;">
                  <span style="display: flex; align-items: center; font-size: 12px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${theme.palette.success.main}; display: inline-block; margin-right: 6px;"></span>
                    Positive:
                  </span>
                  <span style="font-weight: 600; color: ${theme.palette.success.main}; font-size: 12px;">${positive}</span>
                </div>
              ` : ''}
              ${selectedSeries === 'all' || selectedSeries === 'neutral' ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; align-items: center;">
                  <span style="display: flex; align-items: center; font-size: 12px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${theme.palette.warning.main}; display: inline-block; margin-right: 6px;"></span>
                    Neutral:
                  </span>
                  <span style="font-weight: 600; color: ${theme.palette.warning.main}; font-size: 12px;">${neutral}</span>
                </div>
              ` : ''}
              ${selectedSeries === 'all' || selectedSeries === 'negative' ? `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; font-size: 12px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${theme.palette.error.main}; display: inline-block; margin-right: 6px;"></span>
                    Negative:
                  </span>
                  <span style="font-weight: 600; color: ${theme.palette.error.main}; font-size: 12px;">${negative}</span>
                </div>
              ` : ''}
            </div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 11px; color: #999; text-align: center;">
              Click to view reviews
            </div>
          </div>
        `;
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

  // Show loading state while data is loading
  if (isLoading && !chartData.length) {
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
          title={
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h6">{title}</Typography>
              {(() => {
                const aggregationPeriod = getAggregationPeriod();
                let label = '';
                if (aggregationPeriod === 1) label = 'Daily';
                else if (aggregationPeriod === 4) label = '4-Day';
                else if (aggregationPeriod === 7) label = 'Weekly';
                else if (aggregationPeriod === 14) label = 'Bi-Weekly';
                else if (aggregationPeriod === 30) label = 'Monthly';
                else if (aggregationPeriod === 90) label = 'Quarterly';
                else label = `${aggregationPeriod}-Day`;

                return (
                  <Chip
                    label={label}
                    size="small"
                    icon={<Iconify icon="eva:pie-chart-2-fill" width={14} height={14} className="" sx={{}} />}
                    sx={{
                      height: 24,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main,
                    }}
                  />
                );
              })()}
            </Stack>
          }
          subheader={subheader || getChartDescription()}
          action={
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
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

              {/* Custom Date Range Controls */}
              {timeRange === 'custom' && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<Iconify icon="eva:calendar-outline" />}
                    onClick={() => {
                      setTempFromDate(customRange?.from || null);
                      setTempToDate(customRange?.to || null);
                      setDatePickerOpen(true);
                    }}
                    sx={{ minWidth: 180 }}
                  >
                    {customRange?.from && customRange?.to
                      ? `${customRange.from.toLocaleDateString()} - ${customRange.to.toLocaleDateString()}`
                      : 'Select dates'}
                  </Button>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                      value={customRange?.aggregation || 7}
                      onChange={(e) => {
                        const newAgg = e.target.value as number;
                        if (customRange?.from && customRange?.to) {
                          handleCustomRangeChange({
                            from: customRange.from,
                            to: customRange.to,
                            aggregation: newAgg
                          });
                        }
                      }}
                      label="Period"
                    >
                      <MenuItem value={1}>Daily</MenuItem>
                      <MenuItem value={4}>4-Day</MenuItem>
                      <MenuItem value={7}>Weekly</MenuItem>
                      <MenuItem value={14}>Bi-Weekly</MenuItem>
                      <MenuItem value={30}>Monthly</MenuItem>
                      <MenuItem value={90}>Quarterly</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}

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
              <Stack spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Loading analytics...
                </Typography>
              </Stack>
            </Box>
          ) : analyticsError ? (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stack spacing={2} alignItems="center">
                <Iconify icon="eva:alert-circle-outline" className="" height={48} sx={{ opacity: 0.5, color: 'error.main' }} />
                <Typography variant="body2" color="error.main">
                  Error loading analytics data
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {analyticsError.message || 'Please try again later'}
                </Typography>
              </Stack>
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
                  No analytics data available for the selected period
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Try selecting a different time range
                </Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Custom Date Picker Dialog */}
      <CustomDateRangePicker
        variant="calendar"
        title="Select Custom Date Range"
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        startDate={tempFromDate ? dayjs(tempFromDate) : null}
        endDate={tempToDate ? dayjs(tempToDate) : null}
        onChangeStartDate={(date) => setTempFromDate(date ? date.toDate() : null)}
        onChangeEndDate={(date) => setTempToDate(date ? date.toDate() : null)}
        error={tempFromDate && tempToDate ? tempFromDate > tempToDate : false}
        onSubmit={() => {
          if (tempFromDate && tempToDate && tempFromDate <= tempToDate) {
            handleCustomRangeChange({
              from: tempFromDate,
              to: tempToDate,
              aggregation: customRange?.aggregation || 7
            });
          }
        }}
        slotProps={{
          paper: {
            sx: {
              zIndex: 1401,
            }
          }
        }}
      />

      {/* Enhanced Date Reviews Modal */}
      <EnhancedDateReviewsModal
        isOpen={dateModal.isOpen}
        onClose={closeDateModal}
        date={dateModal.date}
        dateEnd={dateModal.dateEnd}
        teamSlug={teamSlug}
        locationId={locationId}
        sentiment={dateModal.sentiment}
      />
    </>
  );
}

