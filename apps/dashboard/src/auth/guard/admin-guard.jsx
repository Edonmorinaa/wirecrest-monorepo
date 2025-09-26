'use client';

import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

export function AdminGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const { authenticated, loading, user } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = async () => {
    if (loading) {
      return;
    }

    if (!authenticated) {
      const queryString = new URLSearchParams({ returnTo: pathname }).toString();
      const redirectPath = `${paths.auth.nextauth.signIn}?${queryString}`;
      router.replace(redirectPath);
      return;
    }

    // Check if user has admin role
    const userRole = user?.superRole;
    
    if (userRole !== 'ADMIN') {
      // Redirect to appropriate page based on role
      if (userRole === 'SUPPORT') {
        router.replace('/dashboard/superadmin');
      } else {
        router.replace('/dashboard');
      }
      return;
    }

    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading, user]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
