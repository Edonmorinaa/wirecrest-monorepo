'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { authApiClient } from '../services/authApiClient';

/**
 * Hook to integrate NextAuth with auth-service API client
 * Automatically sets session token for API calls
 */
export function useAuthApi() {
  const { data: session, status } = useSession();

  useEffect(() => {
    const accessToken = (session as { accessToken?: string })?.accessToken;
    if (accessToken) {
      // Set the session token for API calls
      authApiClient.setSessionToken(accessToken);
    }
  }, [(session as { accessToken?: string })?.accessToken]);

  return {
    authApiClient,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    session,
  };
}
