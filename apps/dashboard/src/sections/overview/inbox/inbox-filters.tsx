import { Search, Filter } from 'lucide-react';

import { 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  InputAdornment,
  SxProps, 
  Theme
} from '@mui/material';

import { InboxFilters } from 'src/hooks/use-inbox-reviews';

// ----------------------------------------------------------------------

interface InboxFiltersProps {
  filters: InboxFilters;
  onFiltersChange: (filters: InboxFilters) => void;
  sx?: SxProps<Theme>;
}

export function InboxFiltersComponent({ filters, onFiltersChange, sx }: InboxFiltersProps) {
  const handleFilterChange = (field: keyof InboxFilters, value: any) => {
    onFiltersChange({ ...filters, [field]: value, page: 1 }); // Reset to page 1 when filters change
  };

  return (
    <Card sx={sx}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Filter size={20} />
          <Box component="h6" sx={{ m: 0, fontWeight: 600 }}>
            Filters
          </Box>
        </Box>
        
        <Grid container spacing={2}>
          {/* Search */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              placeholder="Search reviews..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>

          {/* Platform Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Platform</InputLabel>
              <Select
                value={filters.platforms?.length ? filters.platforms[0] : 'all'}
                onChange={(e) => handleFilterChange('platforms', e.target.value === 'all' ? [] : [e.target.value])}
                label="Platform"
              >
                <MenuItem value="all">All Platforms</MenuItem>
                <MenuItem value="google">Google</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="tripadvisor">TripAdvisor</MenuItem>
                <MenuItem value="booking">Booking.com</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Status Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="unread">Unread</MenuItem>
                <MenuItem value="read">Read</MenuItem>
                <MenuItem value="important">Important</MenuItem>
                <MenuItem value="replied">Replied</MenuItem>
                <MenuItem value="not-replied">Not Replied</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Sort By */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy || 'date'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                label="Sort By"
              >
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="rating">Rating</MenuItem>
                <MenuItem value="sentiment">Sentiment</MenuItem>
                <MenuItem value="platform">Platform</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
