import { useState, useEffect } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface Filters {
  page?: number;
  limit?: number;
  ratings?: number[];
  hasResponse?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'publishedDate' | 'rating' | 'responseStatus';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
  tripType?: string;
  hasPhotos?: boolean;
  helpfulVotes?: boolean;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

interface TripAdvisorReviewsFiltersProps {
  filters: Filters;
  pagination?: any;
  onFilterChange: (key: keyof Filters, value: any) => void;
  onResetFilters?: () => void;
}

const RATING_OPTIONS = [
  { value: 5, label: '5 stars' },
  { value: 4, label: '4 stars' },
  { value: 3, label: '3 stars' },
  { value: 2, label: '2 stars' },
  { value: 1, label: '1 star' },
];

const SENTIMENT_OPTIONS = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

const SORT_OPTIONS = [
  { value: 'publishedDate', label: 'Date' },
  { value: 'rating', label: 'Rating' },
  { value: 'responseStatus', label: 'Response Status' },
];

const SORT_ORDER_OPTIONS = [
  { value: 'desc', label: 'Newest First' },
  { value: 'asc', label: 'Oldest First' },
];

const RESPONSE_STATUS_OPTIONS = [
  { value: 'all', label: 'All Reviews' },
  { value: 'true', label: 'With Response' },
  { value: 'false', label: 'No Response' },
];

const READ_STATUS_OPTIONS = [
  { value: 'all', label: 'All Reviews' },
  { value: 'true', label: 'Read' },
  { value: 'false', label: 'Unread' },
];

const IMPORTANCE_OPTIONS = [
  { value: 'all', label: 'All Reviews' },
  { value: 'true', label: 'Important' },
  { value: 'false', label: 'Normal' },
];

const TRIP_TYPE_OPTIONS = [
  { value: 'FAMILY', label: 'Family' },
  { value: 'COUPLES', label: 'Couples' },
  { value: 'SOLO', label: 'Solo' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'FRIENDS', label: 'Friends' },
];

export function TripAdvisorReviewsFilters({ 
  filters, 
  pagination, 
  onFilterChange, 
  onResetFilters 
}: TripAdvisorReviewsFiltersProps) {
  const theme = useTheme();
  
  // Local state for search input to enable debouncing
  const [searchInput, setSearchInput] = useState(filters.search || '');
  
  // Debounce the search input with 500ms delay
  const debouncedSearch = useDebounce(searchInput, 500);
  
  // Update the actual filter when debounced search changes
  useEffect(() => {
    onFilterChange('search', debouncedSearch || undefined);
  }, [debouncedSearch, onFilterChange]);
  
  // Sync local state when filters.search changes from outside (e.g., URL changes)
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  // Custom reset handler that also clears local search state
  const handleResetFilters = () => {
    setSearchInput('');
    if (onResetFilters) {
      onResetFilters();
    }
  };

  const handleRatingChange = (event: any) => {
    const value = event.target.value;
    onFilterChange('ratings', typeof value === 'string' ? value.split(',').map(Number) : value);
  };

  const handleResponseStatusChange = (value: string) => {
    if (value === 'all') {
      onFilterChange('hasResponse', undefined);
    } else {
      onFilterChange('hasResponse', value === 'true');
    }
  };

  const handleReadStatusChange = (value: string) => {
    if (value === 'all') {
      onFilterChange('isRead', undefined);
    } else {
      onFilterChange('isRead', value === 'true');
    }
  };

  const handleImportanceChange = (value: string) => {
    if (value === 'all') {
      onFilterChange('isImportant', undefined);
    } else {
      onFilterChange('isImportant', value === 'true');
    }
  };

  const handleTripTypeChange = (value: string) => {
    if (value === 'all') {
      onFilterChange('tripType', undefined);
    } else {
      onFilterChange('tripType', value);
    }
  };

  const getSelectedRatingsText = () => {
    if (!filters.ratings || filters.ratings.length === 0) {
      return 'All Ratings';
    }
    if (filters.ratings.length === 1) {
      return `${filters.ratings[0]} star`;
    }
    return `${filters.ratings.length} ratings selected`;
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon="eva:options-2-fill" />
            Filters
          </Box>
        }
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={handleResetFilters}
            startIcon={<Iconify icon="eva:refresh-fill" />}
          >
            Reset Filters
          </Button>
        }
      />

      <Box sx={{ p: 3, pt: 1 }}>
        <Grid container spacing={2.5}>
          {/* Search - Full width on mobile, half on tablet, third on desktop */}
          <Grid item xs={12} sm={12} md={4} lg={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search reviews..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />,
              }}
              sx={{ minWidth: 200 }}
            />
          </Grid>

          {/* Ratings Filter - Full width on mobile, half on tablet, third on desktop */}
          <Grid item xs={12} sm={12} md={4} lg={3}>
            <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Ratings</InputLabel>
              <Select
                multiple
                value={filters.ratings || []}
                onChange={handleRatingChange}
                input={<OutlinedInput label="Ratings" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip size="small" label={getSelectedRatingsText()} />
                  </Box>
                )}
              >
                {RATING_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={(filters.ratings || []).indexOf(option.value) > -1} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Response Status - Full width on mobile, half on tablet, quarter on desktop */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Response Status"
              value={
                filters.hasResponse === true ? 'true' : 
                filters.hasResponse === false ? 'false' : 'all'
              }
              onChange={(e) => handleResponseStatusChange(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {RESPONSE_STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Sentiment - Full width on mobile, half on tablet, quarter on desktop */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sentiment"
              value={filters.sentiment || 'all'}
              onChange={(e) => onFilterChange('sentiment', e.target.value === 'all' ? undefined : e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All Sentiments</MenuItem>
              {SENTIMENT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Sort By - Full width on mobile, half on tablet, quarter on desktop */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sort By"
              value={filters.sortBy || 'publishedDate'}
              onChange={(e) => onFilterChange('sortBy', e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Sort Order - Full width on mobile, half on tablet, quarter on desktop */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sort Order"
              value={filters.sortOrder || 'desc'}
              onChange={(e) => onFilterChange('sortOrder', e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {SORT_ORDER_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Trip Type - Full width on mobile, half on tablet, quarter on desktop */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Trip Type"
              value={filters.tripType || 'all'}
              onChange={(e) => handleTripTypeChange(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All Trip Types</MenuItem>
              {TRIP_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Read Status - Full width on mobile, half on tablet, quarter on desktop */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Read Status"
              value={
                filters.isRead === true ? 'true' : 
                filters.isRead === false ? 'false' : 'all'
              }
              onChange={(e) => handleReadStatusChange(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {READ_STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Importance - Full width on mobile, half on tablet, quarter on desktop */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Importance"
              value={
                filters.isImportant === true ? 'true' : 
                filters.isImportant === false ? 'false' : 'all'
              }
              onChange={(e) => handleImportanceChange(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {IMPORTANCE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {/* Results Summary */}
        {pagination && (
          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body2" color="text.secondary">
              Showing {((pagination.page - 1) * pagination.limit) + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
}
