'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';

import { Iconify } from 'src/components/iconify';
import { OwnerResponseModal } from 'src/components/owner-response-modal/owner-response-modal';
import { useOwnerResponse } from 'src/hooks/useOwnerResponse';
import { Snackbar, Alert } from '@mui/material';

// ----------------------------------------------------------------------

export function BookingReviewsDashboard({ 
  reviews, 
  pagination, 
  stats, 
  isLoading, 
  onPageChange, 
  onFilterChange,
  filters 
}) {
  const [selectedReviews, setSelectedReviews] = useState([]);
  
  // AI Reply modal state
  const [selectedReview, setSelectedReview] = useState(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const { isLoading: isGenerating, generatedResponse, error, generateResponse, reset, snackbar, hideSnackbar } = useOwnerResponse();

  if (isLoading) {
    return <BookingReviewsSkeleton />;
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRating = (rating) => {
    if (rating === null || rating === undefined) return '—';
    return rating.toFixed(1);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'success.main';
    if (rating >= 4.0) return 'warning.main';
    if (rating >= 3.0) return 'info.main';
    return 'error.main';
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'success.main';
      case 'neutral': return 'warning.main';
      case 'negative': return 'error.main';
      default: return 'text.secondary';
    }
  };

  const getGuestTypeColor = (guestType) => {
    switch (guestType) {
      case 'COUPLE': return 'primary';
      case 'FAMILY_WITH_YOUNG_CHILDREN': return 'success';
      case 'FAMILY_WITH_OLDER_CHILDREN': return 'info';
      case 'BUSINESS': return 'warning';
      case 'SOLO': return 'secondary';
      case 'GROUP_OF_FRIENDS': return 'error';
      default: return 'default';
    }
  };

  const getGuestTypeLabel = (guestType) => {
    switch (guestType) {
      case 'COUPLE': return 'Couples';
      case 'FAMILY_WITH_YOUNG_CHILDREN': return 'Families (Young)';
      case 'FAMILY_WITH_OLDER_CHILDREN': return 'Families (Older)';
      case 'BUSINESS': return 'Business';
      case 'SOLO': return 'Solo';
      case 'GROUP_OF_FRIENDS': return 'Friends';
      default: return guestType;
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedReviews(reviews.map(review => review.id));
    } else {
      setSelectedReviews([]);
    }
  };

  const handleSelectReview = (reviewId) => {
    setSelectedReviews(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  // Handle AI Reply modal
  const handleGenerateReply = (review) => {
    setSelectedReview(review);
    setIsReplyModalOpen(true);
    reset();
  };

  const handleCloseReplyModal = () => {
    setIsReplyModalOpen(false);
    setSelectedReview(null);
    reset();
  };

  const handleGenerateResponseInModal = async () => {
    if (selectedReview) {
      await generateResponse(selectedReview, 'BOOKING');
    }
  };

  // Handle status updates (mark as read/important)
  const handleUpdateStatus = async (reviewId, field, value) => {
    try {
      // Extract team slug from the current URL or pass it as a prop
      const currentPath = window.location.pathname;
      const slugMatch = currentPath.match(/\/teams\/([^\/]+)/);
      const slug = slugMatch ? slugMatch[1] : '';
      
      const response = await fetch(`/api/teams/${slug}/booking/reviews/${reviewId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ field, value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // You might want to refresh the data here
      // onRefresh(); // if you have a refresh function
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <Box>
      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:chat-round-dots-bold" sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary.main" gutterBottom>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Reviews
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:star-bold" sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" color="warning.main" gutterBottom>
                {formatRating(stats.averageRating)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Rating
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:shield-check-bold" sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" color="success.main" gutterBottom>
                {stats.verifiedStays}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verified Stays
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:reply-bold" sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" color="info.main" gutterBottom>
                {stats.responseRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Response Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters & Search
          </Typography>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search reviews..."
                value={filters?.search || ''}
                onChange={(e) => onFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="solar:magnifer-bold" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Rating"
                value={filters?.rating || ''}
                onChange={(e) => onFilterChange('rating', e.target.value)}
              >
                <MenuItem value="">All Ratings</MenuItem>
                <MenuItem value="5">5 Stars</MenuItem>
                <MenuItem value="4">4+ Stars</MenuItem>
                <MenuItem value="3">3+ Stars</MenuItem>
                <MenuItem value="2">2+ Stars</MenuItem>
                <MenuItem value="1">1+ Stars</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Guest Type"
                value={filters?.guestType || ''}
                onChange={(e) => onFilterChange('guestType', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="COUPLE">Couples</MenuItem>
                <MenuItem value="FAMILY_WITH_YOUNG_CHILDREN">Families (Young)</MenuItem>
                <MenuItem value="FAMILY_WITH_OLDER_CHILDREN">Families (Older)</MenuItem>
                <MenuItem value="BUSINESS">Business</MenuItem>
                <MenuItem value="SOLO">Solo</MenuItem>
                <MenuItem value="GROUP_OF_FRIENDS">Friends</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Response"
                value={filters?.hasResponse || ''}
                onChange={(e) => onFilterChange('hasResponse', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">With Response</MenuItem>
                <MenuItem value="false">No Response</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onFilterChange('sortBy', 'publishedDate')}
                  startIcon={<Iconify icon="solar:calendar-bold" />}
                >
                  Date
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onFilterChange('sortBy', 'rating')}
                  startIcon={<Iconify icon="solar:star-bold" />}
                >
                  Rating
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onFilterChange('sortBy', 'lengthOfStay')}
                  startIcon={<Iconify icon="solar:calendar-bold" />}
                >
                  Stay
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Guest Reviews ({pagination.total})
            </Typography>
            
            {selectedReviews.length > 0 && (
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:reply-bold" />}
                >
                  Respond ({selectedReviews.length})
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:flag-bold" />}
                >
                  Mark Important
                </Button>
              </Stack>
            )}
          </Stack>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedReviews.length === reviews.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Guest</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Review</TableCell>
                  <TableCell>Guest Type</TableCell>
                  <TableCell>Stay Details</TableCell>
                  <TableCell>Response</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id} hover>
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedReviews.includes(review.id)}
                        onChange={() => handleSelectReview(review.id)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {review.reviewerName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {review.reviewerName}
                          </Typography>
                          {review.reviewerNationality && (
                            <Typography variant="caption" color="text.secondary">
                              {review.reviewerNationality}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Rating value={review.rating} readOnly size="small" />
                        <Typography variant="body2" sx={{ color: getRatingColor(review.rating) }}>
                          {formatRating(review.rating)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Box>
                        {review.title && (
                          <Typography variant="body2" fontWeight="medium" gutterBottom>
                            {review.title}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {review.text}
                        </Typography>
                        {review.likedMost && (
                          <Typography variant="caption" color="success.main" display="block">
                            👍 {review.likedMost}
                          </Typography>
                        )}
                        {review.dislikedMost && (
                          <Typography variant="caption" color="error.main" display="block">
                            👎 {review.dislikedMost}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={getGuestTypeLabel(review.guestType)}
                        color={getGuestTypeColor(review.guestType)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Stack spacing={0.5}>
                        {review.roomType && (
                          <Typography variant="caption" color="text.secondary">
                            {review.roomType}
                          </Typography>
                        )}
                        {review.lengthOfStay && (
                          <Typography variant="caption" color="text.secondary">
                            {review.lengthOfStay} night(s)
                          </Typography>
                        )}
                        {review.stayDate && (
                          <Typography variant="caption" color="text.secondary">
                            Stayed: {formatDate(review.stayDate)}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    
                    <TableCell>
                      <Stack spacing={0.5} alignItems="center">
                        {review.hasOwnerResponse ? (
                          <Chip
                            label="Responded"
                            color="success"
                            size="small"
                            icon={<Iconify icon="solar:check-circle-bold" />}
                          />
                        ) : (
                          <Chip
                            label="No Response"
                            color="warning"
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {review.isVerifiedStay && (
                          <Chip
                            label="Verified"
                            color="info"
                            size="small"
                            icon={<Iconify icon="solar:shield-check-bold" />}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(review.publishedDate)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Generate AI Reply">
                          <IconButton 
                            size="small"
                            onClick={() => handleGenerateReply(review)}
                            color="primary"
                          >
                            <Iconify icon="solar:magic-stick-bold" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={review.reviewMetadata?.isRead ? "Mark as unread" : "Mark as read"}>
                          <IconButton 
                            size="small"
                            onClick={() => handleUpdateStatus(review.id, 'isRead', !review.reviewMetadata?.isRead)}
                            color={review.reviewMetadata?.isRead ? "default" : "primary"}
                          >
                            <Iconify icon={review.reviewMetadata?.isRead ? "solar:eye-bold" : "solar:eye-closed-bold"} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={review.reviewMetadata?.isImportant ? "Remove from important" : "Mark as important"}>
                          <IconButton 
                            size="small"
                            onClick={() => handleUpdateStatus(review.id, 'isImportant', !review.reviewMetadata?.isImportant)}
                            color={review.reviewMetadata?.isImportant ? "warning" : "default"}
                          >
                            <Iconify icon={review.reviewMetadata?.isImportant ? "solar:star-bold" : "solar:star-line-bold"} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <Iconify icon="solar:eye-bold" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={(event, page) => onPageChange(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* AI Reply Modal */}
      <OwnerResponseModal
        open={isReplyModalOpen}
        onClose={handleCloseReplyModal}
        review={selectedReview}
        generatedResponse={generatedResponse}
        isLoading={isGenerating}
        error={error}
        onGenerateResponse={handleGenerateResponseInModal}
        platform="BOOKING"
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={hideSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function BookingReviewsSkeleton() {
  return (
    <Box>
      {/* Stats Skeleton */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[...Array(4)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Skeleton variant="circular" width={32} height={32} sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="80%" height={16} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters Skeleton */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {[...Array(5)].map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Skeleton variant="rectangular" width="100%" height={40} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Skeleton variant="text" width="40%" height={24} />
            <Skeleton variant="rectangular" width={200} height={32} />
          </Stack>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  {[...Array(9)].map((_, i) => (
                    <TableCell key={i}>
                      <Skeleton variant="text" width="100%" height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(5)].map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {[...Array(9)].map((_, colIndex) => (
                      <TableCell key={colIndex}>
                        <Skeleton variant="text" width="100%" height={20} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
