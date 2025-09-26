import { CONFIG } from 'src/global-config';

import { NextAuthSignUpView } from 'src/auth/view/nextauth';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign up | Jwt - ${CONFIG.appName}` };

export default function Page() {
  return <NextAuthSignUpView />;
}
