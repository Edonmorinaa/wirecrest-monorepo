/**
 * @repo/notifications/client
 * 
 * Client-safe exports for notifications package.
 * Does NOT include server-only functions that require database access.
 */

// Export types (safe for client)
export type {
  NotificationType,
  NotificationScope,
  NotificationSuperRole,
  SendNotificationPayload,
  Notification,
  NotificationFilters,
  MarkAsReadOptions,
  NotificationRealtimeEvent,
} from './types';

// Export realtime functions and constants (client-safe, no database access)
export {
  isSupabaseConfigured,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENTS,
  subscribeToUserNotifications,
  subscribeToTeamNotifications,
  subscribeToSuperNotifications,
} from './realtime';

// Export client-safe utility functions
export {
  getVapidPublicKey,
} from './client-utils';

