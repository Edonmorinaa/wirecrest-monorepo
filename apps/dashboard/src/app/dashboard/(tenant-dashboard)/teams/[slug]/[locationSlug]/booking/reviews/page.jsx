import { Suspense } from 'react';

import { CONFIG } from 'src/global-config';

import { TeamBookingReviewsView } from 'src/sections/teams/booking/view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export const metadata = { title: `Booking Reviews | Team Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading reviews..." />}>
      <TeamBookingReviewsView />
    </Suspense>
  );
}
