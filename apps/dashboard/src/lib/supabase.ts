import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Export configuration status
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create a mock client if Supabase is not configured
const createMockClient = (): any => ({
  channel: () => ({
    on: () => {},
    subscribe: () => {},
    send: () => Promise.resolve(),
  }),
  removeChannel: () => {},
  realtime: {
    onMessage: () => ({ unsubscribe: () => {} })
  }
});

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : createMockClient();

// Real-time channel names
export const REALTIME_CHANNELS = {
  TENANTS: 'tenants-updates',
  TENANT_DETAIL: (tenantId: string) => `tenant-${tenantId}`,
  BUSINESS_TASKS: 'business-tasks',
  MARKET_IDENTIFIERS: 'market-identifiers',
  NOTIFICATION_USER: (userId: string) => `notifications-user-${userId}`,
  NOTIFICATION_TEAM: (teamId: string) => `notifications-team-${teamId}`,
  NOTIFICATION_SUPER: (superRole: string) => `notifications-super-${superRole.toLowerCase()}`,
} as const;

// Real-time event types
export const REALTIME_EVENTS = {
  TENANT_UPDATED: 'tenant_updated',
  TENANT_CREATED: 'tenant_created',
  TENANT_DELETED: 'tenant_deleted',
  BUSINESS_TASK_UPDATED: 'business_task_updated',
  BUSINESS_TASK_CREATED: 'business_task_created',
  MARKET_IDENTIFIER_UPDATED: 'market_identifier_updated',
  PLATFORM_STATUS_CHANGED: 'platform_status_changed',
  STATS_UPDATED: 'stats_updated',
  NOTIFICATION_CREATED: 'notification_created',
  NOTIFICATION_UPDATED: 'notification_updated',
  NOTIFICATION_DELETED: 'notification_deleted',
} as const; 