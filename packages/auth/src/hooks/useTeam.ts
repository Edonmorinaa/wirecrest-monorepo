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
    return user?.teamId || null;
  }, [user?.teamId]);

  const isTeamOwner = useMemo(() => {
    if (!user?.team) return false;
    // Check if user is owner of the team
    return user.team.ownerId === user.id;
  }, [user?.team, user?.id]);

  return {
    team,
    teamId,
    isTeamOwner,
    loading,
    authenticated,
  };
}
