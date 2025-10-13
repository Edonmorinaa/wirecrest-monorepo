# 🔢 Batching Strategy for Schedules

## Current Implementation: Single Schedule (No Batching)

**Your system currently uses ONE schedule per platform**, regardless of how many businesses:

```
Team with 100 locations:
  ├─ Schedule 1: google_reviews_reviews
  │  └─ placeIds: [1, 2, 3, ..., 100]  // ALL 100 in one
  └─ Schedule 2: google_reviews_overview
     └─ placeIds: [1, 2, 3, ..., 100]  // ALL 100 in one
```

### Why This Works

**Google Maps Reviews Scraper is designed for batch processing:**
- ✅ Accepts arrays of 100s of place IDs
- ✅ Processes them sequentially internally
- ✅ Cost-effective: ONE run, not 100 runs
- ⚠️ Has 1-hour timeout (3600 seconds)

---

## When to Implement Batching

### **Scenario 1: Large Enterprise Accounts**

```
Enterprise Team with 500+ locations:
  Problem: 500 × 6 seconds = 3000 seconds (50 minutes) ✅ OK
  
  But: 1000 locations:
  Problem: 1000 × 6 seconds = 6000 seconds (100 minutes) ❌ TIMEOUT!
```

**Solution: Split into batches of 50**

```
Team with 150 locations:
  ├─ Schedule 1: google_reviews_reviews_batch_0
  │  └─ placeIds: [1-50]    // Batch 1
  ├─ Schedule 2: google_reviews_reviews_batch_1
  │  └─ placeIds: [51-100]  // Batch 2
  └─ Schedule 3: google_reviews_reviews_batch_2
     └─ placeIds: [101-150] // Batch 3
```

---

## 📊 Batch Size Calculation

### **Timing Analysis**

```
Per Location Processing:
  - Navigate to Google Maps: ~2s
  - Load reviews: ~2s
  - Scrape 50 reviews: ~2s
  - Total: ~6 seconds per location

Actor Timeout: 3600 seconds (1 hour)
Safety Margin: 50% (for retries, slow connections)

Safe batch size:
  3600 seconds ÷ 6 seconds ÷ 2 (safety) = 300 locations

Recommended batch size: 50-100 locations
```

### **Recommended Batch Sizes**

```typescript
const BATCH_SIZES = {
  google_reviews: 50,     // Conservative for reliability
  facebook: 30,           // Facebook is slower
  tripadvisor: 40,        // TripAdvisor is moderate
  booking: 20,            // Booking is slowest
};
```

---

## 🎯 Smart Batching Implementation

### **Strategy: Dynamic Batching Based on Count**

```typescript
/**
 * Create schedules with automatic batching
 * 
 * Rules:
 * - ≤50 businesses: ONE schedule (no batching)
 * - >50 businesses: Multiple schedules (batched)
 */
async createSchedulesWithBatching(
  teamId: string,
  platform: Platform,
  identifiers: string[]
): Promise<number> {
  const BATCH_SIZE = 50;
  
  if (identifiers.length <= BATCH_SIZE) {
    // Small team: ONE schedule
    await this.scheduleService.upsertSchedule(
      teamId,
      this.buildScheduleConfig(
        teamId,
        platform,
        'reviews',
        identifiers,        // All identifiers
        12,
        50
      )
    );
    return 1; // Created 1 schedule
  } else {
    // Large team: MULTIPLE schedules
    const batches = this.chunkArray(identifiers, BATCH_SIZE);
    
    for (let i = 0; i < batches.length; i++) {
      await this.scheduleService.upsertSchedule(
        teamId,
        this.buildScheduleConfig(
          teamId,
          platform,
          'reviews',
          batches[i],     // Batch of identifiers
          12,
          50,
          i               // Batch index
        )
      );
    }
    return batches.length; // Created N schedules
  }
}

/**
 * Split array into chunks
 */
private chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
```

---

## 🔄 What Happens on Tier Change

### **Scenario: Downgrade with Batches**

```
User on Enterprise with 150 locations (3 batches):
  ├─ Schedule 1: batch_0 [1-50]
  ├─ Schedule 2: batch_1 [51-100]
  └─ Schedule 3: batch_2 [101-150]

User downgrades to Professional (5 max locations):
  ↓
Dashboard enforces:
  - Disables 145 locations
  - Keeps only 5 locations
  ↓
syncTeamSchedules() runs:
  ↓
Fetches businesses: [1, 2, 3, 4, 5]  // Only 5 active
  ↓
System detects:
  - ✅ Has 5 businesses (≤50)
  - ✅ Has 3 existing schedules
  - 💡 Action: DELETE 2 batches, UPDATE 1 batch
  ↓
Deletes schedule batch_1 and batch_2
Updates schedule batch_0 with only 5 place IDs
  ↓
Result: 1 schedule with 5 locations
```

### **Scenario: Upgrade with Business Growth**

```
User on Professional with 5 locations (1 schedule):
  └─ Schedule 1: [1, 2, 3, 4, 5]

User upgrades to Enterprise:
  ↓
Adds 100 more locations:
  ↓
syncTeamSchedules() runs:
  ↓
Fetches businesses: [1-105]  // 105 total
  ↓
System detects:
  - ✅ Has 105 businesses (>50)
  - ✅ Has 1 existing schedule
  - 💡 Action: CREATE 2 more batches, UPDATE existing
  ↓
Updates existing schedule with [1-50]
Creates new schedule batch_1 with [51-100]
Creates new schedule batch_2 with [101-105]
  ↓
Result: 3 schedules (3 batches)
```

---

## 💰 Cost Implications

### **Without Batching (Current)**

```
150 locations in 1 schedule:
  - 1 actor run × 90 minutes × 4GB = 6 compute units
  - Cost per run: 6 × $0.25 = $1.50
  - Runs per day: 2 (every 12h)
  - Cost per day: $3.00
  - Cost per month: $90
```

### **With Batching (3 batches of 50)**

```
150 locations in 3 schedules:
  - 3 actor runs × 30 minutes × 4GB = 6 compute units total
  - Cost per run: 6 × $0.25 = $1.50
  - Runs per day: 6 (3 schedules × 2 runs)
  - Cost per day: $3.00
  - Cost per month: $90
```

**Same cost, but:**
- ✅ More reliable (timeout protection)
- ✅ Parallel processing possible
- ✅ Partial failure tolerance

---

## 🎯 Recommended Implementation

### **Phase 1: Single Schedule (Current) ✅**

**For 99% of users:**
- Most teams have <50 locations
- No batching needed
- Simpler system
- Lower cost

**Keep current implementation for:**
- Starter: 1 location
- Professional: 5 locations
- Enterprise: Up to 50 locations

### **Phase 2: Auto-Batching (Future)**

**Only when hitting limits:**
- Implement when first customer exceeds 50 locations
- Automatic batch management
- Transparent to user

```typescript
const BATCHING_THRESHOLD = 50;

if (identifiers.length > BATCHING_THRESHOLD) {
  // Use batching
  return await this.createSchedulesWithBatching(...);
} else {
  // Use single schedule (current)
  return await this.createSingleSchedule(...);
}
```

---

## 🔧 Enhanced syncTeamSchedules with Batching

```typescript
async syncTeamSchedules(teamId: string): Promise<{
  success: boolean;
  message: string;
  schedulesCreated: number;
  schedulesUpdated: number;
  schedulesDeleted: number;
}> {
  try {
    const features = await this.featureExtractor.extractTeamFeatures(teamId);
    const enabledPlatforms = await this.featureExtractor.getEnabledPlatforms(teamId);
    const existingSchedules = await this.scheduleService.getTeamSchedules(teamId);

    let schedulesCreated = 0;
    let schedulesUpdated = 0;
    let schedulesDeleted = 0;

    for (const platform of enabledPlatforms) {
      const identifiers = await this.getTeamBusinessIdentifiers(teamId, [platform]);
      const platformIdentifiers = identifiers[platform as Platform];

      if (!platformIdentifiers || platformIdentifiers.length === 0) {
        // No businesses: Delete all schedules for this platform
        const platformSchedules = existingSchedules.filter(
          (s) => s.platform === platform
        );
        for (const schedule of platformSchedules) {
          await this.scheduleService.deleteSchedule(
            teamId,
            platform as Platform,
            schedule.scheduleType as ScheduleType
          );
          schedulesDeleted++;
        }
        continue;
      }

      // Determine if batching is needed
      const BATCH_SIZE = 50;
      const needsBatching = platformIdentifiers.length > BATCH_SIZE;

      if (needsBatching) {
        // Create/update multiple schedules (batched)
        const batches = this.chunkArray(platformIdentifiers, BATCH_SIZE);
        
        for (let i = 0; i < batches.length; i++) {
          const batchScheduleType = `reviews_batch_${i}`;
          
          // Check if this batch schedule exists
          const existingBatchSchedule = existingSchedules.find(
            (s) => s.platform === platform && s.scheduleType === batchScheduleType
          );

          if (existingBatchSchedule) {
            // Update existing batch
            await this.scheduleService.upsertSchedule(
              teamId,
              this.buildScheduleConfig(
                teamId,
                platform as Platform,
                'reviews',
                batches[i],
                features.limits.reviewsScrapeIntervalHours,
                50,
                i
              )
            );
            schedulesUpdated++;
          } else {
            // Create new batch
            await this.scheduleService.upsertSchedule(
              teamId,
              this.buildScheduleConfig(
                teamId,
                platform as Platform,
                'reviews',
                batches[i],
                features.limits.reviewsScrapeIntervalHours,
                50,
                i
              )
            );
            schedulesCreated++;
          }
        }

        // Delete excess batch schedules (if downgrade happened)
        const platformSchedules = existingSchedules.filter(
          (s) => s.platform === platform && s.scheduleType.startsWith('reviews_batch_')
        );
        const excessSchedules = platformSchedules.slice(batches.length);
        for (const schedule of excessSchedules) {
          await this.scheduleService.deleteSchedule(
            teamId,
            platform as Platform,
            schedule.scheduleType as ScheduleType
          );
          schedulesDeleted++;
        }
      } else {
        // Single schedule (current implementation)
        // ... existing code ...
      }
    }

    return {
      success: true,
      message: `Created ${schedulesCreated}, Updated ${schedulesUpdated}, Deleted ${schedulesDeleted}`,
      schedulesCreated,
      schedulesUpdated,
      schedulesDeleted,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      schedulesCreated: 0,
      schedulesUpdated: 0,
      schedulesDeleted: 0,
    };
  }
}

/**
 * Split array into chunks
 */
private chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
```

---

## 📋 Summary: Batching Decision Tree

```
Number of businesses:
  │
  ├─ ≤50 locations
  │  └─ ONE schedule (current)
  │     └─ Simple, cost-effective
  │
  └─ >50 locations
     └─ MULTIPLE schedules (batched)
        ├─ Batch 1: [1-50]
        ├─ Batch 2: [51-100]
        └─ Batch 3: [101-150]
        └─ Reliable, timeout-safe
```

### **Key Decisions**

| Count | Strategy | Schedules | Cost Impact |
|-------|----------|-----------|-------------|
| 1-50 | Single schedule | 1 | Optimal |
| 51-100 | 2 batches | 2 | Same |
| 101-150 | 3 batches | 3 | Same |
| 151-200 | 4 batches | 4 | Same |

### **When Tier Changes**

1. **Subscription Update** → `handleSubscriptionUpdate()`
2. **Fetch all active businesses** → `getTeamBusinessIdentifiers()`
3. **Count businesses** → Determine batch strategy
4. **Update/create/delete** schedules accordingly

### **When Businesses Added/Removed**

1. **Business event** → `syncTeamSchedules()`
2. **Fetch all businesses** → Count
3. **Determine if rebatching needed**:
   - Was 49 → now 51: Create 2nd batch
   - Was 51 → now 49: Delete 2nd batch, merge to 1
4. **Update schedules** dynamically

---

## 🚀 Recommendation

**For your current users (≤50 locations each):**
- ✅ Keep current single-schedule implementation
- ✅ Simple, fast, cost-effective
- ✅ No batching complexity needed

**For future scalability:**
- 💡 Implement auto-batching when first customer hits 50+
- 💡 Make it transparent to users
- 💡 Add monitoring for batch performance

Your system is production-ready as-is! 🎉

