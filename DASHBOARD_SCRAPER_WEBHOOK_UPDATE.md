# Dashboard-Scraper Webhook Integration Update

## Overview
Updated the dashboard to use the new webhook-driven architecture for platform configuration instead of the old direct API endpoints.

## Changes Made

### File: `apps/dashboard/src/actions/admin.ts`

#### Updated Function: `callExternalBackend()`

**Before:**
- Dashboard called individual platform endpoints like `/api/facebook/profile`, `/api/google/profile`, etc.
- Each platform had its own endpoint structure
- Required separate handling for Instagram and TikTok snapshots

**After:**
- Dashboard now calls a single webhook endpoint: `/api/webhooks/platform-configured`
- Unified interface for all platforms
- Scraper handles all platform-specific logic internally

#### Key Changes:

1. **Unified Webhook Endpoint**
   ```typescript
   const webhookEndpoint = `${env.backendUrl}/api/webhooks/platform-configured`;
   ```

2. **Simplified Payload**
   ```typescript
   const requestPayload = {
     teamId,
     platform: mappedPlatform,  // e.g., 'google_maps', 'facebook', etc.
     identifier                  // placeId, URL, username, etc.
   };
   ```

3. **Platform Mapping**
   ```typescript
   const platformMapping: Record<string, string> = {
     'google_maps': 'google_maps',
     'google': 'google_maps',
     'facebook': 'facebook',
     'tripadvisor': 'tripadvisor',
     'booking': 'booking',
     'instagram': 'instagram',
     'tiktok': 'tiktok'
   };
   ```

4. **Enhanced Response Handling**
   - Returns webhook response with `initialTaskStarted` and `businessAdded` flags
   - Includes error property for better error handling
   - Maintains backward compatibility with existing task tracking

## Benefits

### 1. **Simplified Architecture**
- Single webhook endpoint instead of multiple platform-specific endpoints
- Consistent request/response format across all platforms
- Easier to maintain and extend

### 2. **Better Separation of Concerns**
- Dashboard only needs to notify scraper about platform configuration
- Scraper handles all the complex logic (profile creation, initial scraping, scheduling)
- Clear responsibility boundaries

### 3. **Improved Reliability**
- Webhook-driven approach is more robust
- Scraper can handle retries and error recovery internally
- Dashboard doesn't need to wait for long-running operations

### 4. **Real-time Updates**
- Dashboard can poll for sync status updates
- Users see progress in real-time via the admin interface
- Better UX with loading states and progress indicators

## How It Works

### 1. User Configures Platform in Dashboard
```
User clicks "Setup" → Dashboard saves identifier → Calls webhook
```

### 2. Webhook Triggers Scraper
```
POST /api/webhooks/platform-configured
{
  "teamId": "...",
  "platform": "facebook",
  "identifier": "https://www.facebook.com/..."
}
```

### 3. Scraper Orchestrates Everything
```
SubscriptionOrchestrator.handlePlatformAdded()
├── Extract team features (subscription tier, limits)
├── Determine scraping interval
├── Run initial task (create profile + fetch data)
├── Add business to global schedule
└── Return success response
```

### 4. Dashboard Receives Confirmation
```json
{
  "success": true,
  "message": "Platform configured and scraping initiated",
  "initialTaskStarted": true,
  "businessAdded": true
}
```

### 5. Real-time Status Updates
- Dashboard polls `/api/sync-status/{teamId}` every 5-10 seconds
- Shows sync progress in platform cards
- Updates automatically when scraping completes

## Migration Notes

### Old Endpoints (Deprecated)
- ❌ `/api/google/profile`
- ❌ `/api/facebook/profile`
- ❌ `/api/tripadvisor/profile`
- ❌ `/api/booking/profile`
- ❌ `/api/instagram/snapshots`
- ❌ `/api/tiktok/snapshots`

### New Endpoint (Active)
- ✅ `/api/webhooks/platform-configured` (handles all platforms)

### Backward Compatibility
- Existing task tracking still works
- Response format includes all necessary fields
- Error handling is improved

## Testing Checklist

- [x] Updated dashboard to use webhook endpoint
- [x] Fixed TypeScript linter errors
- [x] Added error property to response type
- [ ] Test Facebook platform setup
- [ ] Test Google Maps platform setup
- [ ] Test TripAdvisor platform setup
- [ ] Test Booking platform setup
- [ ] Test Instagram platform setup
- [ ] Test TikTok platform setup
- [ ] Verify sync status updates in real-time
- [ ] Check error handling for failed setups

## Next Steps

1. **Test the Integration**
   - Try setting up Facebook platform from admin dashboard
   - Verify webhook is called correctly
   - Check that scraper initiates data fetch
   - Confirm sync status updates appear

2. **Monitor Logs**
   - Dashboard logs: Look for "🚀 Calling scraper webhook"
   - Scraper logs: Look for webhook handler execution
   - Check for any errors or unexpected behavior

3. **Update Documentation**
   - Update API documentation with new webhook endpoint
   - Document the webhook payload format
   - Add examples for each platform

## Related Files

- `apps/dashboard/src/actions/admin.ts` - Updated webhook caller
- `apps/scraper/src/controllers/PlatformConfigWebhookController.ts` - Webhook handler
- `apps/scraper/src/services/subscription/SubscriptionOrchestrator.ts` - Orchestration logic
- `DASHBOARD_SCRAPER_INTEGRATION.md` - Full integration documentation

