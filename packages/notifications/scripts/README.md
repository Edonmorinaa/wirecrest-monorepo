# Notification Scripts

## 📝 Available Scripts

### 1. Test Notifications Script

Send test notifications to verify the complete notification system.

#### Quick Test (1 notification)
```bash
# Send to user "test5"
npx tsx scripts/test-notifications.ts test5 user quick

# Or using npm script
npm run test:quick test5 user quick
```

#### Full Test (10 different notifications)
```bash
# Send all test notifications to user "test5"
npx tsx scripts/test-notifications.ts test5

# Send to a team
npx tsx scripts/test-notifications.ts team-456 team

# Send to super admins
npx tsx scripts/test-notifications.ts ADMIN super
```

#### Usage
```bash
npx tsx scripts/test-notifications.ts <targetId> [scope] [mode]

Arguments:
  targetId - User ID, Team ID, or Super Role (required)
  scope    - "user" (default), "team", or "super"
  mode     - "full" (default) or "quick"
```

#### Examples
```bash
# Quick test for user test5
npx tsx scripts/test-notifications.ts test5 user quick

# Full test for user test5 (10 notifications)
npx tsx scripts/test-notifications.ts test5

# Test for team
npx tsx scripts/test-notifications.ts team-123 team full

# Test for admins
npx tsx scripts/test-notifications.ts ADMIN super
```

---

### 2. Scraper Simulation Script

Simulates a realistic Google Maps scraper run over 20 seconds, sending various notification types as it would in a real scraping scenario.

```bash
# Simulate scraper for team
npx tsx scripts/scraper-simulation.ts my-team

# Simulate scraper for super admins
npx tsx scripts/scraper-simulation.ts my-team ADMIN
```

**Features:**
- ⏱️ Runs for exactly 20 seconds
- 📊 Sends 8-10 realistic notifications over time
- 🎲 30% chance of triggering error scenarios
- 🔄 Simulates real scraper behavior with delays
- 📈 Shows progress with timestamps

### 3. Generate VAPID Keys Script

Generate VAPID keys for Web Push notifications.

```bash
npx tsx scripts/generate-vapid-keys.ts
```

Output will include keys to add to your `.env` file.

---

## 🧪 Test Notification Types

The full test script sends these notification types:

### Review Notifications
- ✉️ New reviews received
- 🚨 Urgent negative reviews
- 📉 Negative reviews alert

### Analytics Notifications
- 📊 Rating drop alert
- 🎉 Review milestone

### System Notifications
- ❌ Scraping failure
- ⚠️ Schedule error
- ⏸️ Run aborted

### Success Notifications
- ✅ New business added
- 📄 Report ready

---

## 🔍 Verification

After running the test script:

1. **Check Dashboard**
   - Open: http://test5.wirecrest.local:3032
   - Click the bell icon (notifications drawer)
   - You should see all test notifications

2. **Check Console Logs**
   - Script shows success/failure for each notification
   - Summary at the end with counts

3. **Check Browser Push**
   - If push notifications enabled, you should see browser notifications
   - Check browser notification center

4. **Check Database**
   ```sql
   SELECT * FROM "Notification" 
   WHERE "userId" = 'test5' 
   ORDER BY "createdAt" DESC 
   LIMIT 10;
   ```

---

## 🐛 Troubleshooting

### "Failed to send notification"
**Check:**
- Database connection is working
- `DATABASE_URL` in `.env` is correct
- Prisma client is generated (`npx prisma generate`)

### "Notifications sent but not appearing in dashboard"
**Check:**
- Supabase Realtime is enabled for `Notification` table
- Dashboard is subscribed to correct channel
- Check browser console for errors

### "Push notifications not showing"
**Check:**
- VAPID keys are configured in `.env`
- Browser permission is granted
- Service worker is registered
- Check browser console for errors

---

## 📚 More Information

See the main documentation:
- `NOTIFICATIONS_READY_TO_USE.md` - Setup guide
- `SUPABASE_REALTIME_SETUP.md` - Realtime configuration
- `SERVER_PUSH_GUIDE.md` - Push notifications setup

