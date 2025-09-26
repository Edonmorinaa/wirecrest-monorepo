export enum SuperResource {
  USERS = 'users',
  TEAMS = 'teams',
  SETTINGS = 'settings',
  ANALYTICS = 'analytics',
  BILLING = 'billing',
}

export enum SuperAction {
  READ = 'READ',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  MANAGE = 'MANAGE',
}

export interface SuperRoleConfig {
  name: string;
  description: string;
  permissions: Record<SuperResource, SuperAction[]>;
  dashboardAccess: boolean;
}
