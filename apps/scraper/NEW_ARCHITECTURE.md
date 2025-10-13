# New Apify-Native Scraper Architecture

## 🎯 **Overview**

This is the new architecture that replaces custom polling and job management with **Apify's native Schedules** and **webhook-driven data processing**.

## 🔄 **Architecture Flow**

### **1. Subscription Created (Stripe Webhook)**
```
User subscribes → Stripe webhook → SubscriptionOrchestrator
  ├─→ Extract features from Stripe (@wirecrest/billing)
  ├─→ Get business identifiers from database
  ├─→ Trigger initial data fetch (Apify Task)
  └─→ Create recurring schedules (Apify Schedules)
      ├─→ Reviews schedule (12-24h interval based on tier)
      └─→ Overview schedule (24-48h interval based on tier)
```

### **2. Apify Schedule Triggers (Automated)**
```
Apify Schedule hits → Actor runs → Webhook fired → ApifyWebhookController
  ├─→ Fetch data from Apify dataset
  ├─→ Process reviews (deduplication, sentiment analysis)
  ├─→ Update database
  ├─→ Update analytics
  └─→ Update SyncRecord with results
```

### **3. Cost Optimization Strategy**
```
For businesses with existing reviews (e.g., 500 reviews already fetched):

Recurring Schedule Input:
  ├─→ maxReviews: 50 (small batch)
  ├─→ reviewsSort: 'newest'
  ├─→ onlyNewReviews: true
  └─→ Server-side deduplication:
      ├─→ Check lastReviewDate from business profile
      ├─→ Check externalReviewId in database
      └─→ Only save truly new reviews
```

## 📁 **New File Structure**

```
apps/scraper/src/
├── server.ts                          # New entry point
├── types/
│   ├── apify.types.ts                 # Apify-related types
│   └── subscription.types.ts          # Subscription/feature types
├── services/
│   ├── apify/
│   │   ├── ApifyTaskService.ts        # One-time task execution
│   │   ├── ApifyScheduleService.ts    # Schedule management
│   │   └── ApifyDataSyncService.ts    # Data sync and tracking
│   ├── subscription/
│   │   ├── FeatureExtractor.ts        # Extract features from Stripe
│   │   └── SubscriptionOrchestrator.ts # Orchestrate subscription lifecycle
│   └── processing/
│       └── ReviewDataProcessor.ts     # Process and save review data
└── controllers/
    ├── StripeWebhookController.ts     # Handle Stripe webhooks
    └── ApifyWebhookController.ts      # Handle Apify webhooks
```

## 🗄️ **Database Models**

### **ApifySchedule**
Tracks Apify schedules for each team/platform/type combination.

```prisma
model ApifySchedule {
  id                    String
  teamId                String
  platform              String   // 'google_reviews', 'facebook', etc.
  scheduleType          String   // 'reviews' | 'overview'
  apifyScheduleId       String   @unique
  apifyActorId          String
  cronExpression        String
  intervalHours         Int
  maxReviewsPerRun      Int
  isActive              Boolean
  lastRunAt             DateTime?
  nextRunAt             DateTime?
}
```

### **SyncRecord**
Tracks each data sync operation (initial or recurring).

```prisma
model SyncRecord {
  id                    String
  teamId                String
  platform              String
  syncType              String   // 'initial' | 'recurring_reviews' | 'recurring_overview'
  status                String   // 'pending' | 'running' | 'completed' | 'failed'
  apifyRunId            String   @unique
  apifyDatasetId        String?
  startedAt             DateTime
  completedAt           DateTime?
  reviewsProcessed      Int
  reviewsNew            Int
  reviewsDuplicate      Int
  businessesUpdated     Int
  errorMessage          String?
}
```

### **ApifyWebhookLog**
Logs all incoming Apify webhooks for debugging.

```prisma
model ApifyWebhookLog {
  id                    String
  teamId                String?
  apifyRunId            String
  eventType             String
  payload               Json
  processedAt           DateTime
  processingStatus      String   // 'success' | 'failed' | 'pending'
  errorMessage          String?
}
```

### **Business Profile Updates**
Added fields to track deduplication:
- `lastScrapedAt`: When was the last scrape
- `lastReviewDate`: Most recent review date we have

## 🔑 **Environment Variables**

```env
# Apify
APIFY_API_TOKEN=your_apify_token

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Webhook Base URL (for Apify to call back)
WEBHOOK_BASE_URL=https://your-domain.com

# Database (from @wirecrest/db)
DATABASE_URL=postgresql://...
```

## 🚀 **API Endpoints**

### **Webhooks**
- `POST /webhooks/stripe` - Receives Stripe subscription events
- `POST /webhooks/apify` - Receives Apify actor completion events

### **Manual Triggers (for testing)**
- `POST /api/subscriptions/:teamId/setup` - Manually setup subscription
- `POST /api/scrape/:teamId/:platform` - Manually trigger scrape
- `GET /api/schedules/:teamId` - Get team schedules
- `GET /api/features/:teamId` - Get team features

### **Health Check**
- `GET /health` - Service health status

## 📊 **Tier-Based Schedules**

| Tier | Reviews Interval | Overview Interval | Max Reviews/Business |
|------|------------------|-------------------|---------------------|
| Starter | 24 hours (daily) | 48 hours (2 days) | 500 |
| Professional | 12 hours | 24 hours (daily) | 2000 |
| Enterprise | 6 hours | 12 hours | 10000 |

## 🔄 **Data Flow Example**

### **New Subscription**
1. User subscribes to "Professional" plan on Stripe
2. Stripe sends `customer.subscription.created` webhook
3. StripeWebhookController receives it
4. SubscriptionOrchestrator:
   - Fetches team features via `@wirecrest/billing`
   - Determines tier: "professional"
   - Gets business identifiers (e.g., Google Place ID)
   - Triggers initial Apify task with `maxReviews: 2000`
   - Creates 2 Apify schedules:
     - Reviews: runs every 12 hours, `maxReviews: 50`
     - Overview: runs every 24 hours, `maxReviews: 10`
5. Initial task completes → webhook → ApifyWebhookController → processes data

### **Recurring Schedule Hit**
1. Apify schedule triggers (e.g., 12 hours later)
2. Actor runs with `maxReviews: 50`, `reviewsSort: 'newest'`
3. Actor completes → webhook to `/webhooks/apify`
4. ApifyWebhookController:
   - Fetches data from dataset
   - ReviewDataProcessor:
     - Checks `lastReviewDate` from business profile
     - Deduplicates by `externalReviewId`
     - Saves only new reviews (e.g., 5 new out of 50 fetched)
   - Updates SyncRecord: `reviewsNew: 5`, `reviewsDuplicate: 45`

## 🧪 **Testing**

### **Start Development Server**
```bash
cd apps/scraper
yarn dev
```

### **Test Stripe Webhook (with Stripe CLI)**
```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
stripe trigger customer.subscription.created
```

### **Test Manual Setup**
```bash
curl -X POST http://localhost:3001/api/subscriptions/team_123/setup
```

### **Check Team Features**
```bash
curl http://localhost:3001/api/features/team_123
```

## 🎓 **Key Concepts**

### **Why Apify Schedules?**
- ✅ Native cron-based scheduling
- ✅ Built-in retry and error handling
- ✅ No need for custom polling loops
- ✅ Automatic memory management
- ✅ Webhook integration

### **Why Webhooks?**
- ✅ Real-time processing (no polling delay)
- ✅ More efficient (event-driven)
- ✅ Apify handles job completion notification
- ✅ Better cost control

### **Cost Optimization**
- ✅ Initial fetch: Get all historical data (e.g., 500 reviews)
- ✅ Recurring: Only fetch newest 50, server deduplicates
- ✅ Result: Only pay for what's needed after initial setup

## 📝 **Migration Guide**

### **Files Deleted (Old Architecture)**
- `src/apifyService/reviewPollingService.ts` ❌
- `src/apifyService/actorManager.ts` ❌
- `src/services/FeatureAwareScheduler.ts` ❌
- `src/services/businessSetupService.ts` ❌
- `src/services/businessTaskTracker.ts` ❌
- `src/supabase/businessMetadataService.ts` ❌

### **Files Added (New Architecture)**
- `src/server.ts` ✅
- `src/types/apify.types.ts` ✅
- `src/types/subscription.types.ts` ✅
- `src/services/apify/*` ✅
- `src/services/subscription/*` ✅
- `src/services/processing/*` ✅
- `src/controllers/*` ✅

### **Files Kept & Reused**
- `src/services/businessProfileCreationService.ts` ✅ (simplified)
- `src/supabase/database.ts` ✅ (review saving logic)
- `src/services/*AnalyticsService.ts` ✅ (analytics processing)

## 🚨 **Important Notes**

1. **Instagram & TikTok**: Do NOT use Apify for these platforms
2. **Webhook URL**: Must be publicly accessible for Apify callbacks
3. **Stripe Integration**: Uses `@wirecrest/billing` package for feature extraction
4. **Database**: Uses `@wirecrest/db` (Prisma) for all database operations
5. **Deduplication**: Server-side based on `externalReviewId` and `lastReviewDate`

## 🎯 **Next Steps**

1. ✅ Run database migration: `npx prisma migrate dev`
2. ✅ Install dependencies: `yarn install`
3. ✅ Set environment variables
4. ✅ Start development server: `yarn dev`
5. ✅ Configure Apify webhook URL in Apify Console
6. ✅ Configure Stripe webhook in Stripe Dashboard
7. ✅ Test with a subscription creation event

