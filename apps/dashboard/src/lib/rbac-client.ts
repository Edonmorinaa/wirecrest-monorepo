import { SuperRole } from '@prisma/client';

export type SuperAction = 
  | 'read' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'manage' 
  | 'view_dashboard' 
  | 'view_analytics' 
  | 'manage_tenants' 
  | 'manage_users' 
  | 'manage_billing' 
  | 'view_logs' 
  | 'manage_settings' 
  | 'provide_support' 
  | 'view_support_tickets' 
  | 'manage_support_tickets';

export type SuperResource = 
  | 'super_admin_dashboard'
  | 'tenants'
  | 'tenant_details'
  | 'users'
  | 'billing'
  | 'analytics'
  | 'audit_logs'
  | 'system_settings'
  | 'support_tickets'
  | 'business_profiles'
  | 'market_identifiers'
  | 'platform_operations'
  | 'review_management'
  | 'data_export'
  | 'system_health';

export interface SuperPermission {
  resource: SuperResource;
  actions: SuperAction[] | '*';
}

export interface SuperRoleConfig {
  id: SuperRole;
  name: string;
  description: string;
  permissions: SuperPermission[];
  navigationAccess: string[];
  dashboardAccess: boolean;
}

// Define super role configurations
export const superRoleConfigs: SuperRoleConfig[] = [
  {
    id: SuperRole.ADMIN,
    name: 'Super Admin',
    description: 'Full system access with all administrative privileges',
    permissions: [
      { resource: 'super_admin_dashboard', actions: '*' },
      { resource: 'tenants', actions: '*' },
      { resource: 'tenant_details', actions: '*' },
      { resource: 'users', actions: '*' },
      { resource: 'billing', actions: '*' },
      { resource: 'analytics', actions: '*' },
      { resource: 'audit_logs', actions: '*' },
      { resource: 'system_settings', actions: '*' },
      { resource: 'support_tickets', actions: '*' },
      { resource: 'business_profiles', actions: '*' },
      { resource: 'market_identifiers', actions: '*' },
      { resource: 'platform_operations', actions: '*' },
      { resource: 'review_management', actions: '*' },
      { resource: 'data_export', actions: '*' },
      { resource: 'system_health', actions: '*' },
    ],
    navigationAccess: [
      '/superadmin',
      '/superadmin/tenants',
      '/superadmin/users',
      '/superadmin/analytics',
      '/superadmin/billing',
      '/superadmin/settings',
      '/superadmin/support',
      '/superadmin/logs',
      '/superadmin/health'
    ],
    dashboardAccess: true,
  },
  {
    id: SuperRole.SUPPORT,
    name: 'Support Agent',
    description: 'Customer support with limited administrative access',
    permissions: [
      { resource: 'super_admin_dashboard', actions: ['view_dashboard'] },
      { resource: 'tenants', actions: ['read', 'view_analytics'] },
      { resource: 'tenant_details', actions: ['read'] },
      { resource: 'users', actions: ['read'] },
      { resource: 'billing', actions: ['read'] },
      { resource: 'analytics', actions: ['read'] },
      { resource: 'audit_logs', actions: ['read'] },
      { resource: 'support_tickets', actions: '*' },
      { resource: 'business_profiles', actions: ['read'] },
      { resource: 'market_identifiers', actions: ['read'] },
      { resource: 'platform_operations', actions: ['read'] },
      { resource: 'review_management', actions: ['read', 'update'] },
      { resource: 'data_export', actions: ['read'] },
    ],
    navigationAccess: [
      '/superadmin',
      '/superadmin/tenants',
      '/superadmin/support',
      '/superadmin/analytics'
    ],
    dashboardAccess: true,
  },
  {
    id: SuperRole.TENANT,
    name: 'Tenant User',
    description: 'Regular tenant user with no administrative privileges',
    permissions: [],
    navigationAccess: [],
    dashboardAccess: false,
  },
];

// Client-safe helper functions (no server-side dependencies)
export function getSuperRoleConfig(superRole: SuperRole): SuperRoleConfig {
  return superRoleConfigs.find(config => config.id === superRole) || superRoleConfigs[2]; // Default to TENANT
}

export function hasPermission(
  superRole: SuperRole,
  resource: SuperResource,
  action: SuperAction
): boolean {
  const config = getSuperRoleConfig(superRole);
  
  const permission = config.permissions.find(p => p.resource === resource);
  if (!permission) return false;
  
  if (permission.actions === '*') return true;
  
  return permission.actions.includes(action);
}

export function canAccessRoute(superRole: SuperRole, route: string): boolean {
  const config = getSuperRoleConfig(superRole);
  
  // Check exact match first
  if (config.navigationAccess.includes(route)) return true;
  
  // Check if route starts with any allowed path
  return config.navigationAccess.some(allowedRoute => 
    route.startsWith(allowedRoute) && allowedRoute !== '/'
  );
}

export function hasDashboardAccess(superRole: SuperRole): boolean {
  const config = getSuperRoleConfig(superRole);
  return config.dashboardAccess;
}

export function getUserSuperRoleConfig(superRole: SuperRole | null | undefined): SuperRoleConfig {
  return getSuperRoleConfig(superRole || SuperRole.TENANT);
}

export function canUserAccessRoute(superRole: SuperRole | null | undefined, route: string): boolean {
  if (!superRole) return false;
  return canAccessRoute(superRole, route);
}

export function userHasDashboardAccess(superRole: SuperRole | null | undefined): boolean {
  if (!superRole) return false;
  return hasDashboardAccess(superRole);
}

export function userHasPermission(
  superRole: SuperRole | null | undefined,
  resource: SuperResource,
  action: SuperAction
): boolean {
  if (!superRole) return false;
  return hasPermission(superRole, resource, action);
} 