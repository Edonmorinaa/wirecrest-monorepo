import { AuthSplitLayout } from 'src/layouts/auth-split';

import { AuthGuard } from 'src/components/guards';

// ----------------------------------------------------------------------

export default function Layout({ children }) {
  return (
    <AuthGuard requireAuth={false}>
      <AuthSplitLayout>{children}</AuthSplitLayout>
    </AuthGuard>
  );
}
