import { SuperRole } from '@prisma/client';
import { SuperResource, SuperAction, SuperRoleConfig } from '../types/super-role';

export { SuperResource, SuperAction } from '../types/super-role';
export type { SuperRoleConfig } from '../types/super-role';

export function getUserSuperRoleConfig(superRole?: SuperRole): SuperRoleConfig {
  const configs: Record<SuperRole, SuperRoleConfig> = {
    [SuperRole.ADMIN]: {
      name: 'Super Admin',
      description: 'Full system access',
      permissions: {
        [SuperResource.USERS]: [SuperAction.MANAGE],
        [SuperResource.TEAMS]: [SuperAction.MANAGE],
        [SuperResource.SETTINGS]: [SuperAction.MANAGE],
        [SuperResource.ANALYTICS]: [SuperAction.MANAGE],
        [SuperResource.BILLING]: [SuperAction.MANAGE],
      },
      dashboardAccess: true,
    },
    [SuperRole.SUPPORT]: {
      name: 'Support',
      description: 'Support team access',
      permissions: {
        [SuperResource.USERS]: [SuperAction.READ, SuperAction.UPDATE],
        [SuperResource.TEAMS]: [SuperAction.READ, SuperAction.UPDATE],
        [SuperResource.SETTINGS]: [SuperAction.READ],
        [SuperResource.ANALYTICS]: [SuperAction.READ],
        [SuperResource.BILLING]: [SuperAction.READ],
      },
      dashboardAccess: true,
    },
    [SuperRole.TENANT]: {
      name: 'Tenant',
      description: 'Tenant user access',
      permissions: {
        [SuperResource.USERS]: [SuperAction.READ],
        [SuperResource.TEAMS]: [SuperAction.READ],
        [SuperResource.SETTINGS]: [SuperAction.READ],
        [SuperResource.ANALYTICS]: [SuperAction.READ],
        [SuperResource.BILLING]: [SuperAction.READ],
      },
      dashboardAccess: false,
    },
  };

  return configs[superRole || SuperRole.TENANT];
}

export function canUserAccessRoute(superRole: SuperRole | undefined, route: string): boolean {
  const config = getUserSuperRoleConfig(superRole);
  
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
    userHasPermission(superRole, resource, SuperAction.READ)
  );
}

export function userHasDashboardAccess(superRole: SuperRole | undefined): boolean {
  const config = getUserSuperRoleConfig(superRole);
  return config.dashboardAccess;
}

export function userHasPermission(
  superRole: SuperRole | undefined,
  resource: SuperResource,
  action: SuperAction
): boolean {
  const config = getUserSuperRoleConfig(superRole);
  const permissions = config.permissions[resource] || [];
  
  return permissions.includes(action) || permissions.includes(SuperAction.MANAGE);
}
