'use client';

import { useTeamNavigation } from 'src/hooks/useTeamNavigation';

import { DashboardLayout } from './layout';

// ----------------------------------------------------------------------

export function TeamDashboardLayout({ children, ...other }) {
  const navData = useTeamNavigation();

  return (
    <DashboardLayout
      slotProps={{
        nav: { data: navData },
      }}
      {...other}
    >
      {children}
    </DashboardLayout>
  );
}
