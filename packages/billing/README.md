# Billing Package - Feature Flag Integration

This package has been extended with comprehensive feature flag synchronization capabilities, including Stripe integration, custom plan creation, and webhook handling.

## New Features

### Stripe Synchronization

- **StripeSyncService**: Reads Stripe Product/Price metadata for feature resolution
- **FeatureSyncService**: Applies plan defaults to tenant configurations
- **CustomPlanService**: Creates tenant-specific Stripe products with custom features
- **StripeWebhookHandler**: Processes Stripe events for automatic feature updates

### Key Components

#### StripeSyncService

```typescript
import { createStripeSyncService } from '@packages/billing';

const stripeSync = createStripeSyncService(stripe);

// Get plan defaults from Stripe
const planMetadata = await stripeSync.getPlanDefaultsFromStripe('plan_pro');

// Get active subscription for customer
const subscription = await stripeSync.getActiveSubscription('cus_123');

// Get all customers with subscriptions
const customers = await stripeSync.getCustomersWithSubscriptions(100);
```

#### FeatureSyncService

```typescript
import { createFeatureSyncService } from '@packages/billing';

const featureSync = createFeatureSyncService(prisma, stripeSync);

// Apply plan defaults to tenant
const result = await featureSync.applyPlanDefaultsToTenant(
  'tenant-123',
  'plan_pro',
  { force: false, mergeStrategy: 'merge' }
);

// Sync all tenants from Stripe
const summary = await featureSync.syncAllTenantsFromStripe({
  force: false,
  mergeStrategy: 'merge',
  limit: 100
});
```

#### CustomPlanService

```typescript
import { createCustomPlanService } from '@packages/billing';

const customPlanService = createCustomPlanService(stripe, prisma);

// Create custom enterprise plan
const result = await customPlanService.createCustomEnterprisePlan({
  tenantId: 'tenant-123',
  basePlanId: 'plan_enterprise',
  priceCents: 120000,
  currency: 'usd',
  recurringInterval: 'month',
  overrides: {
    'platform.whiteLabel': true,
    'platform.customIntegrations': true
  },
  planName: 'Acme Enterprise Custom'
});
```

#### StripeWebhookHandler

```typescript
import { createStripeWebhookHandler } from '@packages/billing';

const webhookHandler = createStripeWebhookHandler(
  stripe,
  prisma,
  featureSync,
  webhookSecret
);

// Handle webhook
const result = await webhookHandler.handleWebhook(payload, signature);
```

## Migration Script

### Populate from Stripe Metadata

```bash
# Dry run first
yarn workspace @packages/billing run migrate-stripe-metadata-to-db --dry-run

# Run migration
yarn workspace @packages/billing run migrate-stripe-metadata-to-db --force

# Specific tenant
yarn workspace @packages/billing run migrate-stripe-metadata-to-db --tenant-id=tenant-123
```

### Migration Options

- `--dry-run`: Preview changes without applying
- `--force`: Overwrite existing configurations
- `--tenant-id`: Process specific tenant only
- `--limit`: Limit number of tenants to process

## Stripe Plan Metadata Format

### Product Metadata

```json
{
  "bundle": "pro",
  "features": "google.reviews,facebook.overview,twitter.alerts",
  "featuresJson": "{\"google.reviews\": true, \"facebook.overview\": true}",
  "scrapeIntervalHours": "4",
  "custom": "false"
}
```

### Price Metadata

```json
{
  "tenantId": "tenant-123",
  "custom": "true",
  "features": "{\"platform.whiteLabel\": true}"
}
```

## Webhook Events

### Supported Events

- `customer.subscription.created`: Apply plan defaults
- `customer.subscription.updated`: Update features if plan changed
- `customer.subscription.deleted`: Disable all features
- `invoice.payment_succeeded`: Log successful payment
- `invoice.payment_failed`: Handle payment failure
- `customer.subscription.trial_will_end`: Handle trial ending

### Webhook Configuration

```typescript
// Environment variables
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SECRET_KEY=sk_...

// Webhook endpoint
POST /api/stripe/webhook
```

## Custom Plan Creation

### Process Flow

1. **Validate Request**: Check tenant exists and request is valid
2. **Get Base Plan**: Retrieve base plan from Stripe
3. **Create Product**: Create custom Stripe product with tenant metadata
4. **Create Price**: Create custom Stripe price for the product
5. **Update Features**: Update tenant feature configuration
6. **Create Checkout**: Generate checkout session (optional)

### Example Usage

```typescript
const customPlan = await customPlanService.createCustomEnterprisePlan({
  tenantId: 'tenant-123',
  basePlanId: 'plan_enterprise',
  priceCents: 120000,
  currency: 'usd',
  recurringInterval: 'month',
  overrides: {
    'platform.whiteLabel': true,
    'platform.customIntegrations': true,
    'platform.prioritySupport': true
  },
  planName: 'Acme Enterprise Custom'
});

// Result includes product ID, price ID, and checkout URL
console.log(customPlan.productId);
console.log(customPlan.priceId);
console.log(customPlan.checkoutUrl);
```

## Error Handling

### Common Errors

1. **Plan Not Found**: Base plan doesn't exist in Stripe
2. **Tenant Not Found**: Tenant doesn't exist in database
3. **Invalid Features**: Feature keys not recognized
4. **Stripe API Errors**: Rate limits, authentication issues
5. **Database Errors**: Connection issues, constraint violations

### Error Recovery

```typescript
try {
  const result = await featureSync.applyPlanDefaultsToTenant(tenantId, planId);
  if (!result.success) {
    console.error('Failed to apply plan defaults:', result.reason);
    // Implement retry logic or fallback
  }
} catch (error) {
  console.error('Feature sync error:', error);
  // Log error and continue with other tenants
}
```

## Performance Considerations

### Caching

- Stripe API calls are cached to reduce latency
- Feature resolution results are cached in Redis
- Database queries are optimized with proper indexing

### Rate Limiting

- Stripe API calls are rate-limited to avoid hitting limits
- Webhook processing is batched when possible
- Database operations are optimized for bulk updates

### Monitoring

```typescript
// Get sync statistics
const stats = await stripeSync.getPlanStatistics();
console.log('Total products:', stats.totalProducts);
console.log('Products with features:', stats.productsWithFeatures);
console.log('Custom plans:', stats.customPlans);
```

## Testing

### Unit Tests

```bash
yarn test packages/billing/src/stripe-sync.test.ts
yarn test packages/billing/src/feature-sync.test.ts
yarn test packages/billing/src/custom-plan.test.ts
```

### Integration Tests

```bash
yarn test packages/billing/src/webhooks/stripeWebhookHandler.test.ts
```

### Manual Testing

```bash
# Test Stripe sync
yarn workspace @packages/billing run migrate-stripe-metadata-to-db --dry-run

# Test webhook endpoint
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Security

### Webhook Security

- Stripe webhook signatures are validated
- Webhook secret is stored securely
- Event processing is idempotent

### Data Protection

- Tenant data is isolated
- Feature metadata is encrypted in transit
- Audit logs track all changes

### Access Control

- Admin endpoints require proper authentication
- Tenant isolation is enforced
- Custom plan creation is restricted to authorized users

## Deployment

### Environment Variables

```bash
# Required
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...

# Optional
REDIS_URL=redis://...
STRIPE_PUBLISHABLE_KEY=pk_...
```

### Database Migration

```bash
# Run migration
cd packages/db
npx prisma migrate dev --name add_tenant_features

# Generate Prisma client
npx prisma generate
```

### Webhook Setup

1. **Configure Stripe webhook endpoint**
2. **Set webhook secret in environment**
3. **Test webhook endpoint**
4. **Monitor webhook events in Stripe dashboard**

## Troubleshooting

### Common Issues

1. **Webhook Failures**: Check signature validation and endpoint URL
2. **Sync Failures**: Verify Stripe API keys and database connectivity
3. **Cache Issues**: Clear Redis cache and restart services
4. **Migration Issues**: Check database permissions and constraints

### Debug Commands

```bash
# Check Stripe connection
stripe customers list --limit 1

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check Redis connection
redis-cli ping

# Test webhook endpoint
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Support

For issues related to the feature flag system:

1. Check the [Feature Flag Runbook](../docs/feature-flag-runbook.md)
2. Review application logs for errors
3. Test individual components in isolation
4. Contact the engineering team for assistance

---

**Last Updated**: [Date]
**Version**: 1.0.0
**Maintained By**: Wirecrest Engineering Team
