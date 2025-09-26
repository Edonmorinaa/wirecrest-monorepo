import { CONFIG } from 'src/global-config';

import { TeamBookingReviewsView } from 'src/sections/teams/booking/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Booking Reviews | Team Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <TeamBookingReviewsView />;
}
