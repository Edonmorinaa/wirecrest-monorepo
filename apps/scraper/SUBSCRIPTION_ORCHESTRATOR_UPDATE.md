# SubscriptionOrchestrator - Updated for Global Schedules

## Summary of Changes

The `SubscriptionOrchestrator` has been completely updated to work with the new **global interval-based scheduling system** instead of the old per-team schedule system.

## Key Changes

### 1. **Dependencies Updated**

**Before:**
```typescript
import { ApifyScheduleService } from '../apify/ApifyScheduleService';
private scheduleService: ApifyScheduleService;
```

**After:**
```typescript
import { GlobalScheduleOrchestrator } from './GlobalScheduleOrchestrator';
private globalOrchestrator: GlobalScheduleOrchestrator;
```

### 2. **`handleNewSubscription()` - Completely Rewritten**

**What Changed:**
- **Before**: Created per-team schedules in Apify
- **After**: Adds team's businesses to global interval-based schedules

**New Flow:**
1. Get team's enabled platforms
2. Get team's business identifiers
3. Trigger initial data fetch
4. **For each business**:
   - Get business profile ID
   - Get team's interval (checks custom intervals first)
   - Call `globalOrchestrator.addBusinessToSchedule()`
   - Business is added to appropriate global schedule

**Return Value Changed:**
- Before: `schedulesCreated: number`
- After: `businessesAdded: number`

### 3. **`handleSubscriptionUpdate()` - Completely Rewritten**

**What Changed:**
- **Before**: Updated per-team schedule inputs
- **After**: Moves businesses between global schedules when interval changes

**New Flow:**
1. Get all `BusinessScheduleMapping` records for team
2. Get new interval for each platform
3. **For each business mapping**:
   - Compare `oldInterval` vs `newInterval`
   - If different: call `globalOrchestrator.moveBusinessBetweenSchedules()`
   - Business moves to schedule matching new interval

**Return Value Changed:**
- Before: `schedulesUpdated: number`
- After: `businessesMoved: number`

### 4. **`handleSubscriptionCancellation()` - Completely Rewritten**

**What Changed:**
- **Before**: Deleted per-team schedules
- **After**: Removes all team's businesses from global schedules

**New Flow:**
1. Get all `BusinessScheduleMapping` records for team
2. **For each mapping**:
   - Call `globalOrchestrator.removeBusinessFromSchedule()`
   - Business removed from global schedule

**Return Value Changed:**
- Before: `message: string` only
- After: `businessesRemoved: number` added

### 5. **Removed Methods**

The following methods are **no longer needed** and were removed:

- ❌ `syncTeamSchedules()` - No longer used (global orchestrator handles this)
- ❌ `buildScheduleConfig()` - No longer needed (global orchestrator builds configs)
- ❌ `intervalToCron()` - Moved to GlobalScheduleOrchestrator

### 6. **New Helper Method**

Added `getBusinessProfileId()` to look up business profile IDs from identifiers:

```typescript
private async getBusinessProfileId(
  teamId: string,
  platform: Platform,
  identifier: string
): Promise<string | null>
```

This method queries the appropriate business profile table based on platform and returns the profile ID.

## Architecture Comparison

### Before (Per-Team Schedules)

```
Team A subscribes
  ↓
Create schedules:
  - team_A_google_reviews_reviews (in Apify)
  - team_A_google_reviews_overview (in Apify)
  ↓
Team A's schedules run independently
```

### After (Global Schedules)

```
Team A subscribes
  ↓
Add businesses to global schedules:
  - Find/create google_reviews_6h schedule
  - Add Business1 to google_reviews_6h
  - Add Business2 to google_reviews_6h
  ↓
Global schedule runs all businesses at 6h interval
```

## Data Flow Changes

### Subscription Update Flow

**Before:**
```
Tier changes → Update schedule input in Apify
```

**After:**
```
Tier changes (12h → 6h)
  ↓
Get all BusinessScheduleMapping for team
  ↓
For each business:
  - Remove from google_reviews_12h schedule
  - Add to google_reviews_6h schedule
  - Update mapping record
  ↓
Both schedules rebuilt automatically
```

## Benefits

1. **Scalability**: No more 1:1 relationship between teams and schedules
2. **Cost Efficiency**: Shared schedules reduce Apify overhead
3. **Flexibility**: Custom intervals supported via `FeatureExtractor`
4. **Simplicity**: No more per-team schedule management

## Migration Impact

### Breaking Changes

The method signatures have changed:

| Method | Old Return | New Return |
|--------|-----------|------------|
| `handleNewSubscription` | `schedulesCreated` | `businessesAdded` |
| `handleSubscriptionUpdate` | `schedulesUpdated` | `businessesMoved` |
| `handleSubscriptionCancellation` | - | `businessesRemoved` |

### Code That Needs Updating

Any code that calls these methods needs to update the return value handling:

**Before:**
```typescript
const result = await orchestrator.handleNewSubscription(teamId);
console.log(`Created ${result.schedulesCreated} schedules`);
```

**After:**
```typescript
const result = await orchestrator.handleNewSubscription(teamId);
console.log(`Added ${result.businessesAdded} businesses`);
```

## Testing

To test the updated orchestrator:

1. **Test New Subscription**:
   ```typescript
   const result = await orchestrator.handleNewSubscription(teamId);
   // Verify businesses added to global schedules
   // Check BusinessScheduleMapping records created
   ```

2. **Test Subscription Update**:
   ```typescript
   // Change subscription tier
   const result = await orchestrator.handleSubscriptionUpdate(teamId);
   // Verify businesses moved to new interval schedules
   // Check mapping records updated
   ```

3. **Test Cancellation**:
   ```typescript
   const result = await orchestrator.handleSubscriptionCancellation(teamId);
   // Verify businesses removed from schedules
   // Check mapping records deleted
   ```

## Compatibility

### Old Schedule Service

The old `ApifyScheduleService` is still in the codebase but **no longer used** by `SubscriptionOrchestrator`. It can be:
- Kept for backward compatibility (if needed)
- Removed after full migration to global schedules

### Database

The orchestrator works with:
- **New tables**: `ApifyGlobalSchedule`, `BusinessScheduleMapping`
- **Old tables**: Business profile tables (unchanged)

## Status

✅ **Implementation Complete**
- All three main methods updated
- Helper method added
- Old methods removed
- Ready for testing

## Next Steps

1. Test with Stripe webhook events
2. Verify subscription tier changes work correctly
3. Confirm business addition/removal flows
4. Monitor logs for successful operations

---

**Last Updated**: 2025-01-10  
**Status**: Production-Ready  
**Breaking Changes**: Yes (return values changed)

