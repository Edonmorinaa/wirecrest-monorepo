import { CONFIG } from 'src/global-config';

import { NextAuthResetPasswordView } from '../../../auth/view/nextauth/reset-password-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Forgot Password | NextAuth - ${CONFIG.appName}` };

export default function Page() {
  return <NextAuthResetPasswordView />;
}
