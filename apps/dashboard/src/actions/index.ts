/**
 * Server Actions Index
 * 
 * Central export for all server actions.
 * These replace the old /api/tenants routes.
 */

// Tenant Quotas
export {
  checkQuotaExceeded,
  configureDemoQuotas,
  getTenantQuotaUsage,
  clearTenantQuotaCache,
  type DemoQuotasResponse,
  type QuotaUsageResponse,
} from './tenant-quotas';

// Tenant Features
export {
  getTenantFeatures,
  checkSingleFeature,
  checkTenantFeatures,
  type CheckFeaturesResponse,
  type TenantFeaturesResponse,
  invalidateTenantFeatureCache,
} from './tenant-features';
