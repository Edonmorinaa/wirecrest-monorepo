import { useState, useEffect } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface FacebookFilters {
  page?: number;
  limit?: number;
  // Facebook-specific fields
  isRecommended?: boolean;
  hasLikes?: boolean;
  hasComments?: boolean;
  hasPhotos?: boolean;
  hasTags?: boolean;
  minLikes?: number;
  maxLikes?: number;
  minComments?: number;
  maxComments?: number;
  // Common fields
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'date' | 'likes' | 'comments' | 'recommendation' | 'engagement';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
}

interface FacebookReviewsFiltersProps {
  filters: FacebookFilters;
  pagination?: any;
  onFilterChange: (key: keyof FacebookFilters, value: any) => void;
  onResetFilters?: () => void;
}

const RECOMMENDATION_OPTIONS = [
  { value: 'all', label: 'All Reviews' },
  { value: 'true', label: 'Recommended' },
  { value: 'false', label: 'Not Recommended' },
];

const SENTIMENT_OPTIONS = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'likes', label: 'Likes' },
  { value: 'comments', label: 'Comments' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'engagement', label: 'Engagement' },
];

const SORT_ORDER_OPTIONS = [
  { value: 'desc', label: 'Newest First' },
  { value: 'asc', label: 'Oldest First' },
];

const ENGAGEMENT_OPTIONS = [
  { value: 'all', label: 'All Reviews' },
  { value: 'likes', label: 'With Likes' },
  { value: 'comments', label: 'With Comments' },
  { value: 'photos', label: 'With Photos' },
  { value: 'tags', label: 'With Tags' },
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

export function FacebookReviewsFilters({
  filters,
  pagination,
  onFilterChange,
  onResetFilters,
}: FacebookReviewsFiltersProps) {
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

  const handleRecommendationChange = (value: string) => {
    if (value === 'all') {
      onFilterChange('isRecommended', undefined);
    } else {
      onFilterChange('isRecommended', value === 'true');
    }
  };

  const handleEngagementChange = (value: string) => {
    // Reset all engagement filters first
    onFilterChange('hasLikes', undefined);
    onFilterChange('hasComments', undefined);
    onFilterChange('hasPhotos', undefined);
    onFilterChange('hasTags', undefined);

    if (value !== 'all') {
      onFilterChange(
        `has${value.charAt(0).toUpperCase() + value.slice(1)}` as keyof FacebookFilters,
        true
      );
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

  const getEngagementValue = () => {
    if (filters.hasLikes) return 'likes';
    if (filters.hasComments) return 'comments';
    if (filters.hasPhotos) return 'photos';
    if (filters.hasTags) return 'tags';
    return 'all';
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon="eva:options-2-fill" className="" height={24} sx={{}} />
            Filters
          </Box>
        }
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={handleResetFilters}
            startIcon={<Iconify icon="eva:refresh-fill" className="" height={24} sx={{}} />}
          >
            Reset Filters
          </Button>
        }
      />

      <Box sx={{ p: 3, pt: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(8, 1fr)',
            },
            gap: 2.5,
          }}
        >
          {/* Search - Full width on mobile, half on tablet, third on desktop */}
          <Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Search reviews..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Iconify
                    icon="eva:search-fill"
                    className=""
                    height={24}
                    sx={{ mr: 1, color: 'text.disabled' }}
                  />
                ),
              }}
              sx={{ minWidth: 200 }}
            />
          </Box>

          {/* Recommendation Filter - Full width on mobile, half on tablet, third on desktop */}
          <Box>
            <TextField
              select
              fullWidth
              size="small"
              label="Recommendation"
              value={
                filters.isRecommended === true
                  ? 'true'
                  : filters.isRecommended === false
                    ? 'false'
                    : 'all'
              }
              onChange={(e) => handleRecommendationChange(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {RECOMMENDATION_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Engagement Filter - Full width on mobile, half on tablet, quarter on desktop */}
          <Box>
            <TextField
              select
              fullWidth
              size="small"
              label="Engagement"
              value={getEngagementValue()}
              onChange={(e) => handleEngagementChange(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {ENGAGEMENT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Sentiment - Full width on mobile, half on tablet, quarter on desktop */}
          <Box>
            <TextField
              select
              fullWidth
              size="small"
              label="Sentiment"
              value={filters.sentiment || 'all'}
              onChange={(e) =>
                onFilterChange('sentiment', e.target.value === 'all' ? undefined : e.target.value)
              }
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All Sentiments</MenuItem>
              {SENTIMENT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Sort By - Full width on mobile, half on tablet, quarter on desktop */}
          <Box>
            <TextField
              select
              fullWidth
              size="small"
              label="Sort By"
              value={filters.sortBy || 'date'}
              onChange={(e) => onFilterChange('sortBy', e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Sort Order - Full width on mobile, half on tablet, quarter on desktop */}
          <Box>
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
          </Box>

          {/* Read Status - Full width on mobile, half on tablet, quarter on desktop */}
          <Box>
            <TextField
              select
              fullWidth
              size="small"
              label="Read Status"
              value={filters.isRead === true ? 'true' : filters.isRead === false ? 'false' : 'all'}
              onChange={(e) => handleReadStatusChange(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {READ_STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Importance - Full width on mobile, half on tablet, quarter on desktop */}
          <Box>
            <TextField
              select
              fullWidth
              size="small"
              label="Importance"
              value={
                filters.isImportant === true
                  ? 'true'
                  : filters.isImportant === false
                    ? 'false'
                    : 'all'
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
          </Box>

          {/* Likes Range - Full width on mobile, half on tablet, quarter on desktop */}
          <Box>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Min Likes"
                value={filters.minLikes || ''}
                onChange={(e) =>
                  onFilterChange('minLikes', e.target.value ? parseInt(e.target.value) : undefined)
                }
                InputProps={{ inputProps: { min: 0 } }}
                sx={{ minWidth: 80 }}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Max Likes"
                value={filters.maxLikes || ''}
                onChange={(e) =>
                  onFilterChange('maxLikes', e.target.value ? parseInt(e.target.value) : undefined)
                }
                InputProps={{ inputProps: { min: 0 } }}
                sx={{ minWidth: 80 }}
              />
            </Stack>
          </Box>
          <Box>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Min Comments"
                value={filters.minComments || ''}
                onChange={(e) =>
                  onFilterChange(
                    'minComments',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                InputProps={{ inputProps: { min: 0 } }}
                sx={{ minWidth: 80 }}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Max Comments"
                value={filters.maxComments || ''}
                onChange={(e) =>
                  onFilterChange(
                    'maxComments',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                InputProps={{ inputProps: { min: 0 } }}
                sx={{ minWidth: 80 }}
              />
            </Stack>
          </Box>
        </Box>

        {/* Results Summary */}
        {pagination && (
          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body2" color="text.secondary">
              Showing {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
              results
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
}
