import { CONFIG } from 'src/global-config';

import { InboxView } from 'src/sections/overview/inbox/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Inbox | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <InboxView />;
}
