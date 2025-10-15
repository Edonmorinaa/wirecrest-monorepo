# Subscription Check Fix - Using Billing Package

## Problem
The scraper was checking subscriptions using the `TeamSubscription` table directly, which doesn't reflect the actual Stripe subscription status. This caused teams with Enterprise subscriptions to be incorrectly identified as having no subscription.

## Root Cause
The `PlatformConfigWebhookController` was using:
```typescript
const subscription = await prisma.teamSubscription.findUnique({
  where: { teamId },
  select: {
    id: true,
    status: true,
    stripeSubscriptionId: true,
  },
});
```

This approach:
- Only checks the local database table
- Doesn't verify with Stripe
- May have stale or incorrect data
- Doesn't follow the Stripe-First architecture

## Solution
Updated the controller to use the `StripeFirstSubscriptionService` from the billing package, which:
1. Gets the team's `stripeCustomerId` from the database
2. Queries Stripe directly for active subscriptions
3. Returns accurate, real-time subscription data
4. Properly identifies subscription tiers (FREE, STARTER, PRO, ENTERPRISE)

### Changes Made

**File**: `apps/scraper/src/controllers/PlatformConfigWebhookController.ts`

1. **Updated import** (line 8):
```typescript
import { StripeFirstSubscriptionService } from '@wirecrest/billing/src/server-only';
```

2. **Rewrote `getTeamSubscription` method** (lines 82-104):
```typescript
private async getTeamSubscription(teamId: string): Promise<any | null> {
  try {
    const subscriptionService = new StripeFirstSubscriptionService();
    const subscription = await subscriptionService.getTeamSubscription(teamId);

    console.log(`🔍 Subscription check for team ${teamId}:`, {
      tier: subscription.tier,
      hasStripeSubscription: !!subscription.stripeSubscriptionId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    });

    // Check if team has an active paid subscription (not FREE tier)
    if (subscription.tier !== 'FREE' && subscription.stripeSubscriptionId) {
      return subscription;
    }

    console.log(`⚠️ Team ${teamId} is on ${subscription.tier} tier, no paid subscription found`);
    return null;
  } catch (error) {
    console.error('Error fetching team subscription from Stripe:', error);
    return null;
  }
}
```

## How It Works Now

### Subscription Check Flow
1. Dashboard calls `/api/webhooks/platform-configured` with `teamId`, `platform`, and `identifier`
2. Controller creates `StripeFirstSubscriptionService` instance
3. Service:
   - Looks up team's `stripeCustomerId` in database
   - Queries Stripe API for active subscriptions
   - Returns subscription data with tier information
4. Controller checks if tier is not 'FREE' and has a `stripeSubscriptionId`
5. If valid subscription exists, triggers scraping via `SubscriptionOrchestrator`

### Subscription Tiers
- **FREE**: No Stripe subscription
- **STARTER**: Basic paid plan
- **PRO**: Professional plan
- **ENTERPRISE**: Enterprise plan

All paid tiers (STARTER, PRO, ENTERPRISE) will now correctly trigger scraping.

## Benefits

1. **Accurate**: Always checks Stripe as source of truth
2. **Real-time**: No stale data from local database
3. **Consistent**: Uses the same subscription service as the dashboard
4. **Maintainable**: Centralized subscription logic in billing package
5. **Reliable**: Handles all subscription tiers correctly

## Testing

To verify the fix works:

1. Ensure team has an active Stripe subscription
2. Configure a platform in the admin dashboard
3. Check scraper logs for:
   ```
   🔍 Subscription check for team <teamId>:
   { tier: 'ENTERPRISE', hasStripeSubscription: true, stripeSubscriptionId: 'sub_xxx' }
   ✅ Team <teamId> has active subscription, triggering initial scrape
   ```

## Related Files
- `apps/scraper/src/controllers/PlatformConfigWebhookController.ts` - Updated controller
- `packages/billing/src/stripe-first-subscription-service.ts` - Subscription service
- `packages/billing/src/server-only.ts` - Server-only exports
- `apps/scraper/src/services/subscription/SubscriptionOrchestrator.ts` - Handles scraping setup

## Architecture Note

This change aligns with the **Stripe-First Architecture** where:
- Stripe is the source of truth for subscriptions
- Local database is used for caching and quick lookups
- All subscription checks go through the billing package
- Consistent subscription logic across all services

