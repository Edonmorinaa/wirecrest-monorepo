# Notifications Architecture

This document explains the two separate notification systems and how they work together.

## Overview

There are **TWO separate systems** working independently:

1. **Notifications System** (Database + Realtime) - For UI
2. **Push Web Notifications** (Service Worker + Web Push) - For browser notifications

## 1. Notifications System (Database + Realtime)

### Purpose
Store notifications in database and sync them to the UI in real-time.

### How it works
```
Server creates notification → Database INSERT → postgres_changes → Client UI updates
```

### Components

#### Server Side (`packages/notifications/src/`)
- **service.ts**: Creates notifications in database
- **queries.ts**: Fetches notifications from database
- **realtime.ts**: Provides subscription functions (uses postgres_changes)

#### Client Side (`apps/dashboard/src/`)
- **useNotifications.ts**: Hook that subscribes to postgres_changes and updates UI state
- **global-notification-listener.tsx**: Maintains global realtime connection

### Usage (Server)
```typescript
import { sendNotification } from '@wirecrest/notifications';

// This creates DB record AND sends push notification
await sendNotification({
  type: 'payment',
  scope: 'team',
  teamId: 'team-123',
  title: '<p>Payment received!</p>',
  category: 'Billing',
});
```

### Usage (Client)
```typescript
import { useNotifications } from '@/hooks/useNotifications';

function NotificationsList() {
  const { notifications, unreadCount } = useNotifications();
  
  return (
    <div>
      <h2>Notifications ({unreadCount})</h2>
      {notifications.map(n => (
        <div key={n.id}>{n.title}</div>
      ))}
    </div>
  );
}
```

## 2. Push Web Notifications (Service Worker + Web Push)

### Purpose
Send browser push notifications that appear even when the app is closed/minimized.

### How it works
```
Server → Web Push API → Service Worker → Browser Notification
```

### Components

#### Server Side (`packages/notifications/src/push.ts`)
- **sendPushNotificationToUser()**: Send push to specific user (all their devices)
- **sendPushNotificationToUsers()**: Send push to multiple users
- **subscribeToPush()**: Register a device for push notifications
- Uses `web-push` library with VAPID keys

#### Client Side (Service Worker)
- **sw.js**: Service worker that listens for push events
- **pushNotifications.ts**: Helper functions for registering/managing push

### How Push Works

1. **User subscribes** (one time per device):
```typescript
// Client requests permission and subscribes
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY,
});

// Send subscription to server
await fetch('/api/push/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription),
});
```

2. **Server sends push** (triggered manually):
```typescript
// This is automatically called by sendNotification()
await sendPushNotificationToUser(userId, notification);
```

3. **Service Worker receives push**:
```javascript
// In sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
  });
});
```

## How They Work Together

When you call `sendNotification()` from the server:

```typescript
await sendNotification({
  type: 'payment',
  scope: 'user',
  userId: 'user-123',
  title: '<p>Payment received!</p>',
  category: 'Billing',
});
```

**What happens:**

1. ✅ Notification saved to database (Notification table)
2. ✅ Push notification sent via Web Push API to user's devices
3. ✅ postgres_changes automatically syncs to connected clients
4. ✅ `useNotifications` hook updates UI with new notification
5. ✅ Service Worker shows browser notification

**All of this happens automatically!**

## Important Rules

### ❌ DON'T DO THIS
```typescript
// DON'T trigger push from postgres_changes
subscribeToUserNotifications(userId, (event) => {
  if (event.event === 'notification_created') {
    showPushNotification(event.notification); // ❌ WRONG!
  }
});
```

**Why?** Push notifications are already sent from the server. Triggering them from postgres_changes would create duplicates.

### ✅ DO THIS
```typescript
// Use postgres_changes ONLY for UI updates
subscribeToUserNotifications(userId, (event) => {
  if (event.event === 'notification_created') {
    setNotifications(prev => [event.notification, ...prev]); // ✅ CORRECT
  }
});
```

## Field Name Mapping

Supabase postgres_changes uses **Prisma field names** (camelCase), not database column names (snake_case).

```typescript
// ✅ CORRECT - Use Prisma field names
filter: `userId=eq.${userId}`
filter: `teamId=eq.${teamId}`
filter: `superRole=eq.${superRole}`

// ❌ WRONG - Don't use database column names
filter: `user_id=eq.${userId}`    // Wrong!
filter: `team_id=eq.${teamId}`    // Wrong!
filter: `super_role=eq.${superRole}` // Wrong!
```

Also use the **correct table name** as defined in Prisma schema:

```typescript
// ✅ CORRECT
table: 'Notification'

// ❌ WRONG
table: 'notification'  // Wrong!
```

## Environment Variables

### Required for Push Notifications

```bash
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:support@your-domain.com
```

### Required for Realtime

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing

### Test Database + Realtime
```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts
```

### Test Push Notifications
```typescript
import { testPushNotification } from '@wirecrest/notifications';

// Send test push to user
await testPushNotification('user-123');
```

## Troubleshooting

### Notifications not appearing in UI
1. Check Supabase Realtime is enabled for Notification table
2. Verify postgres_changes subscription is active (check console logs)
3. Check filter matches (userId, teamId, superRole)
4. Verify table name is correct: `Notification` (not `notification`)

### Push notifications not working
1. Check VAPID keys are configured
2. Verify user has granted notification permission
3. Check service worker is registered
4. Verify push subscription exists in database
5. Check browser console for errors

### Getting "mismatch" errors
- Use **Prisma field names** in filters: `userId`, `teamId`, `superRole`
- Use correct **table name**: `Notification`

## Summary

- **Notifications System**: postgres_changes → UI updates (automatic)
- **Push Notifications**: Web Push API → Service Worker → Browser (server-triggered)
- **Don't mix them**: postgres_changes is for UI, push is server-side only
- **One function**: `sendNotification()` handles both systems automatically

