'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import {
  useBookingReviews,
  useFacebookReviews,
  useGoogleReviews,
  useTripAdvisorReviews,
} from 'src/hooks/useLocations';

import { fDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface RecentReviewsProps {
  locationId: string;
  isEnabled: boolean;
}

interface UnifiedReview {
  id: string;
  platform: 'google' | 'facebook' | 'tripadvisor' | 'booking';
  author: string;
  authorImage?: string;
  rating: number;
  text?: string;
  date: string;
  hasReply: boolean;
}

const platformConfig = {
  google: {
    icon: 'logos:google-icon',
    color: '#4285F4',
  },
  facebook: {
    icon: 'logos:facebook',
    color: '#1877F2',
  },
  tripadvisor: {
    icon: 'simple-icons:tripadvisor',
    color: '#00AF87',
  },
  booking: {
    icon: 'simple-icons:bookingdotcom',
    color: '#003580',
  },
};

function ReviewSkeleton() {
  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Stack direction="row" spacing={2}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="50%" />
        </Box>
      </Stack>
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
    </Stack>
  );
}

function ReviewItem({ review }: { review: UnifiedReview }) {
  const config = platformConfig[review.platform];

  return (
    <Stack
      spacing={2}
      sx={{
        p: 2,
        borderBottom: (theme) => `1px dashed ${theme.palette.divider}`,
        '&:last-child': {
          borderBottom: 'none',
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Avatar src={review.authorImage} alt={review.author}>
          {review.author.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="subtitle2" noWrap>
              {review.author}
            </Typography>
            <Chip
              icon={<Iconify icon={config.icon} width={16} />}
              label={review.platform}
              size="small"
              variant="outlined"
              sx={{ textTransform: 'capitalize' }}
            />
            {review.hasReply && (
              <Chip
                icon={<Iconify icon="solar:check-circle-bold" width={16} />}
                label="Replied"
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            <Rating value={review.rating} readOnly size="small" precision={0.1} />
            <Typography variant="caption" color="text.secondary">
              {fDate(review.date)}
            </Typography>
          </Stack>

          {review.text && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {review.text}
            </Typography>
          )}
        </Box>
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function RecentReviews({ locationId, isEnabled }: RecentReviewsProps) {
  // Fetch recent reviews from all platforms
  const { reviews: googleReviews, isLoading: googleLoading } = useGoogleReviews(
    locationId,
    {},
    { page: 1, limit: 10 },
    isEnabled
  );
  const { reviews: facebookReviews, isLoading: facebookLoading } = useFacebookReviews(
    locationId,
    {},
    { page: 1, limit: 10 },
    isEnabled
  );
  const { reviews: tripadvisorReviews, isLoading: tripadvisorLoading } = useTripAdvisorReviews(
    locationId,
    {},
    { page: 1, limit: 10 },
    isEnabled
  );
  const { reviews: bookingReviews, isLoading: bookingLoading } = useBookingReviews(
    locationId,
    {},
    { page: 1, limit: 10 },
    isEnabled
  );

  // Combine and normalize reviews
  const unifiedReviews = useMemo<UnifiedReview[]>(() => {
    const combined: UnifiedReview[] = [];

    // Transform Google reviews
    if (googleReviews) {
      googleReviews.forEach((review: any) => {
        combined.push({
          id: review.id,
          platform: 'google',
          author: review.name || 'Anonymous',
          authorImage: review.reviewerPhotoUrl,
          rating: review.stars,
          text: review.text,
          date: review.publishedAtDate || new Date().toISOString(),
          hasReply: !!review.responseFromOwnerText,
        });
      });
    }

    // Transform Facebook reviews
    if (facebookReviews) {
      facebookReviews.forEach((review: any) => {
        combined.push({
          id: review.id,
          platform: 'facebook',
          author: review.userName || 'Anonymous',
          authorImage: review.userProfilePic,
          rating: review.isRecommended ? 5 : 1,
          text: review.text,
          date: review.date || new Date().toISOString(),
          hasReply: !!review.responseFromOwner,
        });
      });
    }

    // Transform TripAdvisor reviews
    if (tripadvisorReviews) {
      tripadvisorReviews.forEach((review: any) => {
        combined.push({
          id: review.id,
          platform: 'tripadvisor',
          author: review.username || 'Anonymous',
          authorImage: review.userProfile?.avatar,
          rating: review.rating,
          text: review.text,
          date: review.publishedDate || new Date().toISOString(),
          hasReply: !!review.ownerResponse,
        });
      });
    }

    // Transform Booking reviews
    if (bookingReviews) {
      bookingReviews.forEach((review: any) => {
        combined.push({
          id: review.id,
          platform: 'booking',
          author: review.guestName || 'Anonymous',
          authorImage: review.guestAvatar,
          rating: review.averageScore || 0,
          text: `${review.pros || ''}\n${review.cons || ''}`.trim(),
          date: review.reviewDate || review.stayDate || new Date().toISOString(),
          hasReply: !!review.propertyResponse,
        });
      });
    }

    // Sort by date (most recent first)
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Return top 10 most recent
    return combined.slice(0, 10);
  }, [googleReviews, facebookReviews, tripadvisorReviews, bookingReviews]);

  const isLoading = googleLoading || facebookLoading || tripadvisorLoading || bookingLoading;

  return (
    <Card>
      <CardHeader
        title="Recent Reviews"
        subheader="Latest reviews from all platforms"
        action={
          <Chip
            label={`${unifiedReviews.length} reviews`}
            size="small"
            color="primary"
            variant="filled"
          />
        }
      />

      {isLoading ? (
        <Box>
          {[...Array(3)].map((_, index) => (
            <ReviewSkeleton key={index} />
          ))}
        </Box>
      ) : unifiedReviews.length > 0 ? (
        <Box>
          {unifiedReviews.map((review) => (
            <ReviewItem key={`${review.platform}-${review.id}`} review={review} />
          ))}
        </Box>
      ) : (
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <Iconify icon="solar:chat-round-like-bold" width={64} sx={{ mb: 2, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary">
            No reviews yet
          </Typography>
        </Box>
      )}
    </Card>
  );
}

