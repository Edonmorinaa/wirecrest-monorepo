import { useParams } from 'next/navigation';

import { getNavData } from 'src/layouts/nav-config-dashboard';

export function useTeamNavigation() {
  const params = useParams();
  const teamSlug = params?.slug;

  return getNavData(teamSlug);
}
