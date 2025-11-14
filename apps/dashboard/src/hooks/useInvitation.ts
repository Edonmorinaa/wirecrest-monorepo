import { useRouter } from 'next/router';
import { Team, Invitation } from '@prisma/client';

import { trpc } from 'src/lib/trpc/client';

/**
 * Hook for fetching invitation by token using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useInvitation = (token?: string) => {
  const { query, isReady } = useRouter();
  
  const inviteToken = token || (isReady ? (query.token as string) : null);

  const { data, error, isLoading } = trpc.utils.getInvitationByToken.useQuery(
    { token: inviteToken! },
    {
      enabled: !!inviteToken,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // 1 minute
    }
  );

  return {
    isLoading,
    error,
    invitation: data as (Invitation & { team: Team }) | undefined,
  };
};

export default useInvitation;
