'use server';

/**
 * Server Actions for Push Notification Subscription Management
 */

import {
  subscribeToPush,
  subscribeToAPNs,
  unsubscribeFromPush,
  getUserPushSubscriptions,
  getVapidPublicKey,
  testPushNotification,
} from '@wirecrest/notifications';
import { auth } from '@wirecrest/auth-next';

/**
 * Get VAPID public key for client-side subscription
 */
export async function getVapidKey(): Promise<{ success: boolean; publicKey?: string; error?: string }> {
  try {
    const publicKey = getVapidPublicKey();
    
    if (!publicKey) {
      return {
        success: false,
        error: 'VAPID keys not configured. Run: npx ts-node packages/notifications/scripts/generate-vapid-keys.ts',
      };
    }
    
    return {
      success: true,
      publicKey,
    };
  } catch (error: any) {
    console.error('Error getting VAPID key:', error);
    return {
      success: false,
      error: error.message || 'Failed to get VAPID key',
    };
  }
}

/**
 * Subscribe user to push notifications
 */
export async function subscribePushNotifications(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userAgent?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const result = await subscribeToPush(
      session.user.id,
      subscription,
      { userAgent }
    );

    return {
      success: result.success,
      id: result.id,
    };
  } catch (error: any) {
    console.error('Error subscribing to push:', error);
    return {
      success: false,
      error: error.message || 'Failed to subscribe',
    };
  }
}

/**
 * Subscribe user to APNs (iOS/macOS)
 */
export async function subscribeAPNs(
  apnsToken: string,
  options?: {
    bundleId?: string;
    environment?: 'production' | 'sandbox';
    deviceType?: 'ios' | 'macos';
    userAgent?: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const result = await subscribeToAPNs(
      session.user.id,
      apnsToken,
      options
    );

    return {
      success: result.success,
      id: result.id,
    };
  } catch (error: any) {
    console.error('Error subscribing to APNs:', error);
    return {
      success: false,
      error: error.message || 'Failed to subscribe to APNs',
    };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribePushNotifications(
  endpoint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const result = await unsubscribeFromPush(endpoint);
    return result;
  } catch (error: any) {
    console.error('Error unsubscribing from push:', error);
    return {
      success: false,
      error: error.message || 'Failed to unsubscribe',
    };
  }
}

/**
 * Get user's push subscriptions
 */
export async function getPushSubscriptions(): Promise<{
  success: boolean;
  subscriptions?: any[];
  error?: string;
}> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const subscriptions = await getUserPushSubscriptions(session.user.id);
    
    return {
      success: true,
      subscriptions,
    };
  } catch (error: any) {
    console.error('Error getting push subscriptions:', error);
    return {
      success: false,
      error: error.message || 'Failed to get subscriptions',
    };
  }
}

/**
 * Test push notification
 */
export async function sendTestPushNotification(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const result = await testPushNotification(session.user.id);
    
    return {
      success: result.success,
      message: result.message,
    };
  } catch (error: any) {
    console.error('Error sending test push:', error);
    return {
      success: false,
      error: error.message || 'Failed to send test notification',
    };
  }
}

