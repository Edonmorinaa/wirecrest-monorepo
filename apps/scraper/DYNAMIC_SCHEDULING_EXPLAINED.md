# 🔄 Fully Dynamic Scheduling System

## Overview

Your scheduling system is **100% dynamic** and adapts to user actions in real-time. No manual intervention needed!

---

## 🎯 Key Concept: ONE Schedule, Multiple Businesses

### The Rule

**One schedule per platform per team** - but it can handle **unlimited businesses**!

```
Team "Restaurant Chain":
  ├─ Google Reviews Schedule (ONE) 
  │  └─ Handles: Location 1, 2, 3, 4, 5... (unlimited)
  ├─ Facebook Schedule (ONE)
  │  └─ Handles: Page 1, 2, 3... (unlimited)
  └─ TripAdvisor Schedule (ONE)
     └─ Handles: Location 1, 2, 3... (unlimited)
```

---

## 📊 How It Works: Complete Flow

### **Scenario 1: User Subscribes (No Businesses Yet)**

```
User subscribes to Professional tier
↓
Stripe → Webhook → Your Scraper
↓
System checks for businesses:
  - Google Reviews: ❌ No Place IDs found
  - Facebook: ❌ No Pages found
  - TripAdvisor: ❌ No URLs found
  - Booking: ❌ No URLs found
↓
Result: ✅ Subscription active, 🚫 0 schedules created (nothing to scrape!)
```

**Console Output:**
```
🔄 Handling subscription.created: sub_123
⚠️  No business identifiers found for platform: google_reviews
⚠️  No business identifiers found for platform: facebook
✅ Subscription setup result: {
  success: true,
  message: "Successfully started 0 initial tasks and created 0 schedules",
  initialTasksStarted: 0,
  schedulesCreated: 0
}
```

---

### **Scenario 2: User Adds First Business**

```
User adds first Google Business location
↓
Dashboard saves to database:
  GoogleBusinessProfile {
    teamId: "team_123",
    placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    ...
  }
↓
Dashboard calls: POST /api/business/added
{
  teamId: "team_123",
  platform: "google_reviews",
  identifier: "ChIJN1t_tDeuEmsRUsoyG83frY4"
}
↓
Scraper calls: syncTeamSchedules(teamId)
↓
System detects:
  - ✅ Has 1 business
  - ❌ No existing schedule
  - 💡 Action: CREATE schedule
↓
Creates schedule in Apify:
{
  name: "team_123_google_reviews_reviews",
  cronExpression: "0 */12 * * *",
  actions: [{
    actorId: "Xb8osYTtOjlsgI6k9",
    runInput: {
      placeIds: ["ChIJN1t_tDeuEmsRUsoyG83frY4"], // ← Just 1
      maxReviews: 50,
      reviewsSort: 'newest'
    }
  }]
}
↓
Saves to database:
  ApifySchedule {
    teamId: "team_123",
    platform: "google_reviews",
    scheduleType: "reviews",
    apifyScheduleId: "apify_sched_abc123",
    intervalHours: 12,
    isActive: true
  }
↓
Result: ✅ 2 schedules created (reviews + overview)
```

**Console Output:**
```
🔄 Syncing schedules for team team_123
  ➕ Creating google_reviews schedules for 1 business(es)
✅ Schedule sync complete: Created 2
```

---

### **Scenario 3: User Adds 2nd & 3rd Business**

```
User adds 2nd location (Downtown)
↓
Dashboard: POST /api/business/added
↓
Scraper: syncTeamSchedules(teamId)
↓
System fetches ALL businesses:
  placeIds: [
    "ChIJN1t_tDeuEmsRUsoyG83frY4",  // Location 1 (existing)
    "ChIJP5iLHsOuEmsRQutdeuY3Z"     // Location 2 (new!)
  ]
↓
System detects:
  - ✅ Has 2 businesses
  - ✅ Has existing schedule
  - 💡 Action: UPDATE schedule (not create new one!)
↓
Updates existing schedule in Apify:
{
  name: "team_123_google_reviews_reviews",  // Same schedule!
  actions: [{
    runInput: {
      placeIds: [
        "ChIJN1t_tDeuEmsRUsoyG83frY4",  // ← Both locations
        "ChIJP5iLHsOuEmsRQutdeuY3Z"
      ],
      maxReviews: 50
    }
  }]
}
↓
Result: ✅ 2 schedules updated (reviews + overview)
```

**Console Output:**
```
🔄 Syncing schedules for team team_123
  ✏️  Updating google_reviews schedules with 2 business(es)
✅ Schedule sync complete: Updated 2
```

**Same for 3rd location:**
```
User adds 3rd location (Airport)
↓
placeIds: ["ChIJN1t...", "ChIJP5i...", "ChIJK9m..."]  // ← 3 locations
↓
✅ Schedule updated (still just ONE schedule)
```

---

### **Scenario 4: User Removes a Business**

```
User removes 2nd location (Downtown)
↓
Dashboard deletes from database
↓
Dashboard: POST /api/business/removed
{
  teamId: "team_123",
  platform: "google_reviews",
  identifier: "ChIJP5iLHsOuEmsRQutdeuY3Z"
}
↓
Scraper: syncTeamSchedules(teamId)
↓
System fetches remaining businesses:
  placeIds: [
    "ChIJN1t_tDeuEmsRUsoyG83frY4",  // Location 1 (still there)
    "ChIJK9mH7POuEmsRLxYzQ8k2P"     // Location 3 (still there)
  ]
↓
System detects:
  - ✅ Has 2 businesses (down from 3)
  - ✅ Has existing schedule
  - 💡 Action: UPDATE schedule (remove deleted location)
↓
Updates schedule:
{
  runInput: {
    placeIds: [
      "ChIJN1t_tDeuEmsRUsoyG83frY4",  // ← Only 2 now
      "ChIJK9mH7POuEmsRLxYzQ8k2P"
    ]
  }
}
↓
Result: ✅ Schedule updated, deleted location excluded
```

**Console Output:**
```
🔄 Syncing schedules for team team_123
  ✏️  Updating google_reviews schedules with 2 business(es)
✅ Schedule sync complete: Updated 2
```

---

### **Scenario 5: User Removes ALL Businesses**

```
User removes last business location
↓
Dashboard deletes from database
↓
Scraper: syncTeamSchedules(teamId)
↓
System fetches businesses:
  placeIds: []  // ← Empty!
↓
System detects:
  - ❌ No businesses
  - ✅ Has existing schedule
  - 💡 Action: DELETE schedule (no point in running it!)
↓
Deletes schedule from Apify
Deletes from database
↓
Result: ✅ 2 schedules deleted (reviews + overview)
```

**Console Output:**
```
🔄 Syncing schedules for team team_123
  🗑️  Deleting google_reviews schedules (no businesses)
✅ Schedule sync complete: Deleted 2
```

---

### **Scenario 6: User Adds Business After Deletion**

```
User adds a new business (after having 0)
↓
Scraper: syncTeamSchedules(teamId)
↓
System detects:
  - ✅ Has 1 business
  - ❌ No existing schedule (was deleted)
  - 💡 Action: CREATE schedule (fresh start!)
↓
Creates new schedule
↓
Result: ✅ 2 schedules created
```

**This is the beauty of fully dynamic!** The system adapts to ANY scenario.

---

## 🎬 What Happens When Schedule Runs

### With Multiple Businesses

```
Schedule triggers every 12 hours
↓
Apify receives:
{
  placeIds: [
    "ChIJN1t_tDeuEmsRUsoyG83frY4",  // Location 1
    "ChIJP5iLHsOuEmsRQutdeuY3Z",    // Location 2
    "ChIJK9mH7POuEmsRLxYzQ8k2P"     // Location 3
  ],
  maxReviews: 50  // Per location
}
↓
Actor processes each location sequentially:

Actor: "Processing location 1/3..."
Actor: "Found 1,234 reviews → Fetching newest 50"
Actor: "Saved 50 reviews to dataset"

Actor: "Processing location 2/3..."
Actor: "Found 856 reviews → Fetching newest 50"
Actor: "Saved 50 reviews to dataset"

Actor: "Processing location 3/3..."
Actor: "Found 2,103 reviews → Fetching newest 50"
Actor: "Saved 50 reviews to dataset"
↓
Actor: "Total: 150 reviews (50 × 3 locations)"
Actor: "Saving to dataset_abc123"
↓
Webhook → Your Server
POST /webhooks/apify?token=secret
{
  "datasetId": "dataset_abc123",
  "status": "SUCCEEDED"
}
↓
Your server:
- Fetches 150 reviews from dataset
- Deduplicates (45 new, 105 duplicates)
- Saves 45 new reviews to database
↓
Result: ✅ Dashboard shows new reviews!
```

---

## 💰 Batching & Cost Optimization

### Why One Schedule is Better

#### **BAD: Separate Schedules**
```
3 locations = 3 schedules

Schedule 1: Run actor for Location 1 → 1 compute unit
Schedule 2: Run actor for Location 2 → 1 compute unit
Schedule 3: Run actor for Location 3 → 1 compute unit

Cost per run: 3 compute units × $0.25 = $0.75
Cost per day (2 runs): $1.50
Cost per month: $45 🔥💸
```

#### **GOOD: One Batched Schedule**
```
3 locations = 1 schedule

Schedule 1: Run actor for ALL 3 locations → 1 compute unit

Cost per run: 1 compute unit × $0.25 = $0.25
Cost per day (2 runs): $0.50
Cost per month: $15 ✅💰

Savings: 67%! 🎉
```

### Batching Limits

**Google Maps Reviews Scraper:**
- ✅ Optimized for batch processing
- ✅ No practical limit on `placeIds` array
- ✅ Processes all locations in ONE run
- ✅ Cost scales with reviews, not locations

**Example:**
```typescript
// 100 locations in ONE schedule:
{
  placeIds: [
    "ChIJN1t...",  // Location 1
    "ChIJP5i...",  // Location 2
    // ... 98 more
  ],
  maxReviews: 50  // Per location
}

// Actor processes all 100 sequentially
// Cost: ~5 compute units (still cheaper than 100 separate runs!)
```

---

## 🔄 Dynamic Logic: The Key Decision Tree

```typescript
async syncTeamSchedules(teamId: string) {
  for each platform {
    businesses = fetchBusinesses(teamId, platform)
    hasBusinesses = businesses.length > 0
    hasSchedule = scheduleExists(teamId, platform)

    if (hasBusinesses && !hasSchedule) {
      // Case 1: First business added
      → CREATE schedule
    }
    else if (hasBusinesses && hasSchedule) {
      // Case 2: Add/remove businesses
      → UPDATE schedule with new list
    }
    else if (!hasBusinesses && hasSchedule) {
      // Case 3: Last business removed
      → DELETE schedule
    }
    else if (!hasBusinesses && !hasSchedule) {
      // Case 4: No businesses, no schedule
      → DO NOTHING
    }
  }
}
```

---

## 🎯 Subscription Tier Integration

### How Tier Affects Scheduling

```typescript
Starter Tier:
  - maxBusinessLocations: 1
  - reviewsScrapeIntervalHours: 24
  - Schedule: ONE business, runs daily

Professional Tier:
  - maxBusinessLocations: 5
  - reviewsScrapeIntervalHours: 12
  - Schedule: UP TO 5 businesses, runs every 12h

Enterprise Tier:
  - maxBusinessLocations: 999
  - reviewsScrapeIntervalHours: 6
  - Schedule: UNLIMITED businesses, runs every 6h
```

### What Happens on Upgrade

```
User on Starter (1 business, daily)
↓
Upgrades to Professional
↓
Stripe → Webhook → customer.subscription.updated
↓
Scraper: handleSubscriptionUpdate(teamId)
↓
System updates:
  - Fetches new tier limits (5 locations, 12h)
  - Updates cronExpression: "0 0 * * *" → "0 */12 * * *"
  - maxReviewsPerRun: 50 (unchanged)
↓
Existing schedule updated:
{
  cronExpression: "0 */12 * * *",  // ← More frequent!
  runInput: {
    placeIds: ["ChIJN1t..."],  // Still just 1 business
    maxReviews: 50
  }
}
↓
User can now add up to 4 more businesses
Each addition updates the same schedule
```

### What Happens on Downgrade

```
User on Professional (5 businesses, 12h)
↓
Downgrades to Starter
↓
Dashboard enforces:
  - Disables 4 businesses (keeps only 1)
  - Updates database
↓
Scraper: handleSubscriptionUpdate(teamId)
↓
System updates:
  - Fetches new tier limits (1 location, 24h)
  - Updates cronExpression: "0 */12 * * *" → "0 0 * * *"
  - Fetches businesses (only 1 active)
↓
Schedule updated:
{
  cronExpression: "0 0 * * *",  // ← Less frequent
  runInput: {
    placeIds: ["ChIJN1t..."],  // Only 1 business
    maxReviews: 50
  }
}
```

---

## 📋 Summary: The Full System

### Core Principles

1. **One Schedule Per Platform** - Not per business
2. **Dynamic Updates** - Add/remove/update automatically
3. **Tier-Driven** - Intervals based on subscription
4. **Auto-Cleanup** - Deletes schedule when no businesses
5. **Cost-Optimized** - Batch processing saves money

### Trigger Points

| Event | Trigger | Action |
|-------|---------|--------|
| **User subscribes** | Stripe webhook | Create schedules if businesses exist |
| **User adds first business** | Dashboard API call | CREATE schedule |
| **User adds more businesses** | Dashboard API call | UPDATE schedule (append to list) |
| **User removes business** | Dashboard API call | UPDATE schedule (remove from list) |
| **User removes last business** | Dashboard API call | DELETE schedule |
| **User upgrades tier** | Stripe webhook | UPDATE intervals (more frequent) |
| **User downgrades tier** | Stripe webhook | UPDATE intervals (less frequent) |
| **User cancels subscription** | Stripe webhook | DELETE all schedules |

### State Machine

```
NO_SCHEDULE
  ↓ (add first business)
SCHEDULE_ACTIVE
  ↓ (add/remove businesses)
SCHEDULE_ACTIVE (updated inputs)
  ↓ (remove last business)
NO_SCHEDULE
```

---

## 🚀 Result: Zero Manual Intervention

**Everything is automatic:**
- ✅ Schedules created when needed
- ✅ Schedules updated when businesses change
- ✅ Schedules deleted when empty
- ✅ Intervals adjusted on tier change
- ✅ All triggered by user actions
- ✅ No admin panel needed
- ✅ No cron server to maintain

**This is production-ready!** 🎉

