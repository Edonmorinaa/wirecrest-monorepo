# Cache Invalidation Setup

## Overview

The dashboard now has a webhook-based cache invalidation system that automatically refreshes data when the scraper finishes syncing.

## Components

### 1. Scraper Webhook Endpoint

**Location:** `apps/dashboard/src/app/api/scraper-webhook/route.ts`

**Purpose:** Receives events from the scraper service when data syncs complete.

**Payload:**
```json
{
  "teamId": "string",
  "teamSlug": "string",
  "platform": "google | facebook | tripadvisor | booking | instagram | tiktok",
  "status": "completed | failed",
  "syncType": "profile | reviews | snapshot",
  "timestamp": "ISO string",
  "reviewsNew": 0,
  "reviewsDuplicate": 0,
  "error": "string (optional)"
}
```

**Headers:**
- `x-webhook-signature`: Must match `SCRAPER_WEBHOOK_SECRET` environment variable

**Usage from Scraper:**
```typescript
await fetch('https://dashboard.example.com/api/scraper-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-signature': process.env.SCRAPER_WEBHOOK_SECRET,
  },
  body: JSON.stringify({
    teamId: '123',
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

### 2. Cache Revalidation Endpoint

**Location:** `apps/dashboard/src/app/api/revalidate/route.ts`

**Purpose:** Internal endpoint that triggers cache invalidation logic.

**Payload:**
```json
{
  "teamSlug": "string",
  "platform": "string",
  "syncType": "profile | reviews | snapshot"
}
```

**Headers:**
- `x-revalidate-secret`: Must match `REVALIDATE_SECRET` environment variable

### 3. Client-Side Cache Invalidation

**Location:** `apps/dashboard/src/lib/trpc/cache.ts` and `apps/dashboard/src/hooks/usePlatformCache.ts`

**Usage in Components:**
```typescript
import { usePlatformCache } from 'src/hooks/usePlatformCache';

function MyComponent() {
  const cache = usePlatformCache();
  
  // After a manual sync trigger:
  const handleSync = async () => {
    await triggerSync();
    // Invalidate cache after sync
    cache.onPlatformSync('google');
  };
  
  // Or invalidate specific data:
  cache.invalidatePlatformReviews('google');
  cache.invalidatePlatform('facebook');
}
```

## Environment Variables

Add these to your `.env` file:

```bash
# Scraper webhook security
SCRAPER_WEBHOOK_SECRET=your-webhook-secret-here

# Cache revalidation security
REVALIDATE_SECRET=your-revalidate-secret-here

# Dashboard URL (for webhook callbacks)
NEXTAUTH_URL=https://dashboard.example.com
```

## How It Works

1. **Scraper Completes Sync:**
   - Scraper service finishes fetching reviews/profiles
   - Sends webhook to `/api/scraper-webhook`
   - Includes team info, platform, and sync details

2. **Webhook Processing:**
   - Verifies webhook signature
   - Validates payload
   - Logs sync event
   - Triggers revalidation

3. **Cache Invalidation:**
   - Revalidation endpoint is called
   - Next.js ISR can be triggered for SSR pages
   - Client-side: React Query will refetch on next interval or user interaction

4. **Client Refresh:**
   - React Query hooks detect stale data
   - Automatic refetch happens based on `refetchInterval`
   - Users see fresh data without page reload

## Testing

### Test Webhook Locally:

```bash
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
```

### Check Webhook Health:

```bash
curl http://localhost:3000/api/scraper-webhook
# Should return: {"status":"ok","service":"scraper-webhook",...}
```

## Platforms Router Fixes

### What Was Fixed:

1. **Review Fetching:**
   - Changed from scraper-trigger actions to Prisma database queries
   - `googleReviews` now uses `getGoogleReviews` from `actions/reviews.ts`
   - `facebookReviews` now uses `getFacebookReviews` from `actions/facebook-reviews.ts`
   - Added `tripadvisorReviews` and `bookingReviews` procedures

2. **Added Missing Procedures:**
   - `tripadvisorReviews` - Fetch TripAdvisor reviews from database
   - `bookingReviews` - Fetch Booking.com reviews from database

3. **Booking Reviews Action:**
   - Created `getBookingReviews` in `actions/reviews.ts`
   - Follows same pattern as other review fetching functions
   - Includes pagination, filtering, and stats

## Usage in Reviews Pages

Reviews pages should now work correctly:

```typescript
// In any review component
import { trpc } from 'src/lib/trpc/client';

function GoogleReviewsPage() {
  const { data, isLoading } = trpc.platforms.googleReviews.useQuery({
    teamSlug: 'my-team',
    filters: {
      page: 1,
      limit: 25,
      rating: [4, 5], // Filter by rating
      search: 'great service', // Search text
    },
  });
  
  return (
    <div>
      {data?.reviews.map(review => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
```

## Cache Patterns

The system uses predefined cache invalidation patterns:

```typescript
CACHE_INVALIDATION_PATTERNS.onPlatformSync(teamSlug, platform, invalidate);
// Invalidates:
// - Platform profile
// - Platform reviews
```

Available patterns:
- `onPlatformConnect` - When connecting a platform
- `onPlatformDisconnect` - When disconnecting a platform
- `onReviewUpdate` - After updating a review
- `onPlatformSync` - After scraper syncs data ← **Use this one!**
- `onTeamUpdate` - After updating team settings
- `onSubscriptionChange` - After subscription changes

## Scraper Integration

### In your scraper service:

```typescript
// After completing a sync
async function notifyDashboard(syncResult) {
  const webhookUrl = process.env.DASHBOARD_WEBHOOK_URL;
  const webhookSecret = process.env.SCRAPER_WEBHOOK_SECRET;
  
  await fetch(`${webhookUrl}/api/scraper-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': webhookSecret,
    },
    body: JSON.stringify({
      teamId: syncResult.teamId,
      teamSlug: syncResult.teamSlug,
      platform: syncResult.platform,
      status: syncResult.status,
      syncType: syncResult.type,
      timestamp: new Date().toISOString(),
      reviewsNew: syncResult.reviewsNew,
      reviewsDuplicate: syncResult.reviewsDuplicate,
      error: syncResult.error,
    }),
  });
}
```

## Monitoring

Check logs for cache invalidation events:

```bash
# Webhook received
📥 Received scraper webhook: { teamId, platform, status, ... }

# Sync completed successfully
✅ Scraper sync completed for google on team acme-corp
   📊 Reviews: 5 new, 10 duplicate

# Cache revalidated
✨ Cache revalidated successfully

# Revalidation requested
🔄 Cache revalidation requested: { teamSlug, platform, syncType }
```

## Troubleshooting

### Webhook not working:
1. Check `SCRAPER_WEBHOOK_SECRET` is set and matches
2. Verify scraper can reach dashboard URL
3. Check dashboard logs for errors

### Cache not invalidating:
1. Verify webhook is being called (check logs)
2. Check `REVALIDATE_SECRET` is set
3. Ensure React Query is configured with `refetchInterval`

### Reviews not showing:
1. Check database has review data: `SELECT COUNT(*) FROM "GoogleReview" WHERE "businessProfileId" = '...'`
2. Verify team has access to the platform feature
3. Check browser console for tRPC errors
4. Verify business profile exists for the team

