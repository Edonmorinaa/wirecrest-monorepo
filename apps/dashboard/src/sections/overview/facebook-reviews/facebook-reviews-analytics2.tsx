import type { FacebookReview, FacebookReviewPhoto, ReviewMetadata } from '@prisma/client';

import dayjs from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import CardHeader from '@mui/material/CardHeader';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useFacebookReviews, useFacebookEnhancedGraph, useUpdateFacebookReviewMetadata } from 'src/hooks/useLocations';

import { fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Lightbox, useLightbox } from 'src/components/lightbox';
import { Chart, useChart, ChartLegends } from 'src/components/chart';
import { ReviewData } from 'src/components/review-card/dynamic-review-card';
import { CustomDateRangePicker } from 'src/components/custom-date-range-picker';
import { FacebookReviewCard } from 'src/components/review-card/platform-specific/facebook-review-card';

// ----------------------------------------------------------------------

interface FacebookReviewsAnalytics2Props {
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
  recommended: number;
  notRecommended: number;
}

// Extend Prisma types for our use case
type FacebookReviewWithMetadata = FacebookReview & {
  reviewMetadata?: ReviewMetadata | null;
  photos?: FacebookReviewPhoto[];
  reviewUrl?: string;
};

// Use the extended type as our main Review interface
type Review = FacebookReviewWithMetadata;

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

// Helper function to convert review data to generic ReviewData format
const convertToReviewData = (review: Review): ReviewData => ({
  id: review.id,
  name: review.userName,
  text: review.text || undefined,
  publishedAtDate: new Date(review.date).toISOString(),
  reviewerPhotoUrl: review.userProfilePic || undefined,
  reviewUrl: review.reviewUrl || review.url || `https://facebook.com`,
  isRecommended: review.isRecommended,
  facebookLikesCount: review.likesCount,
  commentsCount: review.commentsCount,
  tags: review.tags || [],
  photos: review.photos?.map((p, idx) => ({
    id: p.id || `photo-${idx}`,
    url: p.url,
  })),
  reviewImageUrls: review.photos?.map((p) => p.url),
  reviewMetadata: review.reviewMetadata,
});

// Enhanced Date Reviews Modal Component
function EnhancedDateReviewsModal({ isOpen, onClose, date, dateEnd, teamSlug, locationId, sentiment }: DateReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mutation for updating review metadata
  const updateMetadataMutation = useUpdateFacebookReviewMetadata();
  
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
        platform: 'facebook' as const,
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

  // Use useFacebookReviews hook to fetch reviews for this specific date
  const { 
    reviews: fetchedReviews, 
    isLoading: isFetchingReviews,
    error: fetchError
  } = useFacebookReviews(
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

    // Cast to Review type - all properties including reviewMetadata are preserved
    let filtered = fetchedReviews as unknown as Review[];
    
    // Filter by sentiment if specified
    if (sentiment && sentiment !== 'all') {
      filtered = filtered.filter((review) => {
        const reviewSentiment = review.reviewMetadata?.sentiment;
        
        // If no sentiment data, classify by recommendation status
        if (reviewSentiment === null || reviewSentiment === undefined) {
          switch (sentiment) {
            case 'recommended':
              return review.isRecommended;
            case 'notRecommended':
              return !review.isRecommended;
            default:
              return true;
          }
        }
        
        // Use sentiment score
        switch (sentiment) {
          case 'recommended':
            return reviewSentiment >= 0.1;
          case 'notRecommended':
            return reviewSentiment < -0.1;
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
                label={`${sentiment === 'recommended' ? 'Recommended' : 'Not Recommended'}`}
                size="small"
                sx={{
                  backgroundColor: sentiment === 'recommended' ? 'success.main' : 'error.main',
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
                  <FacebookReviewCard
                    review={convertToReviewData(review)}
                    onImageClick={(images, startIndex) => {
                      const globalIndex = allImages.findIndex(img => img === images[startIndex]);
                      if (globalIndex !== -1) {
                        onOpen(images[startIndex]);
                      }
                    }}
                    onUpdateMetadata={handleUpdateMetadata}
                    showGenerateAIReply
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

export function FacebookReviewsAnalytics2({ 
  teamSlug,
  locationId,
  title = "Review Analytics", 
  subheader,
  sx,
  ...other 
}: FacebookReviewsAnalytics2Props) {
  console.log('FacebookReviewsAnalytics2 rendered with teamSlug:', teamSlug, 'locationId:', locationId, 'at:', new Date().toISOString());
  
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  
  // Chart series selection state
  const [selectedSeries, setSelectedSeries] = useState('all');
  
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

  const { daily: analyticsData, isLoading: isFetchingAnalytics, error: analyticsError } = useFacebookEnhancedGraph(locationId, startDate, endDate);

  // Helper function to aggregate data by periods
  const aggregateDataByPeriod = useCallback((dailyData: any[], periodDays: number, rangeStart: Date, rangeEnd: Date) => {
    if (!dailyData || dailyData.length === 0) {
      // Still generate periods even with no data - filled with zeros
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
          recommended: 0,
          notRecommended: 0,
        });
        
        currentDate.setDate(currentDate.getDate() + periodDays);
      }
      
      return periods;
    }
    
    if (periodDays <= 1) {
      // For daily view, include all days in range
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
          recommended: dayData?.recommendedCount || dayData?.recommended || 0,
          notRecommended: dayData?.notRecommendedCount || dayData?.notRecommended || 0,
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
      
      // Cap the period end at the range end
      if (periodEnd > rangeEndDate) {
        periodEnd.setTime(rangeEndDate.getTime());
      }
      
      // Aggregate all days in this period
      let total = 0;
      let recommended = 0;
      let notRecommended = 0;
      
      const checkDate = new Date(periodStart);
      while (checkDate <= periodEnd && checkDate <= rangeEndDate) {
        const dateKey = checkDate.toISOString().split('T')[0];
        const dayData = dataMap.get(dateKey);
        
        if (dayData) {
          total += dayData.count || 0;
          recommended += dayData.recommendedCount || dayData.recommended || 0;
          notRecommended += dayData.notRecommendedCount || dayData.notRecommended || 0;
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
        recommended,
        notRecommended,
      });
      
      // Move to next period
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
      return 1; // Daily
    } else if (days <= 30) {
      return 4; // 4-day periods
    } else if (days <= 90) {
      return 7; // 7-day periods (weekly)
    } else if (days <= 365) {
      return 7; // 7-day periods (weekly)
    } else {
      return 30; // 30-day periods (monthly)
    }
  }, [timeRange, customRange, timeRanges]);

  // Transform analytics data to chart format - memoized to prevent infinite loops
  const chartData = useMemo(() => {
    if (!analyticsData) {
      return [];
    }

    console.log('Analytics data received from tRPC:', analyticsData);

    // Get the aggregation period
    const aggregationPeriod = getAggregationPeriod();
    console.log('Aggregating data by period:', aggregationPeriod, 'days');

    // Parse the date range from the query
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);

    // Aggregate the daily data
    const aggregatedData = aggregateDataByPeriod(analyticsData, aggregationPeriod, rangeStart, rangeEnd);
    
    console.log('Aggregated chart data:', aggregatedData);
    return aggregatedData;
  }, [analyticsData, startDate, endDate, aggregateDataByPeriod, getAggregationPeriod]);

  // Update loading state
  useEffect(() => {
    setIsLoading(isFetchingAnalytics);
  }, [isFetchingAnalytics]);

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
    if (selectedSeries === 'recommended') {
      return [theme.palette.success.main];
    } else if (selectedSeries === 'notRecommended') {
      return [theme.palette.error.main];
    } else {
      return [
        theme.palette.success.main, // Recommended - Green
        theme.palette.error.main,   // Not Recommended - Red
      ];
    }
  }, [selectedSeries, theme.palette.success.main, theme.palette.error.main]);

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
      categories: chartData.map(item => item.dateDisplay || item.date),
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
        const dataPoint = chartData[dataPointIndex];
        if (!dataPoint) return '';

        const date = dataPoint.dateDisplay || new Date(dataPoint.date).toLocaleDateString();
        const total = dataPoint.total || 0;
        const recommended = dataPoint.recommended || 0;
        const notRecommended = dataPoint.notRecommended || 0;

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
              ${selectedSeries === 'all' || selectedSeries === 'recommended' ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; align-items: center;">
                  <span style="display: flex; align-items: center; font-size: 12px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${theme.palette.success.main}; display: inline-block; margin-right: 6px;"></span>
                    Recommended:
                  </span>
                  <span style="font-weight: 600; color: ${theme.palette.success.main}; font-size: 12px;">${recommended}</span>
                </div>
              ` : ''}
              ${selectedSeries === 'all' || selectedSeries === 'notRecommended' ? `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; font-size: 12px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${theme.palette.error.main}; display: inline-block; margin-right: 6px;"></span>
                    Not Recommended:
                  </span>
                  <span style="font-weight: 600; color: ${theme.palette.error.main}; font-size: 12px;">${notRecommended}</span>
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
      name: 'Recommended',
      data: chartData.map(item => item.recommended),
    },
    {
      name: 'Not Recommended',
      data: chartData.map(item => item.notRecommended),
    },
  ], [chartData]);

  const currentSeries = useMemo(() => 
    selectedSeries === 'all' 
      ? allSeries 
      : allSeries.filter(series => series.name.toLowerCase().replace(' ', '') === selectedSeries.toLowerCase()), 
    [selectedSeries, allSeries]
  );

  const seriesOptions = ['all', 'recommended', 'notRecommended'];
  
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'recommended': return theme.palette.success.main;
      case 'notrecommended': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  };
  
  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'all': return 'All Reviews';
      case 'recommended': return 'Recommended';
      case 'notRecommended': return 'Not Recommended';
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
          ) : chartData.length > 0 ? (
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

