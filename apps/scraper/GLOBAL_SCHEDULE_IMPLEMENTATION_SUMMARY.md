# Global Schedule System - Implementation Summary

## Overview

This document summarizes the implementation of the global interval-based scheduling system for the Wirecrest scraper service. The system migrates from per-team schedules to global schedules organized by update interval, enabling better scalability and cost efficiency.

## What Was Implemented

### 1. Database Schema (`packages/db/prisma/schema.prisma`)

**New Tables:**

- **`ApifyGlobalSchedule`**: Global schedules indexed by (platform × interval × scheduleType × batchIndex)
  - Stores schedule metadata and Apify schedule ID
  - Denormalized `businessCount` for performance
  - Supports batching via `batchIndex`

- **`BusinessScheduleMapping`**: Links businesses to global schedules
  - Maps `businessProfileId` → `scheduleId`
  - Stores platform-specific identifiers (placeId, URLs)
  - Enables webhook data attribution
  - Enforces unique constraint per business-platform pair

- **`ScheduleCustomInterval`**: Custom intervals for Enterprise teams
  - Admin-controlled custom update frequencies
  - Optional expiration dates
  - Audit trail (setBy, reason)

- **`BusinessRetryQueue`**: Per-business retry queue
  - Isolated failure handling
  - Exponential backoff
  - Max retry limits
  - Status tracking (pending/retrying/failed/resolved)

**Modified Tables:**

- **`ApifySchedule`**: Marked as legacy (being phased out)

### 2. Core Services

#### `GlobalScheduleOrchestrator` 
**Location:** `apps/scraper/src/services/subscription/GlobalScheduleOrchestrator.ts`

**Key Methods:**
- `initializeGlobalSchedules()`: Create all platform × interval schedules
- `addBusinessToSchedule()`: Add business to appropriate schedule
- `moveBusinessBetweenSchedules()`: Handle tier changes
- `removeBusinessFromSchedule()`: Remove deleted businesses
- `updateScheduleInput()`: Rebuild Apify schedule inputs dynamically
- `checkAndSplitSchedule()`: Auto-batch when schedule grows large

**Features:**
- Dynamic schedule input generation from `BusinessScheduleMapping`
- Automatic batching at 50 businesses (Google) / 30 (others)
- Batch staggering (15-minute offsets)
- Platform-specific input formatting

#### `ScheduleBatchManager`
**Location:** `apps/scraper/src/services/apify/ScheduleBatchManager.ts`

**Key Methods:**
- `findBestScheduleForBusiness()`: Load balancing
- `rebalanceBatches()`: Redistribute businesses evenly
- `consolidateBatches()`: Merge underutilized batches
- `getHealthStatus()`: Monitor schedule capacity

**Features:**
- Smart batch allocation
- Round-robin distribution
- Health monitoring (healthy/warning/critical)
- Automatic consolidation

#### `BusinessRetryService`
**Location:** `apps/scraper/src/services/retry/BusinessRetryService.ts`

**Key Methods:**
- `addToRetryQueue()`: Queue failed businesses
- `processRetryQueue()`: Process retries (cron job)
- `retryBusinessScrape()`: Trigger single-business scrape
- `removeFromRetryQueue()`: Clean up successful retries

**Features:**
- Exponential backoff (5min → 15min → 45min)
- Max 3 retries
- Individual business isolation
- Automatic cleanup

#### `FeatureExtractor` (Enhanced)
**Location:** `apps/scraper/src/services/subscription/FeatureExtractor.ts`

**New Methods:**
- `getIntervalForTeamPlatform()`: Check custom intervals first
- `setCustomInterval()`: Admin function to set custom intervals
- `removeCustomInterval()`: Remove custom overrides
- `getTeamCustomIntervals()`: List team's custom intervals

**Features:**
- Custom interval support
- Expiration handling
- Fallback to tier defaults

### 3. Controllers

#### `GoogleBusinessController`
**Location:** `apps/scraper/src/controllers/GoogleBusinessController.ts`

**Endpoints:**
- `POST /api/google/profile`: Create profile + add to schedule
- `DELETE /api/google/profile/:id`: Delete profile + remove from schedule
- `GET /api/google/profile/:teamId`: Get profile with schedule info

**Integration:**
- Automatically adds businesses to global schedules on creation
- Removes from schedules on deletion
- Uses `FeatureExtractor` to determine interval

Similar controllers should be created for:
- Facebook (`FacebookBusinessController.ts`)
- TripAdvisor (`TripAdvisorBusinessController.ts`)
- Booking (`BookingBusinessController.ts`)

#### `AdminScheduleController`
**Location:** `apps/scraper/src/controllers/AdminScheduleController.ts`

**Endpoints:**
- `GET /admin/schedules`: List all global schedules
- `GET /admin/schedules/:id/businesses`: Businesses in schedule
- `POST /admin/schedules/:id/trigger`: Manual trigger
- `PUT /admin/schedules/:id/pause`: Pause schedule
- `PUT /admin/schedules/:id/resume`: Resume schedule
- `GET /admin/teams/:teamId/schedules`: Team's assignments
- `POST /admin/teams/:teamId/custom-interval`: Set custom interval
- `POST /admin/businesses/:id/retry`: Force retry
- `GET /admin/health`: System health status
- `POST /admin/schedules/rebalance`: Rebalance batches

**Features:**
- Full admin control over schedules
- Custom interval management
- Health monitoring
- Manual operations

### 4. Jobs & Scripts

#### `processRetryQueue.ts`
**Location:** `apps/scraper/src/jobs/processRetryQueue.ts`

**Purpose:** Cron job to process retry queue every 5 minutes

**Usage:**
```bash
ts-node src/jobs/processRetryQueue.ts
```

**Schedule:** Run every 5 minutes via cron/scheduler

#### `migrate-to-global-schedules.ts`
**Location:** `apps/scraper/scripts/migrate-to-global-schedules.ts`

**Purpose:** Migrate from per-team to global schedules

**Features:**
- Initializes all global schedules
- Migrates all existing businesses
- Validates migration
- Detailed reporting

**Usage:**
```bash
cd apps/scraper
ts-node scripts/migrate-to-global-schedules.ts
```

#### `validate-global-schedules.ts`
**Location:** `apps/scraper/scripts/validate-global-schedules.ts`

**Purpose:** Validate system integrity

**Tests:**
- Business profile coverage
- Orphaned mappings
- Schedule business counts
- Data isolation
- Identifier validity
- Interval validity

**Usage:**
```bash
cd apps/scraper
ts-node scripts/validate-global-schedules.ts
```

## How It Works

### Business Creation Flow

```
User creates Google Business Profile in dashboard
  ↓
Dashboard calls scraper backend: POST /api/google/profile
  ↓
GoogleBusinessController:
  1. Create GoogleBusinessProfile record
  2. Get team's interval (checks custom, then tier)
  3. Call GlobalScheduleOrchestrator.addBusinessToSchedule()
  ↓
GlobalScheduleOrchestrator:
  1. Find/create schedule for interval
  2. Create BusinessScheduleMapping
  3. Update schedule business count
  4. Rebuild schedule input in Apify
  5. Check if batching needed
  ↓
Schedule is now active with new business
```

### Subscription Change Flow

```
Stripe webhook: subscription.updated
  ↓
StripeWebhookController calls SubscriptionOrchestrator
  ↓
SubscriptionOrchestrator:
  1. Get new interval from FeatureExtractor
  2. Get all BusinessScheduleMapping for team
  3. For each business:
     - If interval changed:
       - Call GlobalScheduleOrchestrator.moveBusinessBetweenSchedules()
  ↓
GlobalScheduleOrchestrator:
  1. Find target schedule for new interval
  2. Update BusinessScheduleMapping.scheduleId
  3. Update old schedule (decrement count, rebuild input)
  4. Update new schedule (increment count, rebuild input)
  ↓
All team's businesses now on new interval
```

### Schedule Run Flow

```
Apify cron triggers schedule
  ↓
Actor runs with input containing all business identifiers
  ↓
Actor completes, webhook fires
  ↓
ApifyWebhookController receives webhook
  ↓
For each review in dataset:
  1. Extract identifier (placeId, URL)
  2. Query BusinessScheduleMapping to find owner
  3. Save review with correct teamId + businessProfileId
  ↓
Data is properly attributed to correct teams
```

### Failure Handling Flow

```
Actor run fails for specific business
  ↓
Webhook identifies failed business
  ↓
BusinessRetryService.addToRetryQueue()
  ↓
Business added with nextRetryAt = now + 5 minutes
  ↓
Cron job runs every 5 minutes: processRetryQueue()
  ↓
For each business ready to retry:
  1. Mark as "retrying"
  2. Trigger single-business actor run
  3. If successful: mark as "resolved"
  4. If failed: increment retry count, exponential backoff
  5. If max retries: mark as "failed", alert team owner
```

## Data Isolation & Security

### Critical Security Measures

1. **Business → Team Mapping**
   - Every `BusinessScheduleMapping` has `teamId`
   - Identifier lookup happens via this table
   - Reviews saved with `teamId` from mapping

2. **Database Constraints**
   ```sql
   -- Unique business-platform mapping
   @@unique([businessProfileId, platform])
   
   -- Foreign key cascade deletes
   onDelete: Cascade
   ```

3. **Query Patterns**
   ```typescript
   // ALWAYS filter by teamId
   const reviews = await prisma.googleReview.findMany({
     where: { teamId, businessProfileId }
   });
   ```

4. **Webhook Validation**
   - Token-based authentication
   - Identifier → teamId lookup required
   - Orphaned data logged and reported

## Migration Strategy

### Phase 1: Preparation (Week 1)

1. **Deploy Code**
   ```bash
   # Deploy new schema
   cd packages/db
   npx prisma migrate deploy
   
   # Deploy scraper with new code
   cd apps/scraper
   npm run build
   ```

2. **Initialize Global Schedules**
   ```bash
   ts-node scripts/migrate-to-global-schedules.ts
   ```

3. **Validate**
   ```bash
   ts-node scripts/validate-global-schedules.ts
   ```

### Phase 2: Shadow Mode (Week 2)

- Global schedules created but inactive
- Old per-team schedules still running
- Compare outputs daily
- Monitor for discrepancies

### Phase 3: Cutover (Week 3)

1. **Enable Global Schedules**
   ```sql
   UPDATE "ApifyGlobalSchedule" SET "isActive" = true;
   ```

2. **Disable Old Schedules**
   ```sql
   UPDATE "ApifySchedule" SET "isActive" = false;
   ```

3. **Monitor Closely**
   - Check webhook processing
   - Verify data attribution
   - Monitor schedule runs

### Phase 4: Cleanup (Week 4)

1. **Delete Old Schedules from Apify**
2. **Remove Old Database Records**
   ```sql
   -- After confirming everything works
   DELETE FROM "ApifySchedule";
   ```
3. **Update Documentation**

## Admin Operations

### Set Custom Interval for Team

```bash
# Via API
POST /admin/teams/{teamId}/custom-interval
{
  "platform": "google_reviews",
  "customIntervalHours": 8,
  "reason": "Enterprise contract - custom SLA",
  "setBy": "admin@wirecrest.com",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

### Force Retry Failed Business

```bash
POST /admin/businesses/{businessProfileId}/retry
{
  "platform": "google_reviews"
}
```

### Rebalance Batches

```bash
POST /admin/schedules/rebalance
{
  "platform": "google_reviews",
  "scheduleType": "reviews",
  "intervalHours": 6
}
```

### Check System Health

```bash
GET /admin/health
```

Response:
```json
{
  "success": true,
  "health": {
    "schedules": {
      "total": 32,
      "active": 18,
      "healthy": 15,
      "warning": 2,
      "critical": 1
    },
    "businesses": {
      "total": 453
    },
    "retryQueue": {
      "pending": 3,
      "retrying": 1,
      "failed": 2,
      "resolved": 127
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# Required
APIFY_API_TOKEN=your_apify_token
APIFY_WEBHOOK_SECRET=your_webhook_secret
DATABASE_URL=postgresql://...

# Optional
WEBHOOK_BASE_URL=https://your-domain.com  # Default: http://localhost:3000
```

### Cron Jobs to Set Up

```cron
# Process retry queue every 5 minutes
*/5 * * * * cd /app && ts-node src/jobs/processRetryQueue.ts

# Cleanup old retry queue entries daily
0 2 * * * cd /app && ts-node src/jobs/cleanupRetryQueue.ts

# Health check and rebalancing (weekly)
0 3 * * 0 cd /app && ts-node src/jobs/weeklyMaintenance.ts
```

## Testing

### Unit Tests Needed

- [ ] GlobalScheduleOrchestrator: schedule creation/update
- [ ] ScheduleBatchManager: batch allocation logic
- [ ] BusinessRetryService: exponential backoff calculation
- [ ] FeatureExtractor: custom interval precedence

### Integration Tests Needed

- [ ] Business creation → schedule addition
- [ ] Subscription update → schedule migration
- [ ] Webhook → data attribution (multi-team)
- [ ] Retry queue → successful retry

### Security Tests Needed

- [ ] Cross-team data access (should fail)
- [ ] Orphaned identifier handling
- [ ] Concurrent schedule updates
- [ ] Webhook token validation

## Monitoring & Alerts

### Metrics to Track

1. **Schedule Health**
   - Number of schedules at >80% capacity
   - Number of schedules at >95% capacity (critical)
   - Average batch size per platform

2. **Retry Queue**
   - Pending retries
   - Failed businesses (max retries exceeded)
   - Average retry success rate

3. **Data Integrity**
   - Orphaned business mappings
   - Schedule count mismatches
   - Duplicate mappings

### Alert Thresholds

- **Critical**: Schedule at 95%+ capacity
- **Warning**: >5 businesses in retry queue
- **Critical**: >10 permanently failed businesses
- **Warning**: Schedule count mismatch detected

## Next Steps

1. **Create Admin Dashboard UI**
   - Schedule management interface
   - Team override controls
   - Health monitoring dashboard

2. **Implement Remaining Controllers**
   - FacebookBusinessController
   - TripAdvisorBusinessController
   - BookingBusinessController

3. **Enhance Retry Logic**
   - Team owner notifications
   - Slack/email alerts for failures
   - Retry success metrics

4. **Performance Optimization**
   - Cache custom intervals
   - Batch schedule input updates
   - Optimize webhook processing

5. **Documentation**
   - API documentation
   - Admin runbook
   - Troubleshooting guide

## Rollback Plan

If issues arise:

1. **Immediate**: Disable global schedules
   ```sql
   UPDATE "ApifyGlobalSchedule" SET "isActive" = false;
   ```

2. **Reactivate Old System**
   ```sql
   UPDATE "ApifySchedule" SET "isActive" = true;
   ```

3. **Monitor**
   - Check data flows resume
   - Verify no data loss

4. **Investigate**
   - Review logs
   - Identify root cause
   - Fix before retry

## Support & Troubleshooting

### Common Issues

**Issue**: Business not being scraped
- Check `BusinessScheduleMapping` exists
- Verify schedule is active
- Check retry queue for failures

**Issue**: Data attributed to wrong team
- Verify `BusinessScheduleMapping.teamId` is correct
- Check webhook processing logic
- Review `ApifyWebhookLog` for errors

**Issue**: Schedule at capacity
- Run rebalancing script
- Check if new batch needed
- Review batch size limits

### Debug Commands

```bash
# Check business mapping
psql -c "SELECT * FROM \"BusinessScheduleMapping\" WHERE \"businessProfileId\" = 'xxx';"

# Check schedule health
ts-node scripts/validate-global-schedules.ts

# Process retry queue manually
ts-node src/jobs/processRetryQueue.ts

# View recent webhook logs
psql -c "SELECT * FROM \"ApifyWebhookLog\" ORDER BY \"processedAt\" DESC LIMIT 10;"
```

## Conclusion

The global scheduling system provides a scalable, cost-effective solution for managing scraping across multiple teams and businesses. With proper monitoring and maintenance, it will handle growth from hundreds to thousands of businesses seamlessly.

**Status**: ✅ Core implementation complete
**Next**: Admin UI, remaining controllers, comprehensive testing

