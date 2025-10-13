import type { TeamWithMemberCount } from 'src/types';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';

import { createNewTeam, updateTeamBySlug, deleteTeamBySlug } from 'src/actions/teams';

export function useTeamsServerActions(initialTeams: TeamWithMemberCount[] = []) {
  const [isPending, startTransition] = useTransition();
  const [optimisticTeams, addOptimisticTeam] = useOptimistic(
    initialTeams,
    (state, newTeam: TeamWithMemberCount) => [...state, newTeam]
  );
  const router = useRouter();

  const createTeam = (name: string) => {
    startTransition(async () => {
      const optimisticTeam: TeamWithMemberCount = {
        id: `temp-${Date.now()}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        domain: null,
        defaultRole: 'MEMBER',
        billingId: null,
        billingProvider: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 1 },
      };

      addOptimisticTeam(optimisticTeam);

      try {
        const team = await createNewTeam({ name });
        toast.success('Team created successfully');
        router.refresh(); // Refresh to get updated data
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create team');
      }
    });
  };

  const updateTeam = (slug: string, data: { name?: string; domain?: string }) => {
    startTransition(async () => {
      try {
        await updateTeamBySlug(slug, data);
        toast.success('Team updated successfully');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update team');
      }
    });
  };

  const deleteTeam = (slug: string) => {
    startTransition(async () => {
      try {
        await deleteTeamBySlug(slug);
        toast.success('Team deleted successfully');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete team');
      }
    });
  };

  return {
    teams: optimisticTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    isPending,
  };
}
