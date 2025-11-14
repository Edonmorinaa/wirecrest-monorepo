# Platforms Router & Reviews Fix Summary

## Problem

Reviews pages for all platforms (Google, Facebook, TripAdvisor, Booking) were not showing any data because:

1. **Wrong Actions Called:** The platforms router was calling scraper-trigger actions instead of database query functions
2. **Missing Review Functions:** Booking reviews had no database query function
3. **No Cache Invalidation:** No webhook system to invalidate cache when scraper finishes

## What Was Fixed

### 1. Fixed Platforms Router (platforms.router.ts)

**Before:**
```typescript
// ❌ Called scraper trigger, not database query
googleReviews: protectedProcedure
  .input(getGoogleReviewsSchema)
  .query(async ({ input }) => {
    const result = await _getGoogleReviewsAction(input.teamSlug, input.filters);
    // This was trying to TRIGGER the scraper, not READ from database!
  }),
```

**After:**
```typescript
// ✅ Queries reviews from database
googleReviews: protectedProcedure
  .input(getGoogleReviewsSchema)
  .query(async ({ input }) => {
    const result = await _getGoogleReviews(input.teamSlug, input.filters || {});
    // This reads from Prisma database
  }),
```

### 2. Added Missing Review Procedures

**Added:**
- `tripadvisorReviews` - Fetch TripAdvisor reviews from database
- `bookingReviews` - Fetch Booking.com reviews from database

### 3. Created Booking Reviews Action

**Location:** `apps/dashboard/src/actions/reviews.ts`

**Function:** `getBookingReviews(teamSlug, filters)`

- Queries `bookingReview` table with Prisma
- Supports pagination, filtering, sorting
- Returns reviews, pagination info, and stats
- Follows same pattern as Google/Facebook/TripAdvisor

### 4. Fixed Import Organization

- Corrected import order to comply with linter rules
- Separated concerns: database queries vs scraper triggers
- Fixed `createMarketIdentifier` to pass correct parameters

### 5. Implemented Webhook-Based Cache Invalidation

#### Created Webhook Endpoint: `/api/scraper-webhook`

**Purpose:** Receives notifications from scraper when sync completes

**Features:**
- Signature verification with `SCRAPER_WEBHOOK_SECRET`
- Validates payload and team
- Logs sync events
- Triggers cache revalidation
- Returns success/error responses

**Example Usage:**
```typescript
// From scraper service
await fetch('https://dashboard.example.com/api/scraper-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-signature': process.env.SCRAPER_WEBHOOK_SECRET,
  },
  body: JSON.stringify({
    teamId: 'team-123',
    teamSlug: 'acme-corp',
    platform: 'google',
    status: 'completed',
    syncType: 'reviews',
    timestamp: new Date().toISOString(),
    reviewsNew: 5,
    reviewsDuplicate: 10,
  }),
});
```

#### Created Revalidation Endpoint: `/api/revalidate`

**Purpose:** Internal endpoint for cache invalidation logic

**Features:**
- Secret verification
- Queues Next.js ISR revalidation
- Enables React Query to detect stale data
- Logs revalidation events

### 6. Cache Invalidation System

**Existing Infrastructure Leveraged:**
- `useCacheInvalidation` hook (`src/lib/trpc/cache.ts`)
- `usePlatformCache` hook (`src/hooks/usePlatformCache.ts`)
- `CACHE_INVALIDATION_PATTERNS` for common scenarios

**Key Pattern for Scraper:**
```typescript
CACHE_INVALIDATION_PATTERNS.onPlatformSync(teamSlug, platform, invalidate);
```

This invalidates:
- Platform profile data
- Platform reviews
- Related queries

## How Reviews Loading Works Now

### Client-Side (Dashboard)

```typescript
// In any review component
import { trpc } from 'src/lib/trpc/client';

function GoogleReviewsPage() {
  const { data, isLoading, error } = trpc.platforms.googleReviews.useQuery({
    teamSlug: 'my-team',
    filters: {
      page: 1,
      limit: 25,
      rating: [4, 5],
      search: 'great service',
      hasResponse: false,
      sortBy: 'publishedAtDate',
      sortOrder: 'desc',
    },
  });

  // data.reviews - Array of reviews
  // data.pagination - { page, limit, total, hasNextPage, ... }
  // data.stats - { total, averageRating, withResponse, ... }
}
```

### Flow

1. **Initial Load:**
   - Component mounts
   - tRPC query executes
   - Router calls database action (e.g., `getGoogleReviews`)
   - Action queries Prisma with filters
   - Returns reviews + pagination + stats

2. **Scraper Syncs New Data:**
   - Scraper fetches new reviews from Google/Facebook/etc.
   - Saves to database
   - Calls webhook: `POST /api/scraper-webhook`
   - Webhook triggers revalidation
   - React Query marks data as stale

3. **Auto Refresh:**
   - React Query refetches (based on `refetchInterval` or user interaction)
   - New reviews appear on dashboard
   - No page reload needed!

## Environment Variables Needed

Add to `.env`:

```bash
# Webhook security (must match scraper)
SCRAPER_WEBHOOK_SECRET=generate-a-secure-random-string

# Revalidation security
REVALIDATE_SECRET=another-secure-random-string

# Dashboard URL (for webhooks)
NEXTAUTH_URL=https://yourdashboard.com
```

## All Platform Review Procedures

| Platform | Procedure | Source Action | Status |
|----------|-----------|---------------|--------|
| Google | `platforms.googleReviews` | `reviews.ts/getGoogleReviews` | ✅ Fixed |
| Facebook | `platforms.facebookReviews` | `facebook-reviews.ts/getFacebookReviews` | ✅ Fixed |
| TripAdvisor | `platforms.tripadvisorReviews` | `reviews.ts/getTripAdvisorReviews` | ✅ Added |
| Booking | `platforms.bookingReviews` | `reviews.ts/getBookingReviews` | ✅ Created |

## Testing

### 1. Test Review Loading

```bash
# Start dashboard
cd apps/dashboard
pnpm dev

# Visit review pages:
# http://localhost:3000/teams/[your-team]/google/reviews
# http://localhost:3000/teams/[your-team]/facebook/reviews
# http://localhost:3000/teams/[your-team]/tripadvisor/reviews
# http://localhost:3000/teams/[your-team]/booking/reviews
```

### 2. Test Webhook

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/scraper-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: your-webhook-secret" \
  -d '{
    "teamId": "your-team-id",
    "teamSlug": "your-team-slug",
    "platform": "google",
    "status": "completed",
    "syncType": "reviews",
    "timestamp": "2024-01-01T00:00:00Z",
    "reviewsNew": 5,
    "reviewsDuplicate": 10
  }'

# Should return:
# {"success":true,"message":"Webhook processed successfully","timestamp":"..."}
```

### 3. Verify Database Has Data

```sql
-- Check if reviews exist
SELECT COUNT(*) FROM "GoogleReview" WHERE "businessProfileId" IN (
  SELECT id FROM "GoogleBusinessProfile" WHERE "teamId" = 'your-team-id'
);

SELECT COUNT(*) FROM "FacebookReview" WHERE "businessProfileId" IN (
  SELECT id FROM "FacebookBusinessProfile" WHERE "teamId" = 'your-team-id'
);

SELECT COUNT(*) FROM "TripAdvisorReview" WHERE "businessProfileId" IN (
  SELECT id FROM "TripAdvisorBusinessProfile" WHERE "teamId" = 'your-team-id'
);

SELECT COUNT(*) FROM "BookingReview" WHERE "businessProfileId" IN (
  SELECT id FROM "BookingBusinessProfile" WHERE "teamId" = 'your-team-id'
);
```

## Common Issues & Solutions

### Issue: Reviews still not showing

**Solutions:**
1. Verify business profile exists for the team
2. Check database has review data (SQL above)
3. Verify team has feature access (subscription active)
4. Check browser console for tRPC errors
5. Verify market identifier is set for the platform

### Issue: Webhook fails

**Solutions:**
1. Check `SCRAPER_WEBHOOK_SECRET` matches between scraper and dashboard
2. Verify scraper can reach dashboard URL
3. Check dashboard logs: `pnpm dev` output
4. Test with curl command above

### Issue: Cache not updating

**Solutions:**
1. Verify webhook is being called (check logs)
2. Check React Query is configured with `refetchInterval`
3. Manually trigger refetch in dev tools
4. Clear browser cache/localStorage

## Files Changed

### Modified:
- `apps/dashboard/src/server/trpc/routers/platforms.router.ts` - Fixed to use database queries
- `apps/dashboard/src/actions/reviews.ts` - Added `getBookingReviews` function
- `apps/dashboard/src/hooks/use-booking-reviews.ts` - Fixed export

### Created:
- `apps/dashboard/src/app/api/scraper-webhook/route.ts` - Webhook endpoint
- `apps/dashboard/src/app/api/revalidate/route.ts` - Cache revalidation
- `CACHE_INVALIDATION_SETUP.md` - Detailed webhook setup guide
- `PLATFORMS_ROUTER_FIX_SUMMARY.md` - This file

## Next Steps

1. **Update Scraper:**
   - Add webhook calls after each sync
   - Include all required fields in payload
   - Set `SCRAPER_WEBHOOK_SECRET` environment variable
   - Set `DASHBOARD_WEBHOOK_URL` environment variable

2. **Test Each Platform:**
   - Trigger manual sync for each platform
   - Verify webhook is called
   - Check reviews appear on dashboard
   - Confirm auto-refresh works

3. **Monitor Logs:**
   - Watch for webhook events
   - Check for any errors
   - Verify cache invalidation happens

4. **Production Deployment:**
   - Set all environment variables
   - Test webhook from production scraper
   - Monitor performance and errors

## Summary

✅ All platform review procedures now correctly fetch from database  
✅ Webhook system implemented for automatic cache invalidation  
✅ Missing Booking reviews function created  
✅ Import order and linter issues fixed  
✅ Comprehensive documentation provided  

**Reviews should now load correctly for all platforms!**

