/**
 * Billing Server Actions - Token-Based Auth
 * 
 * IMPORTANT: This package is framework-agnostic and depends ONLY on @wirecrest/auth-core
 * 
 * All functions require a JWT token parameter for authentication.
 * This makes the package usable from any Node.js environment (Next.js, Express, etc.)
 * 
 * Usage in Dashboard (Next.js):
 *   Create wrapper actions in apps/dashboard/src/actions/billing.ts:
 *   
 *   'use server';
 *   import { auth } from '@wirecrest/auth-next';
 *   import { getPaymentMethods as getPaymentMethodsCore } from '@wirecrest/billing/server';
 *   import { extractTokenFromSession } from '@/lib/auth/extract-token';
 *   
 *   export async function getPaymentMethods(teamId: string) {
 *     const session = await auth();
 *     const token = await extractTokenFromSession(session);
 *     return await getPaymentMethodsCore(teamId, token);
 *   }
 * 
 * Usage in Scraper (Express):
 *   import { getPaymentMethods } from '@wirecrest/billing/server';
 *   
 *   app.get('/api/billing/:teamId/methods', authenticate, async (req, res) => {
 *     const token = req.authToken; // From Bearer header via middleware
 *     const methods = await getPaymentMethods(req.params.teamId, token);
 *     res.json(methods);
 *   });
 */

'use server';

import Stripe from 'stripe';
import { requireAuth } from '@wirecrest/auth-core';
import { prisma } from '@wirecrest/db';
import { PaymentMethodService } from '../services/index.js';
import { BillingAddressService } from '../services/billing-address-service.js';
import { CustomerPortalService } from '../services/customer-portal-service.js';
import { StripeFirstSubscriptionService } from '../services/stripe-first-subscription-service.js';
import { StripeService } from '../services/stripe-service.js';
import { 
  PaymentMethodData, 
  BillingAddressData,
} from '../../shared/types/index.js';

// =============================================================================
// PAYMENT METHOD ACTIONS
// =============================================================================

/**
 * List payment methods for a team
 * @param teamId - Team ID
 * @param token - JWT token for authentication (required)
 */
export async function getPaymentMethods(teamId: string, token: string): Promise<PaymentMethodData[]> {
  const session = await requireAuth(token);

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!teamMember) {
    throw new Error('Access denied');
  }

  try {
    const paymentMethodService = new PaymentMethodService();
    return await paymentMethodService.listPaymentMethods(teamId);
  } catch (error) {
    console.error('Failed to fetch payment methods:', error);
    throw new Error('Failed to fetch payment methods');
  }
}

// =============================================================================
// TIER CONFIGURATION ACTIONS
// =============================================================================

/**
 * Get all subscription products directly from Stripe
 * Returns only active subscription products (excludes FREE tier)
 */
export async function getTierConfigs(): Promise<Array<{
  product: Stripe.Product;
  price: Stripe.Price;
  features: string[];
}>> {
  try {
    const stripe = StripeService.getStripeInstance();
    
    console.log('📡 Fetching products from Stripe...');
    
    // Fetch all active products from Stripe
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
      limit: 100,
    });

    console.log(`✅ Fetched ${products.data.length} products from Stripe`);

    // Fetch all active recurring prices (subscriptions only)
    const prices = await stripe.prices.list({
      active: true,
      type: 'recurring',
      limit: 100,
    });

    console.log(`✅ Fetched ${prices.data.length} recurring prices from Stripe`);

    // Create a map of product ID to prices
    const pricesByProduct = new Map<string, Stripe.Price[]>();
    prices.data.forEach(price => {
      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      if (!pricesByProduct.has(productId)) {
        pricesByProduct.set(productId, []);
      }
      pricesByProduct.get(productId)!.push(price);
    });

    // Build tier configs from Stripe products
    const tierConfigs: Array<{
      product: Stripe.Product;
      price: Stripe.Price;
      features: string[];
    }> = [];

    for (const product of products.data) {
      // Skip FREE tier products (check metadata or name)
      const tier = product.metadata?.tier?.toUpperCase();
      
      console.log(`🔍 Processing product: ${product.name} (ID: ${product.id}), tier: ${tier || 'NO_TIER'}`);
      
      if (tier === 'FREE') {
        console.log(`  ⏭️  Skipping FREE tier product`);
        continue;
      }

      // Get the primary price for this product
      const productPrices = pricesByProduct.get(product.id) || [];
      console.log(`  📋 Found ${productPrices.length} prices for this product`);
      
      const primaryPrice = productPrices.find(p => p.id === product.default_price) || productPrices[0];

      if (!primaryPrice) {
        console.warn(`  ⚠️  No price found for product ${product.id} (${product.name})`);
        continue;
      }
      
      console.log(`  ✅ Selected price: ${primaryPrice.id}, amount: ${primaryPrice.unit_amount}`);

      // Extract features from product metadata
      let features: string[] = [];
      try {
        if (product.metadata?.featureFlags) {
          features = JSON.parse(product.metadata.featureFlags);
        }
      } catch (error) {
        console.warn(`Failed to parse features for product ${product.id}:`, error);
        features = [];
      }

      tierConfigs.push({
        product,
        price: primaryPrice,
        features,
      });
    }

    // Sort by price amount (ascending)
    tierConfigs.sort((a, b) => {
      const priceA = a.price.unit_amount || 0;
      const priceB = b.price.unit_amount || 0;
      return priceA - priceB;
    });

    console.log(`\n📊 Final tier configs count: ${tierConfigs.length}`);
    if (tierConfigs.length > 0) {
      tierConfigs.forEach((config, idx) => {
        console.log(`  ${idx + 1}. ${config.product.name} - $${(config.price.unit_amount || 0) / 100}/${config.price.recurring?.interval}`);
      });
    } else {
      console.warn('⚠️  No tier configs found! You may need to create products in Stripe.');
      console.log('💡 Run: npx tsx packages/billing/scripts/initialize-products.ts');
    }

    return tierConfigs;
  } catch (error) {
    console.error('❌ Failed to fetch tier configurations:', error);
    throw new Error('Failed to fetch tier configurations');
  }
}

// =============================================================================
// SUBSCRIPTION ACTIONS
// =============================================================================

/**
 * Get team subscription info
 * @param teamId - Team ID
 * @param token - JWT token for authentication (required)
 */
export async function getTeamSubscriptionInfo(teamId: string, token: string): Promise<{
  tier: string;
  status: string;
  enabledFeatures: string[];
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    currentPeriodStart: number;
    cancelAtPeriodEnd: boolean;
  };
}> {
  const session = await requireAuth(token);

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!teamMember) {
    throw new Error('Access denied');
  }

  try {
    const service = new StripeFirstSubscriptionService();
    return await service.getSubscriptionInfo(teamId);
  } catch (error) {
    console.error('Failed to get team subscription info:', error);
    throw new Error('Failed to get team subscription info');
  }
}

/**
 * Get team invoices from Stripe
 * @param teamId - Team ID
 * @param token - JWT token for authentication (required)
 */
export async function getTeamInvoices(teamId: string, token: string): Promise<Array<{
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  created: number;
  dueDate?: number;
  paidAt?: number;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
}>> {
  const session = await requireAuth(token);

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!teamMember) {
    throw new Error('Access denied');
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { stripeCustomerId: true },
    });

    if (!team?.stripeCustomerId) {
      return [];
    }

    // Use Stripe directly to get invoices
    const stripeService = new StripeFirstSubscriptionService();
    const stripe = (stripeService as any).stripe;
    const invoices = await stripe.invoices.list({
      customer: team.stripeCustomerId,
      limit: 100,
    });

    return invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number || '',
      status: invoice.status || 'draft',
      amount: invoice.amount_paid || 0,
      currency: invoice.currency,
      created: invoice.created,
      dueDate: invoice.due_date,
      paidAt: invoice.status_transitions?.paid_at,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    }));
  } catch (error) {
    console.error('Failed to get team invoices:', error);
    throw new Error('Failed to get team invoices');
  }
}


// =============================================================================
// BILLING ADDRESS ACTIONS
// =============================================================================

/**
 * Get billing address for a team
 * @param teamId - Team ID
 * @param token - JWT token for authentication (required)
 */
export async function getBillingAddress(teamId: string, token: string): Promise<BillingAddressData | null> {
  const session = await requireAuth(token);

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!teamMember) {
    throw new Error('Access denied');
  }

  try {
    const billingAddressService = new BillingAddressService();
    return await billingAddressService.getBillingAddress(teamId);
  } catch (error) {
    console.error('Failed to get billing address:', error);
    throw new Error('Failed to get billing address');
  }
}

// =============================================================================
// CHECKOUT SESSION ACTIONS
// =============================================================================

/**
 * Create a Stripe checkout session for subscription payment
 * @param teamId - Team ID
 * @param priceId - Stripe price ID
 * @param successUrl - URL to redirect to on success
 * @param cancelUrl - URL to redirect to on cancel
 * @param token - JWT token for authentication (required)
 */
export async function createCheckoutSession(
  teamId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  token: string
): Promise<{
  url: string;
  sessionId: string;
}> {
  const session = await requireAuth(token);

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    include: {
      team: true,
    },
  });

  if (!teamMember) {
    throw new Error('Team not found or insufficient permissions');
  }

  const team = teamMember.team;

  // Get or create Stripe customer
  let customerId = team.stripeCustomerId;

  if (!customerId) {
    // Create a new customer
    const stripe = StripeService.getStripeInstance();
    const customer = await stripe.customers.create({
      email: session.user.email || undefined,
      name: team.name,
      metadata: {
        teamId: team.id,
      },
    });
    customerId = customer.id;

    // Update team with customer ID
    await prisma.team.update({
      where: { id: team.id },
      data: {
        stripeCustomerId: customerId,
      },
    });
    
    console.log(`✅ Created Stripe customer ${customerId} for team ${team.id}`);
  }

  // Check for any existing subscriptions in Stripe for this customer
  const stripe = StripeService.getStripeInstance();
  const existingSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  });

  // Cancel any incomplete or unpaid subscriptions
  for (const sub of existingSubscriptions.data) {
    if (['incomplete', 'incomplete_expired', 'unpaid'].includes(sub.status)) {
      console.log(`🧹 Canceling incomplete subscription: ${sub.id} (status: ${sub.status})`);
      try {
        await stripe.subscriptions.cancel(sub.id);
        console.log(`✅ Canceled incomplete subscription: ${sub.id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cancel subscription ${sub.id}:`, error);
      }
    } else if (['active', 'trialing', 'past_due'].includes(sub.status)) {
      // Customer already has an active subscription
      console.warn(`⚠️ Team ${team.id} already has active subscription ${sub.id}`);
      throw new Error('Customer already has an active subscription in Stripe');
    }
  }

  // Validate priceId before creating checkout session
  if (!priceId) {
    throw new Error('Price ID is required to create checkout session');
  }

  // Verify the price exists in Stripe
  try {
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active) {
      throw new Error(`Price ${priceId} is not active`);
    }
  } catch (error) {
    console.error(`Invalid price ID: ${priceId}`, error);
    throw new Error(`Invalid price ID: ${priceId}. Please check your plan configuration.`);
  }

  // Create checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      teamId: team.id,
    },
    subscription_data: {
      metadata: {
        teamId: team.id,
      },
    },
    payment_method_collection: 'always',
    billing_address_collection: 'auto',
  });

  return {
    url: checkoutSession.url!,
    sessionId: checkoutSession.id,
  };
}

// =============================================================================
// CUSTOMER PORTAL ACTIONS
// =============================================================================

/**
 * Create a Customer Portal session for team billing management
 * @param teamId - Team ID
 * @param token - JWT token for authentication (required)
 * @param returnUrl - URL to return to after portal session
 * @param options - Optional configuration for portal session
 */
export async function createCustomerPortalSession(
  teamId: string,
  token: string,
  returnUrl: string,
  options: {
    flowType?: 'subscription_cancel' | 'subscription_update' | 'payment_method_update';
    locale?: string;
    retentionCouponId?: string;
  } = {}
): Promise<{ success: boolean; url?: string }> {
  const session = await requireAuth(token);

  // Verify team membership with billing access
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions to access billing portal');
  }

  try {
    const portalService = new CustomerPortalService();
    const session = await portalService.createPortalSession({
      teamId,
      returnUrl,
      locale: options.locale,
      flowData: options.flowType ? {
        type: options.flowType,
      } : undefined,
    });

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    console.error('Failed to create customer portal session:', error);
    throw new Error(`Failed to create billing portal session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
