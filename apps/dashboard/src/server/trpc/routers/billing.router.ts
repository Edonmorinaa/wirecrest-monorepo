/**
 * Billing Router
 * 
 * tRPC router for billing and subscription operations:
 * - Payment methods
 * - Subscription information
 * - Invoices
 * - Billing addresses
 * - Customer portal sessions
 * - Checkout sessions
 * - Plan upgrades
 */

import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  teamIdSchema,
  createCustomerPortalSchema,
  createCheckoutSchema,
  handlePlanUpgradeSchema,
} from '../schemas/billing.schema';
import {
  createCheckoutSession as createCheckoutSessionCore,
  createCustomerPortalSession as createCustomerPortalSessionCore,
  getBillingAddress as getBillingAddressCore,
  getPaymentMethods as getPaymentMethodsCore,
  getTeamInvoices as getTeamInvoicesCore,
  getTeamSubscriptionInfo as getTeamSubscriptionInfoCore,
  getTierConfigs as getTierConfigsCore,
} from '@wirecrest/billing';
import { InvoiceService } from '@wirecrest/billing/server';
import { getBearerTokenFromSession } from 'src/lib/auth/extract-token';

/**
 * Billing Router
 */
export const billingRouter = router({
  /**
   * Get payment methods for a team
   */
  paymentMethods: protectedProcedure
    .input(teamIdSchema)
    .query(async ({ ctx, input }) => {
      const token = await getBearerTokenFromSession(ctx.session);
      return await getPaymentMethodsCore(input.teamId, token);
    }),

  /**
   * Get team subscription information
   */
  subscriptionInfo: protectedProcedure
    .input(teamIdSchema)
    .query(async ({ ctx, input }) => {
      const token = await getBearerTokenFromSession(ctx.session);
      return await getTeamSubscriptionInfoCore(input.teamId, token);
    }),

  /**
   * Get team invoices
   */
  invoices: protectedProcedure
    .input(teamIdSchema)
    .query(async ({ ctx, input }) => {
      const token = await getBearerTokenFromSession(ctx.session);
      return await getTeamInvoicesCore(input.teamId, token);
    }),

  /**
   * Get billing address for a team
   */
  billingAddress: protectedProcedure
    .input(teamIdSchema)
    .query(async ({ ctx, input }) => {
      const token = await getBearerTokenFromSession(ctx.session);
      return await getBillingAddressCore(input.teamId, token);
    }),

  /**
   * Create a Stripe Customer Portal session
   */
  createPortalSession: protectedProcedure
    .input(createCustomerPortalSchema)
    .mutation(async ({ ctx, input }) => {
      const token = await getBearerTokenFromSession(ctx.session);
      return await createCustomerPortalSessionCore(
        input.teamId,
        token,
        input.returnUrl,
        input.options
      );
    }),

  /**
   * Create a Stripe checkout session for subscription payment
   */
  createCheckoutSession: protectedProcedure
    .input(createCheckoutSchema)
    .mutation(async ({ ctx, input }) => {
      const token = await getBearerTokenFromSession(ctx.session);
      return await createCheckoutSessionCore(
        input.teamId,
        input.priceId,
        input.successUrl,
        input.cancelUrl,
        token
      );
    }),

  /**
   * Get tier configurations (public, no auth required)
   */
  tierConfigs: publicProcedure.query(async () => {
    return await getTierConfigsCore();
  }),

  /**
   * Handle plan upgrade - creates checkout session for the selected plan
   */
  handlePlanUpgrade: protectedProcedure
    .input(handlePlanUpgradeSchema)
    .mutation(async ({ ctx, input }) => {
      const { teamId, plan } = input;

      // Validate inputs
      if (!plan.price.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid plan: missing price ID',
        });
      }

      if (!plan.product.active) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected plan is not currently available',
        });
      }

      // Create checkout session URLs
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3032';
      const successUrl = `${baseUrl}/user/account/billing?success=true`;
      const cancelUrl = `${baseUrl}/user/account/billing?canceled=true`;

      console.log('Creating checkout session with:', {
        teamId,
        priceId: plan.price.id,
        productId: plan.product.id,
        productName: plan.product.name,
        amount: plan.price.unit_amount,
        currency: plan.price.currency,
        interval: plan.price.recurring?.interval,
        features: plan.features,
        successUrl,
        cancelUrl,
      });

      const token = await getBearerTokenFromSession(ctx.session);
      return await createCheckoutSessionCore(
        teamId,
        plan.price.id,
        successUrl,
        cancelUrl,
        token
      );
    }),

  /**
   * Get all Stripe data (products, prices, tax rates, service options)
   * Used for displaying available plans and pricing
   */
  getStripeData: protectedProcedure.query(async () => {
    try {
      const invoiceService = new InvoiceService();
      const data = await invoiceService.getAllInvoiceData();
      return data;
    } catch (error) {
      console.error('Failed to fetch Stripe data:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch Stripe data',
        cause: error,
      });
    }
  }),
});

