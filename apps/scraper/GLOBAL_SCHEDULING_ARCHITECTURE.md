# 🌍 Global Scheduling Architecture

## Concept: Interval-Based Global Schedules

Instead of creating schedules per team, create **global schedules** organized by **update interval**. All businesses across all teams share these schedules based on their subscription tier.

---

## 🎯 Core Principle

```
ONE schedule per (platform × interval) combination
Each schedule processes ALL businesses needing that interval
```

### Example Structure

```
Platform: Google Reviews
  ├─ Schedule: "google_reviews_6h"     → All Enterprise businesses
  ├─ Schedule: "google_reviews_12h"    → All Professional businesses
  ├─ Schedule: "google_reviews_24h"    → All Starter businesses
  └─ Schedule: "google_reviews_72h"    → All Free/paused businesses

Platform: Facebook
  ├─ Schedule: "facebook_6h"
  ├─ Schedule: "facebook_12h"
  └─ Schedule: "facebook_24h"

... and so on for each platform
```

---

## 📊 Database Schema

### **ApifySchedule Table (Global)**

```prisma
model ApifySchedule {
  id                String   @id @default(uuid())
  platform          String   // 'google_reviews', 'facebook', etc.
  scheduleType      String   // 'reviews' | 'overview'
  intervalHours     Int      // 6, 12, 24, 72
  apifyScheduleId   String   @unique
  apifyActorId      String
  cronExpression    String
  isActive          Boolean  @default(true)
  lastRunAt         DateTime?
  nextRunAt         DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  businessMappings  BusinessScheduleMapping[]
  
  // One schedule per platform + interval combo
  @@unique([platform, scheduleType, intervalHours])
  @@index([platform, intervalHours])
  @@index([isActive, nextRunAt])
}
```

### **BusinessScheduleMapping Table (Links businesses to schedules)**

```prisma
model BusinessScheduleMapping {
  id                String   @id @default(uuid())
  teamId            String   // Which team owns this business
  businessProfileId String   // Which business profile
  platform          String   // 'google_reviews', 'facebook', etc.
  scheduleId        String   // Which global schedule
  intervalHours     Int      // Current interval
  
  // Platform-specific identifiers
  placeId           String?  // For Google Reviews
  facebookUrl       String?  // For Facebook
  tripAdvisorUrl    String?  // For TripAdvisor
  bookingUrl        String?  // For Booking.com
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  team              Team     @relation(fields: [teamId], references: [id])
  schedule          ApifySchedule @relation(fields: [scheduleId], references: [id])
  
  @@unique([businessProfileId, platform])
  @@index([scheduleId])
  @@index([teamId, platform])
  @@index([platform, intervalHours])
}
```

---

## 🎬 How It Works

### **Initial Setup: Create Global Schedules**

```typescript
/**
 * Initialize global schedules for all platform + interval combinations
 * Run this ONCE when deploying the system
 */
async function initializeGlobalSchedules() {
  const platforms = ['google_reviews', 'facebook', 'tripadvisor', 'booking'];
  const intervals = [6, 12, 24, 72]; // hours
  const scheduleTypes = ['reviews', 'overview'];
  
  for (const platform of platforms) {
    for (const interval of intervals) {
      for (const scheduleType of scheduleTypes) {
        // Create global schedule in Apify
        const apifySchedule = await apifyClient.schedules().create({
          name: `${platform}_${scheduleType}_${interval}h`,
          cronExpression: intervalToCron(interval),
          isEnabled: true,
          actions: [{
            type: 'RUN_ACTOR',
            actorId: ACTOR_IDS[platform],
            runInput: {
              // Input will be dynamically populated
              placeIds: [],  // Empty initially
              maxReviews: 50
            }
          }]
        });
        
        // Save to database
        await prisma.apifySchedule.create({
          data: {
            platform,
            scheduleType,
            intervalHours: interval,
            apifyScheduleId: apifySchedule.id,
            apifyActorId: ACTOR_IDS[platform],
            cronExpression: intervalToCron(interval),
            isActive: false, // Activate when first business added
          }
        });
      }
    }
  }
}
```

---

### **When User Subscribes**

```typescript
/**
 * Handle new subscription
 * Adds team's businesses to appropriate global schedules
 */
async function handleNewSubscription(teamId: string) {
  // 1. Get team's subscription features
  const features = await getTeamFeatures(teamId);
  const interval = features.limits.reviewsScrapeIntervalHours; // e.g., 12
  
  // 2. Get team's businesses
  const businesses = await getTeamBusinesses(teamId);
  
  // 3. For each business, add to appropriate global schedule
  for (const business of businesses) {
    await addBusinessToSchedule(
      business.id,
      business.platform,
      business.identifier, // placeId, url, etc.
      interval
    );
  }
}

/**
 * Add business to global schedule
 */
async function addBusinessToSchedule(
  businessProfileId: string,
  platform: string,
  identifier: string,
  intervalHours: number
) {
  // 1. Find or create global schedule
  const schedule = await prisma.apifySchedule.findUnique({
    where: {
      platform_scheduleType_intervalHours: {
        platform,
        scheduleType: 'reviews',
        intervalHours
      }
    }
  });
  
  if (!schedule) {
    throw new Error(`Global schedule not found: ${platform}_${intervalHours}h`);
  }
  
  // 2. Create mapping
  await prisma.businessScheduleMapping.create({
    data: {
      businessProfileId,
      platform,
      scheduleId: schedule.id,
      intervalHours,
      placeId: platform === 'google_reviews' ? identifier : null,
      facebookUrl: platform === 'facebook' ? identifier : null,
      // ... etc
    }
  });
  
  // 3. Update schedule input with all businesses
  await updateScheduleInput(schedule.id);
  
  // 4. Activate schedule if this is first business
  if (!schedule.isActive) {
    await activateSchedule(schedule.id);
  }
}
```

---

### **When Schedule Needs to Run**

```typescript
/**
 * Before schedule runs, dynamically build input
 * This is called by a pre-run hook or cron job
 */
async function updateScheduleInput(scheduleId: string) {
  // 1. Get schedule
  const schedule = await prisma.apifySchedule.findUnique({
    where: { id: scheduleId },
    include: { businessMappings: true }
  });
  
  // 2. Collect all identifiers for this schedule
  const identifiers = schedule.businessMappings.map(mapping => {
    if (schedule.platform === 'google_reviews') {
      return mapping.placeId;
    } else if (schedule.platform === 'facebook') {
      return mapping.facebookUrl;
    }
    // ... etc
  }).filter(Boolean);
  
  // 3. Update Apify schedule input
  await apifyClient.schedule(schedule.apifyScheduleId).update({
    actions: [{
      type: 'RUN_ACTOR',
      actorId: schedule.apifyActorId,
      runInput: {
        placeIds: identifiers, // For Google
        // or startUrls: identifiers.map(url => ({ url })) // For others
        maxReviews: 50,
        reviewsSort: 'newest'
      }
    }]
  });
}
```

---

### **When Business Upgrades (Your Example)**

```typescript
/**
 * Handle subscription update
 * Moves businesses between global schedules
 */
async function handleSubscriptionUpdate(teamId: string) {
  // 1. Get new interval
  const features = await getTeamFeatures(teamId);
  const newInterval = features.limits.reviewsScrapeIntervalHours;
  
  // 2. Get all business mappings for this team
  const mappings = await prisma.businessScheduleMapping.findMany({
    where: { teamId },
    include: { schedule: true }
  });
  
  // 3. For each business, move to new schedule if interval changed
  for (const mapping of mappings) {
    const oldInterval = mapping.intervalHours;
    
    if (oldInterval !== newInterval) {
      // Move business to new schedule
      await moveBusinessToSchedule(
        mapping.id,
        mapping.platform,
        oldInterval,     // Remove from this interval
        newInterval      // Add to this interval
      );
    }
  }
}

/**
 * Move business from one schedule to another
 */
async function moveBusinessToSchedule(
  mappingId: string,
  platform: string,
  fromInterval: number,
  toInterval: number
) {
  // 1. Get current mapping
  const mapping = await prisma.businessScheduleMapping.findUnique({
    where: { id: mappingId }
  });
  
  // 2. Find new schedule
  const newSchedule = await prisma.apifySchedule.findUnique({
    where: {
      platform_scheduleType_intervalHours: {
        platform,
        scheduleType: 'reviews',
        intervalHours: toInterval
      }
    }
  });
  
  // 3. Update mapping
  await prisma.businessScheduleMapping.update({
    where: { id: mappingId },
    data: {
      scheduleId: newSchedule.id,
      intervalHours: toInterval
    }
  });
  
  // 4. Update OLD schedule input (remove this business)
  const oldSchedule = mapping.scheduleId;
  await updateScheduleInput(oldSchedule);
  
  // 5. Update NEW schedule input (add this business)
  await updateScheduleInput(newSchedule.id);
  
  console.log(`✅ Moved business from ${fromInterval}h → ${toInterval}h schedule`);
}
```

---

## 🎬 Complete Flow Example

### **Scenario: 3 Teams, Business B Upgrades**

```
Initial State:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Team A (Enterprise):
  - Business A1: Google Place "ChIJ_A1" → 6h schedule
  
Team B (Professional):
  - Business B1: Google Place "ChIJ_B1" → 12h schedule ⭐
  - Business B2: Google Place "ChIJ_B2" → 12h schedule
  
Team C (Enterprise):
  - Business C1: Google Place "ChIJ_C1" → 6h schedule

Global Schedules:
┌────────────────────────────────────────────────────────────────┐
│ google_reviews_6h (Enterprise tier)                            │
│ Input: { placeIds: ["ChIJ_A1", "ChIJ_C1"] }                   │
│ Businesses: A1 (Team A), C1 (Team C)                          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ google_reviews_12h (Professional tier)                         │
│ Input: { placeIds: ["ChIJ_B1", "ChIJ_B2"] }                   │
│ Businesses: B1 (Team B) ⭐, B2 (Team B)                        │
└────────────────────────────────────────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Team B upgrades: Professional → Enterprise
  ↓
handleSubscriptionUpdate("team_B")
  ↓
New interval: 12h → 6h
  ↓
For each Team B business:
  - Business B1: Move from 12h → 6h
  - Business B2: Move from 12h → 6h
  ↓
moveBusinessToSchedule():
  1. Remove B1 from 12h schedule
  2. Add B1 to 6h schedule
  3. Remove B2 from 12h schedule
  4. Add B2 to 6h schedule
  5. Update both schedules in Apify
  ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Final State:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Global Schedules:
┌────────────────────────────────────────────────────────────────┐
│ google_reviews_6h (Enterprise tier)                            │
│ Input: { placeIds: ["ChIJ_A1", "ChIJ_B1", "ChIJ_B2", "ChIJ_C1"] } │
│ Businesses: A1 (Team A), B1 (Team B) ⭐, B2 (Team B) ⭐, C1 (Team C) │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ google_reviews_12h (Professional tier)                         │
│ Input: { placeIds: [] }  ← Empty now!                         │
│ Businesses: (none)                                             │
│ Status: INACTIVE (no businesses)                               │
└────────────────────────────────────────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 💡 Advantages of Global Schedules

### **1. Cost Efficiency**

```
Traditional (per-team schedules):
  - 100 teams × 2 schedules = 200 Apify schedules
  - Each runs independently
  - High overhead

Global (interval-based schedules):
  - 4 intervals × 2 types × 4 platforms = 32 Apify schedules
  - Shared across all teams
  - Low overhead
```

### **2. Better Resource Utilization**

```
6h schedule runs once, processes:
  - Team A's 5 businesses
  - Team B's 10 businesses
  - Team C's 3 businesses
  Total: 18 businesses in ONE actor run

vs.

18 separate actor runs (one per team)
```

### **3. Simpler Management**

```
✅ Fixed number of schedules (32 for 4 platforms × 4 intervals × 2 types)
✅ Easy to monitor/debug
✅ Consistent timing across all teams
```

---

## ⚠️ Considerations & Challenges

### **1. Data Attribution**

**Challenge**: How do you know which team each result belongs to?

**Solution**: Link via database

```typescript
// When processing webhook data
for (const review of reviewsFromApify) {
  // Find which business this placeId belongs to
  const mapping = await prisma.businessScheduleMapping.findFirst({
    where: {
      placeId: review.placeId,
      platform: 'google_reviews'
    },
    include: { team: true }
  });
  
  // Save review with correct teamId and businessProfileId
  await saveReview({
    teamId: mapping.teamId,
    businessProfileId: mapping.businessProfileId,
    ...review
  });
}
```

### **2. Schedule Size Limits**

**Challenge**: What if 1000 businesses need 6h updates?

**Solution**: Implement batching per interval

```
google_reviews_6h_batch_0: [businesses 1-50]
google_reviews_6h_batch_1: [businesses 51-100]
google_reviews_6h_batch_2: [businesses 101-150]
... etc
```

### **3. Mixed Team Data**

**Challenge**: One actor run processes multiple teams' data

**Solution**: Ensure proper isolation in database

```prisma
model GoogleReview {
  id                String @id @default(uuid())
  teamId            String // ← Critical for data isolation
  businessProfileId String
  // ... other fields
  
  @@index([teamId])
  @@index([businessProfileId])
}
```

---

## 🚀 Migration Path

### **Phase 1: Add New Tables**

```sql
-- Create global schedule table
CREATE TABLE "ApifySchedule" (...);

-- Create business-schedule mapping table
CREATE TABLE "BusinessScheduleMapping" (...);
```

### **Phase 2: Initialize Global Schedules**

```typescript
await initializeGlobalSchedules();
```

### **Phase 3: Migrate Existing Teams**

```typescript
// For each existing team
for (const team of allTeams) {
  const features = await getTeamFeatures(team.id);
  const businesses = await getTeamBusinesses(team.id);
  
  for (const business of businesses) {
    await addBusinessToSchedule(
      business.id,
      business.platform,
      business.identifier,
      features.limits.reviewsScrapeIntervalHours
    );
  }
}
```

### **Phase 4: Delete Old Per-Team Schedules**

```typescript
// Delete old team-specific schedules from Apify
```

---

## 📋 Summary

### **Key Differences**

| Aspect | Per-Team Schedules | Global Schedules |
|--------|-------------------|------------------|
| **Scope** | One schedule per team per platform | One schedule per interval per platform |
| **Scalability** | 100 teams = 200 schedules | 100 teams = 32 schedules |
| **Updates** | Update schedule when team changes | Move business between schedules |
| **Data Processing** | One team's data per run | Multiple teams' data per run |
| **Complexity** | Simple attribution | Requires mapping table |

### **When to Use Which**

**Per-Team Schedules** (current):
- ✅ Simple to implement
- ✅ Easy data attribution
- ✅ Good for <100 teams
- ❌ Doesn't scale well

**Global Schedules** (proposed):
- ✅ Scales to 1000s of teams
- ✅ Cost-efficient
- ✅ Centralized management
- ❌ More complex implementation

---

## 🎯 Recommendation

**Start with per-team schedules**, migrate to global schedules when you hit ~100-200 teams. This gives you time to validate the system before adding complexity.

Your proposed global scheduling architecture is **solid for large scale** but adds complexity that may not be needed initially.

