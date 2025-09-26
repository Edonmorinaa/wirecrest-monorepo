import { CONFIG } from 'src/global-config';

import { NextAuthSignInView } from 'src/auth/view/nextauth';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign in | NextAuth - ${CONFIG.appName}` };

export default function Page() {
  return <NextAuthSignInView />;
}
