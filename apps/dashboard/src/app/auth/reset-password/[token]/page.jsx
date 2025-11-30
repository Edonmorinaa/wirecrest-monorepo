import { CONFIG } from 'src/global-config';

import { NextAuthNewPasswordView } from '../../../../auth/view/nextauth/new-password-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Reset Password | NextAuth - ${CONFIG.appName}` };

export default function Page() {
  return <NextAuthNewPasswordView />;
}

