'use client';

import { useState, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';

import { paths } from 'src/routes/paths';

import useTeam from 'src/hooks/useTeam';
import useInboxReviews, {
  type InboxFilters,
  type UnifiedReview,
} from 'src/hooks/use-inbox-reviews';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { InboxList } from '../inbox-list';
import { InboxStats } from '../inbox-stats';
import { ReplyModal } from '../reply-modal';
import { InboxDetail } from '../inbox-detail';
import { InboxFiltersComponent } from '../inbox-filters';

// ----------------------------------------------------------------------

export function InboxView() {
  const { team, isLoading: teamLoading } = useTeam();

  // State
  const [selectedReview, setSelectedReview] = useState<UnifiedReview | null>(null);
  const [filters, setFilters] = useState<InboxFilters>({
    page: 1,
    limit: 20,
    platforms: [],
    ratings: [],
    status: 'all',
    sentiment: undefined,
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
    dateRange: 'all',
  });

  // Load reviews using the hook
  const { reviews, pagination, stats, isLoading, isError, refreshReviews, updateReviewStatus } =
    useInboxReviews(team?.slug, filters);

  const handleUpdateStatus = useCallback(
    async (reviewId: string, field: 'isRead' | 'isImportant', value: boolean) => {
      const review = reviews.find((r) => r.id === reviewId);
      if (!review) return;

      await updateReviewStatus(reviewId, review.platform, field, value);

      // Update local state optimistically
      if (selectedReview?.id === reviewId) {
        setSelectedReview((prev) => (prev ? { ...prev, [field]: value } : null));
      }
    },
    [reviews, selectedReview, updateReviewStatus]
  );

  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyModalReview, setReplyModalReview] = useState<UnifiedReview | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const handleOpenReplyModal = useCallback((review: UnifiedReview) => {
    setReplyModalReview(review);
    setReplyModalOpen(true);
  }, []);

  const handleSendReply = useCallback(
    async (replyText: string) => {
      if (!replyModalReview || !team?.slug) return;

      setIsSubmittingReply(true);
      try {
        const response = await fetch(
          `/api/teams/${team.slug}/inbox/reviews/${replyModalReview.id}/reply`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              replyText,
              platform: replyModalReview.platform,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send reply');
        }

        const data = await response.json();

        // Update local state optimistically
        const updatedReview = {
          ...replyModalReview,
          replyText: data.data.replyText,
          replyDate: data.data.replyDate,
          hasReply: data.data.hasReply,
          generatedReply: undefined, // Clear the generated reply
        };

        // Update the reviews list
        if (selectedReview?.id === replyModalReview.id) {
          setSelectedReview(updatedReview);
        }

        // Close modal and refresh data
        setReplyModalOpen(false);
        setReplyModalReview(null);
        await refreshReviews();
      } catch (error) {
        console.error('Error sending reply:', error);
        throw error; // Let the modal handle the error display
      } finally {
        setIsSubmittingReply(false);
      }
    },
    [replyModalReview, team?.slug, selectedReview, refreshReviews]
  );

  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  if (teamLoading || !team) {
    return (
      <DashboardContent maxWidth="xl" sx={{}} className="" disablePadding={false}>
        <CustomBreadcrumbs
          heading="Inbox"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams', href: paths.dashboard.teams.root },
            { name: team?.name || 'Team', href: paths.dashboard.teams.bySlug(team?.slug || '') },
            { name: 'Inbox' },
          ]}
          action={null}
          sx={{ mb: { xs: 3, md: 5 } }}
          backHref=""
        />

        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rectangular" height={600} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rectangular" height={600} />
          </Grid>
        </Grid>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl" disablePadding={false} sx={{}} className="">
      <CustomBreadcrumbs
        heading="Inbox"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Teams', href: paths.dashboard.teams.root },
          { name: team.name, href: paths.dashboard.teams.bySlug(team.slug) },
          { name: 'Inbox' },
        ]}
        action={null}
        sx={{ mb: 3 }}
        backHref=""
      />

      {/* Stats Overview */}
      <InboxStats stats={stats} sx={{ mb: 3 }} />

      {/* Filters */}
      <InboxFiltersComponent filters={filters} onFiltersChange={setFilters} sx={{ mb: 3 }} />

      {/* Main Content - Responsive Grid */}
      <Grid container spacing={3}>
        {/* Review List - Mobile: full width, Desktop: 4 columns */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <InboxList
            reviews={reviews}
            selectedReview={selectedReview}
            onSelectReview={setSelectedReview}
            isLoading={isLoading}
            isError={isError}
            onRefresh={refreshReviews}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </Grid>

        {/* Review Detail - Mobile: full width, Desktop: 8 columns */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <InboxDetail
            review={selectedReview}
            onUpdateStatus={handleUpdateStatus}
            onOpenReplyModal={handleOpenReplyModal}
          />
        </Grid>
      </Grid>

      {/* Reply Modal */}
      <ReplyModal
        open={replyModalOpen}
        onClose={() => {
          setReplyModalOpen(false);
          setReplyModalReview(null);
        }}
        review={replyModalReview}
        onSendReply={handleSendReply}
        isSubmitting={isSubmittingReply}
      />
    </DashboardContent>
  );
}
