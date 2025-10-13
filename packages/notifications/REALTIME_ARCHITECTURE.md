# Notification System - Realtime Architecture

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                     NOTIFICATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. SERVER-SIDE (Backend/Scraper)
   ┌──────────────────────────────────┐
   │  sendNotification(payload)       │
   │  - Creates in DB (Prisma)        │
   │  - Broadcasts via Supabase       │
   └──────────────────────────────────┘
              ↓
   ┌──────────────────────────────────┐
   │  Database: Notification table    │
   │  - Row inserted with userId      │
   │  - Triggers postgres_changes     │
   └──────────────────────────────────┘
              ↓
2. REALTIME LAYER (Supabase)
   ┌──────────────────────────────────┐
   │  Supabase Realtime Server        │
   │  - Receives INSERT event         │
   │  - Filters by userId/teamId      │
   │  - Broadcasts to subscribers     │
   └──────────────────────────────────┘
              ↓
3. CLIENT-SIDE (Dashboard)
   ┌──────────────────────────────────┐
   │  useNotifications() hook         │
   │  - Subscribes to user channel    │
   │  - Receives realtime events      │
   │  - Updates UI instantly          │
   └──────────────────────────────────┘
```

## 🔄 **Dual-Channel System**

### Channel 1: Broadcast (Manual)
```typescript
// packages/notifications/src/service.ts
await prisma.notification.create({ ... });
await broadcastNotificationCreated(notification); // ← Manual broadcast
```

**Pros:**
- ✅ Immediate (no DB delay)
- ✅ Controlled payload
- ✅ Works across multiple servers

**Cons:**
- ❌ Requires explicit call
- ❌ Can fail silently
- ❌ Doesn't catch direct DB inserts

### Channel 2: Postgres Changes (Automatic)
```typescript
// packages/notifications/src/realtime.ts
.on('postgres_changes', {
  event: 'INSERT',
  table: 'Notification',
  filter: `userId=eq.${userId}`
}, callback)
```

**Pros:**
- ✅ Automatic (no explicit call needed)
- ✅ Catches ALL inserts (even direct DB)
- ✅ Never misses a notification
- ✅ Database-level filtering

**Cons:**
- ⚠️ Requires Realtime enabled on table
- ⚠️ Slight delay (DB commit time)

## 🎯 **Why Both?**

### Scenario 1: Normal Flow
```typescript
await sendNotification({ type: 'mail', ... });
```
**Result:** Frontend receives **BOTH** events:
1. Broadcast event (instant)
2. Postgres change event (backup)

**Deduplication:** Frontend uses notification ID to ignore duplicates.

### Scenario 2: Broadcast Fails
```typescript
await sendNotification({ type: 'mail', ... });
// Broadcast fails due to network issue
```
**Result:** Frontend still receives via postgres_changes ✅

### Scenario 3: Direct DB Insert
```typescript
// Someone inserts directly via Prisma
await prisma.notification.create({ ... });
```
**Result:** Frontend receives via postgres_changes ✅

### Scenario 4: Multiple Servers
```typescript
// Server A creates notification
await sendNotification({ ... });

// Server B's clients receive it via:
// 1. Broadcast (if on same Supabase instance)
// 2. Postgres changes (always works)
```
**Result:** All clients receive regardless of server ✅

## 📡 **Subscription Patterns**

### User Scope
```typescript
subscribeToUserNotifications(userId, callback)
// Listens to:
// - broadcast: notifications-user-{userId}
// - postgres: Notification WHERE userId = {userId}
```

### Team Scope
```typescript
subscribeToTeamNotifications(teamId, callback)
// Listens to:
// - broadcast: notifications-team-{teamId}
// - postgres: Notification WHERE teamId = {teamId}
```

### Super Scope
```typescript
subscribeToSuperNotifications(superRole, callback)
// Listens to:
// - broadcast: notifications-super-{superRole}
// - postgres: Notification WHERE superRole = {superRole}
```

## 🔐 **Security & Filtering**

### Database-Level Filtering
Supabase Realtime filters at the Postgres level:

```sql
-- User notifications
SELECT * FROM "Notification" WHERE "userId" = 'user-123';

-- Team notifications
SELECT * FROM "Notification" WHERE "teamId" = 'team-456';

-- Super notifications
SELECT * FROM "Notification" WHERE "superRole" = 'ADMIN';
```

**Benefits:**
- ✅ Users only receive their own notifications
- ✅ No client-side filtering needed
- ✅ Can't subscribe to other users' data
- ✅ Efficient (filtered before sending)

### Row-Level Security (RLS)
```sql
-- Users can only read their own notifications
CREATE POLICY "Users read own notifications" ON "Notification"
  FOR SELECT
  USING (
    auth.uid()::text = "userId" OR
    auth.uid()::text IN (
      SELECT "userId" FROM "TeamMember" 
      WHERE "teamId" = "Notification"."teamId"
    )
  );
```

## ⚡ **Performance**

### Connection Pooling
- Each subscription = 1 WebSocket connection
- Supabase handles connection pooling
- Max ~100 subscriptions per client

### Message Rate
- Default: 10 events/second per channel
- Configurable in Supabase client:
  ```typescript
  createClient(url, key, {
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  })
  ```

### Scalability
- ✅ **Horizontal**: Multiple servers can send notifications
- ✅ **Vertical**: Supabase Realtime scales automatically
- ✅ **Filtered**: Only relevant data sent to clients

## 🧪 **Testing Strategy**

### Test 1: Broadcast Only
```typescript
// Disable postgres_changes temporarily
await sendNotification({ ... });
// Should work via broadcast
```

### Test 2: Postgres Changes Only
```typescript
// Direct DB insert (no broadcast)
await prisma.notification.create({ ... });
// Should work via postgres_changes
```

### Test 3: Both Channels
```typescript
// Normal flow
await sendNotification({ ... });
// Should receive twice (deduplicated by ID)
```

### Test 4: Network Failure
```typescript
// Disconnect Supabase client
supabase.removeAllChannels();
await sendNotification({ ... });
// Reconnect
// Should receive via postgres_changes backlog
```

## 🔍 **Monitoring**

### Client-Side Logs
```javascript
// Subscription status
✅ Subscribed to user notifications: user-123

// Events received
{
  event: 'notification_created',
  notification: { id: '...', title: '...' },
  timestamp: '2025-01-01T00:00:00.000Z'
}
```

### Server-Side Logs
```javascript
// Broadcast sent
📱 Broadcasting notification to user-123

// Push sent
📱 Push sent to user user-123: 1 sent, 0 failed
```

### Supabase Dashboard
- Go to **Database** → **Replication**
- Check active subscriptions
- Monitor message throughput

## 🚀 **Best Practices**

### 1. Always Use sendNotification()
```typescript
// ✅ Good - Uses both channels
await sendNotification({ ... });

// ❌ Bad - Only postgres_changes
await prisma.notification.create({ ... });
```

### 2. Deduplicate in Frontend
```typescript
// Check notification ID before adding
if (!notifications.some(n => n.id === event.notification.id)) {
  setNotifications(prev => [event.notification, ...prev]);
}
```

### 3. Handle Errors Gracefully
```typescript
try {
  await broadcastNotificationCreated(notification);
} catch (error) {
  // Don't throw - postgres_changes is backup
  console.error('Broadcast failed:', error);
}
```

### 4. Clean Up Subscriptions
```typescript
useEffect(() => {
  const unsubscribe = subscribeToUserNotifications(userId, callback);
  return () => unsubscribe(); // Always cleanup!
}, [userId]);
```

## 📋 **Summary**

| Feature | Broadcast | Postgres Changes |
|---------|-----------|-----------------|
| **Speed** | Instant | ~100ms delay |
| **Reliability** | Can fail | Always works |
| **Setup** | No setup | Requires enabling |
| **Coverage** | Manual calls only | All DB changes |
| **Filtering** | Channel-based | Database-level |
| **Scalability** | High | Very high |

**Combined:** Best of both worlds! 🎉

