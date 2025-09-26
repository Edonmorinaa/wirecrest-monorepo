'use client';

import { useEffect } from 'react';
import { useAuth } from '@wirecrest/auth';
import { SuperRole } from '@prisma/client';
import { getAuthUrl, getSubdomainUrlForSubdomain } from '@/lib/subdomain';

import { SplashScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

export default function AuthRedirectPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // User not authenticated, redirect to sign-in
      const redirectUrl = getAuthUrl('/sign-in');
      window.location.href = redirectUrl;
      return;
    }

    // Determine redirect URL based on user role
    let redirectUrl;
    if (user.superRole === SuperRole.ADMIN) {
      // Super admin goes to admin subdomain
      redirectUrl = getSubdomainUrlForSubdomain('admin', '/dashboard/superadmin');
    } else if (user.superRole === SuperRole.TENANT && user.team?.slug) {
      // Regular user goes to their team subdomain
      redirectUrl = getSubdomainUrlForSubdomain(user.team.slug, `/dashboard/teams/${user.team.slug}`);
    } else {
      // Fallback to main domain dashboard
      redirectUrl = getSubdomainUrlForSubdomain('www', '/dashboard');
    }

    // Redirect to the appropriate URL
    window.location.href = redirectUrl;
  }, [user, loading]);

  // Show splash screen while loading or redirecting
  return <SplashScreen slots={{}} slotProps={{}} sx={{}} />;
}
