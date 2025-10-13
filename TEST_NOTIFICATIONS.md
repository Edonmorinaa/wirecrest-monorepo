# 🧪 Test Notifications for test5

## 🚀 Quick Start

### Option 1: Quick Test (1 Notification)
```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts test5 user quick
```

**Result:** Sends 1 test notification to verify everything works.

### Option 2: Full Test (10 Notifications)
```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts test5
```

**Result:** Sends 10 different notification types to test all scenarios.

---

## 📋 What Happens

### 1. Script Runs
```
🧪 Starting notification tests...

Target: test5
Scope: user
Notifications to send: 10

[1/10] Sending: 5 new reviews received on Google Maps
   ✅ Sent successfully (ID: notif-123)
   
[2/10] Sending: URGENT: 2 negative reviews require immediate response
   ✅ Sent successfully (ID: notif-456)
   
... (continues for all 10)
```

### 2. Database Records Created
Each notification is inserted into the `Notification` table:
```sql
SELECT * FROM "Notification" WHERE "userId" = 'test5';
```

### 3. Realtime Events Broadcast
Supabase Realtime broadcasts to channel: `notifications-user-test5`

### 4. Dashboard Receives
Your dashboard at `http://test5.wirecrest.local:3032` receives:
- ✅ Via broadcast (instant)
- ✅ Via postgres_changes (backup)

### 5. UI Updates
- ✅ Notifications drawer shows new notifications
- ✅ Unread badge updates (+10)
- ✅ Browser push notifications (if enabled)

---

## 🎯 Expected Results

### In Terminal
```
============================================================
📊 Test Results Summary
============================================================
✅ Sent:   10/10
❌ Failed: 0/10

============================================================
✅ Test completed!
============================================================

💡 Next steps:
   1. Check your dashboard at: http://test5.wirecrest.local:3032
   2. Open the notifications drawer (bell icon)
   3. You should see all test notifications
   4. Check browser push notifications (if enabled)
```

### In Dashboard (All Team Members)
Each team member opens their dashboard and clicks the bell icon.

They should see:
- ✅ 10 new notifications
- ✅ Badge showing "10"
- ✅ Each notification with icon, title, timestamp
- ✅ Clicking marks as read (only for that user)
- ✅ One notification = visible to all team members

### Notification Types You'll See

#### 1. Reviews (3 notifications)
- 📧 "5 new reviews received on Google Maps"
- 🚨 "URGENT: 2 negative reviews require immediate response"
- 📧 "3 new negative reviews on TripAdvisor"

#### 2. Analytics (2 notifications)
- 📊 "Rating dropped by 0.7 stars on Booking.com"
- 🎉 "Milestone reached: 500 reviews!"

#### 3. System (3 notifications)
- 📦 "Business scraping failed after 5 retries"
- 💬 "Failed to add business to schedule: Google Maps"
- 🚚 "Scraper run aborted for Facebook Reviews"

#### 4. Success (2 notifications)
- 👤 "New business profile added: Restaurant XYZ"
- 📄 "Weekly report is ready for download"

---

## 🔍 Verification Steps

### Step 1: Check Terminal Output
```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts test5
```

**Expected:** All 10 notifications sent successfully ✅

### Step 2: Check Dashboard
1. Open: `http://test5.wirecrest.local:3032`
2. Click bell icon (top right)
3. See 10 new notifications

**Expected:** All notifications visible with correct icons/titles ✅

### Step 3: Check Browser Console
Open DevTools → Console

**Expected:**
```javascript
✅ Subscribed to user notifications: test5
{
  event: 'notification_created',
  notification: { id: '...', title: '...' },
  timestamp: '2025-01-11T...'
}
// ... (10 events)
```

### Step 4: Check Database
```sql
SELECT 
  id, 
  type, 
  title, 
  category, 
  "isUnRead", 
  "createdAt"
FROM "Notification" 
WHERE "userId" = 'test5' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

**Expected:** 10 rows with correct data ✅

### Step 5: Test Interactions

#### Mark as Read
1. Click any notification
2. Should become "read" (no blue dot)
3. Badge count decreases

#### Mark All as Read
1. Click "Mark all as read" button
2. All notifications become read
3. Badge shows 0

#### Archive
1. Hover over notification
2. Click archive icon
3. Moves to "Archived" tab

---

## 🐛 Troubleshooting

### "Notifications sent but not showing"

**Check 1: Supabase Realtime Enabled?**
```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'Notification';
```

**Expected:** Should return 1 row

**If not:** Run this:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
```

**Check 2: Console Errors?**
Open DevTools → Console, look for:
- ❌ Subscription errors
- ❌ Network errors
- ❌ Authentication errors

**Check 3: Correct User ID?**
Verify `test5` is your actual user ID:
```sql
SELECT id, email FROM "User" WHERE id = 'test5';
```

---

### "Push notifications not showing"

**Check 1: Permission Granted?**
- Browser should have asked for permission
- Check browser settings → Notifications → Allow

**Check 2: VAPID Keys Configured?**
Check `.env` has:
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...
```

**Check 3: Service Worker Registered?**
Open DevTools → Application → Service Workers
- Should see `/sw.js` registered
- Status: "activated"

**Check 4: Localhost/HTTPS?**
Push notifications require:
- ✅ `http://localhost:*`
- ✅ `http://*.local:*` (like test5.wirecrest.local)
- ✅ `https://*`

---

### "Script fails with database error"

**Check 1: Database Connection**
```bash
# Test connection
npx prisma db pull
```

**Check 2: Prisma Client Generated**
```bash
npx prisma generate
```

**Check 3: Environment Variables**
Check `packages/notifications/.env` has:
```
DATABASE_URL=postgresql://...
```

---

## 🎯 Quick Commands

### Send Quick Test (1 notification)
```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts test5 user quick
```

### Send Full Test (10 notifications)
```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts test5
```

### Check Database
```bash
cd packages/db
npx prisma studio
# Navigate to Notification table
# Filter: userId = test5
```

### Clear Test Notifications
```sql
DELETE FROM "Notification" 
WHERE "userId" = 'test5' 
  AND "category" = 'Test';
```

---

## ✅ Success Criteria

After running the test script, you should have:

- [x] ✅ Script completes with 10/10 sent
- [x] ✅ Dashboard shows 10 notifications
- [x] ✅ Notifications update in real-time
- [x] ✅ Clicking marks as read
- [x] ✅ Browser push shows (if enabled)
- [x] ✅ Database has 10 rows
- [x] ✅ Console shows subscription messages
- [x] ✅ No errors in terminal or browser

---

## 🚀 Ready to Test!

Run this now:
```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts test5
```

Then check your dashboard at:
```
http://test5.wirecrest.local:3032
```

**Expected time:** 5-10 seconds
**Expected result:** 10 notifications in your dashboard! 🎉

