'use client';

import { useSession } from 'next-auth/react';
import { useMemo, useCallback } from 'react';
import { SuperResource, SuperAction, getUserSuperRoleConfig, userHasPermission } from '@wirecrest/auth-core';
import { SuperRole } from '@prisma/client';

/**
 * Hook for role-based access control using NextAuth session
 */
export const useSuperRole = () => {
  const { data: session, status } = useSession();
  
  const superRole = useMemo(() => {
    return (session?.user as any)?.superRole as SuperRole;
  }, [session?.user]);

  const config = useMemo(() => {
    return getUserSuperRoleConfig(superRole);
  }, [superRole]);

  const isSuperAdmin = useMemo(() => {
    return superRole === SuperRole.ADMIN;
  }, [superRole]);

  const hasPermission = useCallback((resource: SuperResource, action: SuperAction) => {
    return userHasPermission(superRole, resource, action);
  }, [superRole]);

  const canManage = useCallback((resource: SuperResource) => {
    return hasPermission(resource, SuperAction.MANAGE);
  }, [hasPermission]);

  const canRead = useCallback((resource: SuperResource) => {
    return hasPermission(resource, SuperAction.READ);
  }, [hasPermission]);

  const canCreate = useCallback((resource: SuperResource) => {
    return hasPermission(resource, SuperAction.CREATE);
  }, [hasPermission]);

  const canUpdate = useCallback((resource: SuperResource) => {
    return hasPermission(resource, SuperAction.UPDATE);
  }, [hasPermission]);

  const canDelete = useCallback((resource: SuperResource) => {
    return hasPermission(resource, SuperAction.DELETE);
  }, [hasPermission]);

  return {
    superRole,
    config,
    isSuperAdmin,
    hasPermission,
    canManage,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    loading: status === 'loading',
    authenticated: status === 'authenticated',
  };
};
