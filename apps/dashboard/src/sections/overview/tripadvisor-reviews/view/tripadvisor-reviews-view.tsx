'use client';

import { lazy, useMemo, Suspense, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTeamSlug } from '@/hooks/use-subdomain';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import useTeam from 'src/hooks/useTeam';
import useTripAdvisorReviews from 'src/hooks/use-tripadvisor-reviews';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { TripAdvisorReviewsFilters } from '../tripadvisor-reviews-filters';
import { TripAdvisorReviewsList } from '../tripadvisor-reviews-list';
import { TripAdvisorReviewsStats } from '../tripadvisor-reviews-stats';
import { TripAdvisorReviewsWelcome } from '../tripadvisor-reviews-welcome';
import { TripAdvisorReviewsLoadingSkeleton } from '../tripadvisor-reviews-loading-skeleton';
import { useTeamSlug } from '@/hooks/use-subdomain';

// Lazy load the heavy analytics component
const TripAdvisorReviewsAnalytics = lazy(() => import('../tripadvisor-reviews-analytics').then(module => ({ default: module.TripAdvisorReviewsAnalytics })));

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
  tripType?: string;
  hasPhotos?: boolean;
  helpfulVotes?: boolean;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

export function TripAdvisorReviewsView() {
  const theme = useTheme();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const subdomainTeamSlug = useTeamSlug();
  const slug = subdomainTeamSlug || params.slug;

  // Get team data
  const { team, isLoading: teamLoading } = useTeam(slug);

  // Memoize filters extraction to prevent unnecessary re-renders
  const filters = useMemo((): Filters => {
    const query = Object.fromEntries(searchParams.entries());
    return {
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 10,
      ratings: query.ratings ? 
        query.ratings.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r))
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

  // Convert filters to match the hook's expected format
  const hookFilters = useMemo(() => ({
    ...filters,
    sortBy: (filters.sortBy === 'rating' ? 'rating' : 
            filters.sortBy === 'responseStatus' ? 'hasOwnerResponse' : 
            filters.sortBy) as 'publishedDate' | 'rating' | 'hasOwnerResponse'
  }), [filters]);

  const { 
    reviews, 
    pagination, 
    stats,
    isLoading: reviewsLoading, 
    isError, 
    refreshReviews
  } = useTripAdvisorReviews(slug, hookFilters);

  const updateFilter = useCallback((key: keyof Filters, value: any) => {
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
  }, [searchParams, router]);

  const resetFilters = useCallback(() => {
    // Clear all query parameters except essential ones
    const queryParams = new URLSearchParams();
    queryParams.set('page', '1');
    queryParams.set('limit', '10');
    
    // Use router.replace with shallow routing to prevent full page reload
    router.replace(`?${queryParams.toString()}`, { scroll: false });
  }, [router]);

  const handleUpdateMetadata = useCallback(async (reviewId: string, updates: any) => {
    try {
      // Update the review metadata
      const response = await fetch(`/api/teams/${slug}/tripadvisor/reviews/${reviewId}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: Failed to update review`;
        throw new Error(errorMessage);
      }

      // Refresh the reviews data without causing full page reload
      await refreshReviews();
    } catch (error) {
      console.error('Error updating review metadata:', error);
      // You might want to show a toast notification here
      // toast.error(error instanceof Error ? error.message : 'Failed to update review');
    }
  }, [slug, refreshReviews]);

  // Memoize breadcrumbs to prevent unnecessary re-renders
  const breadcrumbs = useMemo(() => [
    { name: 'Dashboard', href: paths.dashboard.root },
    { name: 'Teams', href: paths.dashboard.teams.root },
    { name: team?.name || '', href: paths.dashboard.teams.bySlug(slug) },
    { name: 'TripAdvisor Reviews' },
  ], [team?.name, slug]);

  if (teamLoading) {
    return (
      <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
        <TripAdvisorReviewsLoadingSkeleton />
      </DashboardContent>
    );
  }

  if (!team) {
    return (
      <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Team not found
          </Typography>
        </Card>
      </DashboardContent>
    );
  }

  // Show loading skeleton when reviews are loading
  if (reviewsLoading) {
    return (
      <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
        <TripAdvisorReviewsLoadingSkeleton />
      </DashboardContent>
    );
  }

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

        {/* Welcome Section */}
        <TripAdvisorReviewsWelcome 
          team={team}
          stats={stats}
          sx={{}}
        />

        {/* Stats Cards */}
        <TripAdvisorReviewsStats stats={stats} />

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
            <TripAdvisorReviewsAnalytics teamSlug={slug} />
          </Suspense>
        </Grid>
          

        {/* Filters and Reviews List */}
        <Card>
          <Box sx={{ p: 3, borderBottom: `solid 1px ${theme.palette.divider}` }}>
            <TripAdvisorReviewsFilters 
              filters={filters}
              onFilterChange={updateFilter}
              onResetFilters={resetFilters}
              pagination={pagination}
            />
          </Box>
          
          <Box sx={{ p: 3 }}>
            <TripAdvisorReviewsList
              reviews={reviews || []}
              pagination={pagination}
              filters={filters}
              isLoading={reviewsLoading}
              isError={isError}
              onUpdateMetadata={handleUpdateMetadata}
              onPageChange={(page) => updateFilter('page', page)}
              onRefresh={refreshReviews}
            />
          </Box>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
