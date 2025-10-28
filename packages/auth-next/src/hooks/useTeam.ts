'use client';

import { useAuth } from './useAuth';
import { useMemo } from 'react';

/**
 * Hook to get team information from user session
 */
export function useTeam() {
  const { user, loading, authenticated } = useAuth();

  const team = useMemo(() => {
    if (!user?.team) return null;
    return user.team;
  }, [user?.team]);

  const teamId = useMemo(() => {
    return user?.team?.id || null;
  }, [user?.team?.id]);

  const isTeamOwner = useMemo(() => {
    if (!user?.team) return false;
    // For now, we'll assume the user is the owner if they have a team
    // In a real implementation, you'd check the team membership role
    return true;
  }, [user?.team]);

  return {
    team,
    teamId,
    isTeamOwner,
    loading,
    authenticated,
  };
}
