'use client';

import { useAuth } from '@wirecrest/auth';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

import { getSubdomainUrl } from 'src/lib/subdomain-config';

import { SplashScreen } from 'src/components/loading-screen';

import { NotFoundView } from 'src/sections/error/not-found-view';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

/**
 * Authentication guard - shows 404 component if not authenticated
 */
export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && requireAuth && !authenticated) {
      router.push(getSubdomainUrl('auth', '/sign-in'));
    }
  }, [loading, requireAuth, authenticated, router]);

  if (loading) {
    return <SplashScreen />;
  }

  if (requireAuth && !authenticated) {
    return <SplashScreen />;
  }

  if (!requireAuth && authenticated) {
    return <NotFoundView />;
  }

  return <>{children}</>;
}
