/**
 * Supabase Realtime Integration
 * 
 * Handles real-time broadcasting of notifications via Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import type { Notification, NotificationRealtimeEvent } from './types';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create Supabase client only if configured
const supabase = isSupabaseConfigured && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Notification channel names
 */
export const NOTIFICATION_CHANNELS = {
  USER: (userId: string) => `notifications-user-${userId}`,
  TEAM: (teamId: string) => `notifications-team-${teamId}`,
  SUPER: (superRole: string) => `notifications-super-${superRole.toLowerCase()}`,
} as const;

/**
 * Notification event types
 */
export const NOTIFICATION_EVENTS = {
  CREATED: 'notification_created',
  UPDATED: 'notification_updated',
  DELETED: 'notification_deleted',
} as const;

/**
 * No-op function for backward compatibility
 * postgres_changes handles replication automatically, no broadcast needed
 */
export async function broadcastNotificationCreated(
  notification: Notification
): Promise<void> {
  // No-op: postgres_changes handles this automatically
}

/**
 * No-op function for backward compatibility
 * postgres_changes handles replication automatically, no broadcast needed
 */
export async function broadcastNotificationUpdated(
  notification: Notification
): Promise<void> {
  // No-op: postgres_changes handles this automatically
}

/**
 * No-op function for backward compatibility
 * postgres_changes handles replication automatically, no broadcast needed
 */
export async function broadcastNotificationDeleted(
  notificationId: string,
  scope: string,
  targetId: string
): Promise<void> {
  // No-op: postgres_changes handles this automatically
}

/**
 * Subscribe to user notifications
 * 
 * Listens to postgres_changes on the Notification table filtered by userId
 */
export function subscribeToUserNotifications(
  userId: string,
  callback: (event: NotificationRealtimeEvent) => void
) {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase not configured, cannot subscribe to notifications');
    return () => {};
  }

  const channelName = `notifications-user-${userId}`;
  const channel = supabase.channel(channelName);

  channel
    // Listen to INSERT events (new notifications)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Notification',
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        const event: NotificationRealtimeEvent = {
          event: 'notification_created',
          notification: payload.new as Notification,
          timestamp: new Date().toISOString(),
        };
        console.log('🔔 [postgres_changes] New notification for user:', userId);
        callback(event);
      }
    )
    // Listen to UPDATE events (notification updates)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'Notification',
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        const event: NotificationRealtimeEvent = {
          event: 'notification_updated',
          notification: payload.new as Notification,
          timestamp: new Date().toISOString(),
        };
        console.log('📝 [postgres_changes] Notification updated for user:', userId);
        callback(event);
      }
    )
    // Listen to DELETE events (notification deletions)
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'Notification',
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        const event: NotificationRealtimeEvent = {
          event: 'notification_deleted',
          notification: payload.old as Notification,
          timestamp: new Date().toISOString(),
        };
        console.log('🗑️ [postgres_changes] Notification deleted for user:', userId);
        callback(event);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to user notifications via postgres_changes: ${userId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to user notifications: ${userId}`, err);
        console.error('💡 Make sure Supabase Realtime is enabled for the Notification table');
        console.error('   Visit: https://supabase.com/dashboard/project/_/database/replication');
      } else if (status === 'TIMED_OUT') {
        console.error(`⏱️ Subscription timed out for user notifications: ${userId}`);
      } else if (status === 'CLOSED') {
        console.log(`🔌 Subscription closed for user notifications: ${userId}`);
      }
    });

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to team notifications
 * 
 * Listens to postgres_changes on the Notification table filtered by teamId
 */
export function subscribeToTeamNotifications(
  teamId: string,
  callback: (event: NotificationRealtimeEvent) => void
) {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase not configured, cannot subscribe to notifications');
    return () => {};
  }

  const channelName = `notifications-team-${teamId}`;
  const channel = supabase.channel(channelName);

  channel
    // Listen to INSERT events (new notifications)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Notification',
        filter: `teamId=eq.${teamId}`,
      },
      (payload) => {
        const event: NotificationRealtimeEvent = {
          event: 'notification_created',
          notification: payload.new as Notification,
          timestamp: new Date().toISOString(),
        };
        console.log('🔔 [postgres_changes] New notification for team:', teamId);
        callback(event);
      }
    )
    // Listen to UPDATE events (notification updates)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'Notification',
        filter: `teamId=eq.${teamId}`,
      },
      (payload) => {
        const event: NotificationRealtimeEvent = {
          event: 'notification_updated',
          notification: payload.new as Notification,
          timestamp: new Date().toISOString(),
        };
        console.log('📝 [postgres_changes] Notification updated for team:', teamId);
        callback(event);
      }
    )
    // Listen to DELETE events (notification deletions)
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'Notification',
        filter: `teamId=eq.${teamId}`,
      },
      (payload) => {
        const event: NotificationRealtimeEvent = {
          event: 'notification_deleted',
          notification: payload.old as Notification,
          timestamp: new Date().toISOString(),
        };
        console.log('🗑️ [postgres_changes] Notification deleted for team:', teamId);
        callback(event);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to team notifications via postgres_changes: ${teamId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to team notifications: ${teamId}`, err);
        console.error('💡 Make sure Supabase Realtime is enabled for the Notification table');
        console.error('   Visit: https://supabase.com/dashboard/project/_/database/replication');
      } else if (status === 'TIMED_OUT') {
        console.error(`⏱️ Subscription timed out for team notifications: ${teamId}`);
      } else if (status === 'CLOSED') {
        console.log(`🔌 Subscription closed for team notifications: ${teamId}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to super admin notifications
 * 
 * Listens to postgres_changes on the Notification table filtered by superRole
 */
export function subscribeToSuperNotifications(
  superRole: string,
  callback: (event: NotificationRealtimeEvent) => void
) {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase not configured, cannot subscribe to notifications');
    return () => {};
  }

  const channelName = `notifications-super-${superRole.toLowerCase()}`;
  const channel = supabase.channel(channelName);

  channel
    // Listen to INSERT events (new notifications)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Notification',
        filter: `superRole=eq.${superRole}`,
      },
      (payload) => {
        const event: NotificationRealtimeEvent = {
          event: 'notification_created',
          notification: payload.new as Notification,
          timestamp: new Date().toISOString(),
        };
        console.log('🔔 [postgres_changes] New notification for super role:', superRole);
        callback(event);
      }
    )
    // Listen to UPDATE events (notification updates)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'Notification',
        filter: `superRole=eq.${superRole}`,
      },
      (payload) => {
        const event: NotificationRealtimeEvent = {
          event: 'notification_updated',
          notification: payload.new as Notification,
          timestamp: new Date().toISOString(),
        };
        console.log('📝 [postgres_changes] Notification updated for super role:', superRole);
        callback(event);
      }
    )
    // Listen to DELETE events (notification deletions)
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'Notification',
        filter: `superRole=eq.${superRole}`,
      },
      (payload) => {
        const event: NotificationRealtimeEvent = {
          event: 'notification_deleted',
          notification: payload.old as Notification,
          timestamp: new Date().toISOString(),
        };
        console.log('🗑️ [postgres_changes] Notification deleted for super role:', superRole);
        callback(event);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to super notifications via postgres_changes: ${superRole}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to super notifications: ${superRole}`, err);
        console.error('💡 Make sure Supabase Realtime is enabled for the Notification table');
        console.error('   Visit: https://supabase.com/dashboard/project/_/database/replication');
      } else if (status === 'TIMED_OUT') {
        console.error(`⏱️ Subscription timed out for super notifications: ${superRole}`);
      } else if (status === 'CLOSED') {
        console.log(`🔌 Subscription closed for super notifications: ${superRole}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

