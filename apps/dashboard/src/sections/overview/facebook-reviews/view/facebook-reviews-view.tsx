'use client';

import { useTeamSlug } from '@/hooks/use-subdomain';
import { lazy, useMemo, Suspense, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import useTeam from 'src/hooks/useTeam';
import useFacebookReviews from 'src/hooks/use-facebook-reviews';
import useFacebookBusinessProfile from 'src/hooks/useFacebookBusinessProfile';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import {
  FacebookReviewsList,
  FacebookReviewsStats,
  FacebookReviewsFilters,
  FacebookReviewsWelcome,
  FacebookReviewsAnalytics,
} from '../index';

// Lazy load the heavy analytics component
const LazyFacebookReviewsAnalytics = lazy(() =>
  Promise.resolve({ default: FacebookReviewsAnalytics })
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

  const subdomainTeamSlug = useTeamSlug();
  const slug = subdomainTeamSlug || params.slug;

  // Get team and business profile data
  const { team } = useTeam(slug as string);
  const { businessProfile } = useFacebookBusinessProfile(slug as string);

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
    stats,
    refetch,
  } = useFacebookReviews(slug as string, hookFilters);

  const updateFilter = useCallback(
    (key: keyof FacebookFilters, value: any) => {
      const queryParams = new URLSearchParams(searchParams);

      // Reset to page 1 when filters change (except when changing page)
      if (key !== 'page') {
        queryParams.set('page', '1');
      }

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

  const handleUpdateMetadata = useCallback(
    async (reviewId: string, updates: any) => {
      try {
        // Update the review metadata
        const response = await fetch(`/api/teams/${slug}/facebook/reviews/${reviewId}/metadata`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error?.message || `HTTP ${response.status}: Failed to update review`;
          throw new Error(errorMessage);
        }

        // Refresh the reviews data without causing full page reload
        await refetch();
      } catch (error) {
        console.error('Error updating review metadata:', error);
        // You might want to show a toast notification here
        // toast.error(error instanceof Error ? error.message : 'Failed to update review');
      }
    },
    [slug, refetch]
  );

  // Memoize breadcrumbs to prevent unnecessary re-renders
  const breadcrumbs = useMemo(
    () => [
      { name: 'Dashboard', href: paths.dashboard.root },
      { name: 'Teams', href: paths.dashboard.teams.root },
      { name: team?.name || '', href: paths.dashboard.teams.bySlug(slug) },
      { name: 'Facebook Reviews' },
    ],
    [team?.name, slug]
  );

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

        {/* Stats Cards */}
        <FacebookReviewsStats stats={stats} sx={{}} />

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
            <LazyFacebookReviewsAnalytics teamSlug={slug} />
          </Suspense>
        </Grid>

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
              reviews={reviews || []}
              pagination={pagination}
              filters={filters}
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
