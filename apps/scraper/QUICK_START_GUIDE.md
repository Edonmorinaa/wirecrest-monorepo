# Quick Start Guide - Production Deployment

**Goal:** Get the new Apify-native scheduling system production-ready and integrated with the dashboard.

---

## 🎯 **TL;DR - What Needs to Be Done**

### **Critical Path (2-3 days)**
1. Update `ReviewDataProcessor` to handle new actor outputs ⏱️ 4-6 hours
2. Create `SubscriptionWebhookController` ⏱️ 2-3 hours
3. Update dashboard Stripe webhook handler ⏱️ 2-3 hours
4. Test end-to-end flow ⏱️ 4-6 hours
5. Deploy to production ⏱️ 2-3 hours

### **Files to Delete Now**
```bash
# These are 100% replaced and safe to delete
rm apps/scraper/src/services/instagramSchedulerService.ts  # Keep for now if Instagram still needs it
rm apps/scraper/src/services/tiktokSchedulerService.ts     # Keep for now if TikTok still needs it

# Review these - likely can be deleted
apps/scraper/src/apifyService/actors/*  # Check if replaced by new services
apps/scraper/src/services/simpleBusinessService.ts  # Keep for backward compatibility
```

---

## 📝 **Step-by-Step Implementation**

### **Step 1: Database Setup** (15 minutes)

```bash
# Navigate to db package
cd packages/db

# Generate Prisma client with new models
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_apify_scheduling

# Verify models exist
npx prisma studio
```

**Verify these tables:**
- ✅ `ApifySchedule`
- ✅ `SyncRecord`
- ✅ `ApifyWebhookLog`

---

### **Step 2: Update ReviewDataProcessor** (4-6 hours)

**File:** `apps/scraper/src/services/processing/ReviewDataProcessor.ts`

**Key Changes:**
1. Add deduplication logic using `lastReviewDate`
2. Update business profiles with `lastScrapedAt`
3. Handle new actor output schemas
4. Skip duplicate reviews efficiently

**Implementation:**
```typescript
// See PRODUCTION_READINESS_CHECKLIST.md for full code example
// Focus on:
// - processGoogleReviews() - handle new Google Maps Reviews Scraper output
// - processFacebookReviews() - handle Facebook Reviews Scraper output
// - processTripAdvisorReviews() - handle TripAdvisor Reviews Scraper output
// - processBookingReviews() - handle Booking Reviews Scraper output
```

---

### **Step 3: Create SubscriptionWebhookController** (2-3 hours)

**File:** `apps/scraper/src/controllers/SubscriptionWebhookController.ts`

**Purpose:** Handle notifications from dashboard when subscription events occur.

**Endpoints to implement:**
- `POST /api/subscription/created` - Create initial schedules
- `POST /api/subscription/updated` - Update schedule intervals
- `POST /api/subscription/cancelled` - Pause schedules
- `POST /api/business/added` - Add location to existing schedules

**Code:**
```typescript
// See PRODUCTION_READINESS_CHECKLIST.md for full implementation
```

**Register routes in `apps/scraper/src/server.ts`:**
```typescript
import { SubscriptionWebhookController } from './controllers/SubscriptionWebhookController';

const subscriptionController = new SubscriptionWebhookController(orchestrator);

app.post('/api/subscription/created', (req, res) => 
  subscriptionController.handleSubscriptionCreated(req, res)
);
// ... other routes
```

---

### **Step 4: Dashboard Integration** (2-3 hours)

#### A. Create API Client

**File:** `apps/dashboard/src/services/scraper-api.ts`

```typescript
export class ScraperApiClient {
  static async notifySubscriptionCreated(teamId: string, subscriptionId: string) {
    await axios.post(`${SCRAPER_API_URL}/api/subscription/created`, {
      teamId,
      subscriptionId
    });
  }
  // ... other methods
}
```

#### B. Update Stripe Webhook

**File:** `apps/dashboard/src/app/api/webhooks/stripe/route.ts`

```typescript
import { ScraperApiClient } from '@/services/scraper-api';

switch (event.type) {
  case 'customer.subscription.created':
    // Existing logic...
    await ScraperApiClient.notifySubscriptionCreated(teamId, subscription.id);
    break;
  // ... other events
}
```

#### C. Add Sync Status Widget

**File:** `apps/dashboard/src/components/SyncStatusWidget.tsx`

Display:
- Last sync time per platform
- Next sync time
- Recent sync results
- New reviews count

---

### **Step 5: Environment Variables** (10 minutes)

**Scraper `.env`:**
```bash
APIFY_TOKEN=your_apify_token
APIFY_WEBHOOK_BASE_URL=https://your-domain.com/api/webhooks/apify
STRIPE_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...
```

**Dashboard `.env`:**
```bash
NEXT_PUBLIC_SCRAPER_API_URL=https://scraper-api.your-domain.com
```

---

### **Step 6: Testing** (4-6 hours)

#### Manual Test Flow

1. **Create Test Subscription**
```bash
# Use Stripe test mode
# Subscribe to Starter plan
# Verify schedules created in Apify
```

2. **Test Webhook Flow**
```bash
# Trigger Apify schedule manually
# Verify webhook received
# Check reviews saved in database
# Confirm deduplication works
```

3. **Test Dashboard Integration**
```bash
# Add new business location
# Verify scraper notified
# Check schedule updated
# Confirm sync status shows correctly
```

#### Automated Tests (Optional but Recommended)

```typescript
// apps/scraper/src/services/apify/__tests__/ApifyScheduleService.test.ts
describe('ApifyScheduleService', () => {
  it('creates schedule with correct input for Google Reviews', async () => {
    // Test batching placeIds
  });
  
  it('creates schedule with correct input for Facebook', async () => {
    // Test residential proxy configuration
  });
});
```

---

### **Step 7: Deploy** (2-3 hours)

#### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Webhook URLs configured in Apify
- [ ] API keys rotated (if needed)

#### Deployment Steps

**1. Deploy Database**
```bash
cd packages/db
npx prisma migrate deploy
```

**2. Deploy Scraper Service**
```bash
cd apps/scraper
npm run build
# Deploy to your hosting (Railway, Render, AWS, etc.)
```

**3. Deploy Dashboard**
```bash
cd apps/dashboard
npm run build
# Deploy to Vercel
```

**4. Verify Webhooks**
```bash
# Test Apify webhook
curl -X POST https://your-scraper.com/api/webhooks/apify \
  -H "Content-Type: application/json" \
  -d @test-webhook-payload.json

# Test subscription webhook
curl -X POST https://your-scraper.com/api/subscription/created \
  -H "Content-Type: application/json" \
  -d '{"teamId":"test","subscriptionId":"sub_test"}'
```

---

## 🐛 **Troubleshooting**

### Issue: Schedules not created
**Check:**
- Apify token is valid
- `SubscriptionOrchestrator.handleNewSubscription()` is being called
- Team has business locations in database
- Check logs for errors

### Issue: Webhooks not received
**Check:**
- Webhook URL is publicly accessible
- Apify webhook is configured correctly in schedule
- Check Apify console for webhook delivery logs
- Verify webhook endpoint returns 200 status

### Issue: Duplicate reviews
**Check:**
- `lastReviewDate` is being updated correctly
- Deduplication logic in `ReviewDataProcessor`
- Review IDs are unique
- Sort order is `newest` first

### Issue: Schedules not running
**Check:**
- Schedule is `isActive: true` in database
- Cron expression is valid
- Apify schedule status in Apify console
- Check Apify account credits/limits

---

## 📊 **Monitoring After Deployment**

### Week 1: Critical Monitoring
- ✅ Check Apify runs every day
- ✅ Verify webhook delivery rate
- ✅ Monitor duplicate rate (should be >80%)
- ✅ Check for failed runs
- ✅ Review cost per team

### Week 2-4: Optimization
- ⏳ Analyze which actors are most expensive
- ⏳ Optimize schedule intervals based on data
- ⏳ Fine-tune `maxReviews` limits
- ⏳ Review deduplication effectiveness

---

## 🎉 **Success Criteria**

You're production-ready when:

- ✅ User subscribes → Schedules automatically created
- ✅ Schedules run on time → Webhooks received
- ✅ Reviews processed → No duplicates saved
- ✅ Dashboard shows sync status → Real-time updates
- ✅ User adds location → Schedule updated immediately
- ✅ <5% failure rate on Apify runs
- ✅ <10% duplicate rate (ideally <5%)
- ✅ Avg processing time <30 seconds per webhook

---

## 📞 **Support**

**Documentation:**
- `PRODUCTION_READINESS_CHECKLIST.md` - Full detailed checklist
- `APIFY_ACTORS_CONFIGURATION.md` - Actor input/output schemas
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `FINAL_SUMMARY.md` - Architecture overview

**Quick Reference:**
- Apify Documentation: https://docs.apify.com
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Prisma Migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate

---

**Estimated Total Time:** 15-25 hours (2-3 days)  
**Complexity:** Medium  
**Risk Level:** Low (can rollback to old system if issues)

**Good luck! 🚀**

