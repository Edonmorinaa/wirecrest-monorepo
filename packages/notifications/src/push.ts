/**
 * Server-Side Push Notifications Service
 * 
 * Handles sending push notifications using Web Push Protocol (for web/Android)
 * and APNs (for iOS/macOS)
 */

// @ts-ignore - web-push types are not available in the current version
import webpush from 'web-push';
import { prisma } from '@wirecrest/db';
import type { Notification } from './types';

// VAPID Configuration (generate with: npx web-push generate-vapid-keys)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@wirecrest.app';

// APNs Configuration (for iOS/macOS)
const APNS_KEY_ID = process.env.APNS_KEY_ID || '';
const APNS_TEAM_ID = process.env.APNS_TEAM_ID || '';
const APNS_KEY_PATH = process.env.APNS_KEY_PATH || '';
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'app.wirecrest.dashboard';

// Initialize web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

/**
 * Send push notification to a user across all their devices
 */
export async function sendPushNotificationToUser(
  userId: string,
  notification: Notification
): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Get all active push subscriptions for this user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return results;
    }

    // Prepare push payload
    const payload = createPushPayload(notification);

    // Send to each subscription
    const promises = subscriptions.map(async (subscription) => {
      try {
        if (subscription.deviceType === 'ios' || subscription.deviceType === 'macos') {
          // Send via APNs for Apple devices
          await sendAPNsPush(subscription, payload);
        } else {
          // Send via Web Push for web/Android
          await sendWebPush(subscription, payload);
        }
        
        // Update last used timestamp
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastUsedAt: new Date() },
        });
        
        results.sent++;
      } catch (error: any) {
        console.error(`Failed to send push to subscription ${subscription.id}:`, error);
        
        // If subscription is invalid/expired, deactivate it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { isActive: false },
          });
          console.log(`Deactivated invalid subscription: ${subscription.id}`);
        }
        
        results.failed++;
        results.errors.push(error.message || 'Unknown error');
      }
    });

    await Promise.allSettled(promises);
  } catch (error: any) {
    console.error('Error sending push notifications:', error);
    results.errors.push(error.message || 'Unknown error');
  }

  return results;
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  notification: Notification
): Promise<{
  totalSent: number;
  totalFailed: number;
  errors: string[];
}> {
  const results = {
    totalSent: 0,
    totalFailed: 0,
    errors: [] as string[],
  };

  const promises = userIds.map(async (userId) => {
    const result = await sendPushNotificationToUser(userId, notification);
    results.totalSent += result.sent;
    results.totalFailed += result.failed;
    results.errors.push(...result.errors);
  });

  await Promise.allSettled(promises);
  return results;
}

/**
 * Send Web Push notification
 */
async function sendWebPush(
  subscription: any,
  payload: PushPayload
): Promise<void> {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  await webpush.sendNotification(
    pushSubscription,
    JSON.stringify(payload),
    {
      TTL: 86400, // 24 hours
    }
  );
}

/**
 * Send APNs push notification (for iOS/macOS)
 */
async function sendAPNsPush(
  subscription: any,
  payload: PushPayload
): Promise<void> {
  if (!subscription.apnsToken) {
    throw new Error('APNs token not found');
  }

  // Note: Actual APNs implementation would use apns2 or node-apn library
  // This is a placeholder for the structure
  
  // For production, you would:
  // 1. Install apns2: npm install apns2
  // 2. Load the APNs certificate/key
  // 3. Create APNs provider
  // 4. Send notification
  
  console.log('APNs push would be sent here:', {
    token: subscription.apnsToken,
    bundleId: subscription.apnsBundleId || APNS_BUNDLE_ID,
    payload,
  });
  
  // Example implementation (requires apns2 package):
  /*
  import { Notification as APNsNotification, Provider } from 'apns2';
  
  const provider = new Provider({
    token: {
      key: APNS_KEY_PATH,
      keyId: APNS_KEY_ID,
      teamId: APNS_TEAM_ID,
    },
    production: subscription.apnsEnvironment === 'production',
  });

  const notification = new APNsNotification(subscription.apnsToken, {
    alert: {
      title: payload.title,
      body: payload.body,
    },
    badge: 1,
    sound: 'default',
    topic: subscription.apnsBundleId || APNS_BUNDLE_ID,
    payload: payload.data,
  });

  await provider.send(notification);
  */
}

/**
 * Create push payload from notification
 */
function createPushPayload(notification: Notification): PushPayload {
  // Strip HTML tags from title
  const plainTitle = notification.title?.replace(/<[^>]*>/g, '') || 'New Notification';
  
  return {
    title: notification.category || 'Wirecrest',
    body: plainTitle,
    icon: notification.avatarUrl || '/logo/logo.png',
    badge: '/logo/logo.png',
    tag: notification.id,
    data: {
      notificationId: notification.id,
      category: notification.category,
      type: notification.type,
      metadata: notification.metadata,
      url: '/', // Could be customized based on notification type
    },
    requireInteraction: false,
  };
}

/**
 * Subscribe a user to push notifications
 */
export async function subscribeToPush(
  userId: string,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  options?: {
    userAgent?: string;
    deviceType?: string;
  }
): Promise<{ id: string; success: boolean }> {
  try {
    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      // Reactivate if it was deactivated
      if (!existing.isActive) {
        await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            lastUsedAt: new Date(),
            userAgent: options?.userAgent,
          },
        });
      }
      return { id: existing.id, success: true };
    }

    // Create new subscription
    const newSubscription = await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: options?.userAgent,
        deviceType: options?.deviceType || detectDeviceType(options?.userAgent),
        isActive: true,
      },
    });

    console.log(`✅ Push subscription created for user ${userId}`);
    return { id: newSubscription.id, success: true };
  } catch (error: any) {
    console.error('Error subscribing to push:', error);
    throw error;
  }
}

/**
 * Subscribe a user to APNs (iOS/macOS)
 */
export async function subscribeToAPNs(
  userId: string,
  apnsToken: string,
  options?: {
    bundleId?: string;
    environment?: 'production' | 'sandbox';
    userAgent?: string;
    deviceType?: 'ios' | 'macos';
  }
): Promise<{ id: string; success: boolean }> {
  try {
    // Check if APNs subscription already exists
    const existing = await prisma.pushSubscription.findFirst({
      where: {
        userId,
        apnsToken,
      },
    });

    if (existing) {
      // Update if needed
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          lastUsedAt: new Date(),
          apnsEnvironment: options?.environment,
          userAgent: options?.userAgent,
        },
      });
      return { id: existing.id, success: true };
    }

    // Create new APNs subscription
    const newSubscription = await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: `apns://${apnsToken}`, // Unique identifier
        p256dh: '', // Not used for APNs
        auth: '', // Not used for APNs
        apnsToken,
        apnsBundleId: options?.bundleId || APNS_BUNDLE_ID,
        apnsEnvironment: options?.environment || 'production',
        userAgent: options?.userAgent,
        deviceType: options?.deviceType || 'ios',
        isActive: true,
      },
    });

    console.log(`✅ APNs subscription created for user ${userId}`);
    return { id: newSubscription.id, success: true };
  } catch (error: any) {
    console.error('Error subscribing to APNs:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(
  endpoint: string
): Promise<{ success: boolean }> {
  try {
    await prisma.pushSubscription.update({
      where: { endpoint },
      data: { isActive: false },
    });
    
    console.log(`✅ Push subscription deactivated: ${endpoint}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error unsubscribing from push:', error);
    return { success: false };
  }
}

/**
 * Get user's push subscriptions
 */
export async function getUserPushSubscriptions(userId: string) {
  return await prisma.pushSubscription.findMany({
    where: {
      userId,
      isActive: true,
    },
  });
}

/**
 * Clean up old/inactive subscriptions
 */
export async function cleanupOldSubscriptions(
  olderThanDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.pushSubscription.deleteMany({
    where: {
      OR: [
        {
          isActive: false,
          updatedAt: { lt: cutoffDate },
        },
        {
          lastUsedAt: { lt: cutoffDate },
        },
      ],
    },
  });

  console.log(`🧹 Cleaned up ${result.count} old push subscriptions`);
  return result.count;
}

/**
 * Detect device type from user agent
 */
function detectDeviceType(userAgent?: string): string {
  if (!userAgent) return 'web';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  if (ua.includes('mac os x')) return 'macos';
  if (ua.includes('android')) return 'android';
  
  return 'web';
}

/**
 * Test push notification (for debugging)
 */
export async function testPushNotification(
  userId: string
): Promise<{ success: boolean; message: string }> {
  const testNotification: any = {
    id: 'test-' + Date.now(),
    type: 'MAIL',
    scope: 'USER',
    userId,
    title: '<p><strong>Test</strong> notification!</p>',
    category: 'Test',
    avatarUrl: '/logo/logo.png',
    isUnRead: true,
    isArchived: false,
    metadata: { test: true },
    createdAt: new Date(),
  };

  const result = await sendPushNotificationToUser(userId, testNotification);
  
  return {
    success: result.sent > 0,
    message: `Sent: ${result.sent}, Failed: ${result.failed}`,
  };
}

/**
 * Get VAPID public key (for client-side subscription)
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

