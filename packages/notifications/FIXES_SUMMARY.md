# Notification System Fixes Summary

## Issues Fixed

### 1. Field Name Mismatch (postgres_changes)

**Problem:** 
Supabase postgres_changes was using wrong field names in filters, causing no events to be received.

**Root Cause:**
- Used snake_case database column names: `user_id`, `team_id`, `super_role`
- Used wrong table name: `notification` (lowercase)

**Fix:**
- Changed to Prisma field names (camelCase): `userId`, `teamId`, `superRole`
- Fixed table name to match Prisma schema: `Notification` (PascalCase)

**Files Changed:**
- `packages/notifications/src/realtime.ts` - Updated all postgres_changes filters

```typescript
// ❌ Before (WRONG)
filter: `user_id=eq.${userId}`
table: 'notification'

// ✅ After (CORRECT)
filter: `userId=eq.${userId}`
table: 'Notification'
```

---

### 2. Push Notifications Architecture

**Problem:**
Push notifications were mixed with postgres_changes, causing confusion and potential duplicates.

**Root Cause:**
- Client-side listener was triggering push notifications from postgres_changes events
- This meant push notifications would only work if the client was connected
- Mixed two separate systems (DB sync vs Web Push)

**Fix:**
Separated into two independent systems:

#### A. Notifications System (Database + Realtime)
- **Purpose:** Store notifications and sync to UI
- **Flow:** DB INSERT → postgres_changes → UI updates
- **Client:** `useNotifications` hook updates state
- **No push logic on client**

#### B. Push Web Notifications (Service Worker + Web Push)
- **Purpose:** Browser notifications via Web Push API
- **Flow:** Server → Web Push API → Service Worker → Browser
- **Server:** `sendNotification()` triggers push automatically
- **Independent of postgres_changes**

**Files Changed:**
- `packages/notifications/src/service.ts` - Removed broadcast, kept push logic
- `apps/dashboard/src/components/global-notification-listener.tsx` - Removed push logic
- `packages/notifications/src/realtime.ts` - Made broadcast functions no-ops

---

### 3. Improved Service Architecture

**Changes Made:**

1. **Added `skipPush` option** to `sendNotification()`:
```typescript
// Skip push if needed (e.g., for bulk operations)
await sendNotification(payload, { skipPush: true });
```

2. **Added `sendPushForNotification()` function**:
```typescript
// Manually send push for existing notification
await sendPushForNotification(notificationId);
```

3. **Removed unnecessary broadcast calls**:
- Removed `broadcastNotificationCreated` import from service.ts
- postgres_changes handles replication automatically

---

## How It Works Now

### Server Side (One Function Does Everything)

```typescript
import { sendNotification } from '@wirecrest/notifications';

// This automatically:
// 1. Creates notification in database
// 2. Sends push notifications to all user devices
// 3. postgres_changes syncs to connected clients (automatic)
await sendNotification({
  type: 'payment',
  scope: 'team',
  teamId: 'team-123',
  title: '<p>Payment received!</p>',
  category: 'Billing',
});
```

### Client Side (Automatic UI Updates)

```typescript
// Just use the hook - it handles everything
const { notifications, unreadCount } = useNotifications();

// postgres_changes automatically updates notifications state
// No need to trigger push - that's server-side only
```

---

## What Changed in Each File

### `packages/notifications/src/realtime.ts`
✅ Fixed postgres_changes filters to use Prisma field names  
✅ Fixed table name to match Prisma schema  
✅ Made broadcast functions no-ops (postgres_changes handles replication)

### `packages/notifications/src/service.ts`
✅ Removed `broadcastNotificationCreated` import  
✅ Added `skipPush` option to `sendNotification()`  
✅ Added `sendPushForNotification()` helper function  
✅ Improved logging and error handling

### `apps/dashboard/src/components/global-notification-listener.tsx`
✅ Removed all push notification logic  
✅ Simplified to just maintain realtime connection  
✅ UI updates handled by `useNotifications` hook

### `packages/notifications/src/index.ts`
✅ Exported new `sendPushForNotification` function

### New Files
✅ `ARCHITECTURE.md` - Comprehensive documentation of both systems  
✅ `FIXES_SUMMARY.md` - This file

---

## Testing Checklist

- [ ] Verify postgres_changes events are received (check console logs)
- [ ] Confirm notifications appear in UI when created
- [ ] Test push notifications are sent from server
- [ ] Verify service worker receives push messages
- [ ] Check browser notifications appear
- [ ] Test with multiple users in same team
- [ ] Verify no duplicate push notifications

---

## Migration Notes

If you have existing code that manually called broadcast functions:

```typescript
// ❌ Old way (no longer needed)
const notification = await prisma.notification.create({ data });
await broadcastNotificationCreated(notification);

// ✅ New way (use sendNotification)
const notification = await sendNotification(payload);
```

---

## Key Takeaways

1. **postgres_changes uses Prisma field names**, not database column names
2. **Push notifications are server-side only**, not triggered from postgres_changes
3. **One function** (`sendNotification()`) handles both DB + push automatically
4. **Two independent systems** working together, not mixed
5. **Client is simpler** - just subscribe to postgres_changes for UI updates

---

## Additional Resources

- See `ARCHITECTURE.md` for detailed system explanation
- See `README.md` for usage examples
- See `SERVER_PUSH_GUIDE.md` for Web Push setup

