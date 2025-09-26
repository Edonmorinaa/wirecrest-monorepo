'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

import { useSuperRole } from '@wirecrest/auth';
import { SuperRole } from '@prisma/client';
import { SuperResource, SuperAction } from '@wirecrest/auth';
import { SplashScreen } from 'src/components/loading-screen';

interface RoleGuardProps {
  children: ReactNode;
  requireRole?: SuperRole;
  requirePermission?: {
    resource: SuperResource;
    action: SuperAction;
  };
}

/**
 * Role-based access control guard - redirects to 404 if not permitted
 */
export function RoleGuard({ 
  children, 
  requireRole, 
  requirePermission 
}: RoleGuardProps) {
  const { 
    superRole, 
    hasPermission, 
    loading, 
    authenticated 
  } = useSuperRole();
  const router = useRouter();

  if (loading) {
    return <SplashScreen />;
  }

  if (!authenticated) {
    router.push('/404');
    return null;
  }

  // Check specific role requirement
  if (requireRole && superRole !== requireRole) {
    router.push('/404');
    return null;
  }

  // Check specific permission requirement
  if (requirePermission && !hasPermission(requirePermission.resource, requirePermission.action)) {
    router.push('/404');
    return null;
  }

  return <>{children}</>;
}
