# 🚀 Quick Test Guide - Team Notifications

## Step 1: Find Your Team ID

```bash
cd packages/notifications
npx tsx scripts/find-team.ts
```

**Output Example:**
```
✅ Found 2 team(s):

┌─────────────────────────────────────────────────────────────┐
│ Team 1                                                      │
├─────────────────────────────────────────────────────────────┤
│ ID:    team-abc123-def456                                   │
│ Name:  My Restaurant                                        │
│ Slug:  my-restaurant                                        │
│ Members: 3                                                  │
├─────────────────────────────────────────────────────────────┤
│ Team Members:                                               │
│   - OWNER      you@example.com           Your Name         │
│   - MEMBER     colleague@example.com     Colleague         │
│   - VIEWER     viewer@example.com        Viewer            │
└─────────────────────────────────────────────────────────────┘

📝 To test team notifications, run:
   npx tsx scripts/test-notifications.ts team-abc123-def456 team quick
```

**Copy the team ID!**

---

## Step 2: Send Test Notifications

### Quick Test (1 notification)
```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts <YOUR_TEAM_ID> team quick
```

### Full Test (10 notifications)
```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts <YOUR_TEAM_ID> team
```

**Example:**
```bash
npx tsx scripts/test-notifications.ts team-abc123-def456 team
```

---

## Step 3: Check Dashboard

Open your dashboard at `http://test5.wirecrest.local:3032`:

1. **Click the bell icon** (notifications drawer)
2. **See notifications** - Should show 10 new notifications
3. **Badge shows "10"**
4. **All team members** see the same notifications

---

## ✅ What to Expect

### ✅ How Team Notifications Work:

1. **One notification** created with `teamId`
2. **Broadcast** to channel: `notifications-team-<teamId>`
3. **All team members** subscribed to that channel
4. **Each member sees** the notification in their drawer
5. **Each member can** mark as read independently
6. **Role filtering** happens on dashboard (if configured)

### ✅ Example Flow:

```
Server creates notification with teamId
          ↓
Supabase broadcasts to: notifications-team-abc123
          ↓
All team members' dashboards receive it
          ↓
Each member sees: "5 new reviews received"
          ↓
Owner marks as read → only for owner
Member marks as read → only for member
```

---

## 🔍 Verification

### Check Database:
```sql
-- See the notification
SELECT * FROM "Notification" 
WHERE "teamId" = 'team-abc123-def456';

-- See team members
SELECT u.email, tm.role 
FROM "TeamMember" tm
JOIN "User" u ON u.id = tm."userId"
WHERE tm."teamId" = 'team-abc123-def456';
```

### Check Console (Each Team Member):
Open DevTools → Console:
```javascript
✅ Subscribed to team notifications: team-abc123-def456
{
  event: 'notification_created',
  notification: { id: '...', teamId: 'team-abc123-def456' }
}
```

---

## 🎯 All Commands

```bash
# Find your team
npx tsx scripts/find-team.ts

# Quick test (1 notification)
npx tsx scripts/test-notifications.ts <TEAM_ID> team quick

# Full test (10 notifications)
npx tsx scripts/test-notifications.ts <TEAM_ID> team

# Clean up test notifications
# Run in Supabase SQL editor:
# DELETE FROM "Notification" WHERE "category" = 'Test';
```

---

## 💡 Tips

- **All team members** will receive the notifications
- **Each member** can mark as read independently
- **Notifications** are team-scoped, not user-scoped
- **Role filtering** happens in the dashboard UI
- **One notification** = visible to entire team

That's it! 🎉

