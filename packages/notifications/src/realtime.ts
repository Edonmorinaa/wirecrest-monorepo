/**
 * Realtime Integration (Legacy - No-op)
 * 
 * Previously handled real-time broadcasting via Supabase.
 * Now returns no-op functions for backward compatibility.
 */

import type { Notification, NotificationRealtimeEvent } from './types';

// Supabase is no longer configured (legacy code removed)
export const isSupabaseConfigured = false;

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
 * Subscribe to user notifications (Legacy - No-op)
 * 
 * Returns a no-op unsubscribe function for backward compatibility
 */
export function subscribeToUserNotifications(
  userId: string,
  callback: (event: NotificationRealtimeEvent) => void
) {
  console.warn('Real-time notifications are disabled (Supabase removed)');
  return () => {};
}

/**
 * Subscribe to team notifications (Legacy - No-op)
 * 
 * Returns a no-op unsubscribe function for backward compatibility
 */
export function subscribeToTeamNotifications(
  teamId: string,
  callback: (event: NotificationRealtimeEvent) => void
) {
  console.warn('Real-time notifications are disabled (Supabase removed)');
  return () => {};
}

/**
 * Subscribe to super admin notifications (Legacy - No-op)
 * 
 * Returns a no-op unsubscribe function for backward compatibility
 */
export function subscribeToSuperNotifications(
  superRole: string,
  callback: (event: NotificationRealtimeEvent) => void
) {
  console.warn('Real-time notifications are disabled (Supabase removed)');
  return () => {};
}

