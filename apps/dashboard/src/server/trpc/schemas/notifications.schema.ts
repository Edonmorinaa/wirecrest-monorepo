/**
 * Zod Schemas for Notifications Router
 */

import { z } from 'zod';

/**
 * Notification filters
 */
export const notificationFiltersSchema = z.object({
  unreadOnly: z.boolean().optional(),
  archivedOnly: z.boolean().optional(),
  type: z.string().optional(),
  limit: z.number().int().positive().optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0),
});

/**
 * Team ID schema
 */
export const teamIdParamSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

/**
 * Combined fetch schema with filters
 */
export const fetchNotificationsSchema = notificationFiltersSchema;

/**
 * Team notifications schema
 */
export const fetchTeamNotificationsSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  filters: notificationFiltersSchema.optional(),
});

/**
 * Super notifications schema
 */
export const fetchSuperNotificationsSchema = z.object({
  filters: notificationFiltersSchema.optional(),
});

/**
 * Notification ID schema
 */
export const notificationIdSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
});

/**
 * Mark all as read schema
 */
export const markAllAsReadSchema = z.object({
  scope: z.enum(['user', 'team', 'super']),
  targetId: z.string().optional(),
});

/**
 * Unread count schema
 */
export const unreadCountSchema = z.object({
  scope: z.enum(['user', 'team', 'super']),
  targetId: z.string().optional(),
});

/**
 * Push subscription schema
 */
export const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('Valid endpoint URL is required'),
    keys: z.object({
      p256dh: z.string().min(1, 'p256dh key is required'),
      auth: z.string().min(1, 'auth key is required'),
    }),
  }),
  userAgent: z.string().optional(),
});

/**
 * APNs subscription schema
 */
export const apnsSubscriptionSchema = z.object({
  apnsToken: z.string().min(1, 'APNs token is required'),
  options: z.object({
    bundleId: z.string().optional(),
    environment: z.enum(['production', 'sandbox']).optional(),
    deviceType: z.enum(['ios', 'macos']).optional(),
    userAgent: z.string().optional(),
  }).optional(),
});

/**
 * Unsubscribe schema
 */
export const unsubscribeSchema = z.object({
  endpoint: z.string().url('Valid endpoint URL is required'),
});

