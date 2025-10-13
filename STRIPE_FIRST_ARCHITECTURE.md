# Stripe-First Billing Architecture

## Architecture Overview

**Single Source of Truth**: Stripe
**Performance**: Redis cache with TTL
**Flexibility**: Admin overrides in database
**Sync**: Webhooks invalidate cache only

## Data Flow

```
Request → Redis Cache → (miss) → Stripe API → Merge with DB overrides → Cache → Response
                ↓
             (hit) → Response

Webhook → Invalidate Redis cache for team
```

## What Gets Stored Where

### Database (Team table)
- ✅ `stripeCustomerId` - Only Stripe reference needed
- ❌ No subscription status, tier, or features (fetched from Stripe)

### Database (SubscriptionTierConfig table)
- ✅ Admin-configurable overrides/defaults
- ✅ `stripePriceId` - Maps Stripe prices to tier names
- ✅ `enabledFeatures`, `includedSeats`, etc. - Default values
- ⚠️ Used as fallback/override when Stripe metadata is incomplete

### Stripe Product Metadata
- Primary tier configuration source
- Keys: `tier`, `includedSeats`, `includedLocations`, `enabledFeatures` (JSON)
- Example:
```json
{
  "tier": "PROFESSIONAL",
  "includedSeats": "5",
  "includedLocations": "10",
  "enabledFeatures": "[\"google_reviews\",\"facebook_reviews\",\"api_access\"]"
}
```

### Redis Cache
- Key: `subscription:${teamId}`
- TTL: 5 minutes (300 seconds)
- Value: Complete subscription data (Stripe + overrides merged)
- Invalidated by webhooks

## Implementation Plan

### Phase 1: Add Redis Service

Create `packages/billing/src/redis-subscription-cache.ts`:

```typescript
import { createClient } from 'redis';

interface CachedSubscription {
  tier: string;
  status: string;
  stripeSubscriptionId: string;
  enabledFeatures: string[];
  includedSeats: number;
  includedLocations: number;
  includedRefreshes: number;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export class SubscriptionCacheService {
  private client: ReturnType<typeof createClient>;
  private readonly TTL = 300; // 5 minutes
  private readonly KEY_PREFIX = 'subscription:';

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.client.connect();
  }

  async get(teamId: string): Promise<CachedSubscription | null> {
    const key = `${this.KEY_PREFIX}${teamId}`;
    const cached = await this.client.get(key);
    if (!cached) return null;
    
    return JSON.parse(cached);
  }

  async set(teamId: string, data: CachedSubscription): Promise<void> {
    const key = `${this.KEY_PREFIX}${teamId}`;
    await this.client.setEx(key, this.TTL, JSON.stringify(data));
  }

  async invalidate(teamId: string): Promise<void> {
    const key = `${this.KEY_PREFIX}${teamId}`;
    await this.client.del(key);
  }

  async invalidateAll(): Promise<void> {
    const keys = await this.client.keys(`${this.KEY_PREFIX}*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}
```

### Phase 2: Create Stripe-First Subscription Service

Create `packages/billing/src/stripe-first-subscription-service.ts`:

```typescript
import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { SubscriptionCacheService } from './redis-subscription-cache';

export class StripeFirstSubscriptionService {
  private stripe: Stripe;
  private cache: SubscriptionCacheService;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    this.cache = new SubscriptionCacheService();
  }

  /**
   * Get team subscription - always from Stripe (with cache)
   */
  async getTeamSubscription(teamId: string) {
    // Check cache first
    const cached = await this.cache.get(teamId);
    if (cached) {
      console.log(`✅ [Cache HIT] Team ${teamId} subscription from cache`);
      return cached;
    }

    console.log(`❌ [Cache MISS] Fetching team ${teamId} subscription from Stripe`);

    // Get team to find stripeCustomerId
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { stripeCustomerId: true },
    });

    if (!team?.stripeCustomerId) {
      return this.getFreeTierDefaults(teamId);
    }

    // Fetch active subscription from Stripe
    const subscriptions = await this.stripe.subscriptions.list({
      customer: team.stripeCustomerId,
      status: 'active',
      limit: 1,
      expand: ['data.items.data.price.product'],
    });

    if (subscriptions.data.length === 0) {
      return this.getFreeTierDefaults(teamId);
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    const product = subscription.items.data[0].price.product as Stripe.Product;

    // Extract tier configuration from Stripe product metadata
    const tierFromMetadata = this.extractTierFromProduct(product);

    // Check for admin overrides in database
    const tierConfig = await prisma.subscriptionTierConfig.findFirst({
      where: { stripePriceId: priceId },
    });

    // Merge Stripe metadata with database overrides (DB overrides win)
    const mergedConfig = {
      tier: tierConfig?.tier || tierFromMetadata.tier || 'STARTER',
      status: subscription.status.toUpperCase(),
      stripeSubscriptionId: subscription.id,
      enabledFeatures: tierConfig?.enabledFeatures || tierFromMetadata.enabledFeatures || [],
      includedSeats: tierConfig?.includedSeats || tierFromMetadata.includedSeats || 1,
      includedLocations: tierConfig?.includedLocations || tierFromMetadata.includedLocations || 1,
      includedRefreshes: tierConfig?.includedRefreshes || tierFromMetadata.includedRefreshes || 24,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    // Cache the result
    await this.cache.set(teamId, mergedConfig);

    return mergedConfig;
  }

  /**
   * Check if team has feature access
   */
  async hasFeatureAccess(teamId: string, feature: string): Promise<boolean> {
    const subscription = await this.getTeamSubscription(teamId);
    return subscription.enabledFeatures.includes(feature);
  }

  /**
   * Invalidate cache (called by webhooks)
   */
  async invalidateTeamCache(teamId: string): Promise<void> {
    console.log(`🗑️ [Cache] Invalidating cache for team ${teamId}`);
    await this.cache.invalidate(teamId);
  }

  /**
   * Extract tier configuration from Stripe product metadata
   */
  private extractTierFromProduct(product: Stripe.Product) {
    const metadata = product.metadata;
    
    return {
      tier: metadata.tier || 'STARTER',
      enabledFeatures: metadata.enabledFeatures 
        ? JSON.parse(metadata.enabledFeatures) 
        : [],
      includedSeats: metadata.includedSeats 
        ? parseInt(metadata.includedSeats, 10) 
        : 1,
      includedLocations: metadata.includedLocations 
        ? parseInt(metadata.includedLocations, 10) 
        : 1,
      includedRefreshes: metadata.includedRefreshes 
        ? parseInt(metadata.includedRefreshes, 10) 
        : 24,
    };
  }

  /**
   * Get FREE tier defaults (no Stripe subscription)
   */
  private async getFreeTierDefaults(teamId: string) {
    // Check if there's a FREE tier config in database
    const freeConfig = await prisma.subscriptionTierConfig.findFirst({
      where: { tier: 'FREE' },
    });

    return {
      tier: 'FREE',
      status: 'ACTIVE',
      stripeSubscriptionId: null,
      enabledFeatures: freeConfig?.enabledFeatures || ['google_reviews_access'],
      includedSeats: freeConfig?.includedSeats || 1,
      includedLocations: freeConfig?.includedLocations || 1,
      includedRefreshes: freeConfig?.includedRefreshes || 6,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }
}
```

### Phase 3: Update Webhook Handler to Only Invalidate Cache

Update `packages/billing/src/billing-service.ts`:

```typescript
// Remove syncSubscriptionToLocal completely
// Replace with cache invalidation only

async handleWebhook(payload: string | Buffer, signature: string): Promise<{ processed: boolean; type: string }> {
  // ... signature verification ...

  console.log(`🔔 [Webhook] Received event: ${event.type}`);

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await this.invalidateSubscriptionCache(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      await this.invalidateCacheFromInvoice(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
      return { processed: false, type: event.type };
  }

  console.log(`✅ [Webhook] Successfully processed: ${event.type}`);
  return { processed: true, type: event.type };
}

private async invalidateSubscriptionCache(subscription: Stripe.Subscription): Promise<void> {
  const teamId = subscription.metadata.teamId;
  if (!teamId) {
    console.warn('No teamId in subscription metadata');
    return;
  }

  const cacheService = new SubscriptionCacheService();
  await cacheService.invalidate(teamId);
  console.log(`✅ [Webhook] Invalidated cache for team ${teamId}`);
}

private async invalidateCacheFromInvoice(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.subscription) return;

  // Fetch subscription to get teamId
  const subscription = await this.stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  
  await this.invalidateSubscriptionCache(subscription);
}
```

### Phase 4: Update Feature Access Functions

Update `packages/billing/src/actions.ts`:

```typescript
export async function getTeamSubscriptionInfo(teamId: string) {
  const service = new StripeFirstSubscriptionService();
  return await service.getTeamSubscription(teamId);
}

export async function checkTeamFeatureAccess(teamId: string, feature: string): Promise<boolean> {
  const service = new StripeFirstSubscriptionService();
  return await service.hasFeatureAccess(teamId, feature);
}

export async function checkTeamFeaturesAccess(
  teamId: string, 
  features: string[]
): Promise<Record<string, boolean>> {
  const service = new StripeFirstSubscriptionService();
  const subscription = await service.getTeamSubscription(teamId);
  
  const result: Record<string, boolean> = {};
  for (const feature of features) {
    result[feature] = subscription.enabledFeatures.includes(feature);
  }
  return result;
}
```

### Phase 5: Simplify Database Schema

Remove fields from `TeamSubscription` table (keep minimal for audit/history):

```prisma
model TeamSubscription {
  id                   String            @id @default(uuid())
  teamId               String            @unique
  
  // Only store these for historical/audit purposes
  // NOT used for access control - always fetch from Stripe
  lastSyncedAt         DateTime          @default(now())
  lastKnownTier        String?           // For reporting only
  lastKnownStatus      String?           // For reporting only
  
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
  
  team                 Team              @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  @@index([teamId])
}
```

Or even simpler - remove `TeamSubscription` table entirely and just use `stripeCustomerId` on Team:

```prisma
model Team {
  id                String   @id @default(uuid())
  name              String
  slug              String   @unique
  stripeCustomerId  String?  @unique  // ONLY Stripe reference needed
  // ... other fields
}
```

### Phase 6: Add Redis to Docker/Environment

**docker-compose.yml** (if using Docker):
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

**Environment variables**:
```bash
REDIS_URL=redis://localhost:6379
```

## Migration Strategy

### Step 1: Add Redis
1. Install Redis: `docker-compose up -d redis`
2. Add `redis` package: `yarn add redis`
3. Test connection

### Step 2: Deploy New Service (Parallel)
1. Deploy `StripeFirstSubscriptionService` alongside existing code
2. Update feature checks to use new service
3. Keep old `TeamSubscription` table for now (safety)

### Step 3: Update Webhooks
1. Change webhooks to only invalidate cache
2. Stop syncing to `TeamSubscription` table

### Step 4: Cleanup (After Testing)
1. Drop `TeamSubscription` table (or keep for audit)
2. Remove old sync code

## Benefits

✅ **Single Source of Truth**: Stripe always has correct data
✅ **Performance**: Redis cache avoids repeated API calls
✅ **Flexibility**: Admins can override in SubscriptionTierConfig
✅ **Simplicity**: No complex sync logic
✅ **Real-time**: Cache invalidation ensures fresh data after changes
✅ **Scalability**: Redis handles high read volume
✅ **Audit Trail**: Optional - keep TeamSubscription for history

## Stripe Product Metadata Setup

For each product in Stripe, add metadata:

```json
{
  "tier": "PROFESSIONAL",
  "includedSeats": "5",
  "includedLocations": "10",
  "includedRefreshes": "72",
  "enabledFeatures": "[\"google_reviews_access\",\"facebook_reviews_access\",\"api_access\",\"advanced_analytics\"]"
}
```

## Admin Override UI

Admins can override defaults in `SubscriptionTierConfig`:
- If `stripePriceId` matches, use DB values over Stripe metadata
- Allows customization without changing Stripe configuration
- Useful for special pricing, beta features, etc.

## Example Usage

```typescript
// Check if team has feature
const hasAPI = await checkTeamFeatureAccess('team-123', 'api_access');

// Get full subscription info
const subscription = await getTeamSubscriptionInfo('team-123');
console.log(subscription.tier); // 'PROFESSIONAL'
console.log(subscription.enabledFeatures); // ['google_reviews_access', ...]

// Cache automatically used on subsequent calls
const subscription2 = await getTeamSubscriptionInfo('team-123'); // From cache!
```

## Next Steps

Should I proceed with implementing this architecture? This will:
1. Remove most of the code we just wrote (the sync logic)
2. Add Redis caching layer
3. Make Stripe the single source of truth
4. Keep database overrides for admin flexibility

