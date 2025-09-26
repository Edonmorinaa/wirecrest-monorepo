import { useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
// import { useTheme } from '@mui/material/styles'; // Currently unused
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const RATING_OPTIONS = [
  { value: 10, label: '10 points' },
  { value: 9, label: '9 points' },
  { value: 8, label: '8 points' },
  { value: 7, label: '7 points' },
  { value: 6, label: '6 points' },
  { value: 5, label: '5 points' },
  { value: 4, label: '4 points' },
  { value: 3, label: '3 points' },
  { value: 2, label: '2 points' },
  { value: 1, label: '1 point' },
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

const GUEST_TYPE_OPTIONS = [
  { value: 'COUPLE', label: 'Couples' },
  { value: 'FAMILY_WITH_YOUNG_CHILDREN', label: 'Families (Young)' },
  { value: 'FAMILY_WITH_OLDER_CHILDREN', label: 'Families (Older)' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'SOLO', label: 'Solo' },
  { value: 'GROUP_OF_FRIENDS', label: 'Friends' },
];

const LENGTH_OF_STAY_OPTIONS = [
  { value: 'short', label: 'Short (1-2 nights)' },
  { value: 'medium', label: 'Medium (3-7 nights)' },
  { value: 'long', label: 'Long (8+ nights)' },
];

export function BookingReviewsFilters({ filters, onFilterChange, stats }) {
  // const theme = useTheme(); // Currently unused
  const [expanded, setExpanded] = useState(false);

  const handleRatingChange = (event) => {
    const value = event.target.value;
    onFilterChange('ratings', typeof value === 'string' ? value.split(',').map(Number) : value);
  };

  const activeFiltersCount = [
    filters.search,
    filters.ratings?.length,
    filters.sentiment,
    filters.hasResponse,
    filters.isRead,
    filters.isImportant,
    filters.guestType,
    filters.lengthOfStay,
    filters.nationality,
    filters.roomType,
    filters.isVerifiedStay,
  ].filter(Boolean).length;

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Reviews ({stats?.total || 0})</Typography>

        <Stack direction="row" spacing={1}>
          {activeFiltersCount > 0 && (
            <Chip
              label={`${activeFiltersCount} active filters`}
              color="primary"
              variant="soft"
              size="small"
            />
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="eva:options-2-fill" width={16} height={16} />}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </Stack>
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search reviews..."
        value={filters.search || ''}
        onChange={(e) => onFilterChange('search', e.target.value)}
        InputProps={{
          startAdornment: (
            <Iconify
              icon="eva:search-fill"
              width={20}
              height={20}
              sx={{ mr: 1, color: 'text.disabled' }}
            />
          ),
        }}
      />

      {/* Expanded Filters */}
      {expanded && (
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={3}>
            {/* Rating Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Rating</InputLabel>
                <Select
                  multiple
                  value={filters.ratings || []}
                  onChange={handleRatingChange}
                  input={<OutlinedInput label="Rating" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={`${value}/10`} size="small" />
                      ))}
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

            {/* Guest Type Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Guest Type</InputLabel>
                <Select
                  value={filters.guestType || ''}
                  onChange={(e) => onFilterChange('guestType', e.target.value)}
                  input={<OutlinedInput label="Guest Type" />}
                >
                  <MenuItem value="">All Guest Types</MenuItem>
                  {GUEST_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Length of Stay Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Length of Stay</InputLabel>
                <Select
                  value={filters.lengthOfStay || ''}
                  onChange={(e) => onFilterChange('lengthOfStay', e.target.value)}
                  input={<OutlinedInput label="Length of Stay" />}
                >
                  <MenuItem value="">All Stays</MenuItem>
                  {LENGTH_OF_STAY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Verified Stay Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Verified Stay</InputLabel>
                <Select
                  value={
                    filters.isVerifiedStay === undefined ? '' : filters.isVerifiedStay.toString()
                  }
                  onChange={(e) =>
                    onFilterChange(
                      'isVerifiedStay',
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )
                  }
                  input={<OutlinedInput label="Verified Stay" />}
                >
                  <MenuItem value="">All Reviews</MenuItem>
                  <MenuItem value="true">Verified Only</MenuItem>
                  <MenuItem value="false">Not Verified</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sentiment Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Sentiment</InputLabel>
                <Select
                  value={filters.sentiment || ''}
                  onChange={(e) => onFilterChange('sentiment', e.target.value)}
                  input={<OutlinedInput label="Sentiment" />}
                >
                  <MenuItem value="">All Sentiments</MenuItem>
                  {SENTIMENT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Response Status */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Response Status</InputLabel>
                <Select
                  value={filters.hasResponse === undefined ? '' : filters.hasResponse.toString()}
                  onChange={(e) =>
                    onFilterChange(
                      'hasResponse',
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )
                  }
                  input={<OutlinedInput label="Response Status" />}
                >
                  <MenuItem value="">All Reviews</MenuItem>
                  <MenuItem value="true">With Response</MenuItem>
                  <MenuItem value="false">No Response</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sort By */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortBy || 'publishedDate'}
                  onChange={(e) => onFilterChange('sortBy', e.target.value)}
                  input={<OutlinedInput label="Sort By" />}
                >
                  {SORT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Sort Order */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Sort Order</InputLabel>
                <Select
                  value={filters.sortOrder || 'desc'}
                  onChange={(e) => onFilterChange('sortOrder', e.target.value)}
                  input={<OutlinedInput label="Sort Order" />}
                >
                  <MenuItem value="desc">Newest First</MenuItem>
                  <MenuItem value="asc">Oldest First</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Read Status */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Read Status</InputLabel>
                <Select
                  value={filters.isRead === undefined ? '' : filters.isRead.toString()}
                  onChange={(e) =>
                    onFilterChange(
                      'isRead',
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )
                  }
                  input={<OutlinedInput label="Read Status" />}
                >
                  <MenuItem value="">All Reviews</MenuItem>
                  <MenuItem value="true">Read</MenuItem>
                  <MenuItem value="false">Unread</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Importance */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Importance</InputLabel>
                <Select
                  value={filters.isImportant === undefined ? '' : filters.isImportant.toString()}
                  onChange={(e) =>
                    onFilterChange(
                      'isImportant',
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )
                  }
                  input={<OutlinedInput label="Importance" />}
                >
                  <MenuItem value="">All Reviews</MenuItem>
                  <MenuItem value="true">Important</MenuItem>
                  <MenuItem value="false">Normal</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Nationality Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Nationality"
                value={filters.nationality || ''}
                onChange={(e) => onFilterChange('nationality', e.target.value)}
                placeholder="e.g. United States"
              />
            </Grid>

            {/* Room Type Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Room Type"
                value={filters.roomType || ''}
                onChange={(e) => onFilterChange('roomType', e.target.value)}
                placeholder="e.g. Standard Double Room"
              />
            </Grid>
          </Grid>

          {/* Clear Filters */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => {
                onFilterChange('search', '');
                onFilterChange('ratings', undefined);
                onFilterChange('sentiment', undefined);
                onFilterChange('hasResponse', undefined);
                onFilterChange('isRead', undefined);
                onFilterChange('isImportant', undefined);
                onFilterChange('guestType', undefined);
                onFilterChange('lengthOfStay', undefined);
                onFilterChange('nationality', undefined);
                onFilterChange('roomType', undefined);
                onFilterChange('isVerifiedStay', undefined);
              }}
            >
              Clear All Filters
            </Button>
          </Box>
        </Box>
      )}
    </Stack>
  );
}
