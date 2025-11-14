import { Suspense } from 'react';

import { TripAdvisorOverviewView } from 'src/sections/overview/tripadvisor/view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading TripAdvisor overview..." />}>
      <TripAdvisorOverviewView />
    </Suspense>
  );
}
