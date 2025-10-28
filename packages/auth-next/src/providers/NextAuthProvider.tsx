'use client';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback, useState } from 'react';
import { useSession, signIn, signOut, SessionProvider } from 'next-auth/react';

import { AuthContext } from '../contexts/AuthContext';

// ----------------------------------------------------------------------

/**
 * NextAuth v5 integration with existing auth context
 * This provider bridges NextAuth v5 session management with the existing auth guard system
 */

function NextAuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { state, setState } = useSetState({ user: null, loading: true });

  // Prevent hydration issues by ensuring client-only operations
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const checkUserSession = useCallback(async () => {
    try {
      // Prevent hydration issues by only processing on client
      if (!isClient || status === 'loading') {
        return;
      }

      if (status === 'authenticated' && session?.user) {
        // User is authenticated, transform session data to match expected format
        const user = {
          id: session.user.id || session.user.email, // Fallback to email if no id
          name: session.user.name,
          email: session.user.email,
          displayName: session.user.name,
          photoURL: session.user.image,
          role: (session.user as { role?: string }).role || 'user',
          superRole: (session.user as { superRole?: unknown }).superRole,
          accessToken: (session as { accessToken?: string }).accessToken, // If you store access token in session
          teamId: (session.user as { teamId?: string }).teamId,
          team: (session.user as { team?: unknown }).team,
        };

        setState({ user: user as any, loading: false });

        // Set axios authorization header if you have an access token
        if ((session as { accessToken?: string }).accessToken) {
          // This will be handled by the consuming app's axios instance
          // The auth service will manage this via domain-wide cookies
        }
      } else {
        // User is not authenticated
        setState({ user: null, loading: false });
        // delete axios.defaults.headers.common.Authorization;
      }
    } catch (error) {
      console.error('NextAuth session check error:', error);
      setState({ user: null, loading: false });
    }
  }, [session, status, setState, isClient]);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';
  const authStatus = state.loading || !isClient ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user,
      checkUserSession,
      loading: authStatus === 'loading',
      authenticated: authStatus === 'authenticated',
      unauthenticated: authStatus === 'unauthenticated',
      // NextAuth specific methods
      signIn,
      signOut,
      session,
    }),
    [checkUserSession, state.user, authStatus, session, isClient]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}

// Main AuthProvider that wraps with SessionProvider
export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextAuthContextProvider>{children}</NextAuthContextProvider>
    </SessionProvider>
  );
}
