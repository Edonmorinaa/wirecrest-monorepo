import type { ApiResponse, TeamWithMemberCount } from 'src/types';

import useSWR, { mutate } from 'swr';

import fetcher from 'src/lib/fetcher';

const useTeams = () => {
  const url = `/api/teams`;

  const { data, error, isLoading } = useSWR<ApiResponse<TeamWithMemberCount[]>>(url, fetcher);

  const mutateTeams = async () => {
    mutate(url);
  };

  return {
    isLoading,
    isError: error,
    teams: data?.data,
    mutateTeams,
  };
};

export default useTeams;
