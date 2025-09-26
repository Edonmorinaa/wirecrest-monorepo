import useSWR from 'swr';
import fetcher from 'src/lib/fetcher';
import { useRouter } from 'next/router';
import type { ApiResponse } from 'src/types';
import { Invitation, Team } from '@prisma/client';

type Response = ApiResponse<Invitation & { team: Team }>;

const useInvitation = (token?: string) => {
  const { query, isReady } = useRouter();

  const { data, error, isLoading } = useSWR<Response>(() => {
    const inviteToken = token || (isReady ? query.token : null);
    return inviteToken ? `/api/invitations/${inviteToken}` : null;
  }, fetcher);

  return {
    isLoading,
    error,
    invitation: data?.data,
  };
};

export default useInvitation;
