/**
 * tRPC Root Router
 * 
 * This is the main router that combines all sub-routers.
 * Export the AppRouter type for client-side type inference.
 */

import { router } from './trpc';
import { teamsRouter } from './routers/teams.router';
import { reviewsRouter } from './routers/reviews.router';
import { billingRouter } from './routers/billing.router';
import { healthRouter } from './routers/health.router';
import { utilsRouter } from './routers/utils.router';
import { aiRouter } from './routers/ai.router';
import { invoicesRouter } from './routers/invoices.router';
import { notificationsRouter } from './routers/notifications.router';
import { webhooksRouter } from './routers/webhooks.router';
import { superadminRouter } from './routers/superadmin.router';
import { tenantsRouter } from './routers/tenants.router';
import { tenantFeaturesRouter } from './routers/tenant-features.router';
import { tenantQuotasRouter } from './routers/tenant-quotas.router';
import { oauthRouter } from './routers/oauth.router';
import { dsyncRouter } from './routers/dsync.router';
import { adminRouter } from './routers/admin.router';
import { platformsRouter } from './routers/platforms.router';

/**
 * Root tRPC router
 * All sub-routers are included here
 */
export const appRouter = router({
  teams: teamsRouter,
  reviews: reviewsRouter,
  billing: billingRouter,
  health: healthRouter,
  utils: utilsRouter,
  ai: aiRouter,
  notifications: notificationsRouter,
  webhooks: webhooksRouter,
  superadmin: superadminRouter,
  tenants: tenantsRouter,
  tenantFeatures: tenantFeaturesRouter,
  tenantQuotas: tenantQuotasRouter,
  oauth: oauthRouter,
  dsync: dsyncRouter,
  admin: adminRouter,
  platforms: platformsRouter,
  invoices: invoicesRouter,
});

/**
 * Export type definition of the API
 * This is used by the client to get type-safety and autocompletion
 */
export type AppRouter = typeof appRouter;

