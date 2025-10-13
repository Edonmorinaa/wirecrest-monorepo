/**
 * Notification Service
 * 
 * Core service for sending and managing notifications.
 */

import { prisma } from '@wirecrest/db';
import type { SendNotificationPayload, Notification } from './types';
import { sendPushNotificationToUser, sendPushNotificationToUsers } from './push';

// Default expiration in days
const DEFAULT_EXPIRY_DAYS = parseInt(
  process.env.NOTIFICATION_DEFAULT_EXPIRY_DAYS || '30',
  10
);

/**
 * Validate notification payload based on scope
 */
function validatePayload(payload: SendNotificationPayload): void {
  const { scope, userId, teamId, superRole } = payload;

  if (scope === 'user' && !userId) {
    throw new Error('userId is required for user-scoped notifications');
  }

  if (scope === 'team' && !teamId) {
    throw new Error('teamId is required for team-scoped notifications');
  }

  if (scope === 'super' && !superRole) {
    throw new Error('superRole is required for super-scoped notifications');
  }

  if (scope === 'super' && superRole && !['ADMIN', 'SUPPORT'].includes(superRole)) {
    throw new Error('superRole must be either ADMIN or SUPPORT');
  }
}

/**
 * Calculate expiration date
 */
function calculateExpirationDate(expiresInDays?: number): Date {
  const days = expiresInDays ?? DEFAULT_EXPIRY_DAYS;
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate;
}

/**
 * Send a notification
 * 
 * Creates a notification in the database and sends push notifications.
 * The notification will be automatically synced to clients via postgres_changes.
 * 
 * @param payload - The notification payload
 * @param options - Additional options
 * @returns The created notification
 * 
 * @example
 * ```typescript
 * const notification = await sendNotification({
 *   type: 'payment',
 *   scope: 'user',
 *   userId: 'user-123',
 *   title: '<p>Payment received</p>',
 *   category: 'Billing',
 *   expiresInDays: 7
 * });
 * ```
 */
export async function sendNotification(
  payload: SendNotificationPayload,
  options?: {
    /** Skip sending push notifications (default: false) */
    skipPush?: boolean;
  }
): Promise<Notification> {
  // Validate the payload
  validatePayload(payload);

  const {
    type,
    scope,
    userId,
    teamId,
    superRole,
    title,
    category,
    avatarUrl,
    metadata,
    expiresInDays,
  } = payload;

  // Calculate expiration date
  const expiresAt = calculateExpirationDate(expiresInDays);

  // Create notification data
  const notificationData: any = {
    type: type.toUpperCase(),
    scope: scope.toUpperCase(),
    title,
    category,
    avatarUrl: avatarUrl || null,
    metadata: metadata || null,
    expiresAt,
    isUnRead: true,
    isArchived: false,
  };

  // Add scope-specific fields
  if (scope === 'user') {
    notificationData.userId = userId;
  } else if (scope === 'team') {
    notificationData.teamId = teamId;
  } else if (scope === 'super') {
    notificationData.superRole = superRole;
  }

  try {
    // Create the notification in the database
    const notification = await prisma.notification.create({
      data: notificationData,
    });

    console.log(`✅ Notification created: ${notification.id}`);

    // Send push notifications (unless explicitly skipped)
    if (!options?.skipPush) {
      sendPushNotifications(notification as unknown as Notification, scope, userId, teamId)
        .catch((error) => {
          console.error('❌ Failed to send push notification:', error);
          // Don't throw - push notifications are best-effort
        });
    }

    return notification as unknown as Notification;
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw new Error('Failed to send notification');
  }
}

/**
 * Send push notifications based on notification scope
 * (Helper function - called asynchronously)
 */
async function sendPushNotifications(
  notification: Notification,
  scope: string,
  userId?: string,
  teamId?: string
): Promise<void> {
  try {
    if (scope === 'user' && userId) {
      // Send to specific user
      const result = await sendPushNotificationToUser(userId, notification);
      console.log(`📱 Push sent to user ${userId}: ${result.sent} sent, ${result.failed} failed`);
    } else if (scope === 'team' && teamId) {
      // Get all team members and send push to each
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true },
      });
      
      const userIds = teamMembers.map((tm) => tm.userId);
      if (userIds.length > 0) {
        const result = await sendPushNotificationToUsers(userIds, notification);
        console.log(
          `📱 Push sent to team ${teamId} (${userIds.length} users): ${result.totalSent} sent, ${result.totalFailed} failed`
        );
      }
    } else if (scope === 'super') {
      // Get all super admins/support users
      const superUsers = await prisma.user.findMany({
        where: {
          superRole: { in: ['ADMIN', 'SUPPORT'] },
        },
        select: { id: true },
      });
      
      const userIds = superUsers.map((u) => u.id);
      if (userIds.length > 0) {
        const result = await sendPushNotificationToUsers(userIds, notification);
        console.log(
          `📱 Push sent to super users (${userIds.length} users): ${result.totalSent} sent, ${result.totalFailed} failed`
        );
      }
    }
  } catch (error) {
    console.error('Error in sendPushNotifications:', error);
    // Swallow error - push notifications are best-effort
  }
}

/**
 * Send multiple notifications in batch
 * 
 * @param payloads - Array of notification payloads
 * @returns Array of created notifications
 */
export async function sendNotificationBatch(
  payloads: SendNotificationPayload[]
): Promise<Notification[]> {
  const results = await Promise.allSettled(
    payloads.map(payload => sendNotification(payload))
  );

  const successful: Notification[] = [];
  const failed: Error[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      console.error(`Failed to send notification ${index}:`, result.reason);
      failed.push(result.reason);
    }
  });

  if (failed.length > 0) {
    console.warn(`${failed.length} of ${payloads.length} notifications failed to send`);
  }

  return successful;
}

/**
 * Send notification to all team members
 * 
 * @param teamId - Team ID
 * @param payload - Notification payload (without teamId and scope)
 * @returns The created notification
 */
export async function sendTeamNotification(
  teamId: string,
  payload: Omit<SendNotificationPayload, 'teamId' | 'scope'>
): Promise<Notification> {
  return sendNotification({
    ...payload,
    scope: 'team',
    teamId,
  });
}

/**
 * Send notification to a specific user
 * 
 * @param userId - User ID
 * @param payload - Notification payload (without userId and scope)
 * @returns The created notification
 */
export async function sendUserNotification(
  userId: string,
  payload: Omit<SendNotificationPayload, 'userId' | 'scope'>
): Promise<Notification> {
  return sendNotification({
    ...payload,
    scope: 'user',
    userId,
  });
}

/**
 * Send notification to super admins
 * 
 * @param superRole - Super role (ADMIN or SUPPORT)
 * @param payload - Notification payload (without superRole and scope)
 * @returns The created notification
 */
export async function sendSuperNotification(
  superRole: 'ADMIN' | 'SUPPORT',
  payload: Omit<SendNotificationPayload, 'superRole' | 'scope'>
): Promise<Notification> {
  return sendNotification({
    ...payload,
    scope: 'super',
    superRole,
  });
}

/**
 * Send push notification for an existing notification
 * 
 * Useful if you need to manually trigger push notifications
 * for a notification that was created with skipPush: true
 * 
 * @param notificationId - Notification ID
 * @returns Push result
 */
export async function sendPushForNotification(
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Fetch the notification
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Send push based on scope
    const { scope, userId, teamId } = notification;
    
    await sendPushNotifications(
      notification as unknown as Notification,
      scope,
      userId || undefined,
      teamId || undefined
    );

    return {
      success: true,
      message: 'Push notification sent',
    };
  } catch (error: any) {
    console.error('Failed to send push for notification:', error);
    return {
      success: false,
      message: error.message || 'Unknown error',
    };
  }
}

