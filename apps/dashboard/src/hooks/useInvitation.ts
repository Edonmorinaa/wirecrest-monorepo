import type { ApiResponse } from 'src/types';

import useSWR from 'swr';
import { useRouter } from 'next/router';
import { Team, Invitation } from '@prisma/client';

import fetcher from 'src/lib/fetcher';

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
