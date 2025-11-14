import { Suspense } from 'react';

import { CONFIG } from 'src/global-config';

import { InstagramAnalyticsView } from 'src/sections/team/instagram/view/instagram-analytics-view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export const metadata = { title: `Instagram | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading Instagram analytics..." />}>
      <InstagramAnalyticsView />
    </Suspense>
  );
}
