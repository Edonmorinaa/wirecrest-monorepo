import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { Scrollbar } from 'src/components/scrollbar';
import { TableNoData, TablePaginationCustom } from 'src/components/table';

// ----------------------------------------------------------------------

export function GoogleReviewsList({ 
  reviews, 
  isLoading, 
  notFound, 
  pagination, 
  onPageChange, 
  onRowsPerPageChange 
}) {
  const renderReviewRow = (review) => {
    const { id, name, reviewerPhotoUrl, stars, text, publishedAtDate, responseFromOwnerText, reviewMetadata } = review;

    return (
      <Box key={id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} sm={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar src={reviewerPhotoUrl} alt={name}>
                {name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" noWrap>
                  {name}
                </Typography>
                <Rating value={stars} readOnly size="small" />
              </Box>
            </Stack>
          </Grid>
          
          <Grid item xs={12} sm={7}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {text || 'No review text'}
            </Typography>
            {responseFromOwnerText && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'background.neutral', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Response:
                </Typography>
                <Typography variant="body2">
                  {responseFromOwnerText}
                </Typography>
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} sm={2}>
            <Typography variant="caption" color="text.secondary">
              {fDate(publishedAtDate)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={1}>
            <Stack direction="row" spacing={0.5}>
              {!reviewMetadata.isRead && (
                <Chip label="New" size="small" color="primary" />
              )}
              {reviewMetadata.isImportant && (
                <Chip label="Important" size="small" color="warning" />
              )}
            </Stack>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Card>
      <Scrollbar>
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[...Array(5)].map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Skeleton variant="rectangular" height={100} />
              </Box>
            ))}
          </Box>
        ) : notFound ? (
          <TableNoData notFound={notFound} />
        ) : (
          <Box>
            {reviews.map(renderReviewRow)}
          </Box>
        )}
      </Scrollbar>

      {/* Pagination */}
      <TablePaginationCustom
        count={pagination.total}
        page={pagination.page - 1}
        rowsPerPage={pagination.limit}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        onRowsPerPageChange={(event) => onRowsPerPageChange(parseInt(event.target.value, 10))}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Card>
  );
}
