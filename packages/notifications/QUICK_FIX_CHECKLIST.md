# ✅ Notification System - Quick Fix Checklist

Use this checklist to fix your notification system in under 5 minutes.

---

## Step 1: Run Diagnostics (30 seconds)

```bash
cd packages/notifications
npx tsx scripts/diagnose-system.ts
```

**What it does:** Checks everything and tells you exactly what to fix.

---

## Step 2: Enable Supabase Realtime (2 minutes)

This fixes the "mismatch between server and client bindings" error.

### Actions:

1. ✅ Go to: https://supabase.com/dashboard/project/_/database/replication

2. ✅ Find the `Notification` table

3. ✅ Toggle replication **ON**

4. ✅ Enable these events:
   - INSERT
   - UPDATE
   - DELETE

5. ✅ Click **Save** or **Apply**

6. ✅ Wait 30 seconds

7. ✅ Refresh your dashboard in browser

8. ✅ Check console - should see: "Subscribed to user notifications"

**Status after this step:**
- ✅ Real-time notifications in UI working
- ✅ No more "mismatch" errors
- ❌ Push notifications still need VAPID keys

---

## Step 3: Configure VAPID Keys (2 minutes)

This enables browser push notifications.

### Actions:

1. ✅ Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. ✅ Copy the output

3. ✅ Add to `.env` file (in root or `apps/dashboard`):
   ```bash
   VAPID_PUBLIC_KEY=BCxxxxx...
   VAPID_PRIVATE_KEY=xxxxx...
   VAPID_SUBJECT=mailto:support@yourdomain.com
   ```

4. ✅ Restart server:
   ```bash
   npm run dev
   ```

5. ✅ Refresh browser

6. ✅ Grant notification permission when prompted

**Status after this step:**
- ✅ Real-time notifications in UI working
- ✅ Push notifications working
- ✅ System fully functional

---

## Step 4: Test (1 minute)

```bash
cd packages/notifications
npx tsx scripts/test-notifications.ts my-team quick
```

### Expected Results:

- ✅ Notification appears in dashboard UI instantly
- ✅ Browser notification pops up
- ✅ Console shows "Notification sent successfully"
- ✅ No errors

---

## Quick Verification

Run this in your browser console:

```javascript
// Check realtime connection
console.log('Supabase client:', window.supabase ? '✅' : '❌');

// Check push subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push subscription:', sub ? '✅' : '❌');
  });
});
```

Both should show ✅

---

## Troubleshooting

### Still seeing "mismatch" error?

- Wait another 30 seconds after enabling Realtime
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check Supabase dashboard that Notification table is enabled

### Push notifications not appearing?

- Check VAPID keys are in `.env`
- Restart server after adding VAPID keys
- Grant notification permission in browser
- Check browser settings allow notifications

### Need more help?

Read: `packages/notifications/TROUBLESHOOTING.md`

---

## Environment Variables Checklist

Make sure these are in your `.env`:

```bash
# Database
✅ DATABASE_URL=postgresql://...

# Supabase (for realtime)
✅ NEXT_PUBLIC_SUPABASE_URL=https://...
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# VAPID (for push notifications)
✅ VAPID_PUBLIC_KEY=BC...
✅ VAPID_PRIVATE_KEY=...
✅ VAPID_SUBJECT=mailto:support@...
```

---

## Success Criteria

Your system is working when:

- ✅ Diagnostic script shows all green checks
- ✅ No "mismatch" errors in console
- ✅ Notifications appear in UI instantly
- ✅ Browser push notifications appear
- ✅ Test script runs without errors

---

## Time Required

- **Step 1 (Diagnostics):** 30 seconds
- **Step 2 (Supabase Realtime):** 2 minutes
- **Step 3 (VAPID Keys):** 2 minutes
- **Step 4 (Testing):** 1 minute

**Total:** ~5 minutes

---

## Done! 🎉

Your notification system is now:

- ✅ Sending notifications to database
- ✅ Syncing to UI in real-time via Supabase
- ✅ Sending browser push notifications
- ✅ Fully functional and tested

---

**Need the detailed guide?** → See `TROUBLESHOOTING.md`

**Need environment setup help?** → See `ENV_TEMPLATE.md`

**Want to understand the system?** → See `ARCHITECTURE.md`

