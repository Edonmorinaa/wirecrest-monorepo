/**
 * Billing Server Actions
 * Server-side actions for billing operations
 */

'use server';

import { auth } from '@wirecrest/auth/server';
import { prisma } from '@wirecrest/db';
import { ProductService, PaymentMethodService, BillingService } from './index';
import { SubscriptionFeaturesService } from './subscription-features-service';
import { BillingAddressService } from './billing-address-service';
import { SubscriptionManagementService } from './subscription-management-service';
import { CustomerPortalService } from './customer-portal-service';
import { TaxService } from './tax-service';
import { UsageTrackingService } from './usage-tracking-service';
import { TrialDemoService } from './trial-demo-service';
import { 
  ProductData, 
  PaymentMethodData, 
  SetupIntentResult, 
  AttachPaymentMethodResult,
  BillingAddressData,
  SubscriptionTier,
  StripeTierMetadata,
  TierMetadata,
  parseTierMetadata
} from './types';

// Product Actions

/**
 * Initialize Stripe products (Admin only)
 */
export async function initializeProducts(): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.superRole !== 'ADMIN') {
    throw new Error('Admin access required');
  }

  try {
    const productService = new ProductService();
    await productService.initialize();
    
    return { 
      success: true, 
      message: 'Products initialized successfully' 
    };
  } catch (error) {
    console.error('Failed to initialize products:', error);
    throw new Error('Failed to initialize products');
  }
}

/**
 * Get all available subscription products
 */
export async function getProducts(): Promise<ProductData[]> {
  try {
    const productService = new ProductService();
    return await productService.getAllProducts();
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw new Error('Failed to fetch products');
  }
}

/**
 * Get product by tier
 */
export async function getProductByTier(tier: SubscriptionTier): Promise<ProductData | null> {
  try {
    const productService = new ProductService();
    return await productService.getProductByTier(tier);
  } catch (error) {
    console.error('Failed to fetch product by tier:', error);
    throw new Error('Failed to fetch product by tier');
  }
}

// Payment Method Actions

/**
 * Create setup intent for payment method collection
 */
export async function createSetupIntent(teamId: string): Promise<SetupIntentResult> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!teamMember) {
    throw new Error('Access denied');
  }

  try {
    const paymentMethodService = new PaymentMethodService();
    return await paymentMethodService.createSetupIntent(teamId);
  } catch (error) {
    console.error('Failed to create setup intent:', error);
    throw new Error('Failed to create setup intent');
  }
}

/**
 * Attach payment method after successful setup
 */
export async function attachPaymentMethod(
  teamId: string,
  setupIntentId: string,
  nickname?: string
): Promise<AttachPaymentMethodResult> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!teamMember) {
    throw new Error('Access denied');
  }

  try {
    const paymentMethodService = new PaymentMethodService();
    return await paymentMethodService.attachPaymentMethod(teamId, setupIntentId, nickname);
  } catch (error) {
    console.error('Failed to attach payment method:', error);
    throw new Error('Failed to attach payment method');
  }
}

/**
 * List payment methods for a team
 */
export async function getPaymentMethods(teamId: string): Promise<PaymentMethodData[]> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

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

/**
 * Update payment method
 */
export async function updatePaymentMethod(
  teamId: string,
  paymentMethodId: string,
  updates: { nickname?: string; setAsDefault?: boolean }
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!teamMember) {
    throw new Error('Access denied');
  }

  try {
    const paymentMethodService = new PaymentMethodService();

    // Update nickname if provided
    if (updates.nickname !== undefined) {
      await paymentMethodService.updatePaymentMethodNickname(teamId, paymentMethodId, updates.nickname);
    }

    // Set as default if requested
    if (updates.setAsDefault) {
      await paymentMethodService.setDefaultPaymentMethod(teamId, paymentMethodId);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update payment method:', error);
    throw new Error('Failed to update payment method');
  }
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  teamId: string,
  paymentMethodId: string
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const paymentMethodService = new PaymentMethodService();
    await paymentMethodService.setDefaultPaymentMethod(teamId, paymentMethodId);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to set default payment method:', error);
    throw new Error('Failed to set default payment method');
  }
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(
  teamId: string,
  paymentMethodId: string
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!teamMember) {
    throw new Error('Access denied');
  }

  try {
    const paymentMethodService = new PaymentMethodService();
    await paymentMethodService.deletePaymentMethod(teamId, paymentMethodId);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete payment method:', error);
    throw new Error('Failed to delete payment method');
  }
}

/**
 * Get default payment method for a team
 */
export async function getDefaultPaymentMethod(teamId: string): Promise<PaymentMethodData | null> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

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
    return await paymentMethodService.getDefaultPaymentMethod(teamId);
  } catch (error) {
    console.error('Failed to fetch default payment method:', error);
    throw new Error('Failed to fetch default payment method');
  }
}

// Tier Configuration Actions

/**
 * Create or update subscription tier configuration (Admin only)
 * Updates both local database and Stripe product metadata
 */
export async function upsertTierConfig(tierData: {
  tier: SubscriptionTier;
  name: string;
  description?: string;
  basePrice: number;
  billingInterval: string;
  includedSeats: number;
  includedLocations: number;
  includedRefreshes: number;
  pricePerSeat: number;
  pricePerLocation: number;
  pricePerRefresh: number;
  enabledFeatures: string[];
  popular?: boolean;
  highlighted?: boolean;
  sortOrder?: number;
  active?: boolean;
}): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.superRole !== 'ADMIN') {
    throw new Error('Admin access required');
  }

  try {
    // Update local database
    await prisma.subscriptionTierConfig.upsert({
      where: { tier: tierData.tier },
      create: {
        tier: tierData.tier,
        name: tierData.name,
        description: tierData.description,
        basePrice: tierData.basePrice,
        billingInterval: tierData.billingInterval,
        includedSeats: tierData.includedSeats,
        includedLocations: tierData.includedLocations,
        includedRefreshes: tierData.includedRefreshes,
        pricePerSeat: tierData.pricePerSeat,
        pricePerLocation: tierData.pricePerLocation,
        pricePerRefresh: tierData.pricePerRefresh,
        enabledFeatures: tierData.enabledFeatures,
        popular: tierData.popular || false,
        highlighted: tierData.highlighted || false,
        sortOrder: tierData.sortOrder || 0,
        active: tierData.active !== false,
      },
      update: {
        name: tierData.name,
        description: tierData.description,
        basePrice: tierData.basePrice,
        billingInterval: tierData.billingInterval,
        includedSeats: tierData.includedSeats,
        includedLocations: tierData.includedLocations,
        includedRefreshes: tierData.includedRefreshes,
        pricePerSeat: tierData.pricePerSeat,
        pricePerLocation: tierData.pricePerLocation,
        pricePerRefresh: tierData.pricePerRefresh,
        enabledFeatures: tierData.enabledFeatures,
        popular: tierData.popular || false,
        highlighted: tierData.highlighted || false,
        sortOrder: tierData.sortOrder || 0,
        active: tierData.active !== false,
      },
    });

    // Update Stripe product metadata if it exists
    const productService = new ProductService();
    const existingProduct = await productService.getProductByTier(tierData.tier);
    
    if (existingProduct) {
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-09-30.clover',
        typescript: true,
      });

      await stripe.products.update(existingProduct.stripeProductId, {
        name: tierData.name,
        description: tierData.description,
        metadata: {
          // Core tier info
          tier: tierData.tier,
          
          // Pricing configuration
          basePrice: tierData.basePrice.toString(),
          billingInterval: tierData.billingInterval,
          
          // Included limits
          includedSeats: tierData.includedSeats.toString(),
          includedLocations: tierData.includedLocations.toString(),
          includedRefreshes: tierData.includedRefreshes.toString(),
          
          // Per-unit pricing
          pricePerSeat: tierData.pricePerSeat.toString(),
          pricePerLocation: tierData.pricePerLocation.toString(),
          pricePerRefresh: tierData.pricePerRefresh.toString(),
          
          // Feature Flag names (JSON string since Stripe metadata values must be strings)
          featureFlags: JSON.stringify(tierData.enabledFeatures),
          
          // Display options
          popular: (tierData.popular || false).toString(),
          highlighted: (tierData.highlighted || false).toString(),
          sortOrder: (tierData.sortOrder || 0).toString(),
        },
      });

      console.log(`✅ Updated Stripe product metadata for ${tierData.name}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to upsert tier config:', error);
    throw new Error('Failed to upsert tier config');
  }
}

/**
 * Get all tier configurations from Stripe (source of truth)
 */
export async function getTierConfigs(): Promise<Array<{
  id: string;
  tier: SubscriptionTier;
  name: string;
  description?: string;
  basePrice: number;
  billingInterval: 'month' | 'year';
  includedSeats: number;
  includedLocations: number;
  includedRefreshes: number;
  pricePerSeat: number;
  pricePerLocation: number;
  pricePerRefresh: number;
  enabledFeatures: string[];
  popular: boolean;
  highlighted: boolean;
  sortOrder: number;
  active: boolean;
  stripeProductId: string;
  stripePriceId?: string;
}>> {
  try {
    const productService = new ProductService();
    const products = await productService.getAllProducts();
    
    // Convert ProductData to tier config format and ensure we have valid price IDs
    const tierConfigs = await Promise.all(
      products
        .filter(product => product.tier && product.metadata)
        .map(async (product) => {
          let stripePriceId = product.stripePriceId;
          
          // If no price ID in database, fetch it from Stripe
          if (!stripePriceId) {
            try {
              const prices = await productService.getProductPrices(product.stripeProductId);
              
              if (prices.length > 0) {
                stripePriceId = prices[0].id;
              }
            } catch (error) {
              console.warn(`Failed to fetch price for product ${product.stripeProductId}:`, error);
            }
          }
          
          // Parse metadata using utility function
          const tierConfig = product.metadata;
          
          return {
            id: product.id,
            tier: product.tier!,
            stripePriceId,
            name: product.name,
            description: product.description,
            basePrice: product.price.amount / 100, // Convert from cents
            billingInterval: product.price.interval as 'month' | 'year',
            includedSeats: tierConfig?.includedSeats || 1,
            includedLocations: tierConfig?.includedLocations || 1,
            includedRefreshes: tierConfig?.includedRefreshes || 24,
            pricePerSeat: tierConfig?.pricePerSeat || 0,
            pricePerLocation: tierConfig?.pricePerLocation || 0,
            pricePerRefresh: tierConfig?.pricePerRefresh || 0,
            enabledFeatures: product.features,
            popular: tierConfig?.popular || false,
            highlighted: tierConfig?.highlighted || false,
            sortOrder: tierConfig?.sortOrder || 0,
            active: product.active,
            stripeProductId: product.stripeProductId,
          };
        })
    );
    
    return tierConfigs.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    console.error('Failed to fetch tier configs from Stripe:', error);
    throw new Error('Failed to fetch tier configs');
  }
}

/**
 * Get tier configuration by tier from Stripe
 */
export async function getTierConfigByTier(tier: SubscriptionTier): Promise<{
  tier: SubscriptionTier;
  name: string;
  description?: string;
  basePrice: number;
  billingInterval: string;
  includedSeats: number;
  includedLocations: number;
  includedRefreshes: number;
  pricePerSeat: number;
  pricePerLocation: number;
  pricePerRefresh: number;
  enabledFeatures: string[];
  popular: boolean;
  highlighted: boolean;
  sortOrder: number;
  active: boolean;
  stripeProductId: string;
} | null> {
  try {
    const productService = new ProductService();
    const product = await productService.getProductByTier(tier);
    
    if (!product || !product.metadata) {
      return null;
    }
    
    return {
      tier: product.tier!,
      name: product.name,
      description: product.description,
      basePrice: product.price.amount / 100, // Convert from cents
      billingInterval: product.price.interval,
      includedSeats: product.metadata.includedSeats || 1,
      includedLocations: product.metadata.includedLocations || 1,
      includedRefreshes: product.metadata.includedRefreshes || 24,
      pricePerSeat: product.metadata.pricePerSeat || 0,
      pricePerLocation: product.metadata.pricePerLocation || 0,
      pricePerRefresh: product.metadata.pricePerRefresh || 0,
      enabledFeatures: product.features,
      popular: product.metadata.popular || false,
      highlighted: product.metadata.highlighted || false,
      sortOrder: product.metadata.sortOrder || 0,
      active: product.active,
      stripeProductId: product.stripeProductId,
    };
  } catch (error) {
    console.error('Failed to fetch tier config by tier from Stripe:', error);
    throw new Error('Failed to fetch tier config by tier');
  }
}

// Feature Access Actions

/**
 * Get enabled features for a team based on their subscription
 */
export async function getTeamEnabledFeatures(teamId: string): Promise<string[]> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

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
    // Use StripeFirstSubscriptionService - always fetches from Stripe (with cache)
    const { StripeFirstSubscriptionService } = await import('./stripe-first-subscription-service');
    const service = new StripeFirstSubscriptionService();
    const subscription = await service.getTeamSubscription(teamId);
    return subscription.enabledFeatures;
  } catch (error) {
    console.error('Failed to get team enabled features:', error);
    throw new Error('Failed to get team enabled features');
  }
}

/**
 * Check if team has access to a specific feature
 */
export async function checkTeamFeatureAccess(
  teamId: string, 
  featureName: string
): Promise<boolean> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

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
    // Use StripeFirstSubscriptionService - always fetches from Stripe (with cache)
    const { StripeFirstSubscriptionService } = await import('./stripe-first-subscription-service');
    const service = new StripeFirstSubscriptionService();
    return await service.hasFeatureAccess(teamId, featureName);
  } catch (error) {
    console.error('Failed to check team feature access:', error);
    throw new Error('Failed to check team feature access');
  }
}

/**
 * Check multiple features access for a team
 */
export async function checkTeamFeaturesAccess(
  teamId: string, 
  featureNames: string[]
): Promise<Record<string, boolean>> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

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
    // Use StripeFirstSubscriptionService - always fetches from Stripe (with cache)
    const { StripeFirstSubscriptionService } = await import('./stripe-first-subscription-service');
    const service = new StripeFirstSubscriptionService();
    return await service.checkFeatures(teamId, featureNames);
  } catch (error) {
    console.error('Failed to check team features access:', error);
    throw new Error('Failed to check team features access');
  }
}

/**
 * Get complete subscription info with features
 */
export async function getTeamSubscriptionInfo(teamId: string): Promise<{
  tier: string;
  status: string;
  enabledFeatures: string[];
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  };
  product?: {
    name: string;
    description?: string;
    metadata: Record<string, any>;
  };
}> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

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
    // Use StripeFirstSubscriptionService - always fetches from Stripe (with cache)
    const { StripeFirstSubscriptionService } = await import('./stripe-first-subscription-service');
    const service = new StripeFirstSubscriptionService();
    const subscriptionInfo = await service.getSubscriptionInfo(teamId);
    
    return subscriptionInfo;
  } catch (error) {
    console.error('Failed to get team subscription info:', error);
    // Re-throw the original error with more context
    if (error instanceof Error) {
      throw new Error(`Failed to get team subscription info: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Refresh subscription data from Stripe (invalidate cache)
 */
export async function refreshTeamSubscription(teamId: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Verify user has access to this team
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!teamMember) {
    throw new Error('Access denied');
  }

  try {
    // Invalidate cache and fetch fresh from Stripe
    const { StripeFirstSubscriptionService } = await import('./stripe-first-subscription-service');
    const service = new StripeFirstSubscriptionService();
    await service.refreshSubscription(teamId);
    return { success: true };
  } catch (error) {
    console.error('Failed to refresh team subscription:', error);
    throw new Error('Failed to refresh team subscription');
  }
}

// =============================================================================
// BILLING ADDRESS ACTIONS
// =============================================================================

/**
 * Create or update billing address for a team
 */
export async function upsertBillingAddress(
  teamId: string,
  addressData: {
    name?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  }
): Promise<{ success: boolean; address?: BillingAddressData }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const billingAddressService = new BillingAddressService();
    
    // Validate address data
    const validation = billingAddressService.validateBillingAddress(addressData);
    if (!validation.isValid) {
      throw new Error(`Invalid address data: ${validation.errors.join(', ')}`);
    }

    const address = await billingAddressService.upsertBillingAddress(teamId, {
      ...addressData,
      // isDefault is handled internally by the service
    });
    return { success: true, address };
  } catch (error) {
    console.error('Failed to upsert billing address:', error);
    throw new Error('Failed to save billing address');
  }
}

/**
 * Get billing address for a team
 */
export async function getBillingAddress(teamId: string): Promise<BillingAddressData | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const billingAddressService = new BillingAddressService();
    return await billingAddressService.getBillingAddress(teamId);
  } catch (error) {
    console.error('Failed to get billing address:', error);
    throw new Error('Failed to retrieve billing address');
  }
}

/**
 * Sync billing address from Stripe to local database
 */
export async function syncBillingAddressFromStripe(teamId: string): Promise<{
  success: boolean;
  address?: BillingAddressData;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const billingAddressService = new BillingAddressService();
    const address = await billingAddressService.syncBillingAddressFromStripe(teamId);
    return { success: true, address: address || undefined };
  } catch (error) {
    console.error('Failed to sync billing address from Stripe:', error);
    throw new Error('Failed to sync billing address');
  }
}

/**
 * Delete billing address for a team
 */
export async function deleteBillingAddress(teamId: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const billingAddressService = new BillingAddressService();
    return await billingAddressService.deleteBillingAddress(teamId);
  } catch (error) {
    console.error('Failed to delete billing address:', error);
    throw new Error('Failed to delete billing address');
  }
}

/**
 * Get supported countries for billing
 */
export async function getSupportedCountries(): Promise<Array<{ code: string; name: string }>> {
  try {
    const billingAddressService = new BillingAddressService();
    return billingAddressService.getSupportedCountries();
  } catch (error) {
    console.error('Failed to get supported countries:', error);
    throw new Error('Failed to retrieve supported countries');
  }
}

/**
 * Validate billing address format
 */
export async function validateBillingAddress(addressData: {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): Promise<{ isValid: boolean; errors: string[] }> {
  try {
    const billingAddressService = new BillingAddressService();
    return billingAddressService.validateBillingAddress(addressData);
  } catch (error) {
    console.error('Failed to validate billing address:', error);
    return {
      isValid: false,
      errors: ['Failed to validate address'],
    };
  }
}

// =============================================================================
// SUBSCRIPTION MANAGEMENT ACTIONS
// =============================================================================

/**
 * Create a new subscription for a team
 */
export async function createTeamSubscription(
  teamId: string,
  options: {
    priceId: string;
    paymentMethodId?: string;
    trialDays?: number;
    quantity?: number;
    couponId?: string;
  }
): Promise<{
  success: boolean;
  subscription?: any;
  clientSecret?: string;
  requiresPaymentConfirmation?: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new Error('Only team owners can create subscriptions');
  }

  try {
    console.log('🔧 createTeamSubscription called with:', {
      teamId,
      options,
    });

    const subscriptionService = new SubscriptionManagementService();
    const result = await subscriptionService.createSubscription({
      teamId,
      ...options,
    });

    return {
      success: true,
      subscription: result.subscription,
      clientSecret: result.clientSecret,
      requiresPaymentConfirmation: result.requiresPaymentConfirmation,
    };
  } catch (error) {
    console.error('Failed to create subscription:', error);
    throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upgrade or downgrade team subscription
 */
export async function upgradeTeamSubscription(
  teamId: string,
  newPriceId: string,
  options: {
    quantity?: number;
    couponId?: string;
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  } = {}
): Promise<{
  success: boolean;
  subscription?: any;
  requiresPaymentConfirmation?: boolean;
  invoice?: any;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership or admin
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const subscriptionService = new SubscriptionManagementService();
    const result = await subscriptionService.upgradeSubscription(teamId, newPriceId, options);

    return {
      success: true,
      subscription: result.subscription,
      requiresPaymentConfirmation: result.requiresPaymentConfirmation,
      invoice: result.invoice,
    };
  } catch (error) {
    console.error('Failed to upgrade subscription:', error);
    throw new Error('Failed to upgrade subscription');
  }
}

/**
 * Cancel team subscription
 */
export async function cancelTeamSubscription(
  teamId: string,
  options: {
    immediately?: boolean;
    reason?: string;
    feedback?: string;
  } = {}
): Promise<{ success: boolean; subscription?: any }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new Error('Only team owners can cancel subscriptions');
  }

  try {
    const subscriptionService = new SubscriptionManagementService();
    const subscription = await subscriptionService.cancelSubscription(teamId, options);

    return {
      success: true,
      subscription,
    };
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Reactivate canceled subscription
 */
export async function reactivateTeamSubscription(teamId: string): Promise<{
  success: boolean;
  subscription?: any;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new Error('Only team owners can reactivate subscriptions');
  }

  try {
    const subscriptionService = new SubscriptionManagementService();
    const subscription = await subscriptionService.reactivateSubscription(teamId);

    return {
      success: true,
      subscription,
    };
  } catch (error) {
    console.error('Failed to reactivate subscription:', error);
    throw new Error('Failed to reactivate subscription');
  }
}

/**
 * Update subscription quantity (for seat-based billing)
 */
export async function updateTeamSubscriptionQuantity(
  teamId: string,
  newQuantity: number,
  prorationBehavior: 'create_prorations' | 'none' = 'create_prorations'
): Promise<{ success: boolean; subscription?: any }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership or admin
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const subscriptionService = new SubscriptionManagementService();
    const subscription = await subscriptionService.updateSubscriptionQuantity(
      teamId,
      newQuantity,
      prorationBehavior
    );

    return {
      success: true,
      subscription,
    };
  } catch (error) {
    console.error('Failed to update subscription quantity:', error);
    throw new Error('Failed to update subscription quantity');
  }
}


/**
 * Get team invoices from Stripe
 */
export async function getTeamInvoices(teamId: string): Promise<Array<{
  id: string;
  number?: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  dueDate?: number;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
}>> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const billingService = new BillingService();
    const invoices = await billingService.getInvoices(teamId);
    
    return invoices.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      created: invoice.created,
      dueDate: invoice.due_date,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
    }));
  } catch (error) {
    console.error('Failed to get team invoices:', error);
    throw new Error('Failed to retrieve invoices');
  }
}

/**
 * Preview subscription changes before applying them
 */
export async function previewSubscriptionChange(
  teamId: string,
  newPriceId: string,
  options: {
    quantity?: number;
    couponId?: string;
    prorationDate?: number;
  } = {}
): Promise<{
  success: boolean;
  preview?: {
    immediateTotal: number;
    nextInvoiceTotal: number;
    prorationAmount: number;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    // Check if team has an active subscription
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { subscription: true },
    });

    if (!team?.subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found. Please create a subscription first.');
    }

    const subscriptionService = new SubscriptionManagementService();
    const preview = await subscriptionService.previewSubscriptionChange(teamId, newPriceId, options);

    return {
      success: true,
      preview: {
        immediateTotal: preview.immediateTotal,
        nextInvoiceTotal: preview.nextInvoiceTotal,
        prorationAmount: preview.prorationAmount,
      },
    };
  } catch (error) {
    console.error('Failed to preview subscription change:', error);
    throw new Error(`Failed to preview subscription change: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// CUSTOMER PORTAL ACTIONS
// =============================================================================

/**
 * Create a Customer Portal session for team billing management
 */
export async function createCustomerPortalSession(
  teamId: string,
  returnUrl: string,
  options: {
    flowType?: 'subscription_cancel' | 'subscription_update' | 'payment_method_update';
    locale?: string;
    retentionCouponId?: string;
  } = {}
): Promise<{ success: boolean; url?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

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
    const url = await portalService.getPortalSessionUrl(
      teamId,
      session.user.id,
      returnUrl,
      options
    );

    return {
      success: true,
      url,
    };
  } catch (error) {
    console.error('Failed to create customer portal session:', error);
    throw new Error(`Failed to create billing portal session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a portal session specifically for subscription cancellation
 */
export async function createCancellationPortalSession(
  teamId: string,
  returnUrl: string,
  options: {
    retentionCouponId?: string;
    locale?: string;
  } = {}
): Promise<{ success: boolean; url?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership for cancellation
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new Error('Only team owners can access cancellation portal');
  }

  try {
    const portalService = new CustomerPortalService();
    const portalSession = await portalService.createCancellationPortalSession(
      teamId,
      returnUrl,
      options
    );

    return {
      success: true,
      url: portalSession.url,
    };
  } catch (error) {
    console.error('Failed to create cancellation portal session:', error);
    throw new Error('Failed to create cancellation portal session');
  }
}

/**
 * Create a portal session for subscription updates (upgrade/downgrade)
 */
export async function createSubscriptionUpdatePortalSession(
  teamId: string,
  returnUrl: string,
  options: {
    locale?: string;
  } = {}
): Promise<{ success: boolean; url?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership or admin
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const portalService = new CustomerPortalService();
    const portalSession = await portalService.createSubscriptionUpdatePortalSession(
      teamId,
      returnUrl,
      options
    );

    return {
      success: true,
      url: portalSession.url,
    };
  } catch (error) {
    console.error('Failed to create subscription update portal session:', error);
    throw new Error('Failed to create subscription update portal session');
  }
}

/**
 * Create a portal session for payment method updates
 */
export async function createPaymentMethodPortalSession(
  teamId: string,
  returnUrl: string,
  options: {
    locale?: string;
  } = {}
): Promise<{ success: boolean; url?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership or admin
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const portalService = new CustomerPortalService();
    const portalSession = await portalService.createPaymentMethodUpdatePortalSession(
      teamId,
      returnUrl,
      options
    );

    return {
      success: true,
      url: portalSession.url,
    };
  } catch (error) {
    console.error('Failed to create payment method portal session:', error);
    throw new Error('Failed to create payment method portal session');
  }
}

/**
 * Initialize default Customer Portal configuration (Admin only)
 */
export async function initializeCustomerPortalConfiguration(): Promise<{
  success: boolean;
  configurationId?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify admin access (you might want to add a specific admin role check)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // TODO: Add proper admin role check
  // For now, we'll allow any authenticated user to initialize (you should restrict this)

  try {
    const portalService = new CustomerPortalService();
    const configuration = await portalService.initializeDefaultPortalConfiguration();

    return {
      success: true,
      configurationId: configuration.id,
    };
  } catch (error) {
    console.error('Failed to initialize customer portal configuration:', error);
    throw new Error('Failed to initialize customer portal configuration');
  }
}

/**
 * Get available Customer Portal configurations
 */
export async function getCustomerPortalConfigurations(): Promise<any[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // TODO: Add proper admin role check

  try {
    const portalService = new CustomerPortalService();
    const configurations = await portalService.getPortalConfigurations();

    return configurations.map(config => ({
      id: config.id,
      active: config.active,
      isDefault: config.is_default,
      businessProfile: config.business_profile,
      features: config.features,
      created: config.created,
      updated: config.updated,
    }));
  } catch (error) {
    console.error('Failed to get customer portal configurations:', error);
    throw new Error('Failed to retrieve portal configurations');
  }
}

// =============================================================================
// TAX CALCULATION AND COMPLIANCE ACTIONS
// =============================================================================

/**
 * Calculate tax for a transaction
 */
export async function calculateTax(
  teamId: string,
  lineItems: Array<{
    amount: number;
    reference?: string;
    taxBehavior?: 'inclusive' | 'exclusive';
    taxCode?: string;
  }>,
  currency: string = 'usd'
): Promise<{
  success: boolean;
  calculation?: {
    amountTotal: number;
    amountSubtotal: number;
    amountTax: number;
    taxBreakdown: Array<{
      jurisdiction: string;
      rate: number;
      amount: number;
      taxType: string;
    }>;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    // Get team's Stripe customer ID and billing address
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        billingAddresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!team?.stripeCustomerId) {
      throw new Error('Team does not have a Stripe customer ID');
    }

    const taxService = new TaxService();
    
    // Use team's billing address if available
    let customerAddress;
    if (team.billingAddresses[0]) {
      const addr = team.billingAddresses[0];
      customerAddress = {
        country: addr.country,
        state: addr.state || undefined,
        city: addr.city,
        postal_code: addr.postalCode,
        line1: addr.line1,
        line2: addr.line2 || undefined,
      };
    }

    const result = await taxService.calculateTax({
      customerId: team.stripeCustomerId,
      lineItems,
      customerDetails: {
        address: customerAddress,
      },
      currency,
    });

    return {
      success: true,
      calculation: {
        amountTotal: result.amountTotal,
        amountSubtotal: result.amountSubtotal,
        amountTax: result.amountTax,
        taxBreakdown: result.taxBreakdown,
      },
    };
  } catch (error) {
    console.error('Failed to calculate tax:', error);
    throw new Error('Failed to calculate tax');
  }
}

/**
 * Calculate tax for subscription pricing
 */
export async function calculateSubscriptionTax(
  teamId: string,
  priceId: string,
  quantity: number = 1
): Promise<{
  success: boolean;
  calculation?: {
    amountTotal: number;
    amountSubtotal: number;
    amountTax: number;
    taxBreakdown: Array<{
      jurisdiction: string;
      rate: number;
      amount: number;
      taxType: string;
    }>;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    // Get team details
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        billingAddresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!team?.stripeCustomerId) {
      throw new Error('Team does not have a Stripe customer ID');
    }

    const taxService = new TaxService();
    
    // Use team's billing address if available
    let customerAddress;
    if (team.billingAddresses[0]) {
      const addr = team.billingAddresses[0];
      customerAddress = {
        country: addr.country,
        state: addr.state || undefined,
        city: addr.city,
        postal_code: addr.postalCode,
        line1: addr.line1,
        line2: addr.line2 || undefined,
      };
    }

    const result = await taxService.calculateSubscriptionTax(
      team.stripeCustomerId,
      priceId,
      quantity,
      customerAddress
    );

    return {
      success: true,
      calculation: {
        amountTotal: result.amountTotal,
        amountSubtotal: result.amountSubtotal,
        amountTax: result.amountTax,
        taxBreakdown: result.taxBreakdown,
      },
    };
  } catch (error) {
    console.error('Failed to calculate subscription tax:', error);
    throw new Error('Failed to calculate subscription tax');
  }
}

/**
 * Add tax ID to team's Stripe customer
 */
export async function addTeamTaxId(
  teamId: string,
  taxIdType: string,
  taxIdValue: string
): Promise<{ success: boolean; taxId?: any }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership or admin
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team?.stripeCustomerId) {
      throw new Error('Team does not have a Stripe customer ID');
    }

    const taxService = new TaxService();
    
    // Validate tax ID first
    const validation = await taxService.validateTaxId(
      taxIdType as any,
      taxIdValue
    );

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid tax ID');
    }

    // Add tax ID to customer
    const taxId = await taxService.addCustomerTaxId(
      team.stripeCustomerId,
      taxIdType as any,
      taxIdValue
    );

    return {
      success: true,
      taxId: {
        id: taxId.id,
        type: taxId.type,
        value: taxId.value,
        country: taxId.country,
        verification: taxId.verification,
      },
    };
  } catch (error) {
    console.error('Failed to add tax ID:', error);
    throw new Error('Failed to add tax ID');
  }
}

/**
 * Remove tax ID from team's Stripe customer
 */
export async function removeTeamTaxId(
  teamId: string,
  taxIdId: string
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership or admin
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team?.stripeCustomerId) {
      throw new Error('Team does not have a Stripe customer ID');
    }

    const taxService = new TaxService();
    await taxService.removeCustomerTaxId(team.stripeCustomerId, taxIdId);

    return { success: true };
  } catch (error) {
    console.error('Failed to remove tax ID:', error);
    throw new Error('Failed to remove tax ID');
  }
}

/**
 * Get team's tax IDs
 */
export async function getTeamTaxIds(teamId: string): Promise<Array<{
  id: string;
  type: string;
  value: string;
  country?: string;
  verification?: any;
}>> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team?.stripeCustomerId) {
      return [];
    }

    const taxService = new TaxService();
    const taxIds = await taxService.getCustomerTaxIds(team.stripeCustomerId);

    return taxIds.map(taxId => ({
      id: taxId.id,
      type: taxId.type,
      value: taxId.value,
      country: taxId.country,
      verification: taxId.verification,
    }));
  } catch (error) {
    console.error('Failed to get tax IDs:', error);
    throw new Error('Failed to retrieve tax IDs');
  }
}

/**
 * Get tax rates for a location
 */
export async function getTaxRatesForLocation(
  country: string,
  state?: string,
  city?: string,
  postalCode?: string
): Promise<Array<{
  jurisdiction: string;
  rate: number;
  type: string;
}>> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  try {
    const taxService = new TaxService();
    return await taxService.getTaxRatesForLocation(country, state, city, postalCode);
  } catch (error) {
    console.error('Failed to get tax rates:', error);
    throw new Error('Failed to retrieve tax rates');
  }
}

/**
 * Get tax registrations (Admin only)
 */
export async function getTaxRegistrations(): Promise<Array<{
  country: string;
  state?: string;
  type: string;
  status: string;
  registrationNumber?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
}>> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // TODO: Add proper admin role check
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  try {
    const taxService = new TaxService();
    return await taxService.getTaxRegistrations();
  } catch (error) {
    console.error('Failed to get tax registrations:', error);
    throw new Error('Failed to retrieve tax registrations');
  }
}

/**
 * Create tax registration (Admin only)
 */
export async function createTaxRegistration(
  country: string,
  options: {
    state?: string;
    type?: 'standard' | 'oss' | 'ioss' | 'simplified';
    activeFrom?: Date;
    expiresAt?: Date;
  } = {}
): Promise<{ success: boolean; registrationId?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // TODO: Add proper admin role check
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  try {
    const taxService = new TaxService();
    const registration = await taxService.createTaxRegistration(country, options);

    return {
      success: true,
      registrationId: registration.id,
    };
  } catch (error) {
    console.error('Failed to create tax registration:', error);
    throw new Error('Failed to create tax registration');
  }
}

/**
 * Get tax compliance summary (Admin only)
 */
export async function getTaxComplianceSummary(): Promise<{
  success: boolean;
  summary?: {
    registrations: Array<any>;
    totalTransactions: number;
    totalTaxCollected: number;
    complianceStatus: string;
    recommendations: string[];
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // TODO: Add proper admin role check
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  try {
    const taxService = new TaxService();
    const summary = await taxService.getTaxComplianceSummary();

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error('Failed to get tax compliance summary:', error);
    throw new Error('Failed to retrieve tax compliance summary');
  }
}

// =============================================================================
// USAGE TRACKING AND QUOTA ACTIONS
// =============================================================================

/**
 * Record usage for a team and feature
 */
export async function recordUsage(
  teamId: string,
  feature: string,
  quantity: number,
  options: {
    timestamp?: Date;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string;
  } = {}
): Promise<{
  success: boolean;
  usageRecord?: {
    id: string;
    feature: string;
    quantity: number;
    timestamp: Date;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const usageService = new UsageTrackingService();
    const usageRecord = await usageService.recordUsage(teamId, feature, quantity, options);

    return {
      success: true,
      usageRecord: {
        id: usageRecord.id,
        feature: usageRecord.feature,
        quantity: usageRecord.quantity,
        timestamp: usageRecord.timestamp,
      },
    };
  } catch (error) {
    console.error('Failed to record usage:', error);
    throw new Error('Failed to record usage');
  }
}

/**
 * Check quota for a feature
 */
export async function checkQuota(
  teamId: string,
  feature: string,
  additionalQuantity: number = 0
): Promise<{
  success: boolean;
  quota?: {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    overage: {
      allowed: boolean;
      current: number;
      max: number;
      rate?: number;
    };
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const usageService = new UsageTrackingService();
    const quota = await usageService.checkQuota(teamId, feature, additionalQuantity);

    return {
      success: true,
      quota,
    };
  } catch (error) {
    console.error('Failed to check quota:', error);
    throw new Error('Failed to check quota');
  }
}

/**
 * Get current usage for a feature
 */
export async function getCurrentUsage(
  teamId: string,
  feature: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<{
  success: boolean;
  usage?: number;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const usageService = new UsageTrackingService();
    const usage = await usageService.getCurrentUsage(
      teamId,
      feature,
      periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
      periodEnd
    );

    return {
      success: true,
      usage,
    };
  } catch (error) {
    console.error('Failed to get current usage:', error);
    throw new Error('Failed to retrieve current usage');
  }
}

/**
 * Get usage summary for a team
 */
export async function getUsageSummary(
  teamId: string,
  period?: {
    start: Date;
    end: Date;
  }
): Promise<{
  success: boolean;
  summary?: {
    teamId: string;
    period: { start: Date; end: Date };
    usage: Array<{
      feature: string;
      used: number;
      limit: number;
      percentage: number;
      overage: number;
      cost: number;
    }>;
    totalCost: number;
    warnings: string[];
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const usageService = new UsageTrackingService();
    const summary = await usageService.getUsageSummary(teamId, period);

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error('Failed to get usage summary:', error);
    throw new Error('Failed to retrieve usage summary');
  }
}

/**
 * Get usage history for a feature
 */
export async function getUsageHistory(
  teamId: string,
  feature: string,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  } = {}
): Promise<{
  success: boolean;
  history?: {
    records: Array<{
      id: string;
      feature: string;
      quantity: number;
      timestamp: Date;
      metadata?: Record<string, unknown>;
    }>;
    total: number;
    aggregated?: Array<{
      period: string;
      quantity: number;
      timestamp: Date;
    }>;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const usageService = new UsageTrackingService();
    const history = await usageService.getUsageHistory(teamId, feature, options);

    return {
      success: true,
      history: {
        records: history.records.map(record => ({
          id: record.id,
          feature: record.feature,
          quantity: record.quantity,
          timestamp: record.timestamp,
          metadata: record.metadata,
        })),
        total: history.total,
        aggregated: history.aggregated,
      },
    };
  } catch (error) {
    console.error('Failed to get usage history:', error);
    throw new Error('Failed to retrieve usage history');
  }
}

/**
 * Reset usage quotas for a team (Admin only)
 */
export async function resetTeamQuotas(
  teamId: string,
  features?: string[]
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team ownership or admin
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!membership) {
    throw new Error('Insufficient permissions');
  }

  try {
    const usageService = new UsageTrackingService();
    await usageService.resetQuotas(teamId, features);

    return { success: true };
  } catch (error) {
    console.error('Failed to reset quotas:', error);
    throw new Error('Failed to reset quotas');
  }
}

/**
 * Create metered billing price for a feature (Admin only)
 */
export async function createMeteredPrice(
  productId: string,
  config: {
    feature: string;
    aggregationUsage: 'sum' | 'last_during_period' | 'last_ever' | 'max';
    billingScheme: 'per_unit' | 'tiered';
    tiers?: Array<{
      upTo: number | 'inf';
      unitAmount: number;
      flatAmount?: number;
    }>;
  }
): Promise<{ success: boolean; priceId?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // TODO: Add proper admin role check
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  try {
    const usageService = new UsageTrackingService();
    const price = await usageService.createMeteredPrice(productId, config);

    return {
      success: true,
      priceId: price.id,
    };
  } catch (error) {
    console.error('Failed to create metered price:', error);
    throw new Error('Failed to create metered price');
  }
}

// =============================================================================
// TRIAL AND DEMO SYSTEM ACTIONS
// =============================================================================

/**
 * Create a new trial configuration (Admin only)
 */
export async function createTrialConfig(
  config: {
    name: string;
    description: string;
    durationDays: number;
    tier: 'STARTER' | 'PRO' | 'ENTERPRISE';
    features: string[];
    limitations: {
      maxSeats?: number;
      maxLocations?: number;
      maxApiCalls?: number;
      maxStorage?: number;
      customLimitations?: Record<string, unknown>;
    };
    requiresPaymentMethod: boolean;
    autoConvert: boolean;
    gracePeriodDays?: number;
    retentionOffers?: Array<{
      type: 'discount' | 'extended_trial' | 'feature_upgrade';
      value: number;
      description: string;
    }>;
    active: boolean;
  }
): Promise<{
  success: boolean;
  trialConfig?: {
    id: string;
    name: string;
    description: string;
    durationDays: number;
    tier: string;
    features: string[];
    limitations: any;
    requiresPaymentMethod: boolean;
    autoConvert: boolean;
    gracePeriodDays?: number;
    retentionOffers?: any[];
    active: boolean;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // TODO: Add proper admin role check
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  try {
    const trialService = new TrialDemoService();
    const trialConfig = await trialService.createTrialConfig(config);

    return {
      success: true,
      trialConfig: {
        id: trialConfig.id,
        name: trialConfig.name,
        description: trialConfig.description,
        durationDays: trialConfig.durationDays,
        tier: trialConfig.tier,
        features: trialConfig.features,
        limitations: trialConfig.limitations,
        requiresPaymentMethod: trialConfig.requiresPaymentMethod,
        autoConvert: trialConfig.autoConvert,
        gracePeriodDays: trialConfig.gracePeriodDays,
        retentionOffers: trialConfig.retentionOffers,
        active: trialConfig.active,
      },
    };
  } catch (error) {
    console.error('Failed to create trial config:', error);
    throw new Error('Failed to create trial configuration');
  }
}

/**
 * Start a trial for a team
 */
export async function startTrial(
  teamId: string,
  trialConfigId: string,
  options: {
    email?: string;
    name?: string;
    paymentMethodId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<{
  success: boolean;
  trialAccount?: {
    id: string;
    teamId: string;
    email: string;
    name: string;
    trialConfigId: string;
    startedAt: Date;
    expiresAt: Date;
    status: string;
    usageStats: {
      apiCalls: number;
      storageUsed: number;
      featuresUsed: string[];
      lastActivity: Date;
    };
    metadata?: Record<string, unknown>;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const trialService = new TrialDemoService();
    const trialAccount = await trialService.startTrial(teamId, trialConfigId, options);

    return {
      success: true,
      trialAccount: {
        id: trialAccount.id,
        teamId: trialAccount.teamId,
        email: trialAccount.email,
        name: trialAccount.name,
        trialConfigId: trialAccount.trialConfigId,
        startedAt: trialAccount.startedAt,
        expiresAt: trialAccount.expiresAt,
        status: trialAccount.status,
        usageStats: trialAccount.usageStats,
        metadata: trialAccount.metadata,
      },
    };
  } catch (error) {
    console.error('Failed to start trial:', error);
    throw new Error('Failed to start trial');
  }
}

/**
 * Convert trial to paid subscription
 */
export async function convertTrialToPaid(
  teamId: string,
  conversion: {
    trialId: string;
    targetTier: string;
    paymentMethodId?: string;
    couponCode?: string;
    retentionOffer?: {
      type: 'discount' | 'extended_trial' | 'feature_upgrade';
      value: number;
      description: string;
    };
  }
): Promise<{
  success: boolean;
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
  };
  clientSecret?: string;
  requiresPaymentConfirmation?: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const trialService = new TrialDemoService();
    const result = await trialService.convertTrialToPaid(teamId, {
      ...conversion,
      teamId,
    });

    return {
      success: result.success,
      subscription: result.subscription ? {
        id: result.subscription.id,
        status: result.subscription.status,
        currentPeriodStart: result.subscription.current_period_start || 0,
        currentPeriodEnd: result.subscription.current_period_end || 0,
      } : undefined,
      clientSecret: result.clientSecret,
      requiresPaymentConfirmation: result.requiresPaymentConfirmation,
    };
  } catch (error) {
    console.error('Failed to convert trial:', error);
    throw new Error('Failed to convert trial to paid subscription');
  }
}

/**
 * Extend trial period
 */
export async function extendTrial(
  teamId: string,
  trialId: string,
  additionalDays: number,
  reason?: string
): Promise<{
  success: boolean;
  trialAccount?: {
    id: string;
    teamId: string;
    email: string;
    name: string;
    trialConfigId: string;
    startedAt: Date;
    expiresAt: Date;
    status: string;
    usageStats: {
      apiCalls: number;
      storageUsed: number;
      featuresUsed: string[];
      lastActivity: Date;
    };
    metadata?: Record<string, unknown>;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const trialService = new TrialDemoService();
    const trialAccount = await trialService.extendTrial(teamId, trialId, additionalDays, reason);

    return {
      success: true,
      trialAccount: {
        id: trialAccount.id,
        teamId: trialAccount.teamId,
        email: trialAccount.email,
        name: trialAccount.name,
        trialConfigId: trialAccount.trialConfigId,
        startedAt: trialAccount.startedAt,
        expiresAt: trialAccount.expiresAt,
        status: trialAccount.status,
        usageStats: trialAccount.usageStats,
        metadata: trialAccount.metadata,
      },
    };
  } catch (error) {
    console.error('Failed to extend trial:', error);
    throw new Error('Failed to extend trial');
  }
}

/**
 * Cancel trial
 */
export async function cancelTrial(
  teamId: string,
  trialId: string,
  reason?: string
): Promise<{
  success: boolean;
  trialAccount?: {
    id: string;
    teamId: string;
    email: string;
    name: string;
    trialConfigId: string;
    startedAt: Date;
    expiresAt: Date;
    status: string;
    usageStats: {
      apiCalls: number;
      storageUsed: number;
      featuresUsed: string[];
      lastActivity: Date;
    };
    metadata?: Record<string, unknown>;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const trialService = new TrialDemoService();
    const trialAccount = await trialService.cancelTrial(teamId, trialId, reason);

    return {
      success: true,
      trialAccount: {
        id: trialAccount.id,
        teamId: trialAccount.teamId,
        email: trialAccount.email,
        name: trialAccount.name,
        trialConfigId: trialAccount.trialConfigId,
        startedAt: trialAccount.startedAt,
        expiresAt: trialAccount.expiresAt,
        status: trialAccount.status,
        usageStats: trialAccount.usageStats,
        metadata: trialAccount.metadata,
      },
    };
  } catch (error) {
    console.error('Failed to cancel trial:', error);
    throw new Error('Failed to cancel trial');
  }
}

/**
 * Get trial account details
 */
export async function getTrialAccount(teamId: string): Promise<{
  success: boolean;
  trialAccount?: {
    id: string;
    teamId: string;
    email: string;
    name: string;
    trialConfigId: string;
    startedAt: Date;
    expiresAt: Date;
    status: string;
    usageStats: {
      apiCalls: number;
      storageUsed: number;
      featuresUsed: string[];
      lastActivity: Date;
    };
    metadata?: Record<string, unknown>;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const trialService = new TrialDemoService();
    const trialAccount = await trialService.getTrialAccount(teamId);

    if (!trialAccount) {
      return { success: true };
    }

    return {
      success: true,
      trialAccount: {
        id: trialAccount.id,
        teamId: trialAccount.teamId,
        email: trialAccount.email,
        name: trialAccount.name,
        trialConfigId: trialAccount.trialConfigId,
        startedAt: trialAccount.startedAt,
        expiresAt: trialAccount.expiresAt,
        status: trialAccount.status,
        usageStats: trialAccount.usageStats,
        metadata: trialAccount.metadata,
      },
    };
  } catch (error) {
    console.error('Failed to get trial account:', error);
    throw new Error('Failed to retrieve trial account');
  }
}

/**
 * Check trial expiration status
 */
export async function checkTrialExpiration(teamId: string): Promise<{
  success: boolean;
  expired: boolean;
  trialAccount?: {
    id: string;
    teamId: string;
    email: string;
    name: string;
    trialConfigId: string;
    startedAt: Date;
    expiresAt: Date;
    status: string;
    usageStats: {
      apiCalls: number;
      storageUsed: number;
      featuresUsed: string[];
      lastActivity: Date;
    };
    metadata?: Record<string, unknown>;
  };
  gracePeriodRemaining?: number;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const trialService = new TrialDemoService();
    const result = await trialService.checkTrialExpiration(teamId);

    return {
      success: true,
      expired: result.expired,
      trialAccount: result.trialAccount ? {
        id: result.trialAccount.id,
        teamId: result.trialAccount.teamId,
        email: result.trialAccount.email,
        name: result.trialAccount.name,
        trialConfigId: result.trialAccount.trialConfigId,
        startedAt: result.trialAccount.startedAt,
        expiresAt: result.trialAccount.expiresAt,
        status: result.trialAccount.status,
        usageStats: result.trialAccount.usageStats,
        metadata: result.trialAccount.metadata,
      } : undefined,
      gracePeriodRemaining: result.gracePeriodRemaining,
    };
  } catch (error) {
    console.error('Failed to check trial expiration:', error);
    throw new Error('Failed to check trial expiration');
  }
}

/**
 * Get trial analytics (Admin only)
 */
export async function getTrialAnalytics(
  options: {
    startDate?: Date;
    endDate?: Date;
    trialConfigId?: string;
  } = {}
): Promise<{
  success: boolean;
  analytics?: {
    totalTrials: number;
    activeTrials: number;
    convertedTrials: number;
    expiredTrials: number;
    conversionRate: number;
    averageTrialDuration: number;
    topConvertingTiers: Array<{
      tier: string;
      conversions: number;
      conversionRate: number;
    }>;
    churnReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // TODO: Add proper admin role check
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  try {
    const trialService = new TrialDemoService();
    const analytics = await trialService.getTrialAnalytics(options);

    return {
      success: true,
      analytics,
    };
  } catch (error) {
    console.error('Failed to get trial analytics:', error);
    throw new Error('Failed to retrieve trial analytics');
  }
}

/**
 * Update trial usage stats
 */
export async function updateTrialUsage(
  teamId: string,
  feature: string,
  usage: {
    apiCalls?: number;
    storageUsed?: number;
    featuresUsed?: string[];
  }
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Access denied');
  }

  try {
    const trialService = new TrialDemoService();
    await trialService.updateTrialUsage(teamId, feature, usage);

    return { success: true };
  } catch (error) {
    console.error('Failed to update trial usage:', error);
    throw new Error('Failed to update trial usage');
  }
}
