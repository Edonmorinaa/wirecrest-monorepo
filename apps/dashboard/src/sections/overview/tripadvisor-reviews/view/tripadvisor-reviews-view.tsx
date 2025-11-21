'use client';

import type { Prisma } from '@prisma/client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { lazy, useMemo, useState, Suspense, useCallback, useEffect, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import type { PaginationInfo, TripAdvisorReviewWithRelations } from 'src/hooks/use-tripadvisor-reviews';
import useTeam from 'src/hooks/useTeam';
import { useLocationBySlug, useTripAdvisorProfile, useTripAdvisorReviews, useUpdateTripAdvisorReviewMetadata } from 'src/hooks/useLocations';

import { fNumber } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import type { LightboxSlide, ConvertedReviewData } from '../components/tripadvisor-reviews-list';
import type { 
  RatingOption, 
  ReviewFilters,
  SentimentOption as FilterSentimentOption, 
  SortOption, 
  SortOrderOption as FilterSortOrderOption, 
  StatusOption, 
  TripTypeOption,
} from '../components/tripadvisor-reviews-filters';
import type { StatCard } from '../components/tripadvisor-reviews-stats';
import type { WelcomeStat } from '../components/tripadvisor-reviews-welcome';

import { 
  TripAdvisorReviewsList, 
  TripAdvisorReviewsStats, 
  TripAdvisorReviewsFilters, 
  TripAdvisorReviewsWelcome,
} from '../components';

// Lazy load the heavy analytics component
const TripAdvisorReviewsAnalytics2 = lazy(() => 
  import('../tripadvisor-reviews-analytics2').then(module => ({ 
    default: module.TripAdvisorReviewsAnalytics2 
  }))
);

// ----------------------------------------------------------------------

// Constants for filter options
const RATING_OPTIONS: RatingOption[] = [
  { value: 5, label: '5 stars' },
  { value: 4, label: '4 stars' },
  { value: 3, label: '3 stars' },
  { value: 2, label: '2 stars' },
  { value: 1, label: '1 star' },
];

const SENTIMENT_OPTIONS: FilterSentimentOption[] = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

const SORT_OPTIONS: SortOption[] = [
  { value: 'publishedDate', label: 'Date' },
  { value: 'rating', label: 'Rating' },
  { value: 'responseStatus', label: 'Response Status' },
];

const SORT_ORDER_OPTIONS: FilterSortOrderOption[] = [
  { value: 'desc', label: 'Newest First' },
  { value: 'asc', label: 'Oldest First' },
];

const RESPONSE_STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'All Reviews' },
  { value: 'true', label: 'With Response' },
  { value: 'false', label: 'No Response' },
];

const READ_STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'All Reviews' },
  { value: 'true', label: 'Read' },
  { value: 'false', label: 'Unread' },
];

const IMPORTANCE_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'All Reviews' },
  { value: 'true', label: 'Important' },
  { value: 'false', label: 'Normal' },
];

const TRIP_TYPE_OPTIONS: TripTypeOption[] = [
  { value: 'FAMILY', label: 'Family' },
  { value: 'COUPLES', label: 'Couples' },
  { value: 'SOLO', label: 'Solo' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'FRIENDS', label: 'Friends' },
];

// ----------------------------------------------------------------------

/**
 * Smart component for TripAdvisor Reviews
 * Contains all business logic and state management
 * Passes only primitive data to dumb components
 */
export function TripAdvisorReviewsView(): JSX.Element {
  const theme = useTheme();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const teamSlug = params.slug as string;
  const locationSlug = params.locationSlug as string;

  // Get team data
  const { team } = useTeam(teamSlug);

  // Get location data
  const { location, isLoading: locationLoading } = useLocationBySlug(teamSlug, locationSlug);

  // Validate locationId
  const locationId = location?.id || '';
  const isValidLocationId = locationId && locationId.length > 20;

  // Get business profile
  const { isLoading: profileLoading } = useTripAdvisorProfile(
    locationId,
    !!location && isValidLocationId
  );

  // Local state for debounced search (synced with URL)
  const [searchValue, setSearchValue] = useState('');

  // Ensure page and limit are always in URL on initial load
  useEffect(() => {
    const hasPage = searchParams.has('page');
    const hasLimit = searchParams.has('limit');
    
    // Only update URL if page or limit is missing (initial load)
    if (!hasPage || !hasLimit) {
      const queryParams = new URLSearchParams(searchParams.toString());
      
      if (!hasPage) {
        queryParams.set('page', '1');
      }
      if (!hasLimit) {
        queryParams.set('limit', '10');
      }
      
      // Only update if we actually changed something
      router.replace(`?${queryParams.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - we intentionally don't include dependencies to prevent loops

  // Memoize filters extraction from URL to prevent unnecessary re-renders
  const filters = useMemo((): ReviewFilters => {
    const query = Object.fromEntries(searchParams.entries());
    return {
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 10,
      ratings: query.ratings 
        ? query.ratings.split(',').map(r => parseInt(r.trim(), 10)).filter(r => !isNaN(r))
        : undefined,
      hasResponse: query.hasResponse === 'true' ? true : query.hasResponse === 'false' ? false : undefined,
      sentiment: query.sentiment as 'positive' | 'negative' | 'neutral' | undefined,
      search: query.search || undefined,
      sortBy: (query.sortBy as 'publishedDate' | 'rating' | 'responseStatus') || 'publishedDate',
      sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
      isRead: query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined,
      isImportant: query.isImportant === 'true' ? true : query.isImportant === 'false' ? false : undefined,
      tripType: query.tripType || undefined,
      hasPhotos: query.hasPhotos === 'true' ? true : query.hasPhotos === 'false' ? false : undefined,
      helpfulVotes: query.helpfulVotes === 'true' ? true : query.helpfulVotes === 'false' ? false : undefined,
      dateRange: query.dateRange || undefined,
      startDate: query.startDate || undefined,
      endDate: query.endDate || undefined,
    };
  }, [searchParams]);

  // Sync search value with filters from URL
  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  // Convert filters to match the hook's expected format
  const hookFilters = useMemo(() => ({
    ...filters,
    sortBy: (filters.sortBy === 'rating' ? 'rating' : 
            filters.sortBy === 'responseStatus' ? 'publishedDate' : 
            filters.sortBy) as 'publishedDate' | 'rating' | 'helpfulVotes' | 'visitDate',
    tripType: filters.tripType ? [filters.tripType] : undefined,
    hasOwnerResponse: filters.hasResponse,
  }), [filters]);

  // Fetch reviews data
  const { 
    reviews: rawReviews,
    pagination: rawPagination,
    allTimeStats,
    isLoading,
    refetch,
  } = useTripAdvisorReviews(
    locationId,
    hookFilters,
    { page: filters.page, limit: filters.limit },
    !!location && isValidLocationId
  );

  // Cast reviews to the correct type
  const reviews = useMemo(() => rawReviews as unknown as TripAdvisorReviewWithRelations[], [rawReviews]);

  // Transform pagination to match expected type
  const pagination: PaginationInfo = useMemo(() => ({
    page: rawPagination?.page || 1,
    limit: rawPagination?.limit || 10,
    total: rawPagination?.totalCount || 0,
    totalPages: rawPagination?.totalPages || 0,
    hasNextPage: (rawPagination?.page || 1) < (rawPagination?.totalPages || 0),
    hasPreviousPage: (rawPagination?.page || 1) > 1,
  }), [rawPagination]);

  // Mutation for updating review metadata
  const updateMetadataMutation = useUpdateTripAdvisorReviewMetadata();

  // Preserve previous stats during loading to prevent showing 0
  const previousStatsRef = useRef<{
    total: number;
    averageRating: number;
    totalHelpfulVotes: number;
    unread: number;
  } | null>(null);

  // Use all-time stats for metric cards
  const stats = useMemo(() => {
    // If we have new data, use it and update the ref
    if (allTimeStats && !isLoading) {
      const newStats = {
        total: allTimeStats.totalReviews || 0,
        averageRating: allTimeStats.averageRating || 0,
        totalHelpfulVotes: allTimeStats.totalHelpfulVotes || 0,
        unread: allTimeStats.unread || 0,
      };
      previousStatsRef.current = newStats;
      return newStats;
    }
    
    // If loading and we have previous stats, use them
    if (isLoading && previousStatsRef.current) {
      return previousStatsRef.current;
    }
    
    // Fallback to defaults if no previous data
    return {
      total: allTimeStats?.totalReviews || previousStatsRef.current?.total || 0,
      averageRating: allTimeStats?.averageRating || previousStatsRef.current?.averageRating || 0,
      totalHelpfulVotes: allTimeStats?.totalHelpfulVotes || previousStatsRef.current?.totalHelpfulVotes || 0,
      unread: allTimeStats?.unread || previousStatsRef.current?.unread || 0,
    };
  }, [allTimeStats, isLoading]);

  // Update filter in URL
  const updateFilter = useCallback((key: keyof ReviewFilters, value: unknown): void => {
    const queryParams = new URLSearchParams(searchParams.toString());
    
    // Reset to page 1 when filters change (except when changing page)
    if (key !== 'page') {
      queryParams.set('page', '1');
    }
    
    if (value === undefined || value === null || value === '') {
      queryParams.delete(key);
    } else if (key === 'ratings' && Array.isArray(value)) {
      // Handle ratings array properly
      if (value.length === 0) {
        queryParams.delete(key);
      } else {
        queryParams.set(key, value.join(','));
      }
    } else {
      queryParams.set(key, String(value));
    }
    
    // Use router.replace with shallow routing to prevent full page reload
    router.replace(`?${queryParams.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Reset all filters
  const resetFilters = useCallback((): void => {
    const queryParams = new URLSearchParams();
    queryParams.set('page', '1');
    queryParams.set('limit', '10');
    setSearchValue('');
    router.replace(`?${queryParams.toString()}`, { scroll: false });
  }, [router]);

  // Handle debounced search with useEffect for cleanup
  const handleSearchChange = useCallback((value: string): void => {
    setSearchValue(value);
  }, []);

  // Separate effect for debounced filter update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFilter('search', searchValue || undefined);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchValue, updateFilter]);

  // Update review metadata
  const handleUpdateMetadata = useCallback(async (
    reviewId: string, 
    updates: Partial<Prisma.ReviewMetadataGetPayload<{}>>
  ): Promise<void> => {
    if (!locationId) {
      console.error('LocationId is required to update metadata');
      return;
    }
    
    try {
      await updateMetadataMutation.mutateAsync({
        locationId,
        platform: 'tripadvisor' as const,
        reviewId,
        metadata: updates,
      });
      
      // Refetch reviews to get updated data
      await refetch();
    } catch (err) {
      console.error('Error updating review metadata:', err);
    }
  }, [locationId, updateMetadataMutation, refetch]);

  // Convert TripAdvisor reviews to format expected by review card
  const convertedReviews = useMemo((): ConvertedReviewData[] => 
    (reviews || []).map((review: any) => ({
      id: review.id,
      name: review.reviewerName,
      text: review.text,
      title: review.title,
      publishedAtDate: review.publishedDate.toString(),
      responseFromOwnerText: review.responseFromOwnerText,
      responseFromOwnerDate: review.responseFromOwnerDate ? review.responseFromOwnerDate.toString() : null,
      reviewerPhotoUrl: review.reviewerPhotoUrl,
      reviewUrl: review.reviewUrl,
      reviewMetadata: review.reviewMetadata,
      tripAdvisorRating: review.rating,
      tripType: review.tripType,
      helpfulVotes: review.helpfulVotes,
      visitDate: review.visitDate ? review.visitDate.toString() : null,
      photos: review.photos?.map(photo => ({ id: photo.id, url: photo.url })),
    }))
  , [reviews]);

  // Prepare image data for lightbox
  const allImageUrls = useMemo((): string[] =>
    (reviews || [])
      .filter((review) => review.photos && Array.isArray(review.photos) && review.photos.length > 0)
      .flatMap((review) => review.photos?.map((photo) => photo.url) || [])
  , [reviews]);

  const lightboxSlides = useMemo((): LightboxSlide[] =>
    allImageUrls.map((src) => ({ src }))
  , [allImageUrls]);

  // Handle image click (for tracking or analytics)
  const handleImageClick = useCallback((_imageUrl: string): void => {
    // Could add analytics tracking here
  }, []);

  // Prepare stats cards data
  const statsCards = useMemo((): StatCard[] => [
    {
      title: 'Total Reviews',
      total: fNumber(stats?.total || 0),
      icon: <Iconify icon="solar:chart-2-bold" width={24} />,
      color: 'primary',
    },
    {
      title: 'Average Rating',
      total: `${stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0'} / 5`,
      icon: <Iconify icon="solar:star-bold" width={24} />,
      color: 'warning',
    },
    {
      title: 'Total Helpful Votes',
      total: `${stats?.totalHelpfulVotes || 0}`,
      subtitle:
        (stats?.total || 0) > 0
          ? `${((stats?.totalHelpfulVotes || 0) / (stats?.total || 1)).toFixed(1)} avg per review`
          : '0 avg per review',
      icon: <Iconify icon="solar:like-bold" width={24} />,
      color: 'success',
      showProgress: true,
      progressValue: (stats?.total || 0) > 0 ? ((stats?.totalHelpfulVotes || 0) / (stats?.total || 1)) * 10 : 0,
    },
    {
      title: 'Unread Reviews',
      total: fNumber(stats?.unread || 0),
      icon: <Iconify icon="solar:eye-bold" width={24} />,
      color: 'error',
    },
  ], [stats]);

  // Prepare welcome stats
  const welcomeStats = useMemo((): WelcomeStat[] => [
    {
      title: 'Total Reviews',
      value: stats?.total || 0,
    },
    {
      title: 'Average Rating',
      value: stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0',
    },
    {
      title: 'Helpful Votes',
      value: stats?.totalHelpfulVotes || 0,
    },
  ], [stats]);

  // Memoize breadcrumbs to prevent unnecessary re-renders
  const breadcrumbs = [
    { name: 'Dashboard', href: paths.dashboard.root },
    { name: 'Teams', href: paths.dashboard.teams.root },
    { name: team?.name || '', href: paths.dashboard.teams.bySlug(teamSlug) },
    { name: location?.name || '', href: "" },
    { name: 'TripAdvisor Reviews', href: '' }
  ]

  return (
    <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
      <Stack spacing={3}>
        {/* Breadcrumbs */}
        <CustomBreadcrumbs
          heading="TripAdvisor Reviews"
          links={breadcrumbs}
          action={null}
          sx={{}}
          backHref=""
        />

        {/* Loading State */}
        {(locationLoading || profileLoading || isLoading) && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>Loading TripAdvisor reviews data...</Typography>
          </Box>
        )}

        {/* Error State */}
        {!locationLoading && !location && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">Location not found</Typography>
          </Box>
        )}

        {/* Welcome Section */}
        {location && (
          <>
            <TripAdvisorReviewsWelcome 
              teamName={team?.name || 'TripAdvisor Reviews'}
              description="Monitor your TripAdvisor reviews and guest feedback"
              subtitle="TripAdvisor Business Profile"
              welcomeStats={welcomeStats}
              sx={{}}
            />

            {/* Stats Cards */}
            <TripAdvisorReviewsStats stats={statsCards} />

            {/* Analytics Chart - Lazy Loaded */}
            <Grid size={{ xs: 12 }}>
              <Suspense fallback={
                <Card sx={{ p: 3 }}>
                  <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Loading analytics...
                    </Typography>
                  </Box>
                </Card>
              }>
                <TripAdvisorReviewsAnalytics2 teamSlug={teamSlug} locationId={locationId} />
              </Suspense>
            </Grid>

            {/* Filters and Reviews List */}
            <Card>
              <Box sx={{ p: 3, borderBottom: `solid 1px ${theme.palette.divider}` }}>
                <TripAdvisorReviewsFilters 
                  filters={filters}
                  pagination={pagination}
                  searchValue={searchValue}
                  ratingOptions={RATING_OPTIONS}
                  sentimentOptions={SENTIMENT_OPTIONS}
                  sortOptions={SORT_OPTIONS}
                  sortOrderOptions={SORT_ORDER_OPTIONS}
                  responseStatusOptions={RESPONSE_STATUS_OPTIONS}
                  readStatusOptions={READ_STATUS_OPTIONS}
                  importanceOptions={IMPORTANCE_OPTIONS}
                  tripTypeOptions={TRIP_TYPE_OPTIONS}
                  onSearchChange={handleSearchChange}
                  onRatingChange={(ratings) => updateFilter('ratings', ratings)}
                  onResponseStatusChange={(hasResponse) => updateFilter('hasResponse', hasResponse)}
                  onSentimentChange={(sentiment) => updateFilter('sentiment', sentiment)}
                  onSortByChange={(sortBy) => updateFilter('sortBy', sortBy)}
                  onSortOrderChange={(sortOrder) => updateFilter('sortOrder', sortOrder)}
                  onReadStatusChange={(isRead) => updateFilter('isRead', isRead)}
                  onImportanceChange={(isImportant) => updateFilter('isImportant', isImportant)}
                  onTripTypeChange={(tripType) => updateFilter('tripType', tripType)}
                  onResetFilters={resetFilters}
                />
              </Box>
              
          <Box sx={{ p: 3 }}>
            <TripAdvisorReviewsList
              reviews={reviews}
              pagination={pagination}
              searchTerm={filters.search}
              allImageUrls={allImageUrls}
              lightboxSlides={lightboxSlides}
              convertedReviews={convertedReviews}
              onPageChange={(page) => updateFilter('page', page)}
              onUpdateMetadata={handleUpdateMetadata}
              onImageClick={handleImageClick}
            />
          </Box>
            </Card>
          </>
        )}
      </Stack>
    </DashboardContent>
  );
}
