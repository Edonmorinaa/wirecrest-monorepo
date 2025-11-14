/**
 * Notifications Router
 * 
 * tRPC router for notification and push notification management:
 * - User notifications
 * - Team notifications
 * - Super admin notifications
 * - Push notification subscriptions
 * - Mark as read/archive
 */

import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure, publicProcedure } from '../trpc';
import {
  fetchNotificationsSchema,
  fetchTeamNotificationsSchema,
  fetchSuperNotificationsSchema,
  notificationIdSchema,
  markAllAsReadSchema,
  unreadCountSchema,
  pushSubscriptionSchema,
  apnsSubscriptionSchema,
  unsubscribeSchema,
} from '../schemas/notifications.schema';
import {
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  archiveNotification,
  getTeamNotifications,
  getUserNotifications,
  getSuperNotifications,
  subscribeToPush,
  subscribeToAPNs,
  unsubscribeFromPush,
  getUserPushSubscriptions,
  getVapidPublicKey,
  testPushNotification,
} from '@wirecrest/notifications';
import { prisma } from '@wirecrest/db';

/**
 * Notifications Router
 */
export const notificationsRouter = router({
  /**
   * Fetch user notifications (personal + team notifications)
   */
  fetchUser: protectedProcedure
    .input(fetchNotificationsSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Get user's personal notifications
        const userNotifications = await getUserNotifications(ctx.session.user.id, input);

        // Get all teams the user is a member of
        const teamMemberships = await prisma.teamMember.findMany({
          where: {
            userId: ctx.session.user.id,
          },
          select: {
            teamId: true,
          },
        });

        const teamIds = teamMemberships.map((tm) => tm.teamId);

        // Get all team notifications for user's teams
        let teamNotifications: any[] = [];
        if (teamIds.length > 0) {
          const whereClause: any = {
            teamId: {
              in: teamIds,
            },
            scope: 'TEAM',
          };

          if (input.unreadOnly) {
            whereClause.isUnRead = true;
          }
          if (input.archivedOnly) {
            whereClause.isArchived = true;
          }
          if (input.type) {
            whereClause.type = input.type.toUpperCase();
          }

          teamNotifications = await prisma.notification.findMany({
            where: whereClause,
            orderBy: {
              createdAt: 'desc',
            },
            take: input.limit || 100,
            skip: input.offset || 0,
          });
        }

        // Combine and sort by createdAt
        const allNotifications = [...userNotifications, ...teamNotifications].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Apply limit
        const limit = input.limit || 100;
        return allNotifications.slice(0, limit);
      } catch (error) {
        console.error('Failed to fetch user notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notifications',
        });
      }
    }),

  /**
   * Fetch team notifications
   */
  fetchTeam: protectedProcedure
    .input(fetchTeamNotificationsSchema)
    .query(async ({ ctx, input }) => {
      // TODO: Add team membership validation

      try {
        return await getTeamNotifications(input.teamId, input.filters);
      } catch (error) {
        console.error('Failed to fetch team notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notifications',
        });
      }
    }),

  /**
   * Fetch super admin notifications
   */
  fetchSuper: adminProcedure
    .input(fetchSuperNotificationsSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.superRole === 'TENANT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Unauthorized',
        });
      }

      try {
        return await getSuperNotifications(
          ctx.session.user.superRole as 'ADMIN' | 'SUPPORT',
          input.filters
        );
      } catch (error) {
        console.error('Failed to fetch super notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notifications',
        });
      }
    }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(notificationIdSchema)
    .mutation(async ({ input }) => {
      try {
        await markAsRead(input.notificationId);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark notification as read',
        });
      }
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure
    .input(markAllAsReadSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.scope === 'user') {
          return await markAllAsRead({ userId: ctx.session.user.id });
        } else if (input.scope === 'team' && input.targetId) {
          return await markAllAsRead({ teamId: input.targetId });
        } else if (input.scope === 'super' && ctx.session.user.superRole !== 'TENANT') {
          return await markAllAsRead({
            superRole: ctx.session.user.superRole as 'ADMIN' | 'SUPPORT',
          });
        }

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid scope',
        });
      } catch (error) {
        console.error('Failed to mark all as read:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark all as read',
        });
      }
    }),

  /**
   * Archive notification
   */
  archive: protectedProcedure
    .input(notificationIdSchema)
    .mutation(async ({ input }) => {
      try {
        await archiveNotification(input.notificationId);
      } catch (error) {
        console.error('Failed to archive notification:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to archive notification',
        });
      }
    }),

  /**
   * Get unread notification count
   */
  unreadCount: protectedProcedure
    .input(unreadCountSchema)
    .query(async ({ ctx, input }) => {
      try {
        if (input.scope === 'user') {
          return await getUnreadCount('user', ctx.session.user.id);
        } else if (input.scope === 'team' && input.targetId) {
          return await getUnreadCount('team', input.targetId);
        } else if (input.scope === 'super' && ctx.session.user.superRole !== 'TENANT') {
          return await getUnreadCount('super', ctx.session.user.superRole);
        }

        return 0;
      } catch (error) {
        console.error('Failed to get unread count:', error);
        return 0;
      }
    }),

  /**
   * Get user's team IDs (for realtime subscriptions)
   */
  userTeamIds: protectedProcedure.query(async ({ ctx }) => {
    try {
      const teamMemberships = await prisma.teamMember.findMany({
        where: { userId: ctx.session.user.id },
        select: { teamId: true },
      });

      return teamMemberships.map((tm) => tm.teamId);
    } catch (error) {
      console.error('Failed to fetch user team IDs:', error);
      return [];
    }
  }),

  /**
   * Get VAPID public key for push subscriptions
   */
  vapidKey: publicProcedure.query(() => {
    try {
      const publicKey = getVapidPublicKey();

      if (!publicKey) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'VAPID keys not configured. Run: npx ts-node packages/notifications/scripts/generate-vapid-keys.ts',
        });
      }

      return {
        success: true,
        publicKey,
      };
    } catch (error: any) {
      console.error('Error getting VAPID key:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to get VAPID key',
      });
    }
  }),

  /**
   * Subscribe to push notifications
   */
  subscribePush: protectedProcedure
    .input(pushSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await subscribeToPush(
          ctx.session.user.id,
          input.subscription,
          { userAgent: input.userAgent }
        );

        return {
          success: result.success,
          id: result.id,
        };
      } catch (error: any) {
        console.error('Error subscribing to push:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to subscribe',
        });
      }
    }),

  /**
   * Subscribe to APNs (iOS/macOS)
   */
  subscribeAPNs: protectedProcedure
    .input(apnsSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await subscribeToAPNs(
          ctx.session.user.id,
          input.apnsToken,
          input.options
        );

        return {
          success: result.success,
          id: result.id,
        };
      } catch (error: any) {
        console.error('Error subscribing to APNs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to subscribe to APNs',
        });
      }
    }),

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe: protectedProcedure
    .input(unsubscribeSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await unsubscribeFromPush(input.endpoint);
        return result;
      } catch (error: any) {
        console.error('Error unsubscribing from push:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to unsubscribe',
        });
      }
    }),

  /**
   * Get user's push subscriptions
   */
  pushSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const subscriptions = await getUserPushSubscriptions(ctx.session.user.id);

      return {
        success: true,
        subscriptions,
      };
    } catch (error: any) {
      console.error('Error getting push subscriptions:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to get subscriptions',
      });
    }
  }),

  /**
   * Send test push notification
   */
  testPush: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await testPushNotification(ctx.session.user.id);

      return {
        success: result.success,
        message: result.message,
      };
    } catch (error: any) {
      console.error('Error sending test push:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to send test notification',
      });
    }
  }),
});

