/**
 * Database Queries
 * 
 * Functions for querying, updating, and managing notifications in the database.
 */

import { prisma } from '@wirecrest/db';
import type { 
  Notification, 
  NotificationFilters, 
  MarkAsReadOptions,
  NotificationType,
  NotificationScope 
} from './types';
import { broadcastNotificationUpdated } from './realtime';

/**
 * Get notifications for a specific user
 */
export async function getUserNotifications(
  userId: string,
  filters: NotificationFilters = {}
): Promise<Notification[]> {
  const {
    unreadOnly = false,
    archivedOnly = false,
    type,
    limit = 50,
    offset = 0,
    startDate,
    endDate,
  } = filters;

  const where: any = {
    userId,
    scope: 'USER' as any,
  };

  if (unreadOnly) {
    where.isUnRead = true;
  }

  if (archivedOnly) {
    where.isArchived = true;
  }

  if (type) {
    where.type = type.toUpperCase();
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return notifications as unknown as Notification[];
}

/**
 * Get notifications for a specific team
 */
export async function getTeamNotifications(
  teamId: string,
  filters: NotificationFilters = {}
): Promise<Notification[]> {
  const {
    unreadOnly = false,
    archivedOnly = false,
    type,
    limit = 50,
    offset = 0,
    startDate,
    endDate,
  } = filters;

  const where: any = {
    teamId,
    scope: 'TEAM' as any,
  };

  if (unreadOnly) {
    where.isUnRead = true;
  }

  if (archivedOnly) {
    where.isArchived = true;
  }

  if (type) {
    where.type = type.toUpperCase();
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return notifications as unknown as Notification[];
}

/**
 * Get notifications for super admins
 */
export async function getSuperNotifications(
  superRole: 'ADMIN' | 'SUPPORT',
  filters: NotificationFilters = {}
): Promise<Notification[]> {
  const {
    unreadOnly = false,
    archivedOnly = false,
    type,
    limit = 50,
    offset = 0,
    startDate,
    endDate,
  } = filters;

  const where: any = {
    scope: 'SUPER' as any,
    superRole,
  };

  if (unreadOnly) {
    where.isUnRead = true;
  }

  if (archivedOnly) {
    where.isArchived = true;
  }

  if (type) {
    where.type = type.toUpperCase();
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return notifications as unknown as Notification[];
}

/**
 * Get a single notification by ID
 */
export async function getNotificationById(
  notificationId: string
): Promise<Notification | null> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  return notification as unknown as Notification | null;
}

/**
 * Mark a specific notification as read
 */
export async function markAsRead(notificationId: string): Promise<Notification> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isUnRead: false },
  });

  // Broadcast the update
  await broadcastNotificationUpdated(notification as unknown as Notification);

  return notification as unknown as Notification;
}

/**
 * Mark all notifications as read for a user, team, or super role
 */
export async function markAllAsRead(options: MarkAsReadOptions): Promise<number> {
  const { userId, teamId, superRole } = options;

  if (!userId && !teamId && !superRole) {
    throw new Error('At least one of userId, teamId, or superRole must be provided');
  }

  const where: any = {
    isUnRead: true,
  };

  if (userId) {
    where.userId = userId;
    where.scope = 'USER';
  } else if (teamId) {
    where.teamId = teamId;
    where.scope = 'TEAM';
  } else if (superRole) {
    where.superRole = superRole;
    where.scope = 'SUPER';
  }

  const result = await prisma.notification.updateMany({
    where,
    data: { isUnRead: false },
  });

  return result.count;
}

/**
 * Archive a notification
 */
export async function archiveNotification(notificationId: string): Promise<Notification> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isArchived: true },
  });

  // Broadcast the update
  await broadcastNotificationUpdated(notification as unknown as Notification);

  return notification as unknown as Notification;
}

/**
 * Unarchive a notification
 */
export async function unarchiveNotification(notificationId: string): Promise<Notification> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isArchived: false },
  });

  // Broadcast the update
  await broadcastNotificationUpdated(notification as unknown as Notification);

  return notification as unknown as Notification;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(
  scope: NotificationScope,
  targetId: string
): Promise<number> {
  const where: any = {
    isUnRead: true,
  };

  if (scope === 'user') {
    where.userId = targetId;
    where.scope = 'USER';
  } else if (scope === 'team') {
    where.teamId = targetId;
    where.scope = 'TEAM';
  } else if (scope === 'super') {
    where.superRole = targetId;
    where.scope = 'SUPER';
  }

  return await prisma.notification.count({ where });
}

/**
 * Get notifications by multiple filters (advanced query)
 */
export async function getNotifications(
  scope: NotificationScope,
  targetId: string,
  filters: NotificationFilters = {}
): Promise<Notification[]> {
  if (scope === 'user') {
    return getUserNotifications(targetId, filters);
  } else if (scope === 'team') {
    return getTeamNotifications(targetId, filters);
  } else if (scope === 'super') {
    return getSuperNotifications(targetId as 'ADMIN' | 'SUPPORT', filters);
  }

  return [];
}

