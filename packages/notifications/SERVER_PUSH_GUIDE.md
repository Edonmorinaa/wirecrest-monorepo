# Server-Side Push Notifications Guide

## Overview

The notification system now supports server-side push notifications using:
- **Web Push Protocol** (for web browsers and Android)
- **APNs** (Apple Push Notification service for iOS/macOS)

This means users will receive push notifications even when the dashboard is not open!

## Features

✅ **Web Push** - Push notifications to Chrome, Firefox, Edge, Safari
✅ **APNs Support** - Native push for iOS and macOS devices
✅ **Automatic Subscription** - Users are auto-subscribed when they grant permission
✅ **Multi-Device** - Users can receive notifications on all their devices
✅ **Subscription Management** - Track and manage push subscriptions per user
✅ **Automatic Cleanup** - Expired/invalid subscriptions are automatically removed
✅ **Integrated** - Every notification automatically sends push notifications
✅ **Best-Effort** - Push failures don't affect notification creation

## Setup

### 1. Generate VAPID Keys

VAPID keys are required for Web Push. Generate them once:

```bash
cd packages/notifications
npx ts-node scripts/generate-vapid-keys.ts
```

This will output keys to add to your `.env`:

```env
# Web Push Notifications (VAPID Keys)
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_SUBJECT=mailto:support@wirecrest.app
```

### 2. (Optional) Configure APNs for iOS/macOS

If you want to support iOS/macOS native apps:

1. Get your APNs Key from Apple Developer Portal
2. Add to `.env`:

```env
# APNs Configuration (iOS/macOS)
APNS_KEY_ID=your_apns_key_id
APNS_TEAM_ID=your_apns_team_id
APNS_KEY_PATH=/path/to/AuthKey_XXXX.p8
APNS_BUNDLE_ID=app.wirecrest.dashboard
```

### 3. Run Database Migration

Add the new `PushSubscription` model:

```bash
cd packages/db
npx prisma migrate dev --name add_push_subscriptions
# OR if you don't want to preserve data:
npx prisma db push
```

### 4. Restart Services

Restart the dashboard and scraper services to pick up the new environment variables.

## How It Works

### Flow Diagram

```
1. User visits dashboard
   ↓
2. Service worker registers automatically
   ↓
3. User clicks "Enable Notifications"
   ↓
4. Browser requests permission → User grants
   ↓
5. Client subscribes to push (browser generates endpoint)
   ↓
6. Subscription sent to server (/api/push/subscribe)
   ↓
7. Subscription stored in database (PushSubscription table)
   ↓
8. Scraper creates notification → sendNotification() called
   ↓
9. Notification saved to DB + Realtime broadcast
   ↓
10. ALSO: Server sends push notification via Web Push
   ↓
11. Push delivered to user's device (even if browser closed!)
   ↓
12. User clicks notification → Dashboard opens
```

### Architecture

```
┌─────────────────┐
│  Scraper/App    │
│  sendNotification()
└────────┬────────┘
         │
         ↓
┌────────────────────────┐
│  @wirecrest/notifications │
│  packages/notifications   │
├────────────────────────┤
│ 1. Save to DB          │
│ 2. Broadcast Realtime  │
│ 3. Send Push (async)   │
└────────┬───────────────┘
         │
         ├→ Web Push (Chrome, Firefox, Safari, Edge)
         └→ APNs (iOS, macOS)
         
         ↓
┌─────────────────┐
│  User Device    │
│  (notification) │
└─────────────────┘
```

## Database Schema

### PushSubscription Model

```prisma
model PushSubscription {
  id               String   @id @default(uuid())
  userId           String
  endpoint         String   @unique          // Push service endpoint
  p256dh           String                    // Public key for encryption
  auth             String                    // Authentication secret
  userAgent        String?
  deviceType       String?                   // 'web', 'ios', 'android'
  isActive         Boolean  @default(true)
  lastUsedAt       DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @default(now())
  
  // APNs specific fields (for iOS/macOS)
  apnsToken        String?                   // APNs device token
  apnsEnvironment  String?                   // 'production' or 'sandbox'
  apnsBundleId     String?                   // App bundle ID
  
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isActive])
  @@index([deviceType])
  @@index([lastUsedAt])
}
```

## API Reference

### Server Functions

#### `sendPushNotificationToUser(userId, notification)`

Send push notification to a specific user across all their devices.

```typescript
import { sendPushNotificationToUser } from '@wirecrest/notifications';

const result = await sendPushNotificationToUser('user-123', notification);
console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
```

#### `sendPushNotificationToUsers(userIds[], notification)`

Send push notification to multiple users.

```typescript
import { sendPushNotificationToUsers } from '@wirecrest/notifications';

const result = await sendPushNotificationToUsers(
  ['user-1', 'user-2', 'user-3'],
  notification
);
console.log(`Total sent: ${result.totalSent}, Failed: ${result.totalFailed}`);
```

#### `subscribeToPush(userId, subscription, options?)`

Subscribe a user to push notifications (Web Push).

```typescript
import { subscribeToPush } from '@wirecrest/notifications';

const result = await subscribeToPush(
  'user-123',
  {
    endpoint: 'https://fcm.googleapis.com/fcm/send/...',
    keys: {
      p256dh: '...',
      auth: '...',
    },
  },
  {
    userAgent: navigator.userAgent,
    deviceType: 'web',
  }
);
```

#### `subscribeToAPNs(userId, apnsToken, options?)`

Subscribe a user to APNs (iOS/macOS).

```typescript
import { subscribeToAPNs } from '@wirecrest/notifications';

const result = await subscribeToAPNs(
  'user-123',
  'device-token-from-ios',
  {
    bundleId: 'app.wirecrest.dashboard',
    environment: 'production',
    deviceType: 'ios',
  }
);
```

### Client-Side (Dashboard)

#### Server Actions

The dashboard provides server actions for push subscription management:

```typescript
import {
  getVapidKey,
  subscribePushNotifications,
  unsubscribePushNotifications,
  getPushSubscriptions,
  sendTestPushNotification,
} from 'src/actions/push-notifications';

// Get VAPID public key
const { publicKey } = await getVapidKey();

// Subscribe to push
const result = await subscribePushNotifications(subscription, userAgent);

// Unsubscribe
await unsubscribePushNotifications(endpoint);

// Get user's subscriptions
const { subscriptions } = await getPushSubscriptions();

// Test push notification
const { success, message } = await sendTestPushNotification();
```

## Integration with Scraper

**No changes needed!** Server-side push notifications are automatically sent whenever you call `sendNotification()`.

```typescript
// In scraper code - this now ALSO sends push notifications!
import { sendNotification } from '@wirecrest/notifications';

await sendNotification({
  type: 'mail',
  scope: 'team',
  teamId: 'team-123',
  title: '<p>New negative review received</p>',
  category: 'Reviews',
  metadata: { platform: 'GOOGLE_MAPS' },
  expiresInDays: 7,
});

// Behind the scenes:
// 1. ✅ Notification saved to database
// 2. ✅ Broadcast via Supabase Realtime
// 3. ✅ Push notification sent to all team members (NEW!)
```

## Push Notification Targeting

### User-Scoped Notifications
```typescript
await sendNotification({
  scope: 'user',
  userId: 'user-123',
  // ... other fields
});
// → Push sent to this specific user's devices
```

### Team-Scoped Notifications
```typescript
await sendNotification({
  scope: 'team',
  teamId: 'team-456',
  // ... other fields
});
// → Push sent to ALL team members' devices
```

### Super-Scoped Notifications
```typescript
await sendNotification({
  scope: 'super',
  superRole: 'ADMIN',
  // ... other fields
});
// → Push sent to all ADMIN/SUPPORT users' devices
```

## Automatic Subscription Management

### Auto-Subscribe
When users enable notifications in the dashboard:
1. Service worker registers
2. Push subscription is created by browser
3. Subscription automatically sent to server
4. Stored in `PushSubscription` table

### Auto-Cleanup
Invalid/expired subscriptions are automatically handled:
- **410 Gone** or **404 Not Found** responses → Subscription deactivated
- **Old subscriptions** → Cleaned up periodically (see Maintenance)

## Maintenance

### Clean Up Old Subscriptions

Run periodically (e.g., daily cron job):

```typescript
import { cleanupOldSubscriptions } from '@wirecrest/notifications';

// Clean up subscriptions older than 90 days
const count = await cleanupOldSubscriptions(90);
console.log(`Cleaned up ${count} old subscriptions`);
```

### Monitor Push Success Rate

```typescript
import { sendPushNotificationToUser } from '@wirecrest/notifications';

const result = await sendPushNotificationToUser(userId, notification);

// Log metrics
console.log({
  sent: result.sent,
  failed: result.failed,
  successRate: (result.sent / (result.sent + result.failed)) * 100,
  errors: result.errors,
});
```

## Testing

### Test Push Notification

```typescript
import { testPushNotification } from '@wirecrest/notifications';

const result = await testPushNotification('user-123');
console.log(result.message); // "Sent: 2, Failed: 0"
```

### Test from Dashboard

1. Go to Settings
2. Find "Push Notifications" card
3. Click "Test Notification" button
4. Should receive browser notification immediately

### Test from API

```bash
# Get VAPID key
curl http://localhost:3000/api/push/vapid-key

# Subscribe
curl -X POST http://localhost:3000/api/push/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "endpoint": "...",
      "keys": { "p256dh": "...", "auth": "..." }
    },
    "userAgent": "Mozilla/5.0..."
  }'

# Unsubscribe
curl -X POST http://localhost:3000/api/push/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{ "endpoint": "..." }'
```

## Troubleshooting

### Push notifications not working

**1. Check VAPID keys are configured:**
```bash
echo $VAPID_PUBLIC_KEY
echo $VAPID_PRIVATE_KEY
```

**2. Check database has PushSubscription table:**
```sql
SELECT * FROM "PushSubscription" LIMIT 5;
```

**3. Check user has subscriptions:**
```sql
SELECT * FROM "PushSubscription" WHERE "userId" = 'user-id' AND "isActive" = true;
```

**4. Check server logs for push errors:**
```
Failed to send push to subscription xxx: ...
```

### "VAPID keys not configured" error

Run the key generation script:
```bash
npx ts-node packages/notifications/scripts/generate-vapid-keys.ts
```

Then add the output to `.env` and restart.

### Subscriptions are created but no push received

**Check subscription validity:**
```typescript
import webpush from 'web-push';

try {
  await webpush.sendNotification(subscription, 'test');
  console.log('Subscription is valid');
} catch (error) {
  console.log('Subscription is invalid:', error.statusCode);
}
```

### APNs not working (iOS/macOS)

1. Verify APNs credentials are correct
2. Check APNs token format
3. Ensure bundle ID matches your app
4. Check environment (production vs sandbox)

## Production Checklist

- [ ] VAPID keys generated and added to `.env`
- [ ] Database migration applied (`PushSubscription` table exists)
- [ ] Service worker deployed (`/sw.js` accessible)
- [ ] Push subscription API endpoints working (`/api/push/*`)
- [ ] Test push notification working
- [ ] Monitor push success rate
- [ ] Set up cleanup job for old subscriptions
- [ ] (Optional) APNs configured for iOS/macOS
- [ ] Error monitoring configured
- [ ] VAPID keys backed up securely

## Security Considerations

1. **VAPID Keys** - Keep private key secret, never expose in client code
2. **Subscription Endpoints** - Unique per user/device, treat as sensitive
3. **HTTPS Required** - Push notifications only work over HTTPS
4. **User Consent** - Always request permission before subscribing
5. **Data Privacy** - Don't send sensitive data in push payloads
6. **Rate Limiting** - Already implemented (1 notification per type per hour)

## Browser Support

| Browser | Web Push | APNs |
|---------|----------|------|
| Chrome (Desktop) | ✅ | N/A |
| Firefox (Desktop) | ✅ | N/A |
| Edge (Desktop) | ✅ | N/A |
| Safari (macOS 16+) | ✅ | ✅ |
| Chrome (Android) | ✅ | N/A |
| Firefox (Android) | ✅ | N/A |
| Safari (iOS 16.4+) | ⚠️ Limited* | ✅ |

*iOS Safari requires "Add to Home Screen" for full push support

## Cost Considerations

- **Web Push** - Free (uses browser's push service)
- **APNs** - Free (included with Apple Developer account)
- **Database** - Small storage cost for `PushSubscription` table
- **Bandwidth** - Minimal (push payloads are small)

## Summary

✅ **Server-side push notifications are now fully integrated!**

Every time a notification is sent via `sendNotification()`, it will automatically:
1. Save to database
2. Broadcast via Supabase Realtime
3. **Send push notification to all affected users' devices**

No code changes needed in the scraper - it just works! 🎉

