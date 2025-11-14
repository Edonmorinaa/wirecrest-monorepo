import { Suspense } from 'react';

import { TripAdvisorReviewsView } from 'src/sections/overview/tripadvisor-reviews/view';
import { PageLoading } from 'src/components/loading/page-loading';

export const metadata = { title: 'TripAdvisor Reviews | Dashboard' };

export default function TripAdvisorReviewsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading reviews..." />}>
      <TripAdvisorReviewsView />
    </Suspense>
  );
}
