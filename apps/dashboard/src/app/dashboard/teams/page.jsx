'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTeamsList } from 'src/actions/teams';
import { TeamListView } from 'src/sections/team/view/team-list-view';
import { useTeamsServerActions } from 'src/hooks/useTeamsServerActions';

// ----------------------------------------------------------------------

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  
  const { createTeam, updateTeam, deleteTeam, isPending } = useTeamsServerActions(teams);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsData = await getTeamsList();
        setTeams(teamsData);
      } catch (error) {
        console.error('Failed to fetch teams:', error);
        setTeams([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const showCreateDialog = searchParams.get('newTeam') === 'true';

  return (
    <TeamListView
      teams={teams}
      onCreateTeam={createTeam}
      onUpdateTeam={updateTeam}
      onDeleteTeam={deleteTeam}
      isLoading={isLoading || isPending}
      showCreateDialog={showCreateDialog}
    />
  );
}
