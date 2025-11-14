# Platform Procedures & Hooks Audit

## ✅ Fixed Issues

### 1. useBookingReviews Export
- **Issue**: Component was importing `{ useBookingReviews }` but file only had `export default`
- **Fix**: Added named export `export { useBookingReviews }`
- **File**: `apps/dashboard/src/hooks/use-booking-reviews.ts`

## 📊 tRPC Procedures Audit

### Platforms Router (`apps/dashboard/src/server/trpc/routers/platforms.router.ts`)

#### ✅ Complete Overview Procedures
| Platform | Procedure | Feature Required | Status |
|----------|-----------|------------------|--------|
| Google | `googleProfile` | google_overview | ✅ |
| Facebook | `facebookProfile` | facebook_overview | ✅ |
| Facebook | `facebookOverview` | facebook_overview | ✅ |
| Booking | `bookingProfile` | booking_overview | ✅ |
| Booking | `bookingOverview` | booking_overview | ✅ |
| TripAdvisor | `tripadvisorProfile` | none | ✅ |
| Instagram | `instagramProfile` | instagram_overview | ✅ |
| TikTok | `tiktokProfile` | tiktok_overview | ✅ |

#### ✅ Complete Review Procedures
| Platform | Procedure | Feature Required | Status |
|----------|-----------|------------------|--------|
| Google | `googleReviews` | google_reviews | ✅ |
| Facebook | `facebookReviews` | facebook_reviews | ✅ |
| Booking | *(uses overview)* | booking_overview | ✅ |
| TripAdvisor | *(uses inbox)* | - | ✅ |

**Note**: Booking reviews come from `bookingOverview.recentReviews`. For full review management, all platforms use the unified inbox (`trpc.reviews.getInboxReviews`).

#### ❓ Missing Overview Procedures
| Platform | Missing Procedure | Recommendation |
|----------|-------------------|----------------|
| Google | `googleOverview` | Consider adding (currently only has `googleProfile`) |
| TripAdvisor | `tripadvisorOverview` | Consider adding (currently only has `tripadvisorProfile`) |
| Instagram | `instagramOverview` | Consider adding (currently only has `instagramProfile`) |
| TikTok | `tiktokOverview` | Consider adding (currently only has `tiktokProfile`) |

### Superadmin Router (`apps/dashboard/src/server/trpc/routers/superadmin.router.ts`)

#### ✅ Complete Procedures
- `allTeams` - List all teams
- `teamById` - Get team by ID  
- `createTeam` - Create team
- `updateTeam` - Update team
- `deleteTeam` - Delete team
- `teamPlatformData` - Get platform data (legacy format)
- `getTeamPlatformData` - Get comprehensive platform data with stats ✅ **ADDED**

### Utils Router (`apps/dashboard/src/server/trpc/routers/utils.router.ts`)

#### ✅ Complete Procedures
- `hello` - Health check
- `invitationByToken` - Get invitation
- `reviewAISuggestions` - AI suggestions
- `samlCertificate` - SAML cert (not implemented)
- `retryWorkflow` - Retry workflow (not implemented)
- `getSyncStatus` - Get sync status ✅ **ADDED**

## 🪝 Hooks Audit

### Review Hooks
| Hook | Export Type | tRPC Procedure Used | Status |
|------|-------------|---------------------|--------|
| `use-google-reviews.ts` | default | `platforms.googleReviews` | ✅ |
| `use-facebook-reviews.ts` | default | `platforms.facebookReviews` | ✅ |
| `use-booking-reviews.ts` | default + named ✅ | `platforms.bookingOverview` | ✅ |
| `use-tripadvisor-reviews.ts` | default | `reviews.getInboxReviews` | ✅ |
| `use-inbox-reviews.ts` | default | `reviews.getInboxReviews` | ✅ |

### Platform Data Hooks
| Hook | tRPC Procedure Used | Status |
|------|---------------------|--------|
| `use-team-booking-data.ts` | `platforms.bookingOverview` | ✅ |

### ❌ Missing Hooks
Consider creating these hooks for consistency:
- `use-google-data.ts` - For Google overview data
- `use-facebook-data.ts` - For Facebook overview data  
- `use-tripadvisor-data.ts` - For TripAdvisor overview data
- `use-instagram-data.ts` - For Instagram overview data
- `use-tiktok-data.ts` - For TikTok overview data

## 🔄 Cache Invalidation

### Current Implementation

#### Cache Utilities (`apps/dashboard/src/lib/trpc/cache.ts`)
✅ Comprehensive cache invalidation functions available:
- `invalidateTeamData(teamSlug)` - Invalidate all team queries
- `invalidatePlatformData(teamSlug)` - Invalidate all platform queries
- `invalidatePlatformProfile(platform, teamSlug)` - Invalidate specific platform
- `invalidateReviews(teamSlug)` - Invalidate all reviews
- `invalidatePlatformReviews(platform, teamSlug)` - Invalidate platform reviews
- `invalidateBillingData(teamSlug)` - Invalidate billing queries
- `invalidateAll()` - Clear everything

#### Hook (`apps/dashboard/src/hooks/usePlatformCache.ts`)
✅ Easy-to-use hook for components:
```typescript
const cache = usePlatformCache();

// After connecting a platform
cache.onPlatformConnect('google');

// After syncing data
cache.onPlatformSync('google');

// After updating review
cache.onReviewUpdate('google');
```

### ❌ Missing: Webhook Integration

**Current Gap**: No automatic cache invalidation when scraper finishes processing.

#### How Scraper Notifies
1. ✅ Scraper sends notifications via `sendNotification()` from `@wirecrest/notifications`
2. ✅ Notifications appear in dashboard via `useNotifications` hook
3. ❌ No webhook endpoint to trigger cache invalidation

#### Recommended Implementation

**Step 1**: Create webhook endpoint
```typescript
// apps/dashboard/src/app/api/webhooks/scraper/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { teamId, platform, event } = body;
  
  // Verify webhook signature
  // Get team slug from teamId
  // Trigger cache invalidation via Pusher or similar
  // Send real-time event to clients
}
```

**Step 2**: Add real-time listener in dashboard
```typescript
// In useNotifications or new useScraperEvents hook
useEffect(() => {
  const channel = pusher.subscribe(`team-${teamId}`);
  
  channel.bind('scraper-complete', (data) => {
    const cache = usePlatformCache();
    cache.onPlatformSync(data.platform);
  });
}, [teamId]);
```

**Step 3**: Update scraper to call webhook
```typescript
// In ReviewDataProcessor after processing completes
await notifyDashboard(teamId, platform, {
  event: 'sync-complete',
  reviewsProcessed: result.reviewsProcessed,
  reviewsNew: result.reviewsNew,
});
```

### Alternative: Polling-Based Cache
If webhook integration is complex, use polling:
```typescript
// Already partially implemented in useSyncStatus
const { isSyncing } = useSyncStatus({
  teamId,
  refreshInterval: 5000,
  onlyPollWhenActive: true,
});

// Invalidate when sync completes
useEffect(() => {
  if (!isSyncing && wasSyncing) {
    cache.onPlatformSync(platform);
  }
}, [isSyncing]);
```

## 📋 Recommendations

### High Priority
1. ✅ Fix `useBookingReviews` export - **COMPLETED**
2. ✅ Add `superadmin.getTeamPlatformData` procedure - **COMPLETED**
3. ✅ Add `utils.getSyncStatus` procedure - **COMPLETED**
4. ❌ Implement cache invalidation when scraper finishes
5. ❌ Add webhook endpoint for scraper events

### Medium Priority
6. ❌ Create missing `*-overview` procedures for consistency
7. ❌ Create missing platform data hooks
8. ❌ Add real-time event listeners for cache updates

### Low Priority
9. ❌ Document all procedures in API docs
10. ❌ Add E2E tests for cache invalidation
11. ❌ Consider migrating remaining server actions to tRPC

## 🎯 Quick Wins

### For Immediate Cache Invalidation
Use the existing `usePlatformCache` hook in your components:

```typescript
// In platform overview pages
const cache = usePlatformCache();

// After any platform mutation
await updatePlatformMutation.mutateAsync(data);
cache.onPlatformSync('google');

// After manual refresh button
const handleRefresh = () => {
  cache.invalidateAllPlatforms();
};
```

### For Automatic Cache on Sync Complete
Listen to sync status and invalidate:

```typescript
const { isSyncing } = useSyncStatus({ teamId });
const cache = usePlatformCache();
const prevSyncing = usePrevious(isSyncing);

useEffect(() => {
  if (prevSyncing && !isSyncing) {
    // Sync just completed
    cache.invalidateAllPlatforms();
    cache.invalidateAllReviews();
  }
}, [isSyncing, prevSyncing, cache]);
```

## ✅ Summary

**What Works**:
- All core platform procedures are implemented
- Cache invalidation utilities are comprehensive
- Review hooks are properly structured
- Tenant management procedures are complete

**What Needs Work**:
- Webhook integration for automatic cache updates
- Some consistency gaps in overview procedures
- Real-time event handling for scraper completion

**Critical Path**:
1. Add webhook endpoint for scraper events
2. Integrate cache invalidation with scraper completion
3. Test end-to-end flow

