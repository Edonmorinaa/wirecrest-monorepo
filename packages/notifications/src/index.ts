/**
 * @repo/notifications
 * 
 * A comprehensive notification system with multi-scope support, real-time delivery,
 * and automatic persistence.
 */

// Export types
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

// Export core service functions
export {
  sendNotification,
  sendNotificationBatch,
  sendTeamNotification,
  sendUserNotification,
  sendSuperNotification,
  sendPushForNotification,
} from './service';

// Export query functions
export {
  getUserNotifications,
  getTeamNotifications,
  getSuperNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  unarchiveNotification,
  deleteNotification,
  getUnreadCount,
  getNotifications,
} from './queries';

// Export cleanup functions
export {
  cleanupExpiredNotifications,
  cleanupArchivedNotifications,
  cleanupReadNotifications,
  performFullCleanup,
  getNotificationStatistics,
} from './cleanup';

// Export realtime functions and constants
export {
  isSupabaseConfigured,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENTS,
  subscribeToUserNotifications,
  subscribeToTeamNotifications,
  subscribeToSuperNotifications,
} from './realtime';

// Export push notification functions
export {
  sendPushNotificationToUser,
  sendPushNotificationToUsers,
  subscribeToPush,
  subscribeToAPNs,
  unsubscribeFromPush,
  getUserPushSubscriptions,
  cleanupOldSubscriptions,
  testPushNotification,
  getVapidPublicKey,
} from './push';

