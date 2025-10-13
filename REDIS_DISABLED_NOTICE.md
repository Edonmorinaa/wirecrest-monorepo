# Redis Caching - Currently Disabled

## Status: ⚠️ DISABLED

Redis caching has been **commented out** in the codebase but the code is preserved for future use.

## Current Behavior

The system now:
- ✅ **Always fetches fresh data from Stripe** on every request
- ✅ No Redis dependency required
- ✅ Simpler setup - no need to run Redis
- ⚠️ **Higher Stripe API usage** (one call per subscription check)
- ⚠️ **Slower response times** (~200-500ms vs ~5ms with cache)

## Files Modified

All Redis cache operations are commented out in:

1. **`packages/billing/src/stripe-first-subscription-service.ts`**
   - Cache initialization commented
   - `cache.get()` commented
   - `cache.set()` commented  
   - `cache.invalidate()` commented

2. **`packages/billing/src/billing-service.ts`**
   - Webhook cache invalidation commented

3. **`packages/billing/src/stripe-service.ts`**
   - Payment handler cache invalidation commented

## To Re-Enable Redis Caching

When you're ready to add Redis back:

### 1. Start Redis
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 2. Set Environment Variable
```bash
REDIS_URL=redis://localhost:6379
```

### 3. Uncomment Code

Search for `REDIS DISABLED` comments and uncomment the following sections:

**In `stripe-first-subscription-service.ts`**:
```typescript
// Uncomment these lines:
import { SubscriptionCacheService, CachedSubscription } from './redis-subscription-cache';
private cache: SubscriptionCacheService;
this.cache = new SubscriptionCacheService();
const cached = await this.cache.get(teamId);
await this.cache.set(teamId, mergedConfig);
await this.cache.invalidate(teamId);
await this.cache.invalidateAll();
```

**In `billing-service.ts`**:
```typescript
// Uncomment these lines:
const { getGlobalCacheService } = await import('./redis-subscription-cache');
const cacheService = getGlobalCacheService();
await cacheService.invalidate(teamId);
```

**In `stripe-service.ts`**:
```typescript
// Uncomment these lines:
const { getGlobalCacheService } = await import('./redis-subscription-cache');
const cacheService = getGlobalCacheService();
await cacheService.invalidate(teamId);
```

### 4. Test

After uncommenting:
- First request: Cache MISS → fetches from Stripe
- Second request (within 5 min): Cache HIT → returns from Redis
- After webhook: Cache invalidated → next request fetches fresh

## Why Disabled?

Redis caching adds complexity:
- Extra infrastructure dependency
- Need to manage connection/reconnection
- Cache invalidation logic
- Potential for stale data if webhooks fail

**For now**: Direct Stripe fetching is simpler and more reliable.

**Later**: When performance becomes an issue, Redis can be re-enabled by uncommenting the code.

## Performance Impact

| Metric | Without Redis | With Redis (5min TTL) |
|--------|---------------|------------------------|
| Response Time | 200-500ms | 5-50ms |
| Stripe API Calls | Every request | Once per 5 minutes |
| Infrastructure | Just app + DB | App + DB + Redis |
| Complexity | Low | Medium |

## Current Setup

No additional setup required! The system works with just:
- ✅ Your application
- ✅ Database (Prisma)
- ✅ Stripe API

Redis is **optional** and can be added later when needed.

---

**Summary**: Redis caching is commented out but preserved. The system works without it, just slower. Re-enable by uncommenting code when performance becomes a priority.

