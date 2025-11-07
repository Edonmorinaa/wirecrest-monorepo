'use client';

import { useAuth } from '@wirecrest/auth-next';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

import { getAuthDomainUrl, getMainDomainUrl, getSubdomainUrl } from 'src/lib/subdomain-config';

import { SplashScreen } from 'src/components/loading-screen';

import { NotFoundView } from 'src/sections/error/not-found-view';
import { SuperRole } from '@prisma/client';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

/**
 * Authentication guard - shows 404 component if not authenticated
 */
export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { authenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('loading', loading);
    console.log('requireAuth', requireAuth);
    console.log('authenticated', authenticated);

    console.log('getAuthDomainUrl', getAuthDomainUrl('/sign-in'));
    console.log('getMainDomainUrl', getMainDomainUrl('/dashboard'));
    
    if (!loading && requireAuth && !authenticated) {
      router.push(getAuthDomainUrl('/sign-in'));
    } else if (authenticated && user.superRole === SuperRole.TENANT) {
      router.push(getSubdomainUrl(user.team?.slug, '/'));
    }
  }, [loading, requireAuth, authenticated, router]);

  if (loading) {
    return <SplashScreen />;
  }

  if (requireAuth && !authenticated) {
    return <NotFoundView />;
  }

  if (!requireAuth && authenticated) {
    return <NotFoundView />;
  }

  return <>{children}</>;
}
