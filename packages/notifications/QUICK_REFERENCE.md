# Notifications Quick Reference

## Common Use Cases

### 1. Send a User Notification (with Push)

```typescript
import { sendUserNotification } from '@wirecrest/notifications';

// Sends notification to DB + Push notification to all user's devices
await sendUserNotification('user-123', {
  type: 'payment',
  title: '<p>Payment received!</p>',
  category: 'Billing',
  expiresInDays: 7,
});
```

### 2. Send a Team Notification (with Push)

```typescript
import { sendTeamNotification } from '@wirecrest/notifications';

// Sends to all team members + Push to all their devices
await sendTeamNotification('team-456', {
  type: 'project',
  title: '<p>New project assigned</p>',
  category: 'Projects',
  avatarUrl: '/images/project.png',
});
```

### 3. Send Notification Without Push

```typescript
import { sendNotification } from '@wirecrest/notifications';

// For silent updates or bulk operations
await sendNotification({
  type: 'mail',
  scope: 'user',
  userId: 'user-123',
  title: '<p>You have new mail</p>',
  category: 'Email',
}, { skipPush: true });
```

### 4. Manually Send Push for Existing Notification

```typescript
import { sendPushForNotification } from '@wirecrest/notifications';

// If you created notification with skipPush, you can send push later
await sendPushForNotification('notification-id');
```

### 5. Display Notifications in UI

```typescript
'use client';

import { useNotifications } from '@/hooks/useNotifications';

export function NotificationsList() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    archiveNotification,
  } = useNotifications();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Notifications ({unreadCount})</h2>
      {notifications.map((notification) => (
        <div key={notification.id}>
          <div dangerouslySetInnerHTML={{ __html: notification.title }} />
          {notification.isUnRead && (
            <button onClick={() => markAsRead(notification.id)}>
              Mark as read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 6. Subscribe User to Push Notifications (Client)

```typescript
'use client';

import { subscribeToPush } from '@wirecrest/notifications';

async function enablePushNotifications() {
  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  // Send subscription to server
  await subscribeToPush(userId, subscription, {
    userAgent: navigator.userAgent,
    deviceType: 'web',
  });
}
```

### 7. Send Batch Notifications

```typescript
import { sendNotificationBatch } from '@wirecrest/notifications';

// Send multiple notifications at once
await sendNotificationBatch([
  {
    type: 'mail',
    scope: 'user',
    userId: 'user-1',
    title: '<p>Message 1</p>',
    category: 'Email',
  },
  {
    type: 'mail',
    scope: 'user',
    userId: 'user-2',
    title: '<p>Message 2</p>',
    category: 'Email',
  },
]);
```

### 8. Query Notifications

```typescript
import { getUserNotifications, getUnreadCount } from '@wirecrest/notifications';

// Get user's notifications with filters
const notifications = await getUserNotifications('user-123', {
  unreadOnly: true,
  type: 'payment',
  limit: 20,
});

// Get unread count
const count = await getUnreadCount('user-123');
```

### 9. Mark Notifications as Read

```typescript
import { markAsRead, markAllAsRead } from '@wirecrest/notifications';

// Mark specific notification as read
await markAsRead('notification-id');

// Mark all user notifications as read
await markAllAsRead({ userId: 'user-123' });

// Mark all team notifications as read
await markAllAsRead({ teamId: 'team-456' });
```

### 10. Archive Notifications

```typescript
import { archiveNotification } from '@wirecrest/notifications';

await archiveNotification('notification-id');
```

---

## Important Notes

### Server-Side Only Functions
These can only be called from server-side code (API routes, server actions):
- `sendNotification()`
- `sendUserNotification()`
- `sendTeamNotification()`
- `sendSuperNotification()`
- `sendPushForNotification()`
- `subscribeToPush()` (when called from API)

### Client-Side Only Functions
These are used in React components:
- `useNotifications()` hook
- Service Worker push subscription

### Universal Functions (Server or Client)
These work in both environments:
- Query functions (via server actions)
- Push subscription (via API route)

---

## Notification Types

Available types (with default icons):
- `friend` - Friend/contact related
- `project` - Project updates
- `file` - File operations
- `tags` - Tag/category updates
- `payment` - Payment/billing
- `order` - Order management
- `delivery` - Delivery/shipping
- `chat` - Chat messages
- `mail` - Email notifications

---

## Notification Scopes

### `user` - Personal notification
```typescript
{
  scope: 'user',
  userId: 'user-123',  // Required
}
```

### `team` - Team notification (visible to all members)
```typescript
{
  scope: 'team',
  teamId: 'team-456',  // Required
}
```

### `super` - Super admin notification
```typescript
{
  scope: 'super',
  superRole: 'ADMIN',  // Required: 'ADMIN' or 'SUPPORT'
}
```

---

## Best Practices

1. **Always use helper functions** (`sendUserNotification`, `sendTeamNotification`) when possible
2. **HTML in titles**: Use HTML for rich formatting: `<p><strong>Bold</strong> text</p>`
3. **Set meaningful categories**: Helps users filter/organize notifications
4. **Use avatarUrl**: Makes notifications more visually appealing
5. **Set appropriate expiry**: Default is 30 days, adjust based on importance
6. **Metadata for context**: Store additional data for click handlers

---

## Environment Setup

```bash
# Required for Push Notifications
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:support@yourdomain.com

# Required for Realtime
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional
NOTIFICATION_DEFAULT_EXPIRY_DAYS=30
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

---

## Troubleshooting

### Notifications not showing in UI
- Check console logs for postgres_changes subscription status
- Verify Supabase Realtime is enabled for `Notification` table
- Check filter syntax (use `userId`, not `user_id`)

### Push notifications not working
- Verify VAPID keys are configured
- Check user granted notification permission
- Verify service worker is registered
- Check push subscription exists in database

### "Mismatch" error
- Use Prisma field names: `userId`, `teamId`, `superRole`
- Use correct table name: `Notification` (PascalCase)

---

## Testing

```bash
# Run test suite
cd packages/notifications
npx tsx scripts/test-notifications.ts

# Test push notification to user
npx tsx -e "
import { testPushNotification } from './src/push';
testPushNotification('user-id').then(console.log);
"
```

