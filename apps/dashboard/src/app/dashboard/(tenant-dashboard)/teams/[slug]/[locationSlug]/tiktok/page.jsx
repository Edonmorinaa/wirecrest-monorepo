import { Suspense } from 'react';

import { CONFIG } from 'src/global-config';

import { TikTokAnalyticsView } from 'src/sections/team/tiktok/view/tiktok-analytics-view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export const metadata = { title: `TikTok | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading TikTok analytics..." />}>
      <TikTokAnalyticsView />
    </Suspense>
  );
}