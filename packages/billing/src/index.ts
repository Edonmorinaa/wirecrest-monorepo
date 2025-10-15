/**
 * @wirecrest/billing
 * Comprehensive billing and subscription management with Stripe integration
 */


// Core services
export { BillingService } from './billing-service';
export { StripeService } from './stripe-service';
export { ProductService } from './product-service';

// Centralized Stripe instance
export { StripeService as getStripeInstance } from './stripe-service';
export { PaymentMethodService } from './payment-method-service';
export { SubscriptionFeaturesService } from './subscription-features-service';
export { BillingAddressService } from './billing-address-service';
export { SubscriptionManagementService } from './subscription-management-service';
export { CustomerPortalService } from './customer-portal-service';
export { TaxService } from './tax-service';
export { UsageTrackingService } from './usage-tracking-service';
export { TrialDemoService } from './trial-demo-service';
export { AccessTokenService } from './access-token-service';
export { InvoiceService } from './invoice-service';

// Note: UI components have been removed from this package
// Use the business logic functions in your application's UI components
// See apps/dashboard/src/sections/account/ for implementation examples

// React hooks
export {
  useSubscription,
  useUsageAnalytics,
  useQuotaCheck,
  useSubscriptionCalculator,
  useUpgradeSubscription,
  useAccessToken,
  useBillingGate,
  useFeatureAccess,
} from './hooks';

// Admin components (only for client-side usage)
// Note: These are React components and should not be imported in server-side code
// export {
//   TeamSubscriptionManager,
//   BillingOverrideManager,
//   AccessTokenManager,
// } from './admin-components';

// Server actions
export * from './actions';

// Admin server actions
export * from './admin-actions';

// Types and constants
export * from './types';

// Feature access system (deprecated feature-access removed - use StripeFirstSubscriptionService)
// export * from './feature-access'; // REMOVED - deprecated
export * from './feature-flags';
// export * from './hooks/use-feature-access'; // REMOVED - depends on deleted feature-access
// export * from './middleware/feature-gate'; // REMOVED - depends on deleted feature-access

// Stripe synchronization services
export { StripeSyncService, createStripeSyncService } from './stripe-sync';

// Feature Flags System (Stripe Product Features)
export {
  StripeFeatureLookupKeys,
  getAllStripeFeatureKeys,
  isValidStripeFeatureKey,
  type StripeFeatureLookupKey,
} from './stripe-features';

export {
  ProductFeaturesService,
  createProductFeaturesService,
  type ProductFeaturesConfig,
} from './product-features';

export {
  FeatureChecker,
  createFeatureChecker,
  getGlobalFeatureChecker,
  setGlobalFeatureChecker,
  resetGlobalFeatureChecker,
  type FeatureCheckResult,
} from './feature-checker';

export {
  ProductWebhookHandler,
  createProductWebhookHandler,
  type ProductWebhookConfig,
} from './product-webhook';

// Cache invalidation service
export {
  CacheInvalidationService,
  getCacheInvalidationService,
  invalidateTeamCacheImmediately,
  clearAllCachesImmediately
} from './cache-invalidation-service';

export {
  RedisCacheService,
  getGlobalRedisCache,
  resetGlobalRedisCache,
  type CacheEntry
} from './redis-cache';

// Default export for convenience
export { BillingService as default } from './billing-service';
