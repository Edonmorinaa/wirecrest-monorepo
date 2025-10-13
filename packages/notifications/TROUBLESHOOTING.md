# Notification System Troubleshooting Guide

This guide helps you diagnose and fix common issues with the notification system.

## Quick Diagnostic

Run the diagnostic script first:

```bash
cd packages/notifications
npx tsx scripts/diagnose-system.ts
```

This will check your entire notification system configuration and provide specific fixes for any issues found.

---

## Common Error: "Mismatch between server and client bindings for postgres changes"

### Symptoms
- Console error: `Error: mismatch between server and client bindings for postgres changes`
- Notifications don't appear in UI in real-time
- postgres_changes subscription fails

### Root Cause
Supabase Realtime is **not enabled** for the `Notification` table in your Supabase project.

### Solution

#### Step 1: Enable Realtime in Supabase Dashboard

1. Go to your Supabase dashboard: https://supabase.com/dashboard

2. Select your project

3. Navigate to **Database** → **Replication**
   - Direct link: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/database/replication`

4. Find the `Notification` table in the list

5. **Enable replication** by toggling it ON

6. Make sure these events are enabled:
   - ✅ **INSERT** - For new notifications
   - ✅ **UPDATE** - For marking as read/archived
   - ✅ **DELETE** - For deleted notifications

7. Click **Save** or **Apply**

8. **Wait 30-60 seconds** for the changes to propagate

#### Step 2: Verify the Fix

1. Refresh your dashboard application

2. Check the browser console

3. You should see: `✅ Subscribed to user notifications via postgres_changes`

4. If still failing, wait another 30 seconds and refresh again

---

## Common Error: Push Notifications Not Working

### Symptoms
- Browser notifications don't appear
- Console error: "Could not get VAPID key"
- Push permission prompt doesn't show

### Root Cause
VAPID keys are not configured in environment variables.

### Solution

#### Step 1: Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This will output something like:

```
=======================================

Public Key:
BCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Private Key:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

=======================================
```

#### Step 2: Add to Environment Variables

Add these to your `.env` or `.env.local` file in the `apps/dashboard` directory:

```bash
# Push Notifications (Web Push API)
VAPID_PUBLIC_KEY=BCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:support@yourdomain.com
```

**Important:** Also add `VAPID_PUBLIC_KEY` to `.env` in the root if you're using a monorepo setup.

#### Step 3: Restart Development Server

```bash
# Kill the current server (Ctrl+C)
# Then restart
npm run dev
# or
yarn dev
```

#### Step 4: Test Push Notifications

1. Open your dashboard

2. Grant notification permission when prompted

3. Send a test notification:

```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts YOUR_TEAM_SLUG quick
```

4. You should see a browser notification appear

---

## Common Error: Service Worker Not Registered

### Symptoms
- Console error: "Service workers are not supported"
- Push notifications not working
- No service worker in DevTools

### Root Cause
Service worker file not found or not registered correctly.

### Solution

#### Step 1: Verify Service Worker File Exists

Check that `/apps/dashboard/public/sw.js` exists.

#### Step 2: Clear Browser Cache

1. Open DevTools (F12)
2. Go to **Application** → **Storage**
3. Click **Clear site data**
4. Refresh the page

#### Step 3: Check Registration

1. Open DevTools (F12)
2. Go to **Application** → **Service Workers**
3. You should see `sw.js` listed
4. Status should be "activated and running"

#### Step 4: Manual Registration Check

Open browser console and run:

```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg ? 'Registered' : 'Not registered');
});
```

---

## Environment Variables Checklist

### Required for Realtime Notifications

```bash
# Supabase (for realtime sync)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/database
```

### Required for Push Notifications

```bash
# VAPID Keys (for Web Push API)
VAPID_PUBLIC_KEY=BCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:support@yourdomain.com
```

### Optional

```bash
# Notification settings
NOTIFICATION_DEFAULT_EXPIRY_DAYS=30
```

---

## Testing the Complete System

### Test 1: Database + Realtime (UI Sync)

```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts my-team quick
```

**Expected:**
- ✅ Notification appears in dashboard UI within 100ms
- ✅ Console shows "Subscribed to user notifications via postgres_changes"
- ✅ No "mismatch" errors

### Test 2: Push Notifications

```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts my-team quick
```

**Expected:**
- ✅ Browser notification appears
- ✅ Clicking notification opens dashboard
- ✅ Console shows "Push sent to user"

### Test 3: Complete Flow

1. Open dashboard in browser
2. Grant notification permission
3. Run test script:

```bash
npx tsx scripts/test-notifications.ts my-team quick
```

**Expected:**
- ✅ Notification appears in UI (real-time)
- ✅ Browser push notification appears
- ✅ Both happen simultaneously

---

## Debugging Tips

### Enable Verbose Logging

In your browser console, run:

```javascript
localStorage.setItem('debug', 'notifications:*');
```

Then refresh the page. You'll see detailed logs about notification subscriptions.

### Check Supabase Realtime Connection

1. Open browser DevTools
2. Go to **Network** tab
3. Filter by **WS** (WebSocket)
4. Look for connection to `realtime-v1`
5. Should show status: **101 Switching Protocols**

### Check Push Subscription

In browser console:

```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push subscription:', sub ? 'Active' : 'Not subscribed');
    if (sub) console.log('Endpoint:', sub.endpoint);
  });
});
```

### Check Database Connection

```bash
cd packages/db
npx prisma studio
```

- Open `Notification` table
- Verify notifications are being created
- Check column names are camelCase: `userId`, `teamId`, etc.

---

## Common Mistakes

### ❌ Wrong Table Name

```typescript
// WRONG
table: 'notification'  // lowercase

// CORRECT
table: 'Notification'  // PascalCase (matches Prisma model)
```

### ❌ Wrong Column Names

```typescript
// WRONG
filter: `user_id=eq.${userId}`  // snake_case

// CORRECT
filter: `userId=eq.${userId}`   // camelCase (matches Prisma fields)
```

### ❌ Using Broadcast Instead of postgres_changes

```typescript
// WRONG - Don't manually broadcast
await supabase.channel('notifications').send({
  type: 'broadcast',
  event: 'notification',
  payload: notification
});

// CORRECT - Use postgres_changes (automatic)
// Just create the notification in database
await prisma.notification.create({ data: notificationData });
// postgres_changes handles the rest automatically
```

### ❌ Triggering Push from Client

```typescript
// WRONG - Don't trigger push from postgres_changes
subscribeToUserNotifications(userId, (event) => {
  if (event.event === 'notification_created') {
    showPushNotification(event.notification); // ❌ WRONG!
  }
});

// CORRECT - Push is sent from server automatically
// Client just updates UI
subscribeToUserNotifications(userId, (event) => {
  setNotifications(prev => [event.notification, ...prev]); // ✅
});
```

---

## Still Having Issues?

### Run Full Diagnostics

```bash
cd packages/notifications
npx tsx scripts/diagnose-system.ts
```

This will check:
- ✅ Database connection
- ✅ Table structure
- ✅ Environment variables
- ✅ Supabase Realtime configuration
- ✅ Push subscription setup

### Check Documentation

- `ARCHITECTURE.md` - System design
- `FIXES_SUMMARY.md` - What was fixed
- `QUICK_REFERENCE.md` - Usage examples
- `SYSTEM_ANALYSIS.md` - Complete audit

### Enable Supabase Realtime (Most Common Fix)

If you see "mismatch" error, 99% of the time it's because:

1. Go to: https://supabase.com/dashboard/project/_/database/replication
2. Find `Notification` table
3. Enable replication
4. Wait 30 seconds
5. Refresh browser

---

## Production Checklist

Before deploying to production:

- [ ] Supabase Realtime enabled for `Notification` table
- [ ] VAPID keys generated and added to production environment
- [ ] Service worker deployed to `/sw.js`
- [ ] All environment variables set in production
- [ ] Test notification sent successfully
- [ ] Push notifications working on multiple devices
- [ ] Database indexes exist (userId, teamId, superRole)
- [ ] Error monitoring configured

---

## Support

If you're still experiencing issues after following this guide:

1. Run the diagnostic script and share the output
2. Check browser console for errors
3. Verify Supabase Realtime is enabled
4. Confirm VAPID keys are set correctly

