import { CONFIG } from 'src/global-config';

import { TeamBookingView } from 'src/sections/teams/booking/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Booking Overview | Team Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <TeamBookingView />;
}
