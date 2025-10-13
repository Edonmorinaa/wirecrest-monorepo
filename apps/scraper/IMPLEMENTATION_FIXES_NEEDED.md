# Implementation Fixes Needed

## Critical Fixes Required Before Production

### 1. Review

DataProcessor Field Mismatches

**Issue:** The code uses wrong field names that don't match the Prisma schema.

**Fixes Required:**

#### Google Reviews
- ✅ Use `businessProfileId` instead of `businessId`
- ✅ Keep `publishedAtDate` (correct)
- ✅ Keep `reviewId` lookup - but schema uses `reviewMetadataId` as unique field

#### Facebook Reviews  
- ✅ Use `businessProfileId` instead of `businessId`
- ✅ Use `date` instead of `publishAt`
- ✅ Use `facebookReviewId` for lookup instead of generic `reviewId`

#### TripAdvisor Reviews
- ✅ Use `businessProfileId` instead of `businessId`
- ✅ Use `publishedDate` (correct)
- ✅ Use `tripAdvisorReviewId` for lookup instead of generic `reviewId`

#### Booking Reviews
- ✅ Use `businessProfileId` instead of `businessId`
- ✅ Use `publishedDate` instead of `publishedAt`
- ✅ Use `bookingReviewId` for lookup instead of generic `reviewId`

---

### 2. Subscription Orchestrator Missing Methods

**Issue:** `SubscriptionWebhookController` calls methods that don't exist yet.

**Methods to Add:**

```typescript
// In SubscriptionOrchestrator.ts

/**
 * Sync team schedules - refresh all schedules for a team
 * Used when business locations are added/removed
 */
async syncTeamSchedules(teamId: string): Promise<{
  success: boolean;
  message: string;
  schedulesUpdated: number;
}> {
  // Re-fetch all business identifiers for the team
  // Update Apify schedules with new inputs
  // Return result
}
```

---

### 3. Review Schema Considerations

**Important:** The actual review schemas use more complex structures than our simple implementation:

- **`reviewMetadataId`**: Each review links to `ReviewMetadata` table
- **Reviewer fields**: Stored in separate tables  
- **Additional fields**: Many more fields than we're populating

**Recommendation:** For MVP, use the existing database services that handle these complexities:
- `databaseService.saveGoogleReviewsWithMetadata()`
- `bookingAnalytics.processBookingReviewsData()`

Or simplify by only populating core review fields initially.

---

### 4. Handler Signature Mismatch

**Issue:** `handleNewSubscription` is called with 2 arguments but expects 1.

**Current Signature:**
```typescript
async handleNewSubscription(teamId: string): Promise<...>
```

**Called With:**
```typescript
await this.orchestrator.handleNewSubscription(teamId, subscriptionId);
```

**Fix Options:**

**Option A:** Update signature to accept subscriptionId:
```typescript
async handleNewSubscription(teamId: string, subscriptionId?: string): Promise<...>
```

**Option B:** Remove subscriptionId from webhook controller calls (simpler):
```typescript
await this.orchestrator.handleNewSubscription(teamId);
```

---

## Quick Fix Script

Due to the complexity of the review models, here's the recommended approach:

### For Google Reviews - Use Existing Service
```typescript
// In processGoogleReviews()
const saveResult = await this.databaseService.saveGoogleReviewsWithMetadata(
  profile.id,
  profile.placeId!,
  rawData,
  isInitial
);
```

### For Facebook Reviews - Needs Update
```typescript
// Update processFacebookReviews to use correct field names
await prisma.facebookReview.create({
  data: {
    businessProfileId: profile.id,  // NOT businessId
    facebookReviewId: review.id,     // NOT reviewId
    date: reviewDate || new Date(),  // NOT publishAt
    // ... other fields
  },
});
```

### For TripAdvisor Reviews
```typescript
await prisma.tripAdvisorReview.create({
  data: {
    businessProfileId: profile.id,      // NOT businessId
    tripAdvisorReviewId: review.id,     // NOT reviewId
    publishedDate: reviewDate || new Date(),  // correct
    // ... other fields
  },
});
```

### For Booking Reviews
```typescript
await prisma.bookingReview.create({
  data: {
    businessProfileId: profile.id,   // NOT businessId
    bookingReviewId: review.id,      // NOT reviewId
    publishedDate: reviewDate || new Date(),  // NOT publishedAt
    // ... other fields
  },
});
```

---

## Recommended Approach (Least Risky)

### Phase 1: Use Existing Services (Now)
- Google: Use `databaseService.saveGoogleReviewsWithMetadata()`
- Booking: Use `bookingAnalytics.processBookingReviewsData()`
- Facebook/TripAdvisor: Temporarily use existing analytics services

### Phase 2: Gradual Migration (Later)
- Once initial flow is working end-to-end
- Gradually migrate to direct Prisma calls
- Add proper handling of ReviewMetadata and related tables

---

## Testing Before Production

1. **Test with Sample Data**
   - Create test reviews for each platform
   - Verify deduplication works
   - Check database entries are correct

2. **Test Webhook Flow**
   - Trigger Apify run manually
   - Verify webhook is received
   - Check data is processed correctly

3. **Test Subscription Flow**
   - Create test subscription
   - Verify schedules are created in Apify
   - Confirm webhook URL is correct

---

## Environment Setup Reminder

Before testing:

```bash
# 1. Generate Prisma client
cd packages/db && npx prisma generate

# 2. Set environment variables
cp apps/scraper/ENVIRONMENT_VARIABLES.md apps/scraper/.env
# Edit .env with actual values

# 3. Start scraper service
cd apps/scraper && npm run dev

# 4. Use ngrok for webhooks (development)
ngrok http 3001
# Copy HTTPS URL to .env as WEBHOOK_BASE_URL
```

---

## Priority Order

1. ✅ **Highest**: Fix `handleNewSubscription` signature
2. ✅ **High**: Add `syncTeamSchedules` method
3. ✅ **High**: Use existing database services for reviews (safest)
4. ⏳ **Medium**: Fix field names if implementing custom saves
5. ⏳ **Low**: Add comprehensive review metadata handling

---

**Status**: Implementation ~90% complete, needs schema alignment fixes before production.

