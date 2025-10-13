/**
 * Notification System Types
 * 
 * Defines all types and interfaces for the notification system.
 */

/**
 * Available notification types matching dashboard UI
 */
export type NotificationType = 
  | 'friend' 
  | 'project' 
  | 'file' 
  | 'tags' 
  | 'payment' 
  | 'order' 
  | 'delivery' 
  | 'chat' 
  | 'mail';

/**
 * Notification scope determines who can see the notification
 */
export type NotificationScope = 
  | 'user'   // Personal notification for specific user
  | 'team'   // Team notification (all team members can see it)
  | 'super'; // Super admin notification

/**
 * Super role types for admin notifications
 */
export type NotificationSuperRole = 'ADMIN' | 'SUPPORT';

/**
 * Payload for sending a notification
 */
export interface SendNotificationPayload {
  /** Type of notification (determines icon and category) */
  type: NotificationType;
  
  /** Scope determines the audience */
  scope: NotificationScope;
  
  // Targeting (at least one required based on scope)
  /** User ID for user-scoped notifications */
  userId?: string;
  
  /** Team ID for team-scoped notifications */
  teamId?: string;
  
  /** Super role for super-scoped notifications */
  superRole?: NotificationSuperRole;
  
  // Content
  /** HTML content for the notification title */
  title: string;
  
  /** Category label for the notification */
  category: string;
  
  /** Optional avatar URL */
  avatarUrl?: string;
  
  // Options
  /** Additional metadata (flexible JSON) */
  metadata?: Record<string, any>;
  
  /** Expiration in days (default: 30) */
  expiresInDays?: number;
}

/**
 * Notification object returned from database
 */
export interface Notification {
  id: string;
  type: NotificationType;
  scope: NotificationScope;
  
  userId: string | null;
  teamId: string | null;
  superRole: string | null;
  
  title: string;
  category: string;
  avatarUrl: string | null;
  
  isUnRead: boolean;
  isArchived: boolean;
  
  metadata: Record<string, any> | null;
  createdAt: Date;
  expiresAt: Date | null;
}

/**
 * Query filters for fetching notifications
 */
export interface NotificationFilters {
  /** Only return unread notifications */
  unreadOnly?: boolean;
  
  /** Only return archived notifications */
  archivedOnly?: boolean;
  
  /** Filter by notification type */
  type?: NotificationType;
  
  /** Limit number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
  
  /** Filter by date range */
  startDate?: Date;
  endDate?: Date;
}

/**
 * Options for marking notifications as read
 */
export interface MarkAsReadOptions {
  /** Mark for specific user */
  userId?: string;
  
  /** Mark for specific team */
  teamId?: string;
  
  /** Mark for specific super role */
  superRole?: NotificationSuperRole;
}

/**
 * Realtime notification event payload
 */
export interface NotificationRealtimeEvent {
  event: 'notification_created' | 'notification_updated' | 'notification_deleted';
  notification: Notification;
  timestamp: string;
}

