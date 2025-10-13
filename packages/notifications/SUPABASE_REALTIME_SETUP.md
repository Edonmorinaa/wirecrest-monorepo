# Supabase Realtime Setup for Notifications

## 🔧 **What Was Changed**

The notification system now uses a **HYBRID approach** for real-time updates:

1. **Manual Broadcast** (existing) - When `sendNotification()` is called, it manually broadcasts via Supabase
2. **Automatic Database Listener** (NEW) - Listens directly to Postgres INSERT/UPDATE events on the `Notification` table

This ensures notifications are received even if:
- Manual broadcast fails
- Notification is created directly in database (outside `sendNotification()`)
- Multiple instances/workers are creating notifications

## ✅ **What Works Now**

### Before (Broadcast Only):
```typescript
// Only works if sendNotification() successfully broadcasts
await sendNotification({ type: 'mail', ... });
// ❌ If broadcast fails, frontend doesn't receive it
```

### After (Hybrid):
```typescript
// Works with broadcast OR database change
await sendNotification({ type: 'mail', ... });
// ✅ Frontend receives via broadcast (fast)
// ✅ ALSO receives via postgres_changes (backup)

// Even direct database inserts work!
await prisma.notification.create({ ... });
// ✅ Frontend receives via postgres_changes automatically
```

## 🚀 **Required Setup**

### Step 1: Enable Realtime for Notification Table

You need to enable Supabase Realtime for the `Notification` table in your Supabase dashboard:

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Database** → **Replication**
4. Find the `Notification` table
5. Toggle **Enable Realtime** to ON
6. Click **Save**

#### Option B: Via SQL
Run this SQL in your Supabase SQL editor:

```sql
-- Enable realtime for Notification table
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";

-- Verify it's enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### Step 2: Verify Realtime Policies

Ensure users can subscribe to their own notifications:

```sql
-- Enable RLS (if not already enabled)
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON "Notification"
  FOR SELECT
  USING (
    auth.uid()::text = "userId" OR
    auth.uid()::text IN (
      SELECT "userId" FROM "TeamMember" 
      WHERE "teamId" = "Notification"."teamId"
    ) OR
    (
      SELECT "superRole" FROM "User" WHERE id = auth.uid()::text
    ) IN ('ADMIN', 'SUPPORT')
  );

-- Policy: Allow realtime subscription
CREATE POLICY "Enable realtime for own notifications" ON "Notification"
  FOR SELECT
  TO authenticated
  USING (true);
```

### Step 3: Test the Setup

#### Test 1: Check Browser Console
Open your dashboard and check the console. You should see:
```
✅ Subscribed to user notifications: <userId>
```

If you see errors like:
```
❌ Error subscribing to user notifications: <userId>
```
Then realtime is not enabled on the table.

#### Test 2: Create a Test Notification
```typescript
// In your backend/API
import { sendNotification } from '@wirecrest/notifications';

await sendNotification({
  type: 'mail',
  scope: 'user',
  userId: 'your-user-id',
  title: 'Test Notification',
  category: 'Test',
  metadata: { test: true },
  expiresInDays: 1,
});
```

The notification should appear **instantly** in the dashboard without refreshing.

#### Test 3: Direct Database Insert
```typescript
// Even without using sendNotification, this works!
import { prisma } from '@wirecrest/db';

await prisma.notification.create({
  data: {
    type: 'MAIL',
    scope: 'USER',
    userId: 'your-user-id',
    title: 'Direct DB Insert',
    category: 'Test',
    isUnRead: true,
    isArchived: false,
    expiresAt: new Date(Date.now() + 86400000), // 1 day
  },
});
```

This should **also** appear instantly in the dashboard!

## 🔍 **How to Verify Everything Works**

### 1. Check Subscription Status
Open browser DevTools → Console. You should see:
```
✅ Subscribed to user notifications: <userId>
✅ Subscribed to team notifications: <teamId>
✅ Subscribed to super notifications: <superRole>
```

### 2. Check Realtime Events
When a notification is created, console should show:
```javascript
{
  event: 'notification_created',
  notification: { id: '...', title: '...' },
  timestamp: '2025-01-01T00:00:00.000Z'
}
```

### 3. Check Network Tab
Open DevTools → Network → WS (WebSocket)

You should see:
- WebSocket connection to Supabase Realtime
- Messages with `postgres_changes` events
- Messages with `broadcast` events

## 🐛 **Troubleshooting**

### "postgres_changes not working"
**Cause:** Realtime not enabled for Notification table
**Fix:** Run Step 1 above

### "CHANNEL_ERROR in console"
**Cause:** RLS policies blocking subscription
**Fix:** Run Step 2 above

### "Broadcast works but postgres_changes doesn't"
**Cause:** Table not added to `supabase_realtime` publication
**Fix:** 
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
```

### "Works for some users but not others"
**Cause:** RLS policies too restrictive
**Fix:** Check your RLS policies allow authenticated users to read their notifications

## 📊 **Performance Considerations**

### Subscription Limits
- Each channel = 1 WebSocket connection
- User scope: 1 channel per user
- Team scope: 1 channel per team
- Super scope: 1 channel per role

### Filtering
Supabase Realtime filters at the database level, so you only receive relevant notifications:
- User: `userId=eq.{userId}`
- Team: `teamId=eq.{teamId}`
- Super: `superRole=eq.{superRole}`

### Load
- ✅ **Efficient**: Only subscribes to user's own notifications
- ✅ **Filtered**: Database-level filtering (not client-side)
- ✅ **Scalable**: Each user only listens to their own data

## 🎯 **Summary**

### What to do NOW:
1. ✅ **Enable Realtime** for `Notification` table in Supabase dashboard
2. ✅ **Test** by creating a notification
3. ✅ **Verify** in browser console you see subscription messages

### What's automatic:
- ✅ Hybrid broadcast + postgres_changes listeners
- ✅ Fallback if broadcast fails
- ✅ Works with direct database inserts
- ✅ Real-time updates without polling

### What you DON'T need to do:
- ❌ No manual polling
- ❌ No custom WebSocket server
- ❌ No additional backend code
- ❌ No triggers or functions

Everything is handled automatically by Supabase Realtime! 🚀

