import { Suspense } from 'react';

import { CONFIG } from 'src/global-config';

import { TeamBookingView } from 'src/sections/teams/booking/view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export const metadata = { title: `Booking Overview | Team Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading Booking overview..." />}>
      <TeamBookingView />
    </Suspense>
  );
}
