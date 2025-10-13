# Notifications System - Usage Examples

## Overview

The notifications system provides a complete solution for sending and managing notifications across different scopes (user, team, and super admin).

## Basic Usage

### 1. Sending Notifications

#### User Notification
```typescript
import { sendNotification } from '@wirecrest/notifications';

// Send a payment notification to a specific user
await sendNotification({
  type: 'payment',
  scope: 'user',
  userId: 'user-123',
  title: '<p>Payment of <strong>$99.99</strong> received successfully</p>',
  category: 'Billing',
  expiresInDays: 7
});

// Send a file upload notification
await sendNotification({
  type: 'file',
  scope: 'user',
  userId: 'user-123',
  title: '<p><strong>John Doe</strong> shared a file with you</p>',
  category: 'Files',
  avatarUrl: 'https://example.com/avatars/john.jpg',
  metadata: {
    fileId: 'file-456',
    fileName: 'document.pdf',
    fileSize: '2.3 MB'
  }
});
```

#### Team Notification
```typescript
// Notify entire team about project update
await sendNotification({
  type: 'project',
  scope: 'team',
  teamId: 'team-789',
  title: '<p><strong>Sarah</strong> mentioned you in <strong><a href="/projects/alpha">Project Alpha</a></strong></p>',
  category: 'Projects',
  avatarUrl: 'https://example.com/avatars/sarah.jpg'
});

// Team-wide order notification
await sendNotification({
  type: 'order',
  scope: 'team',
  teamId: 'team-789',
  title: '<p>New order #12345 requires attention</p>',
  category: 'Orders',
  metadata: {
    orderId: '12345',
    amount: 599.99,
    status: 'pending'
  }
});
```

#### Super Admin Notification
```typescript
// Notify all super admins
await sendNotification({
  type: 'mail',
  scope: 'super',
  superRole: 'ADMIN',
  title: '<p>New tenant signup requires approval</p>',
  category: 'System',
  metadata: {
    tenantId: 'tenant-999',
    tenantName: 'Acme Corp'
  }
});

// Notify support team
await sendNotification({
  type: 'chat',
  scope: 'super',
  superRole: 'SUPPORT',
  title: '<p>New support ticket from <strong>Customer ABC</strong></p>',
  category: 'Support'
});
```

### 2. Helper Functions

```typescript
import { 
  sendUserNotification, 
  sendTeamNotification, 
  sendSuperNotification 
} from '@wirecrest/notifications';

// Simpler API for user notifications
await sendUserNotification('user-123', {
  type: 'payment',
  title: '<p>Payment received</p>',
  category: 'Billing'
});

// Simpler API for team notifications
await sendTeamNotification('team-789', {
  type: 'project',
  title: '<p>Project updated</p>',
  category: 'Projects'
});

// Simpler API for super admin notifications
await sendSuperNotification('ADMIN', {
  type: 'mail',
  title: '<p>System alert</p>',
  category: 'System'
});
```

### 3. Batch Notifications

```typescript
import { sendNotificationBatch } from '@wirecrest/notifications';

// Send multiple notifications at once
const notifications = await sendNotificationBatch([
  {
    type: 'payment',
    scope: 'user',
    userId: 'user-1',
    title: '<p>Payment processed</p>',
    category: 'Billing'
  },
  {
    type: 'order',
    scope: 'user',
    userId: 'user-2',
    title: '<p>Order shipped</p>',
    category: 'Orders'
  },
  {
    type: 'delivery',
    scope: 'user',
    userId: 'user-3',
    title: '<p>Package delivered</p>',
    category: 'Delivery'
  }
]);

console.log(`Sent ${notifications.length} notifications`);
```

## Querying Notifications

### Getting Notifications

```typescript
import { 
  getUserNotifications, 
  getTeamNotifications,
  getSuperNotifications 
} from '@wirecrest/notifications';

// Get user notifications with filters
const userNotifications = await getUserNotifications('user-123', {
  unreadOnly: true,
  limit: 20,
  offset: 0
});

// Get team notifications
const teamNotifications = await getTeamNotifications('team-789', {
  type: 'project',
  limit: 50
});

// Get super admin notifications
const adminNotifications = await getSuperNotifications('ADMIN', {
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  archivedOnly: false
});
```

### Marking as Read

```typescript
import { markAsRead, markAllAsRead } from '@wirecrest/notifications';

// Mark single notification as read
await markAsRead('notification-id');

// Mark all user notifications as read
const count = await markAllAsRead({ userId: 'user-123' });
console.log(`Marked ${count} notifications as read`);

// Mark all team notifications as read
await markAllAsRead({ teamId: 'team-789' });

// Mark all super admin notifications as read
await markAllAsRead({ superRole: 'ADMIN' });
```

### Archiving Notifications

```typescript
import { archiveNotification, unarchiveNotification } from '@wirecrest/notifications';

// Archive a notification
await archiveNotification('notification-id');

// Unarchive a notification
await unarchiveNotification('notification-id');
```

### Getting Counts

```typescript
import { getUnreadCount } from '@wirecrest/notifications';

// Get unread count for user
const userUnreadCount = await getUnreadCount('user', 'user-123');

// Get unread count for team
const teamUnreadCount = await getUnreadCount('team', 'team-789');

// Get unread count for super admins
const adminUnreadCount = await getUnreadCount('super', 'ADMIN');
```

## React Integration

### Using the Hook

```typescript
import { useNotifications } from 'src/hooks/useNotifications';

function NotificationsList() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  } = useNotifications({ scope: 'user', autoFetch: true });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading notifications</div>;

  return (
    <div>
      <h2>Notifications ({unreadCount} unread)</h2>
      <button onClick={markAllAsRead}>Mark all as read</button>
      <button onClick={refresh}>Refresh</button>
      
      {notifications.map((notification) => (
        <div key={notification.id}>
          <h3>{notification.title}</h3>
          <p>{notification.category}</p>
          {notification.isUnRead && (
            <button onClick={() => markAsRead(notification.id)}>
              Mark as read
            </button>
          )}
          <button onClick={() => archiveNotification(notification.id)}>
            Archive
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Team Notifications

```typescript
function TeamNotifications({ teamId }) {
  const { notifications, unreadCount } = useNotifications({ 
    scope: 'team', 
    teamId,
    autoFetch: true 
  });

  return (
    <div>
      <h2>Team Notifications ({unreadCount})</h2>
      {/* Render notifications */}
    </div>
  );
}
```

## Real-time Subscriptions

### Manual Subscription

```typescript
import { 
  subscribeToUserNotifications,
  subscribeToTeamNotifications,
  subscribeToSuperNotifications 
} from '@wirecrest/notifications';

// Subscribe to user notifications
const unsubscribe = subscribeToUserNotifications(
  'user-123',
  (event) => {
    if (event.event === 'notification_created') {
      console.log('New notification:', event.notification);
      // Update UI, play sound, show toast, etc.
    } else if (event.event === 'notification_updated') {
      console.log('Notification updated:', event.notification);
    }
  }
);

// Clean up subscription
unsubscribe();
```

## Cleanup Operations

### Scheduled Cleanup

```typescript
import { 
  cleanupExpiredNotifications,
  cleanupArchivedNotifications,
  cleanupReadNotifications,
  performFullCleanup,
  getNotificationStatistics
} from '@wirecrest/notifications';

// Clean up expired notifications (run daily via cron)
const expiredCount = await cleanupExpiredNotifications();
console.log(`Deleted ${expiredCount} expired notifications`);

// Clean up old archived notifications (90+ days)
const archivedCount = await cleanupArchivedNotifications(90);

// Clean up old read notifications (60+ days)
const readCount = await cleanupReadNotifications(60);

// Perform full cleanup
const results = await performFullCleanup();
console.log(`Cleanup complete:`, results);
// { expired: 45, archived: 120, read: 380, total: 545 }

// Get statistics
const stats = await getNotificationStatistics();
console.log(`Stats:`, stats);
// { total: 1250, unread: 85, archived: 340, expired: 15 }
```

## Server Actions (Next.js)

```typescript
'use server';

import { sendNotification } from '@wirecrest/notifications';
import { auth } from '@wirecrest/auth/server';

export async function notifyUserOfPayment(userId: string, amount: number) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  await sendNotification({
    type: 'payment',
    scope: 'user',
    userId,
    title: `<p>Payment of <strong>$${amount}</strong> received</p>`,
    category: 'Billing',
    expiresInDays: 30
  });
}
```

## Common Patterns

### Friend Request
```typescript
await sendNotification({
  type: 'friend',
  scope: 'user',
  userId: recipientId,
  title: '<p><strong>John Doe</strong> sent you a friend request</p>',
  category: 'Social',
  avatarUrl: senderAvatarUrl,
  metadata: { senderId, senderName: 'John Doe' }
});
```

### Order Status Update
```typescript
await sendNotification({
  type: 'order',
  scope: 'user',
  userId: customerId,
  title: '<p>Your order <strong>#12345</strong> has been shipped</p>',
  category: 'Orders',
  metadata: { 
    orderId: '12345', 
    trackingNumber: 'TRACK123',
    estimatedDelivery: '2024-12-25'
  }
});
```

### Project Mention
```typescript
await sendNotification({
  type: 'project',
  scope: 'team',
  teamId,
  title: '<p><strong>@John</strong> mentioned you in <a href="/projects/123">Project Alpha</a></p>',
  category: 'Projects',
  avatarUrl: mentionerAvatar,
  metadata: { projectId: '123', mentionerId }
});
```

### System Alert
```typescript
await sendNotification({
  type: 'mail',
  scope: 'super',
  superRole: 'ADMIN',
  title: '<p>System maintenance scheduled for tomorrow at 2 AM</p>',
  category: 'System',
  metadata: { 
    maintenanceType: 'database-upgrade',
    estimatedDowntime: '30 minutes'
  }
});
```

