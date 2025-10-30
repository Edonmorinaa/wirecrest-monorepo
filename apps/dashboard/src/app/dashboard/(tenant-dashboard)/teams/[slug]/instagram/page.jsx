import { CONFIG } from 'src/global-config';

import { InstagramAnalyticsView } from 'src/sections/team/instagram/view/instagram-analytics-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Instagram | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <InstagramAnalyticsView />;
}
