/**
 * Product Service
 * Manages Stripe products and prices, syncs them to local database
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { ProductData, SubscriptionTier, StripeTierMetadata, TierMetadata, parseTierMetadata } from './types';
import { StripeService } from './stripe-service';

export class ProductService {
  private stripe: Stripe;

  constructor() {
    this.stripe = StripeService.getStripeInstance();
  }

  /**
   * Create subscription products in Stripe based on tier configuration
   * All tier data and features are stored in Stripe metadata
   */
  async createSubscriptionProducts(): Promise<void> {
    // Get tier configurations from database
    const tierConfigs = await prisma.subscriptionTierConfig.findMany({
      where: { 
        active: true,
        tier: { not: 'FREE' } // Don't create Stripe products for FREE tier
      },
      orderBy: { sortOrder: 'asc' },
    });

    for (const config of tierConfigs) {
      try {
        // Create product in Stripe with full configuration in metadata
        const stripeProduct = await this.stripe.products.create({
          name: config.name,
          description: config.description || undefined,
          type: 'service',
          metadata: {
            // Core tier info
            tier: config.tier,
            configId: config.id,
            
            // Pricing configuration
            basePrice: config.basePrice.toString(),
            billingInterval: config.billingInterval,
            
            // Included limits
            includedSeats: config.includedSeats.toString(),
            includedLocations: config.includedLocations.toString(),
            includedRefreshes: config.includedRefreshes.toString(),
            
            // Per-unit pricing
            pricePerSeat: config.pricePerSeat.toString(),
            pricePerLocation: config.pricePerLocation.toString(),
            pricePerRefresh: config.pricePerRefresh.toString(),
            
            // Feature Flag names (JSON string since Stripe metadata values must be strings)
            featureFlags: JSON.stringify(config.enabledFeatures), // These should be FeatureFlag names
            
            // Display options
            popular: config.popular.toString(),
            highlighted: config.highlighted.toString(),
            sortOrder: config.sortOrder.toString(),
          },
        });

        console.log(`✅ Created Stripe product: ${stripeProduct.name} (${stripeProduct.id})`);

        // Create price in Stripe
        const stripePrice = await this.stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: Math.round(config.basePrice.toNumber() * 100), // Convert to cents
          currency: 'usd',
          recurring: {
            interval: config.billingInterval as Stripe.Price.Recurring.Interval,
          },
          nickname: `${config.name} - ${config.billingInterval}ly`,
          metadata: {
            tier: config.tier,
            configId: config.id,
            basePrice: config.basePrice.toString(),
          },
        });

        console.log(`✅ Created Stripe price: ${stripePrice.nickname} (${stripePrice.id})`);

        // Sync to local database
        await this.syncProductToDatabase(stripeProduct, stripePrice, config.tier);

      } catch (error) {
        console.error(`❌ Error creating product ${config.name}:`, error);
      }
    }
  }

  /**
   * Sync Stripe product to local database
   */
  private async syncProductToDatabase(
    stripeProduct: Stripe.Product,
    stripePrice: Stripe.Price,
    tier: SubscriptionTier
  ): Promise<void> {
    await prisma.stripeProduct.upsert({
      where: { stripeProductId: stripeProduct.id },
      create: {
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        name: stripeProduct.name,
        description: stripeProduct.description,
        tier,
        unitAmount: stripePrice.unit_amount || 0,
        currency: stripePrice.currency,
        interval: stripePrice.recurring?.interval || 'month',
        intervalCount: stripePrice.recurring?.interval_count || 1,
        active: stripeProduct.active,
        metadata: {
          stripeProductMetadata: stripeProduct.metadata,
          stripePriceMetadata: stripePrice.metadata,
        },
      },
      update: {
        stripePriceId: stripePrice.id,
        name: stripeProduct.name,
        description: stripeProduct.description,
        unitAmount: stripePrice.unit_amount || 0,
        currency: stripePrice.currency,
        interval: stripePrice.recurring?.interval || 'month',
        intervalCount: stripePrice.recurring?.interval_count || 1,
        active: stripeProduct.active,
        metadata: {
          stripeProductMetadata: stripeProduct.metadata,
          stripePriceMetadata: stripePrice.metadata,
        },
      },
    });

    console.log(`✅ Synced product to database: ${stripeProduct.name}`);
  }

  /**
   * Sync all Stripe products to database
   */
  async syncAllProductsFromStripe(): Promise<void> {
    try {
      // Get all products from Stripe
      const products = await this.stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      });

      for (const product of products.data) {
        // Get all prices for this product
        const prices = await this.stripe.prices.list({
          product: product.id,
          active: true,
        });

        // Use the first active price (you might want to be more specific)
        const price = prices.data[0];
        if (!price) continue;

        const tier = product.metadata.tier as SubscriptionTier | null;
        if (!tier) continue;

        await this.syncProductToDatabase(product, price, tier);
      }

      console.log('✅ All products synced from Stripe');
    } catch (error) {
      console.error('❌ Error syncing products from Stripe:', error);
      throw error;
    }
  }

  /**
   * Get all products from database with features from Stripe
   */
  async getAllProducts(): Promise<ProductData[]> {
    const products = await prisma.stripeProduct.findMany({
      where: { active: true },
      orderBy: { unitAmount: 'asc' },
    });

    // Enrich with data from Stripe products (which contain all metadata)
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        // Get full Stripe product with metadata
        const stripeProduct = await this.stripe.products.retrieve(product.stripeProductId);
        return this.transformProductForUI(product, stripeProduct);
      })
    );

    return enrichedProducts;
  }

  /**
   * Get prices for a product
   */
  async getProductPrices(productId: string): Promise<Stripe.Price[]> {
    const prices = await this.stripe.prices.list({
      product: productId,
      active: true,
      type: 'recurring',
    });
    return prices.data;
  }

  /**
   * Get product by tier
   */
  async getProductByTier(tier: SubscriptionTier): Promise<ProductData | null> {
    const product = await prisma.stripeProduct.findFirst({
      where: { 
        tier,
        active: true,
      },
    });

    if (!product) return null;

    // Get full Stripe product with metadata
    const stripeProduct = await this.stripe.products.retrieve(product.stripeProductId);
    return this.transformProductForUI(product, stripeProduct);
  }

  /**
   * Get product by Stripe price ID
   */
  async getProductByPriceId(stripePriceId: string): Promise<ProductData | null> {
    const product = await prisma.stripeProduct.findUnique({
      where: { stripePriceId },
    });

    if (!product) return null;

    // Get full Stripe product with metadata
    const stripeProduct = await this.stripe.products.retrieve(product.stripeProductId);
    return this.transformProductForUI(product, stripeProduct);
  }

  /**
   * Initialize products (create if they don't exist, sync if they do)
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Stripe products...');
    
    try {
      // First, try to sync existing products from Stripe
      await this.syncAllProductsFromStripe();
      
      // Check if we have products for all active tier configurations
      const activeTierConfigs = await prisma.subscriptionTierConfig.findMany({
        where: { 
          active: true,
          tier: { not: 'FREE' }
        },
      });
      
      const existingProducts = await this.getAllProducts();
      const existingTiers = existingProducts.map(p => p.tier).filter(Boolean);
      
      const missingTiers = activeTierConfigs
        .map(config => config.tier)
        .filter(tier => !existingTiers.includes(tier));
      
      if (missingTiers.length > 0) {
        console.log(`📦 Creating missing products for tiers: ${missingTiers.join(', ')}`);
        await this.createSubscriptionProducts();
      }
      
      console.log('✅ Product initialization complete');
    } catch (error) {
      console.error('❌ Product initialization failed:', error);
      throw error;
    }
  }

  /**
   * Transform product for UI consumption using Stripe metadata
   */
  private transformProductForUI(
    product: {
      id: string;
      stripeProductId: string;
      stripePriceId: string | null;
      name: string;
      description: string | null;
      tier: SubscriptionTier | null;
      unitAmount: number;
      currency: string;
      interval: string;
      intervalCount: number;
      active: boolean;
      metadata: unknown;
    },
    stripeProduct: Stripe.Product
  ): ProductData {
    // Parse feature flags from Stripe metadata
    let features: string[] = [];
    try {
      if (stripeProduct.metadata.featureFlags) {
        features = JSON.parse(stripeProduct.metadata.featureFlags);
      }
    } catch (error) {
      console.warn('Failed to parse featureFlags from Stripe metadata:', error);
      features = [];
    }

    // Parse metadata using utility function
    const parsedMetadata = parseTierMetadata(stripeProduct.metadata as StripeTierMetadata);

    return {
      id: product.id,
      stripeProductId: product.stripeProductId,
      stripePriceId: product.stripePriceId || undefined,
      name: product.name,
      description: product.description || undefined,
      tier: product.tier || undefined,
      price: {
        amount: product.unitAmount,
        currency: product.currency,
        interval: product.interval as Stripe.Price.Recurring.Interval,
        intervalCount: product.intervalCount,
        formatted: `$${(product.unitAmount / 100).toFixed(2)}/${product.interval}`,
      },
      features,
      active: product.active,
      metadata: parsedMetadata,
    };
  }
}
