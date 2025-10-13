# Global Schedule System - Deployment Checklist

## Pre-Deployment Steps

### 1. Database Migration

```bash
# Navigate to database package
cd packages/db

# Generate Prisma client with new models
npx prisma generate

# Create migration
npx prisma migrate dev --name add_global_schedule_models

# OR for production
npx prisma migrate deploy
```

This will:
- Create `ApifyGlobalSchedule` table
- Create `BusinessScheduleMapping` table
- Create `ScheduleCustomInterval` table
- Create `BusinessRetryQueue` table
- Generate TypeScript types for new models

### 2. Build Scraper Service

```bash
cd apps/scraper

# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

### 3. Environment Variables

Ensure these are set:

```bash
# .env or environment
APIFY_API_TOKEN=your_apify_token_here
APIFY_WEBHOOK_SECRET=your_webhook_secret_here
DATABASE_URL=postgresql://user:pass@host:5432/dbname
WEBHOOK_BASE_URL=https://your-production-domain.com
```

### 4. Initialize Global Schedules

```bash
cd apps/scraper

# Run initialization script
ts-node scripts/migrate-to-global-schedules.ts

# This creates all platform × interval schedules
```

Expected output:
```
✅ Initialized 32 global schedules
✓ Migrated 150 businesses
```

### 5. Validate System

```bash
# Run validation
ts-node scripts/validate-global-schedules.ts

# All tests should pass
```

Expected output:
```
Tests Passed: 7 / 7
✅ All validation tests passed!
```

## Deployment Steps

### Option A: Direct Deployment

```bash
# 1. Deploy database changes
cd packages/db && npx prisma migrate deploy

# 2. Build and deploy scraper
cd apps/scraper
npm run build
pm2 restart scraper

# 3. Set up cron job for retry queue
crontab -e
# Add: */5 * * * * cd /app/apps/scraper && ts-node src/jobs/processRetryQueue.ts
```

### Option B: Docker Deployment

```bash
# Build image
docker build -t wirecrest-scraper:global-schedules .

# Run migration
docker run --env-file .env wirecrest-scraper:global-schedules \
  npx prisma migrate deploy

# Start service
docker-compose up -d scraper

# Start retry queue processor
docker-compose up -d retry-queue-processor
```

## Post-Deployment Verification

### 1. Check Database

```sql
-- Verify tables exist
\dt Apify*
\dt BusinessScheduleMapping
\dt ScheduleCustomInterval
\dt BusinessRetryQueue

-- Check schedule count
SELECT COUNT(*) FROM "ApifyGlobalSchedule";
-- Expected: ~32 (4 platforms × 4 intervals × 2 types)

-- Check mappings
SELECT COUNT(*) FROM "BusinessScheduleMapping";
-- Expected: Number of active businesses
```

### 2. Test Business Creation

```bash
# Create test business via API
curl -X POST http://localhost:3000/api/google/profile \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "test-team-id",
    "placeId": "ChIJTest123"
  }'

# Verify mapping created
SELECT * FROM "BusinessScheduleMapping" WHERE "placeId" = 'ChIJTest123';
```

### 3. Test Subscription Update

```bash
# Trigger subscription update via Stripe webhook
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d @test-subscription-update.json

# Verify business moved to new schedule
SELECT * FROM "BusinessScheduleMapping" WHERE "teamId" = 'test-team-id';
```

### 4. Monitor Logs

```bash
# Watch scraper logs
tail -f logs/scraper.log

# Look for:
# ✓ Added business ... to schedule
# ✓ Moved business from 12h → 6h
# ✓ Updated schedule ... with N businesses
```

### 5. Check Admin Endpoints

```bash
# Get all schedules
curl http://localhost:3000/admin/schedules

# Get system health
curl http://localhost:3000/admin/health

# Expected healthy status:
# {
#   "schedules": { "healthy": N, "warning": 0, "critical": 0 },
#   "retryQueue": { "pending": 0, "failed": 0 }
# }
```

## Monitoring Setup

### 1. Health Checks

Add to your monitoring system:

```yaml
# Prometheus metrics (if using)
- name: global_schedules_active
  query: SELECT COUNT(*) FROM "ApifyGlobalSchedule" WHERE "isActive" = true
  
- name: business_mappings_total
  query: SELECT COUNT(*) FROM "BusinessScheduleMapping" WHERE "isActive" = true
  
- name: retry_queue_pending
  query: SELECT COUNT(*) FROM "BusinessRetryQueue" WHERE status = 'pending'
  
- name: retry_queue_failed
  query: SELECT COUNT(*) FROM "BusinessRetryQueue" WHERE status = 'failed'
```

### 2. Alerts

Set up alerts for:

- **Critical**: Any schedule at >95% capacity
- **Warning**: >5 businesses in retry queue
- **Critical**: >10 permanently failed businesses
- **Warning**: Retry queue not processing (last run >10 minutes ago)
- **Critical**: Zero active schedules (system outage)

### 3. Dashboards

Create dashboards showing:

1. **Schedule Overview**
   - Active schedules by platform
   - Business distribution by interval
   - Batch utilization percentage

2. **Health Metrics**
   - Schedules by health status (healthy/warning/critical)
   - Retry queue trends
   - Failed business count

3. **Performance**
   - Webhook processing time
   - Schedule input rebuild time
   - Retry success rate

## Rollback Procedure

If issues are detected:

### Step 1: Disable Global Schedules

```sql
-- Disable all global schedules
UPDATE "ApifyGlobalSchedule" SET "isActive" = false;
```

### Step 2: Re-enable Old System

```sql
-- Re-enable old per-team schedules
UPDATE "ApifySchedule" SET "isActive" = true;
```

### Step 3: Monitor

```bash
# Watch for recovery
tail -f logs/scraper.log

# Verify old system working
curl http://localhost:3000/health
```

### Step 4: Investigate

```bash
# Check recent errors
SELECT * FROM "ApifyWebhookLog" 
WHERE "processingStatus" = 'failed' 
ORDER BY "processedAt" DESC 
LIMIT 20;

# Check mapping issues
ts-node scripts/validate-global-schedules.ts
```

## Troubleshooting

### Issue: Businesses not being scraped

**Symptoms**: Reviews not updating, schedules showing as inactive

**Debug steps**:
```sql
-- Check if business is mapped
SELECT * FROM "BusinessScheduleMapping" 
WHERE "businessProfileId" = 'xxx';

-- Check schedule status
SELECT s.* FROM "ApifyGlobalSchedule" s
JOIN "BusinessScheduleMapping" m ON m."scheduleId" = s.id
WHERE m."businessProfileId" = 'xxx';

-- Check retry queue
SELECT * FROM "BusinessRetryQueue" 
WHERE "businessProfileId" = 'xxx';
```

**Solution**:
- If not mapped: Re-create business profile
- If schedule inactive: Run `updateScheduleInput()`
- If in retry queue: Check error and retry manually

### Issue: Wrong data attribution

**Symptoms**: Team A seeing Team B's reviews

**Debug steps**:
```sql
-- Check mapping ownership
SELECT teamId, businessProfileId, platform, placeId
FROM "BusinessScheduleMapping"
WHERE "placeId" = 'xxx';

-- Check review attribution
SELECT teamId, businessProfileId, COUNT(*)
FROM "GoogleReview"
WHERE "placeId" = 'xxx'
GROUP BY teamId, businessProfileId;
```

**Solution**:
- Fix mapping if incorrect
- Re-run webhook processing
- Delete incorrectly attributed reviews

### Issue: Schedule at capacity

**Symptoms**: Warning: schedule at >80% capacity

**Debug steps**:
```sql
-- Check schedule size
SELECT id, platform, intervalHours, businessCount
FROM "ApifyGlobalSchedule"
WHERE businessCount > 40;  -- Adjust threshold
```

**Solution**:
```bash
# Run rebalancing
curl -X POST http://localhost:3000/admin/schedules/rebalance \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "google_reviews",
    "scheduleType": "reviews",
    "intervalHours": 6
  }'
```

### Issue: High retry queue

**Symptoms**: Many businesses in retry queue, not resolving

**Debug steps**:
```sql
-- Check retry queue
SELECT platform, status, COUNT(*)
FROM "BusinessRetryQueue"
GROUP BY platform, status;

-- Check specific failures
SELECT businessProfileId, platform, lastError, retryCount
FROM "BusinessRetryQueue"
WHERE status = 'failed'
LIMIT 10;
```

**Solution**:
- Review error messages
- Fix underlying issue (Apify API, actor bugs)
- Manual retry: `POST /admin/businesses/:id/retry`
- If persistent: increase retry limits or timeout

## Success Criteria

✅ **System is healthy when**:

1. All validation tests pass
2. Zero critical health alerts
3. <5 businesses in retry queue
4. All schedules <80% capacity
5. Webhooks processing successfully
6. Reviews attributed correctly
7. Subscription changes work smoothly
8. Admin operations respond quickly

## Support Contacts

- **Database Issues**: DBA team
- **Apify Issues**: Apify support / internal platform team
- **Code Issues**: Development team
- **Monitoring**: DevOps team

## Documentation References

- [Global Schedule Architecture](./GLOBAL_SCHEDULING_ARCHITECTURE.md)
- [Implementation Summary](./GLOBAL_SCHEDULE_IMPLEMENTATION_SUMMARY.md)
- [Batching Strategy](./BATCHING_STRATEGY.md)
- [Dynamic Scheduling Explained](./DYNAMIC_SCHEDULING_EXPLAINED.md)

## Next Steps After Deployment

1. **Week 1**: Monitor closely, validate daily
2. **Week 2**: Review metrics, optimize batch sizes
3. **Week 3**: Clean up old schedules
4. **Week 4**: Build admin dashboard UI
5. **Month 2**: Implement advanced features (custom intervals, etc.)

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Verification Completed**: ☐ Yes ☐ No
**Monitoring Set Up**: ☐ Yes ☐ No
**Team Notified**: ☐ Yes ☐ No
