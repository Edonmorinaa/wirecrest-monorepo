'use server';

/**
 * Server Actions for Notifications
 * 
 * Provides server-side actions for notification management.
 */

import { auth } from '@wirecrest/auth/server';
import {
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  type Notification,
  archiveNotification,
  getTeamNotifications,
  getUserNotifications,
  getSuperNotifications,
  type NotificationFilters,
} from '@wirecrest/notifications';

/**
 * Fetch notifications for the current user
 * 
 * Fetches BOTH:
 * 1. Personal notifications (userId matches)
 * 2. Team notifications (for all teams the user is a member of)
 */
export async function fetchUserNotifications(
  filters?: NotificationFilters
): Promise<Notification[]> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const { prisma } = await import('@wirecrest/db');
    
    // Get user's personal notifications
    const userNotifications = await getUserNotifications(session.user.id, filters);
    
    // Get all teams the user is a member of
    const teamMemberships = await prisma.teamMember.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        teamId: true,
      },
    });
    
    const teamIds = teamMemberships.map((tm) => tm.teamId);
    
    // Get all team notifications for user's teams
    let teamNotifications: Notification[] = [];
    if (teamIds.length > 0) {
      const whereClause: any = {
        teamId: {
          in: teamIds,
        },
        scope: 'TEAM',
      };

      if (filters?.unreadOnly) {
        whereClause.isUnRead = true;
      }
      if (filters?.archivedOnly) {
        whereClause.isArchived = true;
      }
      if (filters?.type) {
        whereClause.type = filters.type.toUpperCase();
      }

      teamNotifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      }) as unknown as Notification[];
    }
    
    // Combine and sort by createdAt
    const allNotifications = [...userNotifications, ...teamNotifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Apply limit if specified
    const limit = filters?.limit || 100;
    return allNotifications.slice(0, limit);
  } catch (error) {
    console.error('Failed to fetch user notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
}

/**
 * Fetch notifications for a team
 */
export async function fetchTeamNotifications(
  teamId: string,
  filters?: NotificationFilters
): Promise<Notification[]> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // TODO: Add team membership validation

  try {
    return await getTeamNotifications(teamId, filters);
  } catch (error) {
    console.error('Failed to fetch team notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
}

/**
 * Fetch super admin notifications
 */
export async function fetchSuperNotifications(
  filters?: NotificationFilters
): Promise<Notification[]> {
  const session = await auth();
  
  if (!session?.user?.superRole || session.user.superRole === 'TENANT') {
    throw new Error('Unauthorized');
  }

  try {
    return await getSuperNotifications(session.user.superRole as 'ADMIN' | 'SUPPORT', filters);
  } catch (error) {
    console.error('Failed to fetch super notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    await markAsRead(notificationId);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(
  scope: 'user' | 'team' | 'super',
  targetId?: string
): Promise<number> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    if (scope === 'user') {
      return await markAllAsRead({ userId: session.user.id });
    } else if (scope === 'team' && targetId) {
      return await markAllAsRead({ teamId: targetId });
    } else if (scope === 'super' && session.user.superRole !== 'TENANT') {
      return await markAllAsRead({ superRole: session.user.superRole as 'ADMIN' | 'SUPPORT' });
    }
    
    throw new Error('Invalid scope');
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    throw new Error('Failed to mark all as read');
  }
}

/**
 * Archive a notification
 */
export async function archiveNotificationAction(notificationId: string): Promise<void> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    await archiveNotification(notificationId);
  } catch (error) {
    console.error('Failed to archive notification:', error);
    throw new Error('Failed to archive notification');
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(
  scope: 'user' | 'team' | 'super',
  targetId?: string
): Promise<number> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    if (scope === 'user') {
      return await getUnreadCount('user', session.user.id);
    } else if (scope === 'team' && targetId) {
      return await getUnreadCount('team', targetId);
    } else if (scope === 'super' && session.user.superRole !== 'TENANT') {
      return await getUnreadCount('super', session.user.superRole);
    }
    
    return 0;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

/**
 * Get the current user's team IDs (for realtime subscriptions)
 */
export async function getUserTeamIds(): Promise<string[]> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  try {
    const { prisma } = await import('@wirecrest/db');
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    });
    
    return teamMemberships.map((tm) => tm.teamId);
  } catch (error) {
    console.error('Failed to fetch user team IDs:', error);
    return [];
  }
}

