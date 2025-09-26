import { CONFIG } from 'src/global-config';

import { TikTokAnalyticsView } from 'src/sections/team/tiktok/view/tiktok-analytics-view';

// ----------------------------------------------------------------------

export const metadata = { title: `TikTok | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <TikTokAnalyticsView />;
}