import { redirect } from 'next/navigation';
import { auth } from '@wirecrest/auth-next';

import { getTeamsList } from 'src/actions/teams';
import { getSubdomainUrl } from 'src/lib/subdomain-config';

import { TeamDashboardView } from 'src/sections/team/view/team-dashboard-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Dashboard` };

export default async function DashboardPage() {
  // Check authentication on server side
  const session = await auth();
  if (!session?.user?.id) {
    redirect(getSubdomainUrl('auth', '/auth/sign-in'));
  }

  let teams = [];
  
  try {
    teams = await getTeamsList();
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    teams = [];
  }

  // If user has teams, redirect to the first one
  if (teams.length > 0) {
    redirect(`/dashboard/teams/${teams[0].slug}`);
  }

  // If no teams, show the dashboard view which will show create team option
  return <TeamDashboardView teams={teams} />;
}