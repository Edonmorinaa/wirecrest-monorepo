import { Suspense } from 'react';

import { CONFIG } from 'src/global-config';

import { GoogleReviewsView } from 'src/sections/overview/google-reviews/view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export const metadata = { title: `Google Reviews | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading reviews..." />}>
      <GoogleReviewsView />
    </Suspense>
  );
}
