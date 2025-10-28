import { SuperResource, SuperAction } from '../lib/rbac';
import { SuperRole } from '@prisma/client';
import { getUserSuperRoleConfig, userHasPermission } from '../lib/rbac';

/**
 * Logic-only permission utilities - NO UI
 * These functions can be used to check permissions before rendering components
 */

/**
 * Check if user has specific role
 */
export function hasRole(userRole: SuperRole | undefined, requiredRole: SuperRole): boolean {
  return userRole === requiredRole;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userRole: SuperRole | undefined, 
  resource: SuperResource, 
  action: SuperAction
): boolean {
  return userHasPermission(userRole, resource, action);
}

/**
 * Check if user can manage a resource
 */
export function canManage(userRole: SuperRole | undefined, resource: SuperResource): boolean {
  return hasPermission(userRole, resource, SuperAction.MANAGE);
}

/**
 * Check if user can read a resource
 */
export function canRead(userRole: SuperRole | undefined, resource: SuperResource): boolean {
  return hasPermission(userRole, resource, SuperAction.READ);
}

/**
 * Check if user can create a resource
 */
export function canCreate(userRole: SuperRole | undefined, resource: SuperResource): boolean {
  return hasPermission(userRole, resource, SuperAction.CREATE);
}

/**
 * Check if user can update a resource
 */
export function canUpdate(userRole: SuperRole | undefined, resource: SuperResource): boolean {
  return hasPermission(userRole, resource, SuperAction.UPDATE);
}

/**
 * Check if user can delete a resource
 */
export function canDelete(userRole: SuperRole | undefined, resource: SuperResource): boolean {
  return hasPermission(userRole, resource, SuperAction.DELETE);
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(userRole: SuperRole | undefined): boolean {
  return userRole === SuperRole.ADMIN;
}

/**
 * Check if user is support
 */
export function isSupport(userRole: SuperRole | undefined): boolean {
  return userRole === SuperRole.SUPPORT;
}

/**
 * Check if user is tenant
 */
export function isTenant(userRole: SuperRole | undefined): boolean {
  return userRole === SuperRole.TENANT;
}

/**
 * Check if user has dashboard access
 */
export function hasDashboardAccess(userRole: SuperRole | undefined): boolean {
  const config = getUserSuperRoleConfig(userRole);
  return config.dashboardAccess;
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(userRole: SuperRole | undefined, route: string): boolean {
  const config = getUserSuperRoleConfig(userRole);
  
  // Define route permissions
  const routePermissions: Record<string, SuperResource[]> = {
    '/dashboard': [SuperResource.USERS],
    '/admin': [SuperResource.USERS, SuperResource.TEAMS],
    '/settings': [SuperResource.SETTINGS],
    '/analytics': [SuperResource.ANALYTICS],
    '/billing': [SuperResource.BILLING],
  };

  const requiredResources = routePermissions[route] || [];
  
  return requiredResources.every(resource => 
    hasPermission(userRole, resource, SuperAction.READ)
  );
}