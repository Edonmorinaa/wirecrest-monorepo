/**
 * Push Notifications Utility
 * 
 * Handles browser push notification permissions, registration, and display
 */

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check basic APIs
  const hasNotification = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  
  // Check protocol (HTTPS or localhost/127.0.0.1 required)
  // Note: Custom local domains (*.local) routing to 127.0.0.1 via /etc/hosts
  // are treated as localhost by browsers
  const isSecure = window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.endsWith('.local') ||
                   window.location.hostname.includes('127.0.0.1');
  
  return hasNotification && hasServiceWorker && hasPushManager && isSecure;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Register service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration);
    
    // After service worker is registered, subscribe to push
    await subscribeUserToPush(registration);
    
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Subscribe user to push notifications (server-side)
 */
async function subscribeUserToPush(registration: ServiceWorkerRegistration): Promise<void> {
  try {
    // Get VAPID public key from server
    const response = await fetch('/api/push/vapid-key');
    if (!response.ok) {
      console.warn('Could not get VAPID key');
      return;
    }
    
    const { publicKey } = await response.json();
    if (!publicKey) {
      console.warn('VAPID key not configured');
      return;
    }
    
    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    
    // Send subscription to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });
    
    console.log('✅ Subscribed to push notifications');
  } catch (error) {
    console.error('Error subscribing to push:', error);
  }
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Show a browser push notification
 */
export async function showPushNotification(options: PushNotificationOptions): Promise<void> {
  const permission = getNotificationPermission();
  
  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Show notification through service worker
    await registration.showNotification(options.title, {
      body: options.body,
      icon: options.icon || '/logo/logo.png',
      badge: options.badge || '/logo/logo.png',
      tag: options.tag || `notification-${Date.now()}`,
      requireInteraction: options.requireInteraction || false,
      data: options.data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error showing push notification:', error);
  }
}

/**
 * Initialize push notifications
 * Registers service worker and requests permission
 */
export async function initializePushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications not supported in this browser');
    return false;
  }

  try {
    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      console.warn('Service worker registration failed');
      return false;
    }

    console.log('✅ Service worker registered successfully');
    return true;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return false;
  }
}

/**
 * Create notification from notification object
 */
export function formatNotificationForPush(notification: any): PushNotificationOptions {
  // Strip HTML tags from title
  const plainTitle = notification.title?.replace(/<[^>]*>/g, '') || 'New Notification';
  
  return {
    title: notification.category || 'Wirecrest',
    body: plainTitle,
    icon: notification.avatarUrl || '/logo/logo.png',
    tag: notification.id,
    data: {
      notificationId: notification.id,
      category: notification.category,
      type: notification.type,
    },
  };
}

