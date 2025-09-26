'use client';

import { useEffect } from 'react';
import { useTeam } from '@/contexts/tenant-context';
import { useRouter, usePathname } from 'next/navigation';

import { MainLayout } from 'src/layouts/main';

// ----------------------------------------------------------------------

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthSubdomain, isLoading } = useTeam();

  useEffect(() => {
    // Skip redirects for localhost development
    if (typeof window !== 'undefined') {
      return;
    }

    console.log('isAuthSubdomain', isAuthSubdomain);

    if (isLoading) return;

    // Handle auth subdomain redirects
    if (isAuthSubdomain) {
      // If on auth subdomain root, redirect to sign-in
      if (pathname === '/' || pathname === '') {
        router.replace('/auth/sign-in');
        return;
      }
    }
  }, [isAuthSubdomain, pathname, router, isLoading]);

  return <MainLayout>{children}</MainLayout>;
}
