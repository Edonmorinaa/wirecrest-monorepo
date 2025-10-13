import type { User, TeamMember } from '@prisma/client';
import type { ApiResponse } from 'src/types';

import useSWR, { mutate } from 'swr';

import fetcher from 'src/lib/fetcher';

export type TeamMemberWithUser = TeamMember & { user: User };

const useTeamMembers = (slug: string) => {
  const url = `/api/teams/${slug}/members`;

  const { data, error, isLoading } = useSWR<ApiResponse<TeamMemberWithUser[]>>(url, fetcher);

  const mutateTeamMembers = async () => {
    mutate(url);
  };

  return {
    isLoading,
    isError: error,
    members: data?.data,
    mutateTeamMembers,
  };
};

export default useTeamMembers;
