import { AccountBillingView } from '@/sections/account/view';

import { CONFIG } from 'src/global-config';
// ----------------------------------------------------------------------

export const metadata = {
  title: `Account billing settings | Dashboard - ${CONFIG.appName}`,
};

export default function Page() {
  return <AccountBillingView />;
}
