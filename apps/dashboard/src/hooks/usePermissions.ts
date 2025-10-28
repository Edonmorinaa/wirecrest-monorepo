'use client';

import { 
  canRead, 
  hasRole, 
  isTenant, 
  canManage, 
  canCreate,
  canUpdate,
  canDelete,
  isSupport, 
  SuperRole,
  SuperAction,
  isSuperAdmin, 
  useSuperRole, 
  SuperResource, 
  hasPermission, 
  canAccessRoute,
  hasDashboardAccess,
} from '@wirecrest/auth-next';

/**
 * Dashboard permission hook that uses logic-only functions
 */
export function usePermissions() {
  const { superRole, loading, authenticated } = useSuperRole();

  return {
    // Basic role checks
    isSuperAdmin: isSuperAdmin(superRole),
    isSupport: isSupport(superRole),
    isTenant: isTenant(superRole),
    
    // Permission checks
    hasRole: (role: SuperRole) => hasRole(superRole, role),
    hasPermission: (resource: SuperResource, action: SuperAction) => 
      hasPermission(superRole, resource, action),
    
    // Resource permissions
    canManage: (resource: SuperResource) => canManage(superRole, resource),
    canRead: (resource: SuperResource) => canRead(superRole, resource),
    canCreate: (resource: SuperResource) => canCreate(superRole, resource),
    canUpdate: (resource: SuperResource) => canUpdate(superRole, resource),
    canDelete: (resource: SuperResource) => canDelete(superRole, resource),
    
    // Access checks
    hasDashboardAccess: hasDashboardAccess(superRole),
    canAccessRoute: (route: string) => canAccessRoute(superRole, route),
    
    // State
    loading,
    authenticated,
    superRole,
  };
}