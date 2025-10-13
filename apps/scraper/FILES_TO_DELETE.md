# Files to Delete - Cleanup Guide

This document lists all old files that should be deleted as they're replaced by the new Apify-native scheduling system.

---

## 🗑️ **Safe to Delete Now**

### 1. Old Custom Memory-Aware Queue System
These files are 100% replaced by Apify's native scheduling:

```bash
# ALREADY DELETED ✅
apps/scraper/src/apifyService/actorManager.ts
apps/scraper/src/apifyService/reviewPollingService.ts
apps/scraper/src/services/FeatureAwareScheduler.ts
```

---

## ⚠️ **Review Before Deleting**

### 2. Instagram/TikTok Schedulers
**Status:** KEEP for now (they don't use Apify)

```bash
# These handle Instagram/TikTok which don't use Apify
# Review if these platforms still need custom scheduling
apps/scraper/src/services/instagramSchedulerService.ts
apps/scraper/src/services/tiktokSchedulerService.ts
```

**Action:** 
- If Instagram/TikTok are still active, KEEP these files
- If migrating to different solution, DELETE them
- Consider refactoring to match new architecture pattern

---

### 3. Old Actor Implementation Files
**Status:** Check if replaced by new `ApifyTaskService` and `ApifyScheduleService`

```bash
# Old actor wrappers - likely replaced by new services
apps/scraper/src/apifyService/actors/actor.ts
apps/scraper/src/apifyService/actors/bookingBusinessProfileActor.ts
apps/scraper/src/apifyService/actors/bookingBusinessReviewsActor.ts
apps/scraper/src/apifyService/actors/facebookBusinessReviewsActor.ts
apps/scraper/src/apifyService/actors/googleBusinessReviewsActor.ts
apps/scraper/src/apifyService/actors/googleBusinessReviewsBatchActor.ts
apps/scraper/src/apifyService/actors/tripAdvisorBusinessReviewsActor.ts
```

**How to Check:**
```bash
# Search for references to these files
grep -r "from.*apifyService/actors" apps/scraper/src/ --exclude-dir=node_modules

# If no results or only in old files, safe to delete
```

**Action:**
- If `ApifyTaskService` and `ApifyScheduleService` handle all actor calls → DELETE
- If still referenced in active code → KEEP for now, gradually migrate

---

### 4. Monolithic Business Service
**Status:** Deprecate but keep for backward compatibility during migration

```bash
# Large monolithic service - being replaced by SOLID architecture
apps/scraper/src/services/simpleBusinessService.ts
```

**Action:**
- KEEP for now (2313 lines - high risk to delete immediately)
- Mark as `@deprecated` in code
- Gradually migrate endpoints to new services
- Delete after all references removed

**Migration Strategy:**
```typescript
// Add at top of file
/**
 * @deprecated Use ModernBusinessService and specific platform services instead
 * This service will be removed in a future version
 */
export class SimpleBusinessService {
  // ... existing code
}
```

---

### 5. Migration Helper Files
**Status:** Delete after full migration complete

```bash
# Migration utilities - only needed during transition
apps/scraper/src/core/migration/ServiceMigration.ts
apps/scraper/src/core/migration/MigrationGuide.md
```

**Action:**
- KEEP until all services migrated to SOLID architecture
- DELETE once `simpleBusinessService.ts` is removed
- DELETE once all controllers use new services

---

### 6. Old Index File
**Status:** Check if still used

```bash
# Old entry point
apps/scraper/src/core/old-index.ts
```

**Action:**
- If not referenced anywhere → DELETE
- If still used by tests → KEEP until tests updated

---

## 📋 **Deletion Checklist**

### Phase 1: Immediate Cleanup (Safe)
- [ ] Verify `actorManager.ts` deleted ✅
- [ ] Verify `reviewPollingService.ts` deleted ✅
- [ ] Verify `FeatureAwareScheduler.ts` deleted ✅

### Phase 2: Review Old Actors (Week 1)
- [ ] Search for references to old actor files
- [ ] Test that new `ApifyTaskService` works for all platforms
- [ ] Delete old actor files if no references found
- [ ] Delete `apps/scraper/src/apifyService/` directory if empty

### Phase 3: Deprecate Monolithic Service (Week 2-4)
- [ ] Add `@deprecated` tag to `simpleBusinessService.ts`
- [ ] Find all imports of `SimpleBusinessService`
- [ ] Create migration tasks for each import
- [ ] Gradually replace with new services

### Phase 4: Final Cleanup (Month 2)
- [ ] Delete `simpleBusinessService.ts`
- [ ] Delete migration helper files
- [ ] Delete `old-index.ts`
- [ ] Delete Instagram/TikTok schedulers if not needed
- [ ] Clean up unused imports across codebase

---

## 🔍 **How to Find References**

### Search for old service imports:
```bash
# Find SimpleBusinessService usage
grep -r "SimpleBusinessService" apps/scraper/src/ --exclude-dir=node_modules

# Find old actor imports
grep -r "from.*apifyService/actors" apps/scraper/src/ --exclude-dir=node_modules

# Find FeatureAwareScheduler usage
grep -r "FeatureAwareScheduler" apps/scraper/src/ --exclude-dir=node_modules

# Find actorManager usage
grep -r "ActorManager\|actorManager" apps/scraper/src/ --exclude-dir=node_modules
```

### Check import counts:
```bash
# Count files importing each service
grep -r "SimpleBusinessService" apps/scraper/src/ --exclude-dir=node_modules | wc -l
grep -r "ApifyTaskService" apps/scraper/src/ --exclude-dir=node_modules | wc -l
grep -r "ApifyScheduleService" apps/scraper/src/ --exclude-dir=node_modules | wc -l
```

---

## ⚡ **Quick Delete Script**

**Create `cleanup.sh` for safe deletion:**

```bash
#!/bin/bash

echo "🧹 Starting cleanup of old files..."

# Phase 1: Delete files that are 100% replaced
echo "Phase 1: Checking for already deleted files..."
[ -f "apps/scraper/src/apifyService/actorManager.ts" ] && echo "❌ actorManager.ts still exists" || echo "✅ actorManager.ts deleted"
[ -f "apps/scraper/src/apifyService/reviewPollingService.ts" ] && echo "❌ reviewPollingService.ts still exists" || echo "✅ reviewPollingService.ts deleted"
[ -f "apps/scraper/src/services/FeatureAwareScheduler.ts" ] && echo "❌ FeatureAwareScheduler.ts still exists" || echo "✅ FeatureAwareScheduler.ts deleted"

# Phase 2: Check for references before deleting old actors
echo ""
echo "Phase 2: Checking old actor references..."
ACTOR_REFS=$(grep -r "from.*apifyService/actors" apps/scraper/src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
echo "Found $ACTOR_REFS references to old actor files"

if [ "$ACTOR_REFS" -eq "0" ]; then
  echo "✅ Safe to delete old actor files"
  # Uncomment to actually delete:
  # rm -rf apps/scraper/src/apifyService/actors/
else
  echo "⚠️  Still has references - review before deleting"
fi

# Phase 3: Check SimpleBusinessService usage
echo ""
echo "Phase 3: Checking SimpleBusinessService usage..."
SIMPLE_REFS=$(grep -r "SimpleBusinessService" apps/scraper/src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
echo "Found $SIMPLE_REFS references to SimpleBusinessService"

if [ "$SIMPLE_REFS" -eq "1" ]; then
  echo "✅ Only self-reference found - safe to delete after migration"
else
  echo "⚠️  Still has $SIMPLE_REFS references - keep for now"
fi

echo ""
echo "✨ Cleanup check complete!"
```

**Usage:**
```bash
chmod +x cleanup.sh
./cleanup.sh
```

---

## 📊 **Progress Tracking**

| File/Directory | Status | References | Action | ETA |
|----------------|--------|------------|--------|-----|
| `actorManager.ts` | ✅ Deleted | 0 | Done | - |
| `reviewPollingService.ts` | ✅ Deleted | 0 | Done | - |
| `FeatureAwareScheduler.ts` | ✅ Deleted | 0 | Done | - |
| `apifyService/actors/` | ⏳ Review | TBD | Check refs | Week 1 |
| `simpleBusinessService.ts` | ⚠️ Deprecate | Many | Gradual migration | Week 2-4 |
| `instagramSchedulerService.ts` | ⚠️ Keep | Active | Keep if needed | TBD |
| `tiktokSchedulerService.ts` | ⚠️ Keep | Active | Keep if needed | TBD |
| `core/migration/` | ⏳ Keep | 0 | Delete after migration | Month 2 |
| `core/old-index.ts` | ⏳ Review | TBD | Delete if unused | Week 1 |

---

## 🎯 **Success Metrics**

**You've successfully cleaned up when:**

- ✅ No references to `actorManager` or `reviewPollingService`
- ✅ No references to `FeatureAwareScheduler`
- ✅ All Apify calls go through `ApifyTaskService` or `ApifyScheduleService`
- ✅ `simpleBusinessService.ts` has `@deprecated` tag
- ✅ Migration path documented for all old service usage
- ✅ Codebase LOC reduced by 20-30%
- ✅ All tests passing with new services

---

## 📝 **Notes**

**Don't delete these (they're still needed):**
- ✅ `ApifyDataSyncService.ts` - Still used for data syncing
- ✅ `FeatureFlagService.ts` - Still used for feature checks
- ✅ `FeatureExtractor.ts` - Still used for subscription features
- ✅ `ReviewDataProcessor.ts` - Core processing service
- ✅ `*AnalyticsService.ts` files - Analytics still needed
- ✅ All `core/` services and repositories - SOLID architecture

**Be careful with:**
- ⚠️ Any file imported in `server.ts` or `index.ts`
- ⚠️ Any file used in API controllers
- ⚠️ Any file referenced in tests

---

**Last Updated:** 2025-10-07  
**Next Review:** After Week 1 of production use

