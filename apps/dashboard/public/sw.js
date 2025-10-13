/**
 * Service Worker for Push Notifications
 * Handles background push notifications and notification clicks
 */

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();

  // Open or focus the dashboard
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a dashboard window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Listen for push events from server (Web Push API)
self.addEventListener('push', (event) => {
  console.log('📱 Push event received from server');
  
  if (event.data) {
    try {
      let data;
      let title = 'Wirecrest';
      let body = 'You have a new notification';
      
      // Try to parse as JSON first
      try {
        data = event.data.json();
        console.log('📦 Push data (JSON):', data);
        
        title = data.title || title;
        body = data.body || body;
        
        // Server sends: { title, body, icon, badge, tag, data, requireInteraction }
        const options = {
          body,
          icon: data.icon || '/logo/logo.png',
          badge: data.badge || '/logo/logo.png',
          tag: data.tag || `notification-${Date.now()}`,
          data: data.data || {},
          requireInteraction: data.requireInteraction || false,
          vibrate: [200, 100, 200],
          timestamp: Date.now(),
        };

        event.waitUntil(
          self.registration.showNotification(title, options)
            .then(() => {
              console.log('✅ Notification displayed successfully');
            })
            .catch((error) => {
              console.error('❌ Failed to display notification:', error);
            })
        );
      } catch (jsonError) {
        // If JSON parsing fails, treat as plain text
        const textData = event.data.text();
        console.log('📦 Push data (plain text):', textData);
        
        // For plain text, use it as the body
        const options = {
          body: textData || body,
          icon: '/logo/logo.png',
          badge: '/logo/logo.png',
          tag: `notification-${Date.now()}`,
          vibrate: [200, 100, 200],
          timestamp: Date.now(),
        };

        event.waitUntil(
          self.registration.showNotification(title, options)
            .then(() => {
              console.log('✅ Notification displayed successfully (plain text)');
            })
            .catch((error) => {
              console.error('❌ Failed to display notification:', error);
            })
        );
      }
    } catch (error) {
      console.error('❌ Error handling push event:', error);
      
      // Fallback: show generic notification
      event.waitUntil(
        self.registration.showNotification('Wirecrest', {
          body: 'You have a new notification',
          icon: '/logo/logo.png',
          badge: '/logo/logo.png',
        })
      );
    }
  } else {
    console.warn('⚠️ Push event received but no data');
  }
});

