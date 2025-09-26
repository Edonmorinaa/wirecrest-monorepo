import { useCallback, useEffect, useMemo, useState } from 'react';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Rating from '@mui/material/Rating';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useRouter, useSearchParams } from 'next/navigation';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

interface GoogleReviewsAnalyticsProps {
  teamSlug: string;
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

interface Review {
  id: string;
  name: string;
  stars: number;
  text?: string;
  publishedAtDate: string;
  responseFromOwnerText?: string;
  responseFromOwnerDate?: string;
  reviewerPhotoUrl?: string;
  reviewerNumberOfReviews: number;
  isLocalGuide: boolean;
  likesCount: number;
  reviewUrl: string;
  reviewImageUrls?: string[];
  visitedIn?: string;
  reviewMetadata?: {
    isRead: boolean;
    isImportant: boolean;
    sentiment?: number;
    keywords?: string[];
  };
}

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
}

// Helper functions for sentiment analysis
const getSentimentLabel = (sentiment: number | null): string => {
  if (!sentiment) return 'Unknown';
  if (sentiment >= 0.1) return 'Positive';
  if (sentiment <= -0.1) return 'Negative';
  return 'Neutral';
};

const getSentimentColor = (sentiment: number | null): 'success' | 'error' | 'default' => {
  if (!sentiment) return 'default';
  if (sentiment >= 0.1) return 'success';
  if (sentiment <= -0.1) return 'error';
  return 'default';
};

// Date Range Picker Component
function DateRangePicker({ 
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

  const handleAggregationChange = (value: number) => {
    setAggregation(value);
    if (fromDate && toDate) {
      onChange({ from: fromDate, to: toDate, aggregation: value });
    }
  };

  const aggregationOptions = [
    { value: 1, label: 'Daily (1 day)' },
    { value: 2, label: '2-day periods' },
    { value: 3, label: '3-day periods' },
    { value: 4, label: '4-day periods' },
    { value: 7, label: 'Weekly (7 days)' },
    { value: 14, label: 'Bi-weekly (14 days)' },
    { value: 30, label: 'Monthly (30 days)' },
    { value: 90, label: 'Quarterly (90 days)' },
  ];

  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Custom Date Range
      </Typography>
      <Grid container spacing={2} alignItems="flex-end">
        <Grid item xs={12} sm={4}>
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
          />
        </Grid>
        <Grid item xs={12} sm={4}>
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
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel>Aggregation</InputLabel>
            <Select
              value={aggregation}
              onChange={(e) => handleAggregationChange(e.target.value as number)}
              label="Aggregation"
            >
              {aggregationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Card>
  );
}

// Date Reviews Modal Component
function DateReviewsModal({ isOpen, onClose, date, dateEnd, teamSlug }: DateReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setReviews(data.data?.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  }, [date, dateEnd, teamSlug]);

  useEffect(() => {
    if (isOpen) {
      fetchDateReviews();
    }
  }, [isOpen, fetchDateReviews]);

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
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="eva:calendar-fill" className="" height={20} sx={{}} />
          <Typography variant="h6">
            Reviews for {getFormattedDateRange()}
          </Typography>
          {reviews.length > 0 && (
            <Chip 
              label={`${reviews.length} reviews`} 
              size="small" 
              color="primary" 
            />
          )}
        </Stack>
      </DialogTitle>
      
      <DialogContent>
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
          <Stack spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
            {reviews.map((review) => (
              <Card key={review.id} sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar 
                      src={review.reviewerPhotoUrl} 
                      sx={{ width: 32, height: 32 }}
                    >
                      {review.name?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2">{review.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(review.publishedAtDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Rating value={review.stars} readOnly size="small" />
                  </Stack>
                  
                  {review.text && (
                    <Typography variant="body2">{review.text}</Typography>
                  )}
                  
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {review.reviewMetadata?.sentiment !== undefined && (
                      <Chip
                        label={getSentimentLabel(review.reviewMetadata.sentiment)}
                        size="small"
                        color={getSentimentColor(review.reviewMetadata.sentiment)}
                        variant="outlined"
                      />
                    )}
                    {review.reviewMetadata?.isImportant && (
                      <Chip label="Important" size="small" color="warning" variant="outlined" />
                    )}
                    {!review.reviewMetadata?.isRead && (
                      <Chip label="Unread" size="small" color="secondary" variant="outlined" />
                    )}
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export function GoogleReviewsAnalytics({ teamSlug }: GoogleReviewsAnalyticsProps) {
  console.log('GoogleReviewsAnalytics rendered with teamSlug:', teamSlug, 'at:', new Date().toISOString());
  
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [constraints, setConstraints] = useState<DateRangeConstraints>({
    minDate: null,
    maxDate: null,
    totalReviews: 0
  });
  const [isLoadingConstraints, setIsLoadingConstraints] = useState(true);
  
  // Ensure chartData is always an array
  const safeChartData = Array.isArray(chartData) ? chartData : [];
  
  // Modal state for showing reviews for a specific date
  const [dateModal, setDateModal] = useState<{
    isOpen: boolean;
    date: string | null;
    dateEnd: string | null;
  }>({
    isOpen: false,
    date: null,
    dateEnd: null
  });

  // Get state from URL - memoized to prevent infinite loops
  const timeRange = useMemo(() => {
    return searchParams.get('timeRange') || '90d';
  }, [searchParams]);

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

  const timeRanges: TimeRangeOption[] = [
    { value: "7d", label: "Last 7 days", days: 7 },
    { value: "30d", label: "Last 30 days", days: 30 },
    { value: "90d", label: "Last 3 months", days: 90 },
    { value: "365d", label: "Last year", days: 365 },
    { value: "1825d", label: "Last 5 years", days: 1825 },
    { value: "custom", label: "Custom Range", days: 0 },
  ];

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
        } catch (textError) {
          errorText = 'Unable to read error response';
        }
        
        // Log error details for debugging
        console.warn('Date range API error response:', {
          status: response.status,
          statusText: response.statusText,
          url: apiUrl,
          errorText: errorText
        });
        
        // Set default constraints instead of throwing
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
        // Handle case where result.data is undefined
        setConstraints({
          minDate: null,
          maxDate: null,
          totalReviews: 0
        });
      }
    } catch (error) {
      console.warn('Error fetching date range constraints:', error);
      // Set default constraints on error
      setConstraints({
        minDate: null,
        maxDate: null,
        totalReviews: 0
      });
    } finally {
      setIsLoadingConstraints(false);
    }
  }, [teamSlug]);

  // Debounced fetch function to reduce API calls
  const debouncedFetchReviewsData = useCallback(async () => {
    if (!teamSlug) return;
    
    setIsLoading(true);
    try {
      let apiUrl = `/api/google/${teamSlug}/reviews/analytics`;
      
      if (timeRange === 'custom' && customRange) {
        // Use custom range parameters
        const fromDate = customRange.from.toISOString().split('T')[0];
        const toDate = customRange.to.toISOString().split('T')[0];
        apiUrl += `?startDate=${fromDate}&endDate=${toDate}&aggregation=${customRange.aggregation}`;
        console.log('Fetching custom range analytics:', { 
          fromDate, 
          toDate, 
          aggregation: customRange.aggregation,
          customRange,
          timeRange,
          apiUrl
        });
      } else {
        // Use predefined period
        apiUrl += `?period=${timeRange}`;
        console.log('Fetching analytics data for period:', timeRange, 'URL:', apiUrl);
      }
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (textError) {
          errorText = 'Unable to read error response';
        }
        
        console.warn('Analytics API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: apiUrl,
          errorText
        });
        
        // Set empty chart data instead of throwing
        setChartData([]);
        return;
      }
      
      const data = await response.json();
      console.log('Analytics data received:', data.data?.length, 'data points');
      
      setChartData(data.data || []);
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
    // This will trigger the data fetching useEffect
  }, [timeRange, customRange]);

  // Load data when parameters change
  useEffect(() => {
    console.log('useEffect triggered for data fetching - timeRange:', timeRange, 'customRange:', customRange);
    debouncedFetch();
    
    // Cleanup function to prevent memory leaks
    return () => {
      // The debounced function will handle its own cleanup
    };
  }, [debouncedFetch]);

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
    // Get current custom range from URL to avoid dependency issues
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
        dateEnd: data.dateEnd || null
      });
    }
  }, []);

  const closeDateModal = useCallback(() => {
    setDateModal({
      isOpen: false,
      date: null,
      dateEnd: null
    });
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

  const chartOptions = useChart({
    colors: [
      theme.palette.success.main, // Positive - Green
      theme.palette.warning.main, // Neutral - Yellow/Orange
      theme.palette.error.main,   // Negative - Red
    ],
    chart: {
      stacked: false, // Changed from true to false to prevent wave shape sharing
      zoom: {
        enabled: false,
      },
      events: {
        click: (event, chartContext, config) => {
          // Handle click events for data points
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
      // Add cursor styling for clickable data points
      toolbar: {
        show: false,
      },
      // Make the chart area clickable
      animations: {
        enabled: true,
        speed: 300,
      },
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 0,
      hover: {
        size: 6,
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
      width: 2,
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
        fillTo: 'origin', // Changed from 'end' to 'origin' so each series starts from 0
      },
    },
  });

  const series = [
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
  ];

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
      <Card>
        <CardHeader
          title="Reviews Analytics"
          subheader={getChartDescription()}
          action={
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
              <Chart
                type="area"
                series={series}
                options={chartOptions}
                height={400}
                sx={{
                  '& .apexcharts-canvas': {
                    cursor: 'pointer',
                  },
                  '& .apexcharts-series': {
                    cursor: 'pointer',
                  },
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
          <DateRangePicker
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

      {/* Date Reviews Modal */}
      <DateReviewsModal
        isOpen={dateModal.isOpen}
        onClose={closeDateModal}
        date={dateModal.date}
        dateEnd={dateModal.dateEnd}
        teamSlug={teamSlug}
      />
    </>
  );
}


// import { useState, useCallback } from 'react';

// import Card from '@mui/material/Card';
// import { useTheme } from '@mui/material/styles';
// import CardHeader from '@mui/material/CardHeader';

// import { fShortenNumber } from 'src/utils/format-number';

// import { Chart, useChart, ChartSelect, ChartLegends } from 'src/components/chart';

// // ----------------------------------------------------------------------

// export function GoogleReviewsAnalytics2({ title, subheader, chart, sx, ...other }) {
//   const theme = useTheme();

//   const [selectedSeries, setSelectedSeries] = useState('2023');

//   const chartColors = chart.colors ?? [theme.palette.primary.main, theme.palette.warning.main];

//   const chartOptions = useChart({
//     colors: chartColors,
//     xaxis: { categories: chart.categories },
//     ...chart.options,
//   });

//   const handleChangeSeries = useCallback((newValue) => {
//     setSelectedSeries(newValue);
//   }, []);

//   const currentSeries = chart.series.find((i) => i.name === selectedSeries);

//   return (
//     <Card sx={sx} {...other}>
//       <CardHeader
//         title={title}
//         subheader={subheader}
//         action={
//           <ChartSelect
//             options={chart.series.map((item) => item.name)}
//             value={selectedSeries}
//             onChange={handleChangeSeries}
//           />
//         }
//         sx={{ mb: 3 }}
//       />

//       <ChartLegends
//         colors={chartOptions?.colors}
//         labels={chart.series[0].data.map((item) => item.name)}
//         values={[fShortenNumber(1234), fShortenNumber(6789)]}
//         sx={{ px: 3, gap: 3 }}
//       />

//       <Chart
//         type="area"
//         series={currentSeries?.data}
//         options={chartOptions}
//         slotProps={{ loading: { p: 2.5 } }}
//         sx={{
//           pl: 1,
//           py: 2.5,
//           pr: 2.5,
//           height: 320,
//         }}
//       />
//     </Card>
//   );
// }
