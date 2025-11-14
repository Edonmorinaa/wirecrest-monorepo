import { TeamInvitation } from '@/models/invitation';

import { trpc } from 'src/lib/trpc/client';

interface Props {
  slug: string;
  sentViaEmail: boolean;
}

/**
 * Hook for fetching team invitations using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useInvitations = ({ slug, sentViaEmail }: Props) => {
  const { data, error, isLoading, refetch } = trpc.teams.getInvitations.useQuery(
    { slug, sentViaEmail },
    {
      enabled: !!slug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000, // 30 seconds (invitations change more frequently)
    }
  );

  const mutateInvitation = async () => {
    await refetch();
  };

  return {
    isLoading,
    isError: error,
    invitations: data as TeamInvitation[] | undefined,
    mutateInvitation,
    refetch, // Additional alias
  };
};

export default useInvitations;
