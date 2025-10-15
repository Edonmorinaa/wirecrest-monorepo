# Scraper Webhook Route Fix

## Problem
The dashboard was getting a 404 error when trying to call the scraper's platform configuration webhook:
```
Cannot POST /api/webhooks/platform-configured
```

## Root Cause
The scraper service has two entry points:
- **`src/index.ts`** - Old SOLID-compliant architecture (not in use)
- **`src/server.ts`** - New webhook-driven subscription architecture (currently running)

The `PlatformConfigWebhookController` route was only registered in `index.ts`, but the service was running `server.ts`.

## Solution
Added the `PlatformConfigWebhookController` to `src/server.ts`:

### Changes Made

1. **Import the controller** (line 13):
```typescript
import { PlatformConfigWebhookController } from './controllers/PlatformConfigWebhookController';
```

2. **Declare the controller variable** (line 43):
```typescript
let platformConfigWebhookController: PlatformConfigWebhookController;
```

3. **Initialize the controller** (line 63):
```typescript
platformConfigWebhookController = new PlatformConfigWebhookController(APIFY_TOKEN, WEBHOOK_BASE_URL);
```

4. **Register the webhook route** (lines 128-134):
```typescript
app.post('/api/webhooks/platform-configured', async (req: Request, res: Response) => {
  if (!platformConfigWebhookController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await platformConfigWebhookController.handlePlatformConfigured(req, res);
});
```

5. **Update health check** (line 82):
```typescript
const servicesReady = !!(
  stripeWebhookController &&
  apifyWebhookController &&
  platformConfigWebhookController &&  // Added
  orchestrator &&
  scheduleService &&
  taskService
);
```

## Architecture Clarification

### Current Architecture (server.ts)
- **Purpose**: Webhook-driven subscription management
- **Key Components**:
  - StripeWebhookController - Handles Stripe subscription events
  - ApifyWebhookController - Handles Apify actor completion events
  - PlatformConfigWebhookController - Handles platform configuration from dashboard
  - SubscriptionOrchestrator - Manages subscription lifecycle
  - Global scheduling system for review scraping

### Old Architecture (index.ts)
- **Purpose**: SOLID-compliant direct API architecture
- **Status**: Not currently in use
- **Note**: Can be started with `yarn dev:old` if needed

## Verification
The scraper service automatically restarts with `ts-node-dev` when changes are detected. The webhook endpoint should now be available at:
```
POST http://localhost:3001/api/webhooks/platform-configured
```

## Testing
From the dashboard, when you click "Setup" for a platform, it should now successfully call the scraper webhook and initiate the scraping process.

## Related Files
- `apps/scraper/src/server.ts` - Main entry point (NEW)
- `apps/scraper/src/index.ts` - Old entry point (not in use)
- `apps/scraper/src/controllers/PlatformConfigWebhookController.ts` - Webhook handler
- `apps/scraper/package.json` - Scripts configuration
- `apps/dashboard/src/actions/admin.ts` - Dashboard webhook caller

