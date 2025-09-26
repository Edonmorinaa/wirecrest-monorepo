import { CONFIG } from 'src/global-config';

import { FacebookReviewsView } from 'src/sections/overview/facebook-reviews/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Facebook Reviews | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <FacebookReviewsView />;
}
