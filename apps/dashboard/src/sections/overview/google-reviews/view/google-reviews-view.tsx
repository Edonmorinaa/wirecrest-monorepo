'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import useTeam from 'src/hooks/useTeam';
import { useGoogleProfile, useGoogleReviews, useLocationBySlug, useUpdateGoogleReviewMetadata } from 'src/hooks/useLocations';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { GoogleReviewsList } from '../google-reviews-list';
import { GoogleReviewsStats } from '../google-reviews-stats';
import { GoogleReviewsFilters } from '../google-reviews-filters';
import { GoogleReviewsWelcome } from '../google-reviews-welcome';

// Lazy load the heavy analytics component
const GoogleReviewsAnalytics2 = lazy(() => import('../google-reviews-analytics2').then(module => ({ default: module.GoogleReviewsAnalytics2 })));

// ----------------------------------------------------------------------

interface Filters {
  page?: number;
  limit?: number;
  ratings?: number[];
  hasResponse?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'publishedAtDate' | 'rating' | 'responseStatus';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
  startDate?: string;
  endDate?: string;
}

export function GoogleReviewsView() {
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
  
  const { profile: businessProfile } = useGoogleProfile(locationId, !!location && isValidLocationId);

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
  const filters = useMemo((): Filters => {
    const query = Object.fromEntries(searchParams.entries());
    const pageNum = query.page ? parseInt(query.page, 10) : 1;
    const limitNum = query.limit ? parseInt(query.limit, 10) : 10;
    return {
      page: !isNaN(pageNum) && pageNum > 0 ? pageNum : 1,
      limit: !isNaN(limitNum) && limitNum > 0 ? limitNum : 10,
      ratings: query.ratings ? 
        query.ratings.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r))
        : undefined,
      hasResponse: query.hasResponse === 'true' ? true : query.hasResponse === 'false' ? false : undefined,
      sentiment: query.sentiment as 'positive' | 'negative' | 'neutral' | undefined,
      search: query.search || undefined,
      sortBy: (query.sortBy as 'publishedAtDate' | 'rating' | 'responseStatus') || 'publishedAtDate',
      sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
      isRead: query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined,
      isImportant: query.isImportant === 'true' ? true : query.isImportant === 'false' ? false : undefined,
      startDate: query.startDate ? new Date(query.startDate).toISOString() : undefined,
      endDate: query.endDate ? new Date(query.endDate).toISOString() : undefined,
    };
  }, [searchParams]);

  // Convert filters to match the hook's expected format
  const hookFilters = useMemo(() => ({
    rating: filters.ratings, // Convert plural to singular for API
    sentiment: filters.sentiment,
    hasResponse: filters.hasResponse,
    search: filters.search,
    sortBy: filters.sortBy === 'rating' ? 'stars' : filters.sortBy,
    sortOrder: filters.sortOrder,
    isRead: filters.isRead,
    isImportant: filters.isImportant,
  }), [filters]);

  // Fetch reviews using tRPC hook
  const { 
    reviews, 
    pagination, 
    aggregates,
    allTimeStats,
    isLoading,
    refetch,
  } = useGoogleReviews(locationId, hookFilters, { page: filters.page || 1, limit: filters.limit || 10 }, !!location && isValidLocationId);
  
  // Mutation for updating review metadata
  const updateMetadataMutation = useUpdateGoogleReviewMetadata();
  
  // Preserve previous stats during loading to prevent showing 0
  const previousStatsRef = useRef<{
    total: number;
    averageRating: number;
    withResponse: number;
    unread: number;
  } | null>(null);
  
  // Convert all-time stats to stats format for metric cards
  // Use all-time stats for metric cards (total reviews, average rating, with response, unread)
  const stats = useMemo(() => {
    // If we have new data, use it and update the ref
    if (allTimeStats && !isLoading) {
      const newStats = {
        total: allTimeStats.totalReviews || 0,
        averageRating: allTimeStats.averageRating || 0,
        withResponse: allTimeStats.withResponse || 0,
        unread: allTimeStats.unread || 0,
      };
      previousStatsRef.current = newStats;
      return {
        ...newStats,
        // Keep filtered aggregates for other uses
        positive: aggregates?.sentimentBreakdown?.positive || 0,
        neutral: aggregates?.sentimentBreakdown?.neutral || 0,
        negative: aggregates?.sentimentBreakdown?.negative || 0,
        responded: aggregates?.respondedCount || 0,
        responseRate: aggregates?.responseRate || 0,
        ratingDistribution: aggregates?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }
    
    // If loading and we have previous stats, use them
    if (isLoading && previousStatsRef.current) {
      return {
        ...previousStatsRef.current,
        // Keep filtered aggregates for other uses
        positive: aggregates?.sentimentBreakdown?.positive || 0,
        neutral: aggregates?.sentimentBreakdown?.neutral || 0,
        negative: aggregates?.sentimentBreakdown?.negative || 0,
        responded: aggregates?.respondedCount || 0,
        responseRate: aggregates?.responseRate || 0,
        ratingDistribution: aggregates?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }
    
    // Fallback to defaults if no previous data
    return {
      total: allTimeStats?.totalReviews || previousStatsRef.current?.total || 0,
      averageRating: allTimeStats?.averageRating || previousStatsRef.current?.averageRating || 0,
      withResponse: allTimeStats?.withResponse || previousStatsRef.current?.withResponse || 0,
      unread: allTimeStats?.unread || previousStatsRef.current?.unread || 0,
      // Keep filtered aggregates for other uses
      positive: aggregates?.sentimentBreakdown?.positive || 0,
      neutral: aggregates?.sentimentBreakdown?.neutral || 0,
      negative: aggregates?.sentimentBreakdown?.negative || 0,
      responded: aggregates?.respondedCount || 0,
      responseRate: aggregates?.responseRate || 0,
      ratingDistribution: aggregates?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }, [allTimeStats, aggregates, isLoading]);

  const updateFilter = useCallback((key: keyof Filters, value: any) => {
    // Create a new URLSearchParams from the current search params
    // This ensures we preserve all existing query parameters
    const queryParams = new URLSearchParams(searchParams.toString());
    
    // Reset to page 1 when filters change (except when changing page)
    // if (key !== 'page') {
    //   queryParams.set('page', '1');
    // }
    
    // Handle the value update
    if (value === undefined || value === null || value === '') {
      queryParams.delete(key);
    } else if (key === 'ratings' && Array.isArray(value)) {
      // Handle ratings array properly
      if (value.length === 0) {
        queryParams.delete('ratings');
      } else {
        queryParams.set('ratings', value.join(','));
      }
    } else if (key === 'page') {
      // Explicitly set page value - ensure it's a valid number
      const pageNum = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        queryParams.set('page', pageNum.toString());
      } else {
        // If invalid page, default to 1 but don't delete it
        queryParams.set('page', '1');
      }
    } else {
      queryParams.set(key, String(value));
    }
    
    // Use router.replace with shallow routing to prevent full page reload
    const newQueryString = queryParams.toString();
    router.replace(`?${newQueryString}`, { scroll: false });
  }, [searchParams, router]);

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
        platform: 'google' as const,
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
  const breadcrumbs = useMemo(() => [
    { name: 'Dashboard', href: paths.dashboard.root },
    { name: 'Teams', href: paths.dashboard.teams.root },
    { name: team?.name || teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
    { name: location?.name || locationSlug, href: paths.dashboard.locations.bySlug(teamSlug, locationSlug) },
    { name: 'Google Reviews', href: '#' },
  ], [team?.name, teamSlug, location?.name, locationSlug]);

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
          heading="Google Reviews"
          links={breadcrumbs}
          action={null}
          sx={{}}
          backHref=""
        />

        {/* Welcome Section */}
        <GoogleReviewsWelcome 
          team={team}
          businessProfile={businessProfile}
          stats={stats}
          sx={{}}
        />

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
            <GoogleReviewsAnalytics2 teamSlug={teamSlug} locationId={locationId} />
          </Suspense>
        </Grid>
          
          {/* Stats Cards */}
        <GoogleReviewsStats stats={stats} />

        {/* Filters and Reviews List */}
        <Card>
          <Box sx={{ p: 3, borderBottom: `solid 1px ${theme.palette.divider}` }}>
            <GoogleReviewsFilters 
              filters={filters}
              onFilterChange={updateFilter}
              onResetFilters={resetFilters}
              pagination={pagination}
            />
          </Box>
          
          <Box sx={{ p: 3 }}>
            <GoogleReviewsList
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
