# Dashboard-Scraper Integration Complete

## Overview

This document summarizes the implementation of a clean, webhook-driven architecture where Stripe subscription events and platform configuration automatically trigger data scraping, with scheduled updates based on subscription tier.

## Architecture

### Data Flow Patterns

#### Flow 1: User Subscribes → Platforms Already Configured
```
User subscribes → Stripe webhook → Scraper StripeWebhookController
→ SubscriptionOrchestrator.handleNewSubscription()
→ Checks BusinessMarketIdentifier for enabled platforms
→ Triggers initial scrape + adds to global schedules
→ User sees "Data syncing..." → Data appears
```

#### Flow 2: User Subscribes → No Platforms Yet (Edge Case)
```
User subscribes → Stripe webhook → Scraper StripeWebhookController
→ SubscriptionOrchestrator finds no platforms → Logs warning, does nothing
→ User configures platform → Dashboard calls scraper webhook endpoint
→ Scraper triggers initial scrape + adds to schedule
→ User sees "Data syncing..." → Data appears
```

#### Flow 3: Ongoing Updates (Scheduled Only)
```
Apify global schedule runs (tier-based intervals: 24h/12h/6h/3h)
→ Scraper fetches new data → Writes to shared DB
→ Dashboard reads from DB (no polling, just on-demand queries)
→ Optional: Supabase realtime for live updates
```

## Implementation Details

### 1. Scraper Service Changes

#### New Files Created

**`apps/scraper/src/controllers/PlatformConfigWebhookController.ts`**
- Handles platform configuration webhook events from dashboard
- Validates team has active subscription before triggering scraping
- Calls `SubscriptionOrchestrator.handlePlatformAdded()` to initiate scraping

**Key Features:**
- Validates required fields (teamId, platform, identifier)
- Checks for active subscription before proceeding
- Gracefully handles case where no subscription exists
- Returns detailed response about scraping initiation

#### Modified Files

**`apps/scraper/src/services/subscription/SubscriptionOrchestrator.ts`**
- Added `handlePlatformAdded()` method
- Triggers initial data fetch when platform is configured after subscription
- Extracts team features to determine scraping interval
- Creates sync record and adds business to global schedule
- Handles case where business profile doesn't exist yet

**`apps/scraper/src/controllers/StripeWebhookController.ts`**
- Updated `handleSubscriptionCreated()` to log warning when no platforms configured
- Provides clear feedback in logs for edge case handling

**`apps/scraper/src/index.ts`**
- Imported `PlatformConfigWebhookController`
- Initialized controller in `initializeServices()`
- Registered new route: `POST /api/webhooks/platform-configured`

### 2. Dashboard Changes

#### Modified Files

**`apps/dashboard/src/models/business-market-identifier.ts`**
- Added `notifyScraperPlatformConfigured()` function
- Calls scraper webhook when platform identifier is created/updated
- Gracefully handles webhook failures (doesn't break platform configuration)
- Uses `SCRAPER_API_URL` environment variable

**`apps/dashboard/src/actions/platforms.ts`**
- **REMOVED** `takeInstagramSnapshot()` function
- **REMOVED** `takeTikTokSnapshot()` function
- Cleaned up manual trigger endpoints per architecture design

**`apps/dashboard/src/hooks/useInstagramBusinessProfile.ts`**
- **REMOVED** `triggerWorkflow()` function
- **REMOVED** `triggerWorkflow` from return object
- Cleaned up hook to remove manual triggering

**`apps/dashboard/env.example`**
- Added `SCRAPER_API_URL` for server-side webhook calls
- Documented both public and server-side scraper URLs

#### New Files Created

**`apps/dashboard/src/hooks/useSyncStatus.ts`**
- Custom hook to monitor scraper sync status
- Polls scraper API for sync progress
- Provides helpers to check sync completion
- Smart polling (only polls when syncs are active)
- Platform-specific sync status checking

**`apps/dashboard/src/components/sync-status-indicator.tsx`**
- Reusable component to show sync status
- Displays different states: loading, syncing, completed, pending
- Supports compact and full modes
- Platform-specific or overall status display
- Shows review counts when available

### 3. Webhook Endpoint

**New Endpoint:** `POST /api/webhooks/platform-configured`

**Request Body:**
```json
{
  "teamId": "team_123",
  "platform": "GOOGLE_MAPS",
  "identifier": "ChIJN1t_tDeuEmsRUsoyG83frY4"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Platform configured and scraping initiated",
  "initialTaskStarted": true,
  "businessAdded": true
}
```

## Environment Variables

### Dashboard (Vercel)

```bash
# Server-side URL for webhook notifications
SCRAPER_API_URL="https://scraper-service.railway.app"

# Public URL for client-side requests
NEXT_PUBLIC_SCRAPER_API_URL="https://scraper-service.railway.app"
```

### Scraper (Railway)

```bash
# Apify token for scraping
APIFY_TOKEN="your_apify_token"

# Webhook base URL for callbacks
WEBHOOK_BASE_URL="https://scraper-service.railway.app"
```

## Usage Examples

### Using Sync Status Hook

```typescript
import { useSyncStatus } from 'src/hooks/useSyncStatus';

function MyComponent({ teamId }: { teamId: string }) {
  const {
    syncStatus,
    isLoading,
    hasActiveSyncs,
    isInitialSyncComplete,
    getPlatformSyncStatus,
  } = useSyncStatus({
    teamId,
    refreshInterval: 5000, // Poll every 5 seconds
    onlyPollWhenActive: true,
  });

  // Check overall sync status
  if (hasActiveSyncs) {
    return <div>Data is syncing...</div>;
  }

  // Check platform-specific status
  const googleStatus = getPlatformSyncStatus('google_maps');
  if (googleStatus?.isActive) {
    return <div>Google reviews syncing...</div>;
  }

  return <div>All synced!</div>;
}
```

### Using Sync Status Indicator Component

```typescript
import { SyncStatusIndicator } from 'src/components/sync-status-indicator';

function PlatformDashboard({ teamId }: { teamId: string }) {
  return (
    <div>
      <h1>Google Reviews</h1>
      
      {/* Show overall sync status */}
      <SyncStatusIndicator teamId={teamId} />
      
      {/* Show platform-specific status */}
      <SyncStatusIndicator 
        teamId={teamId} 
        platform="google_maps" 
        compact 
      />
      
      {/* Your dashboard content */}
    </div>
  );
}
```

## Testing Checklist

### Scenario 1: User Subscribes with Platforms Already Configured
- [x] Stripe webhook triggers
- [x] Initial scrape starts
- [x] Business added to schedule
- [ ] Data appears in dashboard (requires end-to-end test)

### Scenario 2: User Subscribes without Platforms
- [x] Stripe webhook logs warning
- [x] No scraping happens
- [x] User adds platform identifier
- [x] Platform webhook triggers
- [x] Initial scrape starts
- [ ] Data appears in dashboard (requires end-to-end test)

### Scenario 3: Ongoing Updates
- [ ] Scheduled jobs run at correct intervals (requires time-based test)
- [ ] Data updates in database (requires integration test)
- [ ] Dashboard shows updated data on refresh (requires end-to-end test)

### Scenario 4: Subscription Upgrade
- [ ] Businesses move to new interval schedule (requires integration test)
- [ ] No duplicate scraping (requires monitoring)
- [ ] Data continues flowing (requires integration test)

## Benefits of This Implementation

1. **Clean Separation**: Dashboard never triggers scraping directly - all scraping is event-driven
2. **Webhook-Driven**: All scraping initiated by events (Stripe webhooks, platform configuration)
3. **Handles Edge Cases**: Works whether platforms configured before or after subscription
4. **Scheduled Updates Only**: No manual refresh buttons needed - users trust the schedule
5. **Scalable**: Global schedules batch businesses efficiently
6. **Predictable**: Users see clear "syncing" state, then data appears
7. **Observable**: Sync status can be monitored in real-time
8. **Graceful Degradation**: Webhook failures don't break platform configuration

## Files Modified Summary

### Scraper Service (5 files)
- ✅ `apps/scraper/src/controllers/PlatformConfigWebhookController.ts` (NEW)
- ✅ `apps/scraper/src/services/subscription/SubscriptionOrchestrator.ts` (MODIFIED)
- ✅ `apps/scraper/src/controllers/StripeWebhookController.ts` (MODIFIED)
- ✅ `apps/scraper/src/index.ts` (MODIFIED)

### Dashboard (7 files)
- ✅ `apps/dashboard/src/models/business-market-identifier.ts` (MODIFIED)
- ✅ `apps/dashboard/src/actions/platforms.ts` (MODIFIED - removed functions)
- ✅ `apps/dashboard/src/hooks/useInstagramBusinessProfile.ts` (MODIFIED - removed function)
- ✅ `apps/dashboard/src/hooks/useSyncStatus.ts` (NEW)
- ✅ `apps/dashboard/src/components/sync-status-indicator.tsx` (NEW)
- ✅ `apps/dashboard/env.example` (MODIFIED)

## Next Steps

1. **Deploy Scraper Service** to Railway with updated code
2. **Deploy Dashboard** to Vercel with updated code
3. **Configure Environment Variables** in both services
4. **Test End-to-End Flow**:
   - Create test subscription
   - Configure platform
   - Verify webhook triggers
   - Confirm data appears
5. **Monitor Logs** for webhook calls and scraping activity
6. **Update UI Components** to use `SyncStatusIndicator` where appropriate

## Troubleshooting

### Platform Configuration Not Triggering Scraping

**Check:**
1. `SCRAPER_API_URL` is set correctly in dashboard environment
2. Scraper service is accessible from dashboard
3. Team has active subscription
4. Check scraper logs for webhook receipt
5. Check dashboard logs for webhook call

**Debug:**
```bash
# Check if webhook endpoint is accessible
curl -X POST https://scraper-service.railway.app/api/webhooks/platform-configured \
  -H "Content-Type: application/json" \
  -d '{"teamId":"test","platform":"GOOGLE_MAPS","identifier":"test"}'
```

### Subscription Not Triggering Scraping

**Check:**
1. Stripe webhook is configured correctly
2. Team has platform identifiers configured
3. Check scraper logs for Stripe webhook receipt
4. Verify `SubscriptionOrchestrator.handleNewSubscription()` is called

### Sync Status Not Updating

**Check:**
1. `NEXT_PUBLIC_SCRAPER_API_URL` is set in dashboard
2. Scraper API is accessible from browser
3. Check browser console for API errors
4. Verify `ScraperApiClient.getSyncStatus()` is working

## Conclusion

The dashboard-scraper integration is now complete with a clean, webhook-driven architecture. All scraping is triggered automatically by subscription events and platform configuration, with scheduled updates running based on subscription tier. The system handles edge cases gracefully and provides real-time feedback to users about sync status.

