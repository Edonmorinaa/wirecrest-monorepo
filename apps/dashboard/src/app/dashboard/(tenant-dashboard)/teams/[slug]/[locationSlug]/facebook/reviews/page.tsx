import { Suspense } from 'react';

import { CONFIG } from 'src/global-config';

import { FacebookReviewsView } from 'src/sections/overview/facebook-reviews/view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export const metadata = { title: `Facebook Reviews | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading reviews..." />}>
      <FacebookReviewsView />
    </Suspense>
  );
}
