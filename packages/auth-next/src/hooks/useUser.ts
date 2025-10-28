'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { User } from '@wirecrest/auth-core';

/**
 * Hook to get user data from NextAuth session
 */
export const useUser = () => {
  const { data: session, status } = useSession();
  
  const user = useMemo(() => {
    if (!session?.user) return null;
    
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: (session.user as { role?: string }).role,
      superRole: (session.user as { superRole?: unknown }).superRole,
      teamId: (session.user as { teamId?: string }).teamId,
      team: (session.user as { team?: unknown }).team,
    } as unknown as User;
  }, [session?.user]);

  return {
    user,
    loading: status === 'loading',
    error: status === 'unauthenticated' ? 'Not authenticated' : null,
    isAuthenticated: status === 'authenticated',
    refresh: async () => {
      // NextAuth handles session refresh automatically
      return session;
    },
  };
};

export { useUser as default };
