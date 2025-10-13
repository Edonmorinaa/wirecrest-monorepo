# Global Scheduling System - Quick Reference

## 🚀 Quick Start

```bash
# 1. Migrate database
cd packages/db && npx prisma migrate deploy

# 2. Initialize schedules
cd apps/scraper && ts-node scripts/migrate-to-global-schedules.ts

# 3. Validate
ts-node scripts/validate-global-schedules.ts

# 4. Start retry queue (cron every 5 min)
ts-node src/jobs/processRetryQueue.ts
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `GlobalScheduleOrchestrator.ts` | Core schedule management |
| `ScheduleBatchManager.ts` | Automatic batching |
| `BusinessRetryService.ts` | Retry queue |
| `GoogleBusinessController.ts` | Business API |
| `AdminScheduleController.ts` | Admin API |
| `migrate-to-global-schedules.ts` | Migration script |
| `validate-global-schedules.ts` | Validation script |

## 🔗 API Endpoints

### Business Operations
```bash
# Create business
POST /api/google/profile
{ "teamId": "xxx", "placeId": "ChIJxxx" }

# Delete business
DELETE /api/google/profile/:id

# Get business
GET /api/google/profile/:teamId
```

### Admin Operations
```bash
# List schedules
GET /admin/schedules

# Get health
GET /admin/health

# Set custom interval
POST /admin/teams/:teamId/custom-interval
{ "platform": "google_reviews", "customIntervalHours": 8 }

# Force retry
POST /admin/businesses/:id/retry
{ "platform": "google_reviews" }

# Rebalance
POST /admin/schedules/rebalance
{ "platform": "google_reviews", "scheduleType": "reviews", "intervalHours": 6 }
```

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `ApifyGlobalSchedule` | Global schedules by interval |
| `BusinessScheduleMapping` | Business → Schedule links |
| `ScheduleCustomInterval` | Custom intervals |
| `BusinessRetryQueue` | Retry queue |

## 📊 Key Queries

```sql
-- Check schedule health
SELECT platform, intervalHours, businessCount, isActive 
FROM "ApifyGlobalSchedule";

-- Check business mapping
SELECT * FROM "BusinessScheduleMapping" 
WHERE "businessProfileId" = 'xxx';

-- Check retry queue
SELECT status, COUNT(*) FROM "BusinessRetryQueue" 
GROUP BY status;

-- Find orphaned mappings
SELECT m.* FROM "BusinessScheduleMapping" m
LEFT JOIN "ApifyGlobalSchedule" s ON m."scheduleId" = s.id
WHERE s.id IS NULL;
```

## 🔄 Common Workflows

### Add Business
```typescript
1. Create GoogleBusinessProfile
2. Get team interval (custom or tier)
3. GlobalOrchestrator.addBusinessToSchedule()
4. ✅ Business in schedule
```

### Change Subscription
```typescript
1. Get new interval
2. For each business:
   GlobalOrchestrator.moveBusinessBetweenSchedules()
3. ✅ All businesses moved
```

### Handle Failure
```typescript
1. Webhook identifies failure
2. BusinessRetryService.addToRetryQueue()
3. Cron processes queue
4. ✅ Retry with backoff
```

## 🎯 Validation Checks

```bash
# Run all tests
ts-node scripts/validate-global-schedules.ts

# Expected: 7/7 tests pass
```

**Tests**:
- Business profile coverage
- No orphaned mappings
- Accurate business counts
- Data isolation
- Valid identifiers
- Valid intervals
- Active schedules have businesses

## 🚨 Health Thresholds

| Status | Condition |
|--------|-----------|
| ✅ Healthy | <80% capacity, <5 retries |
| ⚠️ Warning | 80-95% capacity, 5-10 retries |
| 🚨 Critical | >95% capacity, >10 retries |

## 🔧 Maintenance Commands

```bash
# Rebalance schedule
curl -X POST /admin/schedules/rebalance \
  -d '{"platform":"google_reviews","scheduleType":"reviews","intervalHours":6}'

# Check health
curl /admin/health

# Force retry
curl -X POST /admin/businesses/{id}/retry \
  -d '{"platform":"google_reviews"}'

# Set custom interval
curl -X POST /admin/teams/{teamId}/custom-interval \
  -d '{"platform":"google_reviews","customIntervalHours":8}'
```

## 🐛 Troubleshooting

| Issue | Check | Fix |
|-------|-------|-----|
| Business not scraped | BusinessScheduleMapping | Re-create profile |
| Wrong data | teamId in mapping | Fix mapping |
| Schedule full | businessCount > 40 | Rebalance |
| High retry queue | BusinessRetryQueue | Check errors, manual retry |

## 📈 Metrics to Monitor

- Active schedules (target: ~32)
- Schedule capacity (alert: >95%)
- Retry queue size (alert: >10)
- Failed businesses (alert: >5)
- Webhook processing time (alert: >30s)

## 🔒 Security Checklist

- ✅ Always filter by `teamId`
- ✅ Use BusinessScheduleMapping for attribution
- ✅ Validate webhook tokens
- ✅ Never expose cross-team data
- ✅ Audit admin operations

## 📚 Documentation

- `README_GLOBAL_SCHEDULES.md` - Quick reference
- `GLOBAL_SCHEDULE_IMPLEMENTATION_SUMMARY.md` - Full details
- `DEPLOYMENT_CHECKLIST.md` - Deployment steps
- `GLOBAL_SCHEDULING_ARCHITECTURE.md` - Design spec

## 🎓 Key Concepts

**Global Schedules**: One schedule per (platform × interval), shared by all teams

**Batching**: Auto-split at 50 businesses (Google) / 30 (others)

**Custom Intervals**: Enterprise teams can request custom update frequencies

**Retry Queue**: Individual business failures isolated with exponential backoff

**Data Attribution**: Identifier → BusinessScheduleMapping → teamId → Reviews

## ⚡ Performance

- Schedule input rebuild: <10s
- Webhook processing: <5s
- Batch allocation: O(log n)
- Data attribution: O(1) lookup

## 🎉 Success Criteria

✅ All validation tests pass  
✅ Zero critical alerts  
✅ <5 businesses in retry queue  
✅ All schedules <80% capacity  
✅ Webhooks processing successfully  
✅ Reviews attributed correctly  

---

**Quick Links**:
- Full Docs: `README_GLOBAL_SCHEDULES.md`
- Deployment: `DEPLOYMENT_CHECKLIST.md`
- Status: `IMPLEMENTATION_STATUS.md`

