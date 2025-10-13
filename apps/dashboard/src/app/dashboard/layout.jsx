import { CONFIG } from 'src/global-config';
import { TeamDashboardLayout } from 'src/layouts/dashboard';


// ----------------------------------------------------------------------

export default function Layout({ children }) {
  if (CONFIG.auth.skip) {
    return <TeamDashboardLayout>{children}</TeamDashboardLayout>;
  }

  // For superadmin routes, let the superadmin layout handle authentication
  // This prevents AuthGuard from interfering with superadmin authentication flow
  return (
    <TeamDashboardLayout>{children}</TeamDashboardLayout>
  );
}
