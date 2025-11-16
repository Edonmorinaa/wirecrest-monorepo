import type { ChangeEvent } from 'react';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { Prisma } from '@prisma/client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';

import { Iconify } from 'src/components/iconify';

import type { PaginationInfo } from 'src/hooks/use-tripadvisor-reviews';

// ----------------------------------------------------------------------

export interface ReviewFilters {
  page: number;
  limit: number;
  ratings?: number[];
  hasResponse?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy: 'publishedDate' | 'rating' | 'responseStatus';
  sortOrder: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
  tripType?: string;
  hasPhotos?: boolean;
  helpfulVotes?: boolean;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

export interface RatingOption {
  value: number;
  label: string;
}

export interface SentimentOption {
  value: 'positive' | 'neutral' | 'negative';
  label: string;
}

export interface SortOption {
  value: 'publishedDate' | 'rating' | 'responseStatus';
  label: string;
}

export interface SortOrderOption {
  value: 'asc' | 'desc';
  label: string;
}

export interface StatusOption {
  value: 'all' | 'true' | 'false';
  label: string;
}

export interface TripTypeOption {
  value: string;
  label: string;
}

export type TProps = {
  filters: ReviewFilters;
  pagination: PaginationInfo;
  searchValue: string;
  ratingOptions: RatingOption[];
  sentimentOptions: SentimentOption[];
  sortOptions: SortOption[];
  sortOrderOptions: SortOrderOption[];
  responseStatusOptions: StatusOption[];
  readStatusOptions: StatusOption[];
  importanceOptions: StatusOption[];
  tripTypeOptions: TripTypeOption[];
  onSearchChange: (value: string) => void;
  onRatingChange: (ratings: number[]) => void;
  onResponseStatusChange: (hasResponse: boolean | undefined) => void;
  onSentimentChange: (sentiment: 'positive' | 'negative' | 'neutral' | undefined) => void;
  onSortByChange: (sortBy: 'publishedDate' | 'rating' | 'responseStatus') => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
  onReadStatusChange: (isRead: boolean | undefined) => void;
  onImportanceChange: (isImportant: boolean | undefined) => void;
  onTripTypeChange: (tripType: string | undefined) => void;
  onResetFilters: () => void;
};

/**
 * Dumb component for TripAdvisor reviews filters
 * Only receives data and handlers, no internal state or logic
 */
export function TripAdvisorReviewsFilters({ 
  filters, 
  pagination,
  searchValue,
  ratingOptions,
  sentimentOptions,
  sortOptions,
  sortOrderOptions,
  responseStatusOptions,
  readStatusOptions,
  importanceOptions,
  tripTypeOptions,
  onSearchChange,
  onRatingChange,
  onResponseStatusChange,
  onSentimentChange,
  onSortByChange,
  onSortOrderChange,
  onReadStatusChange,
  onImportanceChange,
  onTripTypeChange,
  onResetFilters,
}: TProps): JSX.Element {
  const theme = useTheme();

  const handleRatingChange = (event: SelectChangeEvent<number[]>): void => {
    const value = event.target.value;
    const ratings = typeof value === 'string' ? [] : value;
    onRatingChange(ratings);
  };

  const handleResponseStatusChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    if (value === 'all') {
      onResponseStatusChange(undefined);
    } else {
      onResponseStatusChange(value === 'true');
    }
  };

  const handleReadStatusChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    if (value === 'all') {
      onReadStatusChange(undefined);
    } else {
      onReadStatusChange(value === 'true');
    }
  };

  const handleImportanceChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    if (value === 'all') {
      onImportanceChange(undefined);
    } else {
      onImportanceChange(value === 'true');
    }
  };

  const handleTripTypeChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    if (value === 'all') {
      onTripTypeChange(undefined);
    } else {
      onTripTypeChange(value);
    }
  };

  const handleSentimentChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    if (value === 'all') {
      onSentimentChange(undefined);
    } else {
      onSentimentChange(value as 'positive' | 'negative' | 'neutral');
    }
  };

  const getSelectedRatingsText = (): string => {
    if (!filters.ratings || filters.ratings.length === 0) {
      return 'All Ratings';
    }
    if (filters.ratings.length === 1) {
      return `${filters.ratings[0]} star`;
    }
    return `${filters.ratings.length} ratings selected`;
  };

  const getResponseStatusValue = (): string => {
    if (filters.hasResponse === true) return 'true';
    if (filters.hasResponse === false) return 'false';
    return 'all';
  };

  const getReadStatusValue = (): string => {
    if (filters.isRead === true) return 'true';
    if (filters.isRead === false) return 'false';
    return 'all';
  };

  const getImportanceValue = (): string => {
    if (filters.isImportant === true) return 'true';
    if (filters.isImportant === false) return 'false';
    return 'all';
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
            onClick={onResetFilters}
            startIcon={<Iconify icon="eva:refresh-fill" />}
          >
            Reset Filters
          </Button>
        }
      />

      <Box sx={{ p: 3, pt: 1 }}>
        <Grid container spacing={2.5}>
          {/* Search */}
          <Grid item xs={12} sm={12} md={4} lg={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search reviews..."
              value={searchValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />,
              }}
              sx={{ minWidth: 200 }}
            />
          </Grid>

          {/* Ratings Filter */}
          <Grid item xs={12} sm={12} md={4} lg={3}>
            <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Ratings</InputLabel>
              <Select
                multiple
                value={filters.ratings || []}
                onChange={handleRatingChange}
                input={<OutlinedInput label="Ratings" />}
                renderValue={() => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip size="small" label={getSelectedRatingsText()} />
                  </Box>
                )}
              >
                {ratingOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={(filters.ratings || []).includes(option.value)} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Response Status */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Response Status"
              value={getResponseStatusValue()}
              onChange={handleResponseStatusChange}
              sx={{ minWidth: 160 }}
            >
              {responseStatusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Sentiment */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sentiment"
              value={filters.sentiment || 'all'}
              onChange={handleSentimentChange}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All Sentiments</MenuItem>
              {sentimentOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Sort By */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sort By"
              value={filters.sortBy}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onSortByChange(e.target.value as 'publishedDate' | 'rating' | 'responseStatus')}
              sx={{ minWidth: 160 }}
            >
              {sortOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Sort Order */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sort Order"
              value={filters.sortOrder}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onSortOrderChange(e.target.value as 'asc' | 'desc')}
              sx={{ minWidth: 160 }}
            >
              {sortOrderOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Trip Type */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Trip Type"
              value={filters.tripType || 'all'}
              onChange={handleTripTypeChange}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All Trip Types</MenuItem>
              {tripTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Read Status */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Read Status"
              value={getReadStatusValue()}
              onChange={handleReadStatusChange}
              sx={{ minWidth: 160 }}
            >
              {readStatusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Importance */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Importance"
              value={getImportanceValue()}
              onChange={handleImportanceChange}
              sx={{ minWidth: 160 }}
            >
              {importanceOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {/* Results Summary */}
        <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((pagination.page - 1) * pagination.limit) + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
