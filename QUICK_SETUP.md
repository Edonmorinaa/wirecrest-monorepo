# Quick Setup Guide - Stripe-First Architecture

## ✅ Implementation Complete!

All code changes are done. Follow these steps to get it running:

## ⚠️ Redis Caching: CURRENTLY DISABLED

Redis caching is **commented out** for now to simplify setup. The system works without it!

- ✅ No Redis required
- ⚠️ Slower (200-500ms per request vs 5ms with cache)
- ⚠️ More Stripe API calls

See `REDIS_DISABLED_NOTICE.md` for details on re-enabling later.

## 1. ~~Start Redis~~ (SKIP - Redis Disabled)

~~Redis caching is disabled for now. Skip to step 2.~~

## 2. Environment Variables

Your `.env` should already have:
```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
# REDIS_URL not needed (Redis disabled)
```

## 3. Configure Stripe Product Metadata

For each tier's product in Stripe Dashboard:

### Go to: Products → [Your Product] → Edit → Metadata

Add these fields:

```
tier: PROFESSIONAL
includedSeats: 5
includedLocations: 10
includedRefreshes: 72
enabledFeatures: ["google_reviews_access","facebook_reviews_access","api_access","advanced_analytics"]
```

**Repeat for each tier** (FREE, STARTER, PROFESSIONAL, ENTERPRISE)

## 4. Link Stripe Prices to Database Tiers

Run this SQL (update with your actual Stripe price IDs):

```sql
-- Get your price IDs from Stripe Dashboard: Products → Prices
UPDATE "SubscriptionTierConfig" 
SET "stripePriceId" = 'price_1234567890abcdef'  -- Your actual STARTER price ID
WHERE "tier" = 'STARTER';

UPDATE "SubscriptionTierConfig" 
SET "stripePriceId" = 'price_abcdef1234567890'  -- Your actual PROFESSIONAL price ID
WHERE "tier" = 'PROFESSIONAL';

UPDATE "SubscriptionTierConfig" 
SET "stripePriceId" = 'price_xyz123abc456'  -- Your actual ENTERPRISE price ID
WHERE "tier" = 'ENTERPRISE';
```

## 5. Test It Out!

### Test 1: ~~Check Redis Connection~~ (SKIP - Redis Disabled)

~~Redis is disabled, skip this test.~~

### Test 2: Fetch Subscription (Always from Stripe)
```typescript
// Visit /user/account/billing in your dashboard
// Check console logs:
// 🔍 [Stripe-First] Fetching subscription for team team-123 from Stripe (NO CACHE)
// ✅ [Stripe-First] Fetched subscription for team team-123
```

### Test 3: Fetch Again (Still Fetches from Stripe)
```typescript
// Refresh the page
// Check console logs:
// 🔍 [Stripe-First] Fetching subscription for team team-123 from Stripe (NO CACHE)
// (Every request hits Stripe API - no cache)
```

### Test 4: Webhook (No Cache to Invalidate)
```bash
# In Stripe Dashboard → Developers → Webhooks → Send test webhook
# Event: customer.subscription.updated

# Check logs:
# 🔔 [Webhook] Received event: customer.subscription.updated
# 🗑️ [Webhook] Cache invalidation skipped (Redis disabled) for team team-123
```

## 6. Verify Stripe Webhook Endpoint

Make sure your Stripe webhook points to:
```
https://your-domain.com/api/webhooks/stripe
```

With these events enabled:
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `checkout.session.completed`

## 🎉 You're Done!

The system is now live with:
- ✅ Stripe as single source of truth
- ✅ Redis caching (5-minute TTL)
- ✅ Admin overrides via database
- ✅ Automatic cache invalidation on subscription changes

## 🐛 Troubleshooting

**Redis not connecting?**
```bash
# Check Redis is running
redis-cli ping

# Check environment variable
echo $REDIS_URL
```

**Subscription showing as FREE when it shouldn't?**
1. Check Stripe product metadata is set
2. Check `stripePriceId` in database matches
3. Force refresh: Click "Refresh" button in billing page

**Cache not invalidating?**
1. Check webhook endpoint is configured
2. Check webhook logs in Stripe Dashboard
3. Manually invalidate: Refresh the billing page

## 📊 Monitor Performance

Watch your logs for these indicators:

**Good** (Cache Working):
```
✅ [Redis Cache HIT] Team team-123
```

**Expected on First Load**:
```
❌ [Redis Cache MISS] Team team-123
🔍 [Stripe-First] Fetching subscription from Stripe
💾 [Redis] Cached subscription
```

**After Webhook**:
```
🔔 [Webhook] Received event
🗑️ [Redis] Invalidated cache
```

## Next: Admin Overrides

To give a team special features:

```sql
-- Example: Give team extra seats and features
UPDATE "SubscriptionTierConfig" 
SET 
  "enabledFeatures" = ARRAY['api_access', 'white_label', 'priority_support'],
  "includedSeats" = 20
WHERE "stripePriceId" = (
  SELECT "stripePriceId" 
  FROM "TeamSubscription" 
  WHERE "teamId" = 'team-123'
  LIMIT 1
);

-- Then invalidate their cache:
-- They'll get the new features on next page load (or after 5 minutes)
```

---

**Need help?** Check `STRIPE_FIRST_IMPLEMENTATION_SUMMARY.md` for detailed documentation.

