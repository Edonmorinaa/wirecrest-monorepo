/**
 * Notification Cleanup Service
 * 
 * Handles automatic purging of expired notifications.
 */

import { prisma } from '@wirecrest/db';

/**
 * Delete all expired notifications
 * 
 * Removes notifications where expiresAt is in the past.
 * This function should be called periodically (e.g., via cron job).
 * 
 * @returns The number of deleted notifications
 * 
 * @example
 * ```typescript
 * // In a cron job or scheduled task
 * const deletedCount = await cleanupExpiredNotifications();
 * console.log(`Deleted ${deletedCount} expired notifications`);
 * ```
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  try {
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    console.log(`Cleaned up ${result.count} expired notifications`);
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup expired notifications:', error);
    throw new Error('Failed to cleanup expired notifications');
  }
}

/**
 * Delete archived notifications older than specified days
 * 
 * @param daysOld - Number of days old for archived notifications to be deleted
 * @returns The number of deleted notifications
 * 
 * @example
 * ```typescript
 * // Delete archived notifications older than 90 days
 * const deletedCount = await cleanupArchivedNotifications(90);
 * ```
 */
export async function cleanupArchivedNotifications(daysOld: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        isArchived: true,
        createdAt: {
          lte: cutoffDate,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old archived notifications`);
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup archived notifications:', error);
    throw new Error('Failed to cleanup archived notifications');
  }
}

/**
 * Delete all read notifications older than specified days
 * 
 * @param daysOld - Number of days old for read notifications to be deleted
 * @returns The number of deleted notifications
 * 
 * @example
 * ```typescript
 * // Delete read notifications older than 60 days
 * const deletedCount = await cleanupReadNotifications(60);
 * ```
 */
export async function cleanupReadNotifications(daysOld: number = 60): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        isUnRead: false,
        isArchived: false,
        createdAt: {
          lte: cutoffDate,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old read notifications`);
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup read notifications:', error);
    throw new Error('Failed to cleanup read notifications');
  }
}

/**
 * Perform a full cleanup operation
 * 
 * Runs all cleanup operations:
 * - Expired notifications
 * - Old archived notifications (90+ days)
 * - Old read notifications (60+ days)
 * 
 * @returns Object with counts for each cleanup operation
 * 
 * @example
 * ```typescript
 * const results = await performFullCleanup();
 * console.log('Cleanup results:', results);
 * ```
 */
export async function performFullCleanup(): Promise<{
  expired: number;
  archived: number;
  read: number;
  total: number;
}> {
  const expired = await cleanupExpiredNotifications();
  const archived = await cleanupArchivedNotifications(90);
  const read = await cleanupReadNotifications(60);

  const total = expired + archived + read;

  return {
    expired,
    archived,
    read,
    total,
  };
}

/**
 * Get statistics about notifications in the database
 * 
 * @returns Statistics object
 */
export async function getNotificationStatistics(): Promise<{
  total: number;
  unread: number;
  archived: number;
  expired: number;
}> {
  const [total, unread, archived, expired] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { isUnRead: true } }),
    prisma.notification.count({ where: { isArchived: true } }),
    prisma.notification.count({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    }),
  ]);

  return {
    total,
    unread,
    archived,
    expired,
  };
}

