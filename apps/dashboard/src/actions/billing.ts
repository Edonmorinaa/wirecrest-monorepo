/**
 * Dashboard Billing Actions
 * 
 * These are wrapper actions that extract JWT tokens from NextAuth sessions
 * and pass them to the framework-agnostic @wirecrest/billing package.
 * 
 * This layer handles NextAuth-specific concerns, while the billing package
 * remains framework-agnostic and can be used by any Node.js app.
 */

'use server';

import type Stripe from 'stripe';

import { auth } from '@wirecrest/auth-next';
import { getBearerTokenFromSession } from '@/lib/auth/extract-token';
import { 
  createCheckoutSession as createCheckoutSessionCore,
  createCustomerPortalSession as createCustomerPortalSessionCore,
  getBillingAddress as getBillingAddressCore,
  getPaymentMethods as getPaymentMethodsCore,
  getTeamInvoices as getTeamInvoicesCore,
  getTeamSubscriptionInfo as getTeamSubscriptionInfoCore,
  getTierConfigs as getTierConfigsCore,
} from '@wirecrest/billing';

/**
 * Get payment methods for a team
 */
export async function getPaymentMethods(teamId: string) {
  const session = await auth();
  const token = await getBearerTokenFromSession(session);
  return await getPaymentMethodsCore(teamId, token);
}

/**
 * Get team subscription information
 */
export async function getTeamSubscriptionInfo(teamId: string) {
  const session = await auth();
  const token = await getBearerTokenFromSession(session);
  return await getTeamSubscriptionInfoCore(teamId, token);
}

/**
 * Get team invoices
 */
export async function getTeamInvoices(teamId: string) {
  const session = await auth();
  const token = await getBearerTokenFromSession(session);
  return await getTeamInvoicesCore(teamId, token);
}

/**
 * Get billing address for a team
 */
export async function getBillingAddress(teamId: string) {
  const session = await auth();
  const token = await getBearerTokenFromSession(session);
  return await getBillingAddressCore(teamId, token);
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createCustomerPortalSession(
  teamId: string,
  returnUrl: string,
  options?: {
    flowType?: 'subscription_cancel' | 'subscription_update' | 'payment_method_update';
    locale?: string;
    retentionCouponId?: string;
  }
) {
  const session = await auth();
  const token = await getBearerTokenFromSession(session);
  return await createCustomerPortalSessionCore(teamId, token, returnUrl, options);
}

/**
 * Create a Stripe checkout session for subscription payment
 */
export async function createCheckoutSession(
  teamId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const session = await auth();
  const token = await getBearerTokenFromSession(session);
  return await createCheckoutSessionCore(teamId, priceId, successUrl, cancelUrl, token);
}

/**
 * Get tier configurations (doesn't require auth)
 */
export async function getTierConfigs() {
  return await getTierConfigsCore();
}

/**
 * Handle plan selection - creates checkout session for the selected plan
 * This is used for first-time plan selection, not upgrades
 * @param teamId - Team ID
 * @param plan - Selected plan from getTierConfigs (product, price, features)
 */
export async function handlePlanUpgrade(
  teamId: string,
  plan: {
    product: Stripe.Product;
    price: Stripe.Price;
    features: string[];
  }
) {
  console.log('handlePlanUpgrade', plan);
  // Validate inputs
  if (!plan.price.id) {
    throw new Error('Invalid plan: missing price ID');
  }

  if (!plan.product.active) {
    throw new Error('Selected plan is not currently available');
  }

  // Always create a checkout session for plan selection
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3032'}/user/account/billing?success=true`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3032'}/user/account/billing?canceled=true`;
  
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
    cancelUrl
  });
  
  return await createCheckoutSession(
    teamId,
    plan.price.id,
    successUrl,
    cancelUrl
  );
}

// TODO: Add wrappers for other billing functions as needed:
// - createSetupIntent
// - attachPaymentMethod
// - deletePaymentMethod
// - setDefaultPaymentMethod
// - upsertBillingAddress
// - deleteBillingAddress
// - validateBillingAddress

