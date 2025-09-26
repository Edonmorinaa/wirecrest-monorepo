import { Role, SuperRole } from '@prisma/client';
import { ApiError } from './errors';
import { getTeamMember } from '@/models/team';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@wirecrest/auth/server';
import { prisma } from '@wirecrest/db';

export async function validateMembershipOperation(
  memberId: string,
  teamMember,
  operationMeta?: {
    role?: Role;
  }
) {
  const updatingMember = await getTeamMember(memberId, teamMember.team.slug);
  // Member and Admin can't update the role of Owner
  if (
    (teamMember.role === Role.MEMBER || teamMember.role === Role.ADMIN) &&
    updatingMember.role === Role.OWNER
  ) {
    throw new ApiError(403, 'You do not have permission to update the role of this member.');
  }
  // Member can't update the role of Admin & Owner
  if (
    teamMember.role === Role.MEMBER &&
    (updatingMember.role === Role.ADMIN || updatingMember.role === Role.OWNER)
  ) {
    throw new ApiError(403, 'You do not have permission to update the role of this member.');
  }

  // Admin can't make anyone an Owner
  if (teamMember.role === Role.ADMIN && operationMeta?.role === Role.OWNER) {
    throw new ApiError(
      403,
      'You do not have permission to update the role of this member to Owner.'
    );
  }

  // Member can't make anyone an Admin or Owner
  if (
    teamMember.role === Role.MEMBER &&
    (operationMeta?.role === Role.ADMIN || operationMeta?.role === Role.OWNER)
  ) {
    throw new ApiError(
      403,
      'You do not have permission to update the role of this member to Admin.'
    );
  }
}

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
      '/superadmin/health',
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
      '/superadmin/analytics',
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

// Helper functions
export function getSuperRoleConfig(superRole: SuperRole): SuperRoleConfig {
  return superRoleConfigs.find((config) => config.id === superRole) || superRoleConfigs[2]; // Default to TENANT
}

export function hasPermission(
  superRole: SuperRole,
  resource: SuperResource,
  action: SuperAction
): boolean {
  const config = getSuperRoleConfig(superRole);

  const permission = config.permissions.find((p) => p.resource === resource);
  if (!permission) return false;

  if (permission.actions === '*') return true;

  return permission.actions.includes(action);
}

export function canAccessRoute(superRole: SuperRole, route: string): boolean {
  const config = getSuperRoleConfig(superRole);

  // Check if route is in allowed navigation
  return config.navigationAccess.some(
    (allowedRoute) => route === allowedRoute || route.startsWith(allowedRoute + '/')
  );
}

export function hasDashboardAccess(superRole: SuperRole): boolean {
  const config = getSuperRoleConfig(superRole);
  return config.dashboardAccess;
}

// API middleware functions
export async function throwIfNotSuperRole(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredRoles: SuperRole[] = [SuperRole.ADMIN, SuperRole.SUPPORT]
) {
  const session = await getSession(req, res);
  if (!session) {
    throw new ApiError(401, 'Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!requiredRoles.includes(user.superRole)) {
    throw new ApiError(403, 'Access denied. Insufficient privileges.');
  }

  return user;
}

export async function throwIfNotSuperAdmin(req: NextApiRequest, res: NextApiResponse) {
  return throwIfNotSuperRole(req, res, [SuperRole.ADMIN]);
}

export async function throwIfNotSuperAdminOrSupport(req: NextApiRequest, res: NextApiResponse) {
  return throwIfNotSuperRole(req, res, [SuperRole.ADMIN, SuperRole.SUPPORT]);
}

export async function requirePermission(
  req: NextApiRequest,
  res: NextApiResponse,
  resource: SuperResource,
  action: SuperAction
) {
  const user = await throwIfNotSuperRole(req, res);

  if (!hasPermission(user.superRole, resource, action)) {
    throw new ApiError(403, `Access denied. Missing permission: ${action} on ${resource}`);
  }

  return user;
}

// Client-side helper functions
export function getUserSuperRoleConfig(superRole: SuperRole | null | undefined): SuperRoleConfig {
  if (!superRole) return getSuperRoleConfig(SuperRole.TENANT);
  return getSuperRoleConfig(superRole);
}

export function canUserAccessRoute(
  superRole: SuperRole | null | undefined,
  route: string
): boolean {
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
