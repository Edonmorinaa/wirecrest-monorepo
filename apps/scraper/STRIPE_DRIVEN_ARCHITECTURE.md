# Stripe-Driven Scraper Architecture

## Overview

The scraper is **100% driven by Stripe subscription events**. No manual API calls needed from dashboard.

---

## 🔄 **Event Flow**

### 1. User Subscribes (Stripe Checkout)
```
User → Stripe Checkout → Payment Success → Stripe sends webhook
```

**Stripe Event:** `customer.subscription.created`

**Payload:**
```json
{
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_xxx",
      "customer": "cus_xxx",  // ← This is the key!
      "status": "active",
      "items": {
        "data": [
          {
            "price": {
              "id": "price_xxx",
              "product": "prod_starter"
            }
          }
        ]
      }
    }
  }
}
```

**What Happens:**
1. Scraper receives webhook at `/webhooks/stripe`
2. `StripeWebhookController.handleSubscriptionCreated()` is called
3. Looks up `teamId` from database using `customer.stripeCustomerId`
4. Calls `orchestrator.handleNewSubscription(teamId)`
5. Orchestrator:
   - Gets team features from `@wirecrest/billing`
   - Finds all business profiles for team
   - Creates Apify schedules for enabled platforms
   - Triggers initial data fetch (optional)

---

### 2. User Upgrades/Downgrades
```
User → Dashboard → Stripe API → Update Subscription → Stripe sends webhook
```

**Stripe Event:** `customer.subscription.updated`

**What Happens:**
1. Scraper receives webhook
2. `StripeWebhookController.handleSubscriptionUpdated()` is called
3. Looks up `teamId` from `customer.stripeCustomerId`
4. Calls `orchestrator.handleSubscriptionUpdate(teamId)`
5. Orchestrator:
   - Fetches new features (new tier limits)
   - Updates schedule intervals (e.g., 3 days → 1 day)
   - Adjusts `maxReviewsPerRun` based on new tier

---

### 3. User Cancels Subscription
```
User → Dashboard → Stripe API → Cancel Subscription → Stripe sends webhook
```

**Stripe Event:** `customer.subscription.deleted`

**What Happens:**
1. Scraper receives webhook
2. `StripeWebhookController.handleSubscriptionDeleted()` is called
3. Looks up `teamId` from `customer.stripeCustomerId`
4. Calls `orchestrator.handleSubscriptionCancellation(teamId)`
5. Orchestrator:
   - Pauses all Apify schedules for team
   - Sets `isActive: false` in database
   - Schedules stop running (no more charges)

---

## 🗄️ **Database Lookup**

### How teamId is Found

```typescript
// In StripeWebhookController.ts
private async getTeamIdFromCustomer(customerId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  
  return team?.id || null;
}
```

**Database Schema:**
```prisma
model Team {
  id               String   @id @default(uuid())
  name             String
  stripeCustomerId String?  @unique  // ← This is the link!
  // ...
}
```

**Key Points:**
- Each team has ONE `stripeCustomerId`
- `stripeCustomerId` is set when team first subscribes
- It's unique across all teams
- We use it to map Stripe events back to our teams

---

## 🎯 **Why This Approach is Better**

### ❌ Old Approach (Dashboard → Scraper API)
```
Dashboard → Receive Stripe Webhook → Call Scraper API → Process
```

**Problems:**
- Dashboard needs to know scraper API endpoints
- Extra HTTP call (potential failure point)
- Dashboard needs to handle scraper errors
- Duplicate webhook handling logic

### ✅ New Approach (Direct Stripe → Scraper)
```
Scraper → Receive Stripe Webhook → Process
```

**Benefits:**
- **Single source of truth**: Stripe is the authority
- **No coupling**: Dashboard doesn't need to know about scraper
- **Automatic**: No manual triggers needed
- **Reliable**: Stripe retries failed webhooks automatically
- **Simpler**: Less code, fewer failure points

---

## 📋 **What Dashboard Still Does**

Dashboard is completely decoupled from scraper operations!

### Dashboard Responsibilities:
1. ✅ Handle Stripe Checkout sessions
2. ✅ Create/update `TeamSubscription` records
3. ✅ Set `team.stripeCustomerId` on first subscription
4. ✅ Display subscription status to user
5. ✅ Show sync status (read-only from scraper API)

### Dashboard Does NOT:
- ❌ Trigger scraper operations
- ❌ Manage Apify schedules
- ❌ Handle review syncing
- ❌ Deal with Apify webhooks

---

## 🔧 **Implementation Details**

### Stripe Webhook Endpoint

**URL:** `https://your-scraper-api.com/webhooks/stripe`

**Events to Listen For:**
```typescript
[
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused'  // Optional
]
```

### Setup in Stripe Dashboard

1. Go to https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Enter: `https://your-scraper-api.com/webhooks/stripe`
4. Select events above
5. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## 🚀 **When Things Happen**

### Subscription Created
```
T+0s:    User completes Stripe Checkout
T+1s:    Stripe sends webhook to scraper
T+2s:    Scraper creates Apify schedules
T+3s:    Apify schedules are active
T+4s:    (Optional) Initial data fetch starts
T+5min:  Reviews start appearing in database
```

### Business Location Added
```
User adds location → Dashboard saves to DB → Next schedule run picks it up
```

**How it works:**
- When schedule runs, `ApifyScheduleService` fetches current business identifiers from database
- If new location added, it's automatically included in next run
- No manual sync needed!

### Business Location Removed
```
User removes location → Dashboard deletes from DB → Next schedule run excludes it
```

**How it works:**
- Schedule fetches identifiers from database before each run
- Deleted locations won't be included
- Automatic cleanup!

---

## 🎨 **Dashboard Integration (Read-Only)**

Dashboard can display sync status without triggering anything:

```typescript
// In dashboard
import { ScraperApiClient } from '@/services/scraper-api';

// Get sync status (read-only)
const status = await ScraperApiClient.getSyncStatus(teamId);

// Get schedules (read-only)
const schedules = await ScraperApiClient.getSchedules(teamId);
```

**No write operations needed!**

---

## 🔐 **Security Considerations**

### Webhook Signature Verification

**Critical:** Always verify Stripe webhook signatures:

```typescript
// In StripeWebhookController.ts
const event = stripe.webhooks.constructEvent(
  req.body,
  req.headers['stripe-signature'],
  this.webhookSecret
);
```

This prevents:
- ❌ Fake webhook attacks
- ❌ Replay attacks
- ❌ Man-in-the-middle tampering

### Environment Variables

```bash
# REQUIRED - Get from Stripe Dashboard
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# REQUIRED - Your scraper URL
WEBHOOK_BASE_URL=https://scraper-api.your-domain.com
```

---

## 🧪 **Testing**

### Local Development with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### Test Flow

1. **Create test customer in Stripe**
2. **Link customer to test team in database**
   ```sql
   UPDATE "Team" 
   SET "stripeCustomerId" = 'cus_test_xxxxx' 
   WHERE id = 'your-test-team-id';
   ```
3. **Create subscription in Stripe dashboard**
4. **Watch scraper logs** for webhook processing
5. **Check Apify console** for created schedules
6. **Verify database** has `ApifySchedule` records

---

## 📊 **Monitoring**

### What to Monitor

1. **Webhook Delivery Success Rate**
   - Stripe Dashboard → Webhooks → Your endpoint
   - Should be >99%

2. **Schedule Creation Success**
   - Check logs for "✅ Subscription setup result"
   - Verify schedules in Apify console

3. **Initial Data Fetch Status**
   - Monitor `SyncRecord` table
   - Check for failed runs

### Alerting

Set up alerts for:
- ❌ Webhook verification failures
- ❌ Team not found for customerId
- ❌ Schedule creation failures
- ❌ Orchestrator errors

---

## 🎯 **Summary**

### The Flow is Simple:

1. **Stripe → Scraper** (webhook)
2. **Scraper → Database** (lookup teamId)
3. **Scraper → Apify** (create/update/delete schedules)
4. **Apify → Scraper** (webhook when scrape completes)
5. **Scraper → Database** (save reviews)

### Dashboard's Role:
- **Passive observer** that displays status
- **No active participation** in scraper operations
- **Fully decoupled** from review syncing

### Key Advantages:
- ✅ **Automatic**: No manual triggers
- ✅ **Reliable**: Stripe handles retries
- ✅ **Simple**: Single source of truth
- ✅ **Scalable**: Handles any volume
- ✅ **Maintainable**: Clear separation of concerns

---

**This is production-ready architecture!** 🚀

