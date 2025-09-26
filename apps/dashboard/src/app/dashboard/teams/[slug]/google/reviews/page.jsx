import { CONFIG } from 'src/global-config';

import { GoogleReviewsView } from 'src/sections/overview/google-reviews/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Google Reviews | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <GoogleReviewsView />;
}
