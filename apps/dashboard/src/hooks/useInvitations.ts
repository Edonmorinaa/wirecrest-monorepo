import type { ApiResponse } from 'src/types';

import useSWR, { mutate } from 'swr';
import { TeamInvitation } from '@/models/invitation';

import fetcher from 'src/lib/fetcher';

interface Props {
  slug: string;
  sentViaEmail: boolean;
}

const useInvitations = ({ slug, sentViaEmail }: Props) => {
  const url = `/api/teams/${slug}/invitations?sentViaEmail=${sentViaEmail}`;

  const { data, error, isLoading } = useSWR<ApiResponse<TeamInvitation[]>>(url, fetcher);

  const mutateInvitation = async () => {
    mutate(url);
  };

  return {
    isLoading,
    isError: error,
    invitations: data?.data,
    mutateInvitation,
  };
};

export default useInvitations;
