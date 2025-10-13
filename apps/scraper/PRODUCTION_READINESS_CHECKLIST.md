# Production Readiness Checklist

This document outlines everything needed to make the new Apify-native scheduling system production-ready and integrated with the dashboard.

---

## 🗑️ **FILES TO DELETE** (Old Custom Scheduling System)

### 1. **Old Scheduling Services** ❌
```bash
# Custom scheduling services (replaced by Apify-native scheduling)
apps/scraper/src/services/instagramSchedulerService.ts
apps/scraper/src/services/tiktokSchedulerService.ts
```

**Reason:** Instagram and TikTok don't use Apify and have their own custom scheduling. These remain but should be reviewed for consistency.

### 2. **Old Actor Management** ❌
```bash
# Custom memory-aware priority queuing (replaced by Apify's native scheduling)
apps/scraper/src/apifyService/actorManager.ts  # Already deleted ✅
apps/scraper/src/apifyService/reviewPollingService.ts  # Already deleted ✅
```

**Reason:** We now use Apify's built-in scheduling instead of custom queuing.

### 3. **Old Feature-Aware Scheduler** ❌
```bash
# Custom feature-flag based scheduler (replaced by SubscriptionOrchestrator)
apps/scraper/src/services/FeatureAwareScheduler.ts  # Already deleted ✅
```

**Reason:** Replaced by `SubscriptionOrchestrator` which integrates with Stripe and Apify schedules.

### 4. **Monolithic Service** ⚠️ (Keep for now, gradually migrate)
```bash
# Large monolithic service (being replaced by SOLID architecture)
apps/scraper/src/services/simpleBusinessService.ts
```

**Action:** Keep for backward compatibility during migration, but deprecate and remove references.

### 5. **Old Migration Files** ⚠️
```bash
# Migration helper files (can be deleted once fully migrated)
apps/scraper/src/core/migration/ServiceMigration.ts
apps/scraper/src/core/migration/MigrationGuide.md
```

**Action:** Keep until all services are migrated, then delete.

### 6. **Duplicate Actor Files** ⚠️
```bash
# Check if these are still used or replaced by new services
apps/scraper/src/apifyService/actors/actor.ts
apps/scraper/src/apifyService/actors/bookingBusinessProfileActor.ts
apps/scraper/src/apifyService/actors/bookingBusinessReviewsActor.ts
apps/scraper/src/apifyService/actors/facebookBusinessReviewsActor.ts
apps/scraper/src/apifyService/actors/googleBusinessReviewsActor.ts
apps/scraper/src/apifyService/actors/googleBusinessReviewsBatchActor.ts
apps/scraper/src/apifyService/actors/tripAdvisorBusinessReviewsActor.ts
```

**Action:** Review each file. If replaced by new `ApifyTaskService` and `ApifyScheduleService`, delete them.

---

## ✅ **WHAT NEEDS TO BE IMPLEMENTED**

### **1. Database Setup** 🗄️

#### A. Run Prisma Migrations
```bash
cd packages/db
npx prisma migrate dev --name add_apify_scheduling_models
npx prisma generate
```

**Models to verify:**
- ✅ `ApifySchedule` - Tracks Apify schedules per team/platform
- ✅ `SyncRecord` - Logs every Apify run with metrics
- ✅ `ApifyWebhookLog` - Raw webhook payloads for debugging
- ✅ `TeamSubscription` - Links teams to Stripe subscriptions
- ✅ `lastScrapedAt` and `lastReviewDate` fields on business profile models

#### B. Seed Data (Optional)
Create initial test teams with subscriptions for testing.

---

### **2. Environment Variables** 🔐

Add to `apps/scraper/.env`:

```bash
# Apify Configuration
APIFY_TOKEN=your_apify_api_token_here
APIFY_WEBHOOK_BASE_URL=https://your-domain.com/api/webhooks/apify

# Stripe Configuration (for subscription management)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://...

# Redis (for job queuing)
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=production
PORT=3001
```

**Dashboard also needs:**
```bash
# In apps/dashboard/.env
NEXT_PUBLIC_SCRAPER_API_URL=https://your-scraper-api.com
```

---

### **3. Update ReviewDataProcessor** 🔄

**File:** `apps/scraper/src/services/processing/ReviewDataProcessor.ts`

**Current Issues:**
- ✅ Has basic structure for all platforms
- ⚠️ Needs to handle new actor output schemas
- ⚠️ Needs proper deduplication logic
- ⚠️ Needs to update `lastScrapedAt` and `lastReviewDate`

**Required Changes:**

```typescript
// Add deduplication based on lastReviewDate
private async processGoogleReviews(
  teamId: string,
  rawData: any[],
  isInitial: boolean
): Promise<Omit<SyncResult, 'processingTimeMs'>> {
  
  // Get all place IDs from dataset
  const uniquePlaceIds = [...new Set(rawData.map(r => r.placeId))];
  
  // Fetch existing profiles with lastReviewDate
  const profiles = await prisma.googleBusinessProfile.findMany({
    where: { teamId, placeId: { in: uniquePlaceIds } },
    select: { id: true, placeId: true, lastReviewDate: true }
  });
  
  const profileMap = new Map(profiles.map(p => [p.placeId, p]));
  
  let reviewsNew = 0;
  let reviewsDuplicate = 0;
  let businessesUpdated = new Set<string>();
  
  for (const item of rawData) {
    const profile = profileMap.get(item.placeId);
    if (!profile) continue;
    
    const reviewDate = new Date(item.publishedAtDate);
    
    // Skip if we've already processed this review
    if (profile.lastReviewDate && reviewDate <= profile.lastReviewDate) {
      reviewsDuplicate++;
      continue;
    }
    
    // Check if review exists in DB
    const existingReview = await prisma.googleReview.findFirst({
      where: { 
        businessId: profile.id,
        reviewId: item.reviewId 
      }
    });
    
    if (existingReview) {
      reviewsDuplicate++;
      continue;
    }
    
    // Save new review
    await prisma.googleReview.create({
      data: {
        businessId: profile.id,
        reviewId: item.reviewId,
        text: item.text,
        stars: item.stars,
        publishedAtDate: reviewDate,
        reviewerName: item.reviewerName,
        reviewUrl: item.reviewUrl,
        responseFromOwner: item.responseFromOwner,
        responseFromOwnerDate: item.responseFromOwnerDate ? new Date(item.responseFromOwnerDate) : null,
      }
    });
    
    reviewsNew++;
    businessesUpdated.add(profile.id);
  }
  
  // Update lastScrapedAt and lastReviewDate for all profiles
  await Promise.all(
    Array.from(businessesUpdated).map(async (businessId) => {
      const latestReview = await prisma.googleReview.findFirst({
        where: { businessId },
        orderBy: { publishedAtDate: 'desc' },
        select: { publishedAtDate: true }
      });
      
      await prisma.googleBusinessProfile.update({
        where: { id: businessId },
        data: {
          lastScrapedAt: new Date(),
          lastReviewDate: latestReview?.publishedAtDate || new Date()
        }
      });
    })
  );
  
  return {
    reviewsProcessed: rawData.length,
    reviewsNew,
    reviewsDuplicate,
    businessesUpdated: businessesUpdated.size
  };
}
```

**Similar updates needed for:**
- `processFacebookReviews()`
- `processTripAdvisorReviews()`
- `processBookingReviews()`

---

### **4. API Endpoints for Dashboard** 🌐

**File:** Create `apps/scraper/src/controllers/SubscriptionWebhookController.ts`

This controller will be called by the dashboard when:
1. User subscribes (create initial schedules)
2. User upgrades/downgrades (update schedule intervals)
3. User cancels (pause schedules)
4. User adds new business location (update schedule inputs)

```typescript
import { Request, Response } from 'express';
import { SubscriptionOrchestrator } from '../services/subscription/SubscriptionOrchestrator';

export class SubscriptionWebhookController {
  private orchestrator: SubscriptionOrchestrator;

  constructor(orchestrator: SubscriptionOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Handle new subscription - create initial schedules
   * POST /api/subscription/created
   */
  async handleSubscriptionCreated(req: Request, res: Response): Promise<void> {
    try {
      const { teamId, subscriptionId } = req.body;
      
      await this.orchestrator.handleNewSubscription(teamId, subscriptionId);
      
      res.json({ success: true, message: 'Schedules created' });
    } catch (error: any) {
      console.error('Error handling subscription created:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle subscription updated - adjust schedule intervals
   * POST /api/subscription/updated
   */
  async handleSubscriptionUpdated(req: Request, res: Response): Promise<void> {
    try {
      const { teamId, subscriptionId } = req.body;
      
      await this.orchestrator.handleSubscriptionUpdate(teamId, subscriptionId);
      
      res.json({ success: true, message: 'Schedules updated' });
    } catch (error: any) {
      console.error('Error handling subscription updated:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle subscription cancelled - pause schedules
   * POST /api/subscription/cancelled
   */
  async handleSubscriptionCancelled(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.body;
      
      await this.orchestrator.handleSubscriptionCancellation(teamId);
      
      res.json({ success: true, message: 'Schedules paused' });
    } catch (error: any) {
      console.error('Error handling subscription cancelled:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle business location added - update schedule inputs
   * POST /api/business/added
   */
  async handleBusinessAdded(req: Request, res: Response): Promise<void> {
    try {
      const { teamId, platform, identifier } = req.body;
      
      // This will add the new identifier to existing schedules
      await this.orchestrator.syncTeamSchedules(teamId);
      
      res.json({ success: true, message: 'Schedule updated with new location' });
    } catch (error: any) {
      console.error('Error handling business added:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
```

**Add routes in `apps/scraper/src/server.ts`:**

```typescript
import { SubscriptionWebhookController } from './controllers/SubscriptionWebhookController';

const subscriptionController = new SubscriptionWebhookController(orchestrator);

app.post('/api/subscription/created', (req, res) => 
  subscriptionController.handleSubscriptionCreated(req, res)
);

app.post('/api/subscription/updated', (req, res) => 
  subscriptionController.handleSubscriptionUpdated(req, res)
);

app.post('/api/subscription/cancelled', (req, res) => 
  subscriptionController.handleSubscriptionCancelled(req, res)
);

app.post('/api/business/added', (req, res) => 
  subscriptionController.handleBusinessAdded(req, res)
);
```

---

### **5. Dashboard Integration** 🎨

**Location:** `apps/dashboard/src/`

#### A. API Client Service

Create `apps/dashboard/src/services/scraper-api.ts`:

```typescript
import axios from 'axios';

const SCRAPER_API_URL = process.env.NEXT_PUBLIC_SCRAPER_API_URL || 'http://localhost:3001';

export class ScraperApiClient {
  
  /**
   * Notify scraper that team subscribed
   */
  static async notifySubscriptionCreated(teamId: string, subscriptionId: string) {
    await axios.post(`${SCRAPER_API_URL}/api/subscription/created`, {
      teamId,
      subscriptionId
    });
  }

  /**
   * Notify scraper that subscription was updated
   */
  static async notifySubscriptionUpdated(teamId: string, subscriptionId: string) {
    await axios.post(`${SCRAPER_API_URL}/api/subscription/updated`, {
      teamId,
      subscriptionId
    });
  }

  /**
   * Notify scraper that subscription was cancelled
   */
  static async notifySubscriptionCancelled(teamId: string) {
    await axios.post(`${SCRAPER_API_URL}/api/subscription/cancelled`, {
      teamId
    });
  }

  /**
   * Notify scraper that business location was added
   */
  static async notifyBusinessAdded(teamId: string, platform: string, identifier: string) {
    await axios.post(`${SCRAPER_API_URL}/api/business/added`, {
      teamId,
      platform,
      identifier
    });
  }

  /**
   * Get sync status for team
   */
  static async getSyncStatus(teamId: string) {
    const response = await axios.get(`${SCRAPER_API_URL}/api/sync-status/${teamId}`);
    return response.data;
  }

  /**
   * Get schedules for team
   */
  static async getSchedules(teamId: string) {
    const response = await axios.get(`${SCRAPER_API_URL}/api/schedules/${teamId}`);
    return response.data;
  }
}
```

#### B. Update Stripe Webhook Handler

**File:** `apps/dashboard/src/app/api/webhooks/stripe/route.ts`

Add calls to notify scraper:

```typescript
import { ScraperApiClient } from '@/services/scraper-api';

// In your Stripe webhook handler
switch (event.type) {
  case 'customer.subscription.created':
    // ... existing logic to save to database
    
    // Notify scraper to create schedules
    await ScraperApiClient.notifySubscriptionCreated(
      teamId,
      subscription.id
    );
    break;

  case 'customer.subscription.updated':
    // ... existing logic
    
    // Notify scraper to update schedules
    await ScraperApiClient.notifySubscriptionUpdated(
      teamId,
      subscription.id
    );
    break;

  case 'customer.subscription.deleted':
    // ... existing logic
    
    // Notify scraper to pause schedules
    await ScraperApiClient.notifySubscriptionCancelled(teamId);
    break;
}
```

#### C. Business Location Add Flow

**File:** `apps/dashboard/src/app/[teamSlug]/settings/locations/page.tsx`

When user adds a new business location:

```typescript
async function handleAddLocation(platform: string, identifier: string) {
  // 1. Save to database
  await saveToDB(teamId, platform, identifier);
  
  // 2. Notify scraper to update schedules
  await ScraperApiClient.notifyBusinessAdded(teamId, platform, identifier);
  
  toast.success('Location added and scheduled for syncing!');
}
```

#### D. Sync Status Dashboard

Create `apps/dashboard/src/components/SyncStatusWidget.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ScraperApiClient } from '@/services/scraper-api';

export function SyncStatusWidget({ teamId }: { teamId: string }) {
  const [status, setStatus] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStatus() {
      const [statusData, schedulesData] = await Promise.all([
        ScraperApiClient.getSyncStatus(teamId),
        ScraperApiClient.getSchedules(teamId)
      ]);
      setStatus(statusData);
      setSchedules(schedulesData);
    }
    fetchStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [teamId]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Sync Status</h3>
      
      {/* Last Sync Times */}
      <div className="space-y-2">
        {schedules.map(schedule => (
          <div key={schedule.id} className="flex justify-between">
            <span>{schedule.platform} - {schedule.scheduleType}</span>
            <span className="text-sm text-gray-500">
              {schedule.lastRunAt 
                ? `Last: ${new Date(schedule.lastRunAt).toLocaleString()}`
                : 'Not run yet'}
            </span>
            <span className="text-sm text-blue-600">
              Next: {new Date(schedule.nextRunAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Recent Syncs */}
      {status?.recentSyncs && (
        <div className="mt-6">
          <h4 className="font-medium mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {status.recentSyncs.map((sync: any) => (
              <div key={sync.id} className="text-sm">
                <span className={sync.status === 'completed' ? 'text-green-600' : 'text-red-600'}>
                  {sync.platform}: {sync.reviewsNew} new reviews
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### **6. Missing Service Methods** 🔧

**File:** `apps/scraper/src/services/subscription/SubscriptionOrchestrator.ts`

Ensure these methods exist:

```typescript
/**
 * Handle subscription cancellation - pause all schedules
 */
async handleSubscriptionCancellation(teamId: string): Promise<void> {
  const schedules = await prisma.apifySchedule.findMany({
    where: { teamId, isActive: true }
  });

  for (const schedule of schedules) {
    // Pause Apify schedule
    await this.scheduleService.pauseSchedule(schedule.apifyScheduleId);
    
    // Update database
    await prisma.apifySchedule.update({
      where: { id: schedule.id },
      data: { isActive: false }
    });
  }
}

/**
 * Re-activate schedules when subscription is renewed
 */
async reactivateSchedules(teamId: string): Promise<void> {
  const schedules = await prisma.apifySchedule.findMany({
    where: { teamId, isActive: false }
  });

  for (const schedule of schedules) {
    // Resume Apify schedule
    await this.scheduleService.resumeSchedule(schedule.apifyScheduleId);
    
    // Update database
    await prisma.apifySchedule.update({
      where: { id: schedule.id },
      data: { isActive: true }
    });
  }
}
```

---

### **7. Additional API Endpoints** 📡

Add to `apps/scraper/src/server.ts`:

```typescript
/**
 * Get sync status for team (for dashboard widget)
 */
app.get('/api/sync-status/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const recentSyncs = await prisma.syncRecord.findMany({
      where: { teamId },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        platform: true,
        syncType: true,
        status: true,
        reviewsNew: true,
        reviewsDuplicate: true,
        startedAt: true,
        completedAt: true
      }
    });

    const activeSchedules = await prisma.apifySchedule.count({
      where: { teamId, isActive: true }
    });

    res.json({
      recentSyncs,
      activeSchedules,
      lastSync: recentSyncs[0]?.completedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get schedules for team
 */
app.get('/api/schedules/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const schedules = await prisma.apifySchedule.findMany({
      where: { teamId },
      orderBy: [
        { platform: 'asc' },
        { scheduleType: 'asc' }
      ]
    });

    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manually trigger sync (for testing/admin)
 */
app.post('/api/trigger-sync/:teamId/:platform', async (req: Request, res: Response) => {
  try {
    const { teamId, platform } = req.params;
    
    // Get business identifiers
    const identifiers = await getBusinessIdentifiers(teamId, platform);
    
    const result = await taskService.runInitialTask({
      platform: platform as Platform,
      identifiers,
      isInitial: false,
      maxReviews: 100,
      webhookUrl: `${WEBHOOK_BASE_URL}/api/webhooks/apify`
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### **8. Testing Plan** 🧪

#### A. Unit Tests
```bash
# Test services
apps/scraper/src/services/apify/__tests__/ApifyScheduleService.test.ts
apps/scraper/src/services/apify/__tests__/ApifyTaskService.test.ts
apps/scraper/src/services/subscription/__tests__/SubscriptionOrchestrator.test.ts
apps/scraper/src/services/processing/__tests__/ReviewDataProcessor.test.ts
```

#### B. Integration Tests
1. **Test Stripe Webhook → Scraper API flow**
2. **Test Apify Webhook → Data Processing flow**
3. **Test Schedule Creation → Apify API**
4. **Test Deduplication logic**

#### C. End-to-End Test Scenarios
1. ✅ User subscribes → Schedules created → Reviews synced
2. ✅ User adds location → Schedule updated → New location synced
3. ✅ User upgrades → Intervals adjusted → Faster syncing
4. ✅ User cancels → Schedules paused
5. ✅ Webhook fires → Reviews processed → Dashboard updated

---

### **9. Monitoring & Alerts** 📊

**Create monitoring dashboard for:**
- ✅ Active schedules per team
- ✅ Successful vs failed runs
- ✅ Average processing time
- ✅ Deduplication rate
- ✅ Compute units consumed
- ✅ Webhook delivery success rate

**Set up alerts for:**
- ❌ Failed Apify runs (>5% failure rate)
- ❌ Webhook processing errors
- ❌ Schedule drift (nextRunAt too far in past)
- ❌ High duplicate rate (>90%)
- ❌ API timeout errors

---

### **10. Documentation** 📚

#### For Developers:
- ✅ `APIFY_ACTORS_CONFIGURATION.md` (already created)
- ⏳ API endpoint documentation
- ⏳ Database schema documentation
- ⏳ Webhook payload examples

#### For Operations:
- ⏳ Deployment guide
- ⏳ Troubleshooting guide
- ⏳ Scaling guide
- ⏳ Cost optimization tips

---

## 🚀 **Deployment Checklist**

### Pre-Deployment
- [ ] All linting errors fixed
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] Apify actors tested manually
- [ ] Webhook endpoints secured (auth/validation)

### Deployment Steps
1. [ ] Deploy database migrations
2. [ ] Deploy scraper service
3. [ ] Test webhook endpoints
4. [ ] Deploy dashboard updates
5. [ ] Create test subscription
6. [ ] Verify end-to-end flow
7. [ ] Monitor first real subscriptions

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Check Apify run success rates
- [ ] Verify schedules are running
- [ ] Confirm webhooks are being received
- [ ] Review dashboard sync status widgets

---

## 📋 **Summary**

### High Priority (Must Complete Before Production)
1. ✅ Update `ReviewDataProcessor` with new actor outputs
2. ✅ Create `SubscriptionWebhookController`
3. ✅ Add API endpoints for dashboard
4. ✅ Integrate with dashboard Stripe webhooks
5. ✅ Test end-to-end flow
6. ✅ Set up monitoring

### Medium Priority (Should Complete Soon After)
1. ⏳ Delete old files
2. ⏳ Write tests
3. ⏳ Add error handling and retries
4. ⏳ Create admin dashboard for monitoring
5. ⏳ Document API endpoints

### Low Priority (Nice to Have)
1. ⏳ Optimize deduplication algorithm
2. ⏳ Add rate limiting
3. ⏳ Create cost analysis dashboard
4. ⏳ Add support for custom scrape intervals
5. ⏳ Implement manual sync button in dashboard

---

## 🔗 **Key Files Reference**

| Component | File Path |
|-----------|-----------|
| Schedule Management | `apps/scraper/src/services/apify/ApifyScheduleService.ts` |
| Task Execution | `apps/scraper/src/services/apify/ApifyTaskService.ts` |
| Subscription Logic | `apps/scraper/src/services/subscription/SubscriptionOrchestrator.ts` |
| Data Processing | `apps/scraper/src/services/processing/ReviewDataProcessor.ts` |
| Webhook Handler | `apps/scraper/src/controllers/ApifyWebhookController.ts` |
| Type Definitions | `apps/scraper/src/types/apify.types.ts` |
| Database Schema | `packages/db/prisma/schema.prisma` |

---

**Last Updated:** 2025-10-07  
**Status:** 🟡 In Progress - Core architecture complete, integration pending

