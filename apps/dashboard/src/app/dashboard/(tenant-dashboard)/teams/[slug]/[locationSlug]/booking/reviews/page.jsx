import { Suspense } from 'react';

import { CONFIG } from 'src/global-config';

import { BookingReviewsView } from 'src/sections/overview/booking-reviews/view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export const metadata = { title: `Booking Reviews | Team Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading reviews..." />}>
      <BookingReviewsView />
    </Suspense>
  );
}
