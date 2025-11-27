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
import { useLocationBySlug, useBookingProfile, useBookingReviews, useUpdateBookingReviewMetadata } from 'src/hooks/useLocations';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { BookingReviewsList } from '../booking-reviews-list';
import { BookingReviewsStats } from '../booking-reviews-stats';
import { BookingReviewsFilters } from '../booking-reviews-filters';
import { BookingReviewsWelcome } from '../booking-reviews-welcome';

// Lazy load the heavy analytics component
const BookingReviewsAnalytics2 = lazy(() =>
  import('../booking-reviews-analytics2').then((module) => ({
    default: module.BookingReviewsAnalytics2,
  }))
);

// ----------------------------------------------------------------------

interface Filters {
  page?: number;
  limit?: number;
  ratings?: number[];
  hasResponse?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'publishedDate' | 'rating' | 'responseStatus';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
  guestType?: string;
  lengthOfStay?: string;
  nationality?: string;
  roomType?: string;
  isVerifiedStay?: boolean;
}

export function BookingReviewsView() {
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
  const { profile: businessProfile, isLoading: profileLoading } = useBookingProfile(
    locationId,
    !!location && isValidLocationId
  );

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
    return {
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 10,
      ratings: query.ratings
        ? query.ratings
          .split(',')
          .map((r) => parseInt(r.trim()))
          .filter((r) => !isNaN(r))
        : undefined,
      hasResponse:
        query.hasResponse === 'true' ? true : query.hasResponse === 'false' ? false : undefined,
      sentiment: query.sentiment as 'positive' | 'negative' | 'neutral' | undefined,
      search: query.search || undefined,
      sortBy: (query.sortBy as 'publishedDate' | 'rating' | 'responseStatus') || 'publishedDate',
      sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
      isRead: query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined,
      isImportant:
        query.isImportant === 'true' ? true : query.isImportant === 'false' ? false : undefined,
      guestType: query.guestType || undefined,
      lengthOfStay: query.lengthOfStay || undefined,
      nationality: query.nationality || undefined,
      roomType: query.roomType || undefined,
      isVerifiedStay:
        query.isVerifiedStay === 'true'
          ? true
          : query.isVerifiedStay === 'false'
            ? false
            : undefined,
    };
  }, [searchParams]);

  // Convert filters to match the hook's expected format
  const hookFilters = useMemo(
    () => ({
      ...filters,
      sortBy: (filters.sortBy === 'rating'
        ? 'rating'
        : filters.sortBy === 'responseStatus'
          ? 'responseStatus'
          : filters.sortBy) as 'publishedDate' | 'rating' | 'responseStatus',
    }),
    [filters]
  );

  // Fetch reviews data
  const {
    reviews,
    pagination,
    aggregates,
    allTimeStats,
    isLoading,
    refetch,
  } = useBookingReviews(
    locationId,
    hookFilters,
    { page: filters.page || 1, limit: filters.limit || 10 },
    !!location && isValidLocationId
  );

  // Mutation for updating review metadata
  const updateMetadataMutation = useUpdateBookingReviewMetadata();

  // Preserve previous stats during loading to prevent showing 0
  const previousStatsRef = useRef<{
    total: number;
    averageRating: number;
    responded: number;
    unread: number;
  } | null>(null);

  // Use all-time stats for metric cards (total reviews, average rating, with response, unread)
  const stats = useMemo(() => {
    // If we have new data, use it and update the ref
    if (allTimeStats && !isLoading) {
      const newStats = {
        total: allTimeStats.totalReviews || 0,
        averageRating: allTimeStats.averageRating || 0,
        responded: allTimeStats.withResponse || 0,
        unread: allTimeStats.unread || 0,
      };
      previousStatsRef.current = newStats;
      return {
        ...newStats,
        // Keep filtered aggregates for other uses
        positive: aggregates?.sentimentBreakdown?.positive || 0,
        neutral: aggregates?.sentimentBreakdown?.neutral || 0,
        negative: aggregates?.sentimentBreakdown?.negative || 0,
        responseRate: aggregates?.responseRate || 0,
        verifiedStays: aggregates?.verifiedStays || 0,
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
        responseRate: aggregates?.responseRate || 0,
        verifiedStays: aggregates?.verifiedStays || 0,
      };
    }

    // Fallback to defaults if no previous data
    return {
      total: allTimeStats?.totalReviews || previousStatsRef.current?.total || 0,
      averageRating: allTimeStats?.averageRating || previousStatsRef.current?.averageRating || 0,
      responded: allTimeStats?.withResponse || previousStatsRef.current?.responded || 0,
      unread: allTimeStats?.unread || previousStatsRef.current?.unread || 0,
      // Keep filtered aggregates for other uses
      positive: aggregates?.sentimentBreakdown?.positive || 0,
      neutral: aggregates?.sentimentBreakdown?.neutral || 0,
      negative: aggregates?.sentimentBreakdown?.negative || 0,
      responseRate: aggregates?.responseRate || 0,
      verifiedStays: aggregates?.verifiedStays || 0,
    };
  }, [allTimeStats, aggregates, isLoading]);

  const updateFilter = useCallback(
    (key: keyof Filters, value: any) => {
      const queryParams = new URLSearchParams(searchParams);

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
        platform: 'booking' as const,
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
      { name: team?.name || '', href: paths.dashboard.teams.bySlug(teamSlug) },
      { name: location?.name || '', href: "" },
      { name: 'Booking.com Reviews' },
    ],
    [team?.name, location?.name, teamSlug]
  );

  return (
    <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
      <Stack spacing={3}>
        {/* Breadcrumbs */}
        <CustomBreadcrumbs
          heading="Booking.com Reviews"
          links={breadcrumbs}
          action={null}
          sx={{}}
          backHref=""
        />

        {/* Loading State */}
        {(locationLoading || profileLoading) && !location && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>Loading location...</Typography>
          </Box>
        )}

        {/* Welcome Section */}
        {location && (
          <>
            <BookingReviewsWelcome
              team={team}
              businessProfile={businessProfile}
              stats={stats}
              sx={{}}
            />

            {/* Stats Cards */}
            <BookingReviewsStats stats={stats} />

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
                <BookingReviewsAnalytics2 teamSlug={teamSlug} locationId={locationId} />
              </Suspense>
            </Grid>

            {/* Filters and Reviews List */}
            <Card>
              <Box sx={{ p: 3, borderBottom: `solid 1px ${theme.palette.divider}` }}>
                <BookingReviewsFilters
                  filters={filters}
                  onFilterChange={updateFilter}
                  onResetFilters={resetFilters}
                  stats={stats}
                />
              </Box>

              <Box sx={{ p: 3 }}>
                <BookingReviewsList
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
          </>
        )}
      </Stack>
    </DashboardContent>
  );
}
