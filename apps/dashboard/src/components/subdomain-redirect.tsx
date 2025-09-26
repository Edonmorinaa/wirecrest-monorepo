'use client';

import { useEffect } from 'react';
import { useTeam } from '@/contexts/tenant-context';
import { useRouter, usePathname } from 'next/navigation';

import { SplashScreen } from './loading-screen';

interface SubdomainRedirectProps {
  children: React.ReactNode;
}

/**
 * Component that handles subdomain-based redirects
 * This should be placed high in the component tree
 */
export function SubdomainRedirect({ children }: SubdomainRedirectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { teamSlug, isTeamSubdomain, isAuthSubdomain, isLoading } = useTeam();

  useEffect(() => {
    // Skip all subdomain redirects for localhost development
    if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
      return;
    }

    if (isLoading) return;

    // Handle auth subdomain redirects
    if (isAuthSubdomain) {
      // If on auth subdomain root, redirect to sign-in
      if (pathname === '/' || pathname === '') {
        router.replace('/auth/sign-in');
        return;
      }
      
      // If on auth subdomain but not on auth path, redirect to main domain
      if (!pathname.startsWith('/auth/')) {
        const mainDomain = window.location.hostname.replace('auth.', '');
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        const newUrl = `${protocol}//${mainDomain}${port}${pathname}`;
        window.location.href = newUrl;
        return;
      }
    }

    // Handle team subdomain redirects
    if (isTeamSubdomain && teamSlug) {
      // If on team subdomain but on wrong team path, redirect to correct team
      if (pathname.startsWith('/dashboard/teams/')) {
        const pathParts = pathname.split('/');
        const teamSlugIndex = pathParts.indexOf('teams');
        
        if (teamSlugIndex !== -1 && pathParts[teamSlugIndex + 1]) {
          const pathTeamSlug = pathParts[teamSlugIndex + 1];
          
          if (pathTeamSlug !== teamSlug) {
            const newPath = pathname.replace(`/dashboard/teams/${pathTeamSlug}`, `/dashboard/teams/${teamSlug}`);
            router.replace(newPath);
            return;
          }
        }
      }
      
      // If on team subdomain but on root dashboard, redirect to team dashboard
      if (pathname === '/dashboard' || pathname === '/dashboard/') {
        router.replace(`/dashboard/teams/${teamSlug}`);
        return;
      }
    }

    // Handle main domain redirects
    if (!isTeamSubdomain && !isAuthSubdomain) {
      const port = window.location.port ? `:${window.location.port}` : '';
      const protocol = window.location.protocol;
      
      // Clear any existing subdomain and get clean domain
      const cleanHostname = window.location.hostname
        .replace(/^[^.]+\./, '') // Remove any existing subdomain
        .replace(/^www\./, ''); // Remove www if present
      
      // Redirect auth paths to auth subdomain
      if (pathname.startsWith('/auth/')) {
        const authDomain = `auth.${cleanHostname}`;
        const newUrl = `${protocol}//${authDomain}${port}${pathname}`;
        window.location.href = newUrl;
        return;
      }
      
      // Redirect team paths to team subdomain
      if (pathname.startsWith('/dashboard/teams/')) {
        const pathParts = pathname.split('/');
        const teamSlugIndex = pathParts.indexOf('teams');
        
        if (teamSlugIndex !== -1 && pathParts[teamSlugIndex + 1]) {
          const pathTeamSlug = pathParts[teamSlugIndex + 1];
          const newPath = pathname.replace(`/dashboard/teams/${pathTeamSlug}`, '/dashboard');
          const teamDomain = `${pathTeamSlug}.${cleanHostname}`;
          const newUrl = `${protocol}//${teamDomain}${port}${newPath}`;
          window.location.href = newUrl;
          return;
        }
      }
    }
  }, [teamSlug, isTeamSubdomain, isAuthSubdomain, pathname, router, isLoading]);

  // Skip all subdomain redirects for localhost development
  if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <SplashScreen slots={{}} slotProps={{}} sx={{}} />;
  }

  return <>{children}</>;
}
