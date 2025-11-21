'use client';

import { lazy, useMemo, Suspense, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import useTeam from 'src/hooks/useTeam';
import { useLocationBySlug, useFacebookProfile, useFacebookReviews, useUpdateFacebookReviewMetadata } from 'src/hooks/useLocations';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import {
  FacebookReviewsList,
  FacebookReviewsStats,
  FacebookReviewsFilters,
  FacebookReviewsWelcome,
} from '../index';

// Lazy load the heavy analytics component
const FacebookReviewsAnalytics2 = lazy(() => 
  import('../facebook-reviews-analytics2').then(module => ({ default: module.FacebookReviewsAnalytics2 }))
);

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

export function FacebookReviewsView() {
  const theme = useTheme();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const teamSlug = params.slug as string;
  const locationSlug = params.locationSlug as string;

  // Get team and location data
  const { team } = useTeam(teamSlug);
  const { location, isLoading: locationLoading } = useLocationBySlug(teamSlug, locationSlug);
  
  // Validate locationId
  const locationId = location?.id || '';
  const isValidLocationId = locationId && locationId.length > 20;
  
  const { profile: businessProfile } = useFacebookProfile(locationId, !!location && isValidLocationId);

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

  // Memoize filters extraction to prevent unnecessary re-renders
  const filters = useMemo((): FacebookFilters => {
    const query = Object.fromEntries(searchParams.entries());
    return {
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 10,
      isRecommended:
        query.isRecommended === 'true' ? true : query.isRecommended === 'false' ? false : undefined,
      hasLikes: query.hasLikes === 'true' ? true : query.hasLikes === 'false' ? false : undefined,
      hasComments:
        query.hasComments === 'true' ? true : query.hasComments === 'false' ? false : undefined,
      hasPhotos:
        query.hasPhotos === 'true' ? true : query.hasPhotos === 'false' ? false : undefined,
      hasTags: query.hasTags === 'true' ? true : query.hasTags === 'false' ? false : undefined,
      minLikes: query.minLikes ? parseInt(query.minLikes) : undefined,
      maxLikes: query.maxLikes ? parseInt(query.maxLikes) : undefined,
      minComments: query.minComments ? parseInt(query.minComments) : undefined,
      maxComments: query.maxComments ? parseInt(query.maxComments) : undefined,
      sentiment: query.sentiment as 'positive' | 'negative' | 'neutral' | undefined,
      search: query.search || undefined,
      sortBy:
        (query.sortBy as 'date' | 'likes' | 'comments' | 'recommendation' | 'engagement') || 'date',
      sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
      isRead: query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined,
      isImportant:
        query.isImportant === 'true' ? true : query.isImportant === 'false' ? false : undefined,
    };
  }, [searchParams]);

  // Convert filters to match the hook's expected format
  const hookFilters = useMemo(
    () => ({
      ...filters,
      sortBy: (filters.sortBy === 'likes'
        ? 'likesCount'
        : filters.sortBy === 'comments'
          ? 'commentsCount'
          : filters.sortBy === 'recommendation'
            ? 'isRecommended'
            : filters.sortBy === 'engagement'
              ? 'likesCount'
              : 'date') as 'date' | 'likesCount' | 'commentsCount' | 'isRecommended',
    }),
    [filters]
  );

  const {
    reviews,
    pagination,
    aggregates,
    allTimeStats,
    isLoading,
    refetch,
  } = useFacebookReviews(locationId, hookFilters, { page: filters.page || 1, limit: filters.limit || 10 }, !!location && isValidLocationId);

  // Mutation for updating review metadata
  const updateMetadataMutation = useUpdateFacebookReviewMetadata();

  // Preserve previous stats during loading to prevent showing 0
  const previousStatsRef = useRef<{
    total: number;
    recommendationRate: number;
    responded: number;
    unread: number;
  } | null>(null);

  // Use all-time stats for metric cards (total reviews, recommendation rate, with response, unread)
  const stats = useMemo(() => {
    // Calculate sentiment breakdown from recommendations
    const recommended = aggregates?.recommendations?.recommendedCount || 0;
    const notRecommended = aggregates?.recommendations?.notRecommendedCount || 0;
    
    // Map recommended/not recommended to positive/negative sentiment
    const positive = recommended;
    const negative = notRecommended;
    const neutral = 0; // Facebook doesn't have neutral sentiment
    
    // Calculate response rate from filtered data
    const totalWithResponse = allTimeStats?.withResponse || 0;
    const totalReviews = allTimeStats?.totalReviews || 0;
    const responseRate = totalReviews > 0 ? (totalWithResponse / totalReviews) * 100 : 0;
    
    // If we have new data, use it and update the ref
    if (allTimeStats && !isLoading) {
      const newStats = {
        total: allTimeStats.totalReviews || 0,
        recommendationRate: allTimeStats.recommendationRate || 0,
        responded: allTimeStats.withResponse || 0,
        unread: allTimeStats.unread || 0,
      };
      previousStatsRef.current = newStats;
      return {
        ...newStats,
        // Additional aggregated metrics from filtered data
        positive,
        neutral,
        negative,
        responseRate,
        averageLikes: aggregates?.engagement?.averageLikesPerReview || 0,
        averageComments: aggregates?.engagement?.averageCommentsPerReview || 0,
      };
    }
    
    // If loading and we have previous stats, use them
    if (isLoading && previousStatsRef.current) {
      return {
        ...previousStatsRef.current,
        // Additional aggregated metrics from filtered data
        positive,
        neutral,
        negative,
        responseRate,
        averageLikes: aggregates?.engagement?.averageLikesPerReview || 0,
        averageComments: aggregates?.engagement?.averageCommentsPerReview || 0,
      };
    }
    
    // Fallback to defaults if no previous data
    return {
      total: allTimeStats?.totalReviews || previousStatsRef.current?.total || 0,
      recommendationRate: allTimeStats?.recommendationRate || previousStatsRef.current?.recommendationRate || 0,
      responded: allTimeStats?.withResponse || previousStatsRef.current?.responded || 0,
      unread: allTimeStats?.unread || previousStatsRef.current?.unread || 0,
      // Additional aggregated metrics from filtered data
      positive,
      neutral,
      negative,
      responseRate,
      averageLikes: aggregates?.engagement?.averageLikesPerReview || 0,
      averageComments: aggregates?.engagement?.averageCommentsPerReview || 0,
    };
  }, [allTimeStats, aggregates, isLoading]);

  const updateFilter = useCallback(
    (key: keyof FacebookFilters, value: any) => {
      const queryParams = new URLSearchParams(searchParams);

      // Reset to page 1 when filters change (except when changing page)
      // if (key !== 'page') {
      //   queryParams.set('page', '1');
      // }

      if (value === undefined || value === null || value === '') {
        queryParams.delete(key);
      } else {
        queryParams.set(key, value.toString());
      }

      // Use router.replace with shallow routing to prevent full page reload
      router.replace(`?${queryParams.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const resetFilters = useCallback(() => {
    // Clear all query parameters except essential ones
    const queryParams = new URLSearchParams();
    queryParams.set('page', '1');
    queryParams.set('limit', '10');

    // Use router.replace with shallow routing to prevent full page reload
    router.replace(`?${queryParams.toString()}`, { scroll: false });
  }, [router]);

  const handleUpdateMetadata = useCallback(async (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => {
    if (!locationId) {
      console.error('LocationId is required to update metadata');
      return;
    }

    try {
      await updateMetadataMutation.mutateAsync({
        locationId,
        platform: 'facebook' as const,
        reviewId,
        metadata: {
          [field]: value,
        },
      });
      
      // Refetch reviews to get updated data
      await refetch();
    } catch (error) {
      console.error('Error updating review metadata:', error);
      // You might want to show a toast notification here
      // toast.error(error instanceof Error ? error.message : 'Failed to update review');
    }
  }, [locationId, updateMetadataMutation, refetch]);

  // Memoize breadcrumbs to prevent unnecessary re-renders
  const breadcrumbs = useMemo(
    () => [
      { name: 'Dashboard', href: paths.dashboard.root },
      { name: 'Teams', href: paths.dashboard.teams.root },
      { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
      { name: location?.name || locationSlug, href: paths.dashboard.locations.bySlug(teamSlug, locationSlug) },
      { name: 'Facebook Reviews', href: '#' },
    ],
    [team?.name, teamSlug, location?.name, locationSlug]
  );

  // Show loading state
  if (locationLoading || !location) {
    return (
      <DashboardContent maxWidth="xl">
        <Typography>Loading location...</Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
      <Stack spacing={3}>
        {/* Breadcrumbs */}
        <CustomBreadcrumbs
          heading="Facebook Reviews"
          links={breadcrumbs}
          action={null}
          sx={{}}
          backHref=""
        />

        {/* Welcome Section */}
        <FacebookReviewsWelcome team={team} businessProfile={businessProfile} stats={stats} />

        {/* Analytics Chart - Lazy Loaded */}
        <Grid size={{ xs: 12 }}>
          <Suspense
            fallback={
              <Card sx={{ p: 3 }}>
                <Box
                  sx={{
                    height: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Loading analytics...
                  </Typography>
                </Box>
              </Card>
            }
          >
            <FacebookReviewsAnalytics2 teamSlug={teamSlug} locationId={locationId} />
          </Suspense>
        </Grid>

        {/* Stats Cards */}
        <FacebookReviewsStats stats={stats} sx={{}} />

        {/* Filters and Reviews List */}
        <Card>
          <Box sx={{ p: 3, borderBottom: `solid 1px ${theme.palette.divider}` }}>
            <FacebookReviewsFilters
              filters={filters}
              onFilterChange={updateFilter}
              onResetFilters={resetFilters}
              pagination={pagination}
            />
          </Box>

          <Box sx={{ p: 3 }}>
            <FacebookReviewsList
              reviews={(reviews || []) as any}
              pagination={pagination}
              filters={filters}
              isLoading={isLoading}
              onUpdateMetadata={handleUpdateMetadata}
              onPageChange={(page) => updateFilter('page', page)}
              onRefresh={refetch}
            />
          </Box>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
