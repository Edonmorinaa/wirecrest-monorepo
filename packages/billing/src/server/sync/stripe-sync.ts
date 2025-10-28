import Stripe from 'stripe';

/**
 * Plan metadata structure from Stripe
 */
export interface StripePlanMetadata {
  bundle?: string;
  features?: string;
  featuresJson?: string;
  scrapeIntervalHours?: string;
  custom?: string;
  basePlanId?: string;
}

/**
 * Stripe synchronization service for feature flags
 * 
 * Handles reading Stripe Product/Price metadata and parsing feature information
 * for tenant feature flag resolution.
 */
export class StripeSyncService {
  private stripe: Stripe;

  constructor(stripe: Stripe) {
    this.stripe = stripe;
  }

  /**
   * Get plan defaults from Stripe Product/Price metadata
   * @param planId - Stripe plan/product ID
   * @returns Parsed plan metadata with features
   */
  async getPlanDefaultsFromStripe(planId: string): Promise<StripePlanMetadata | null> {
    try {
      // Try to get as Product first
      let product: Stripe.Product | null = null;
      let price: Stripe.Price | null = null;

      try {
        product = await this.stripe.products.retrieve(planId);
      } catch (error) {
        // If not a product, try as price
        try {
          price = await this.stripe.prices.retrieve(planId);
          if (price.product) {
            product = await this.stripe.products.retrieve(price.product as string);
          }
        } catch (priceError) {
          console.error(`Failed to retrieve plan ${planId}:`, error);
          return null;
        }
      }

      if (!product) {
        return null;
      }

      // Parse metadata from product
      const metadata = this.parseProductMetadata(product);
      
      // If we have a price, merge its metadata too
      if (price) {
        const priceMetadata = this.parsePriceMetadata(price);
        return { ...metadata, ...priceMetadata };
      }

      return metadata;
    } catch (error) {
      console.error(`Error getting plan defaults for ${planId}:`, error);
      return null;
    }
  }

  /**
   * Get active subscription for a customer
   * @param customerId - Stripe customer ID
   * @returns Active subscription or null
   */
  async getActiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });

      return subscriptions.data[0] || null;
    } catch (error) {
      console.error(`Error getting active subscription for customer ${customerId}:`, error);
      return null;
    }
  }

  /**
   * Get subscription plan metadata
   * @param subscription - Stripe subscription
   * @returns Plan metadata
   */
  async getSubscriptionPlanMetadata(subscription: Stripe.Subscription): Promise<StripePlanMetadata | null> {
    if (!subscription.items.data.length) {
      return null;
    }

    const price = subscription.items.data[0].price;
    return this.getPlanDefaultsFromStripe(price.id);
  }

  /**
   * Get all customers with active subscriptions
   * @param limit - Maximum number of customers to return
   * @returns Array of customers with subscription info
   */
  async getCustomersWithSubscriptions(limit: number = 100): Promise<Array<{
    customer: Stripe.Customer;
    subscription: Stripe.Subscription;
    planMetadata: StripePlanMetadata | null;
  }>> {
    try {
      const customers: Array<{
        customer: Stripe.Customer;
        subscription: Stripe.Subscription;
        planMetadata: StripePlanMetadata | null;
      }> = [];

      let startingAfter: string | undefined;

      while (customers.length < limit) {
        const customerList = await this.stripe.customers.list({
          limit: Math.min(100, limit - customers.length),
          starting_after: startingAfter
        });

        if (customerList.data.length === 0) {
          break;
        }

        for (const customer of customerList.data) {
          const subscription = await this.getActiveSubscription(customer.id);
          if (subscription) {
            const planMetadata = await this.getSubscriptionPlanMetadata(subscription);
            customers.push({
              customer,
              subscription,
              planMetadata
            });
          }
        }

        startingAfter = customerList.data[customerList.data.length - 1].id;
      }

      return customers;
    } catch (error) {
      console.error('Error getting customers with subscriptions:', error);
      return [];
    }
  }

  /**
   * Parse product metadata for features
   * @param product - Stripe product
   * @returns Parsed metadata
   */
  private parseProductMetadata(product: Stripe.Product): StripePlanMetadata {
    const metadata: StripePlanMetadata = {};

    // Parse bundle information
    if (product.metadata.bundle) {
      metadata.bundle = product.metadata.bundle as any;
    }

    // Parse features
    if (product.metadata.features) {
      metadata.features = product.metadata.features;
    }

    if (product.metadata.featuresJson) {
      metadata.featuresJson = product.metadata.featuresJson;
    }

    // Parse scrape interval
    if (product.metadata.scrapeIntervalHours) {
      metadata.scrapeIntervalHours = product.metadata.scrapeIntervalHours;
    }

    // Parse custom plan info
    if (product.metadata.custom) {
      metadata.custom = product.metadata.custom;
    }

    if (product.metadata.basePlanId) {
      metadata.basePlanId = product.metadata.basePlanId;
    }

    return metadata;
  }

  /**
   * Parse price metadata for features
   * @param price - Stripe price
   * @returns Parsed metadata
   */
  private parsePriceMetadata(price: Stripe.Price): Partial<StripePlanMetadata> {
    const metadata: Partial<StripePlanMetadata> = {};

    // Price-specific metadata overrides
    if (price.metadata.features) {
      metadata.features = price.metadata.features;
    }

    if (price.metadata.featuresJson) {
      metadata.featuresJson = price.metadata.featuresJson;
    }

    if (price.metadata.scrapeIntervalHours) {
      metadata.scrapeIntervalHours = price.metadata.scrapeIntervalHours;
    }

    return metadata;
  }

  /**
   * Validate plan metadata
   * @param metadata - Plan metadata to validate
   * @returns Validation result
   */
  validatePlanMetadata(metadata: StripePlanMetadata): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate bundle
    if (metadata.bundle && !['basic', 'pro', 'enterprise'].includes(metadata.bundle)) {
      errors.push(`Invalid bundle: ${metadata.bundle}`);
    }

    // Validate features format
    if (metadata.features) {
      if (typeof metadata.features === 'string') {
        try {
          JSON.parse(metadata.features);
        } catch {
          // If not JSON, should be comma-separated
          const features = metadata.features.split(',').map(f => f.trim());
          if (features.some(f => !f)) {
            warnings.push('Empty feature names found in comma-separated list');
          }
        }
      }
    }

    // Validate scrape interval
    if (metadata.scrapeIntervalHours) {
      const interval = parseInt(metadata.scrapeIntervalHours, 10);
      if (isNaN(interval) || interval < 1 || interval > 168) { // 1 hour to 1 week
        errors.push(`Invalid scrape interval: ${metadata.scrapeIntervalHours}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get plan statistics
   * @returns Plan usage statistics
   */
  async getPlanStatistics(): Promise<{
    totalProducts: number;
    totalPrices: number;
    productsWithFeatures: number;
    customPlans: number;
  }> {
    try {
      const products = await this.stripe.products.list({ limit: 100 });
      const prices = await this.stripe.prices.list({ limit: 100 });

      let productsWithFeatures = 0;
      let customPlans = 0;

      for (const product of products.data) {
        if (product.metadata.features || product.metadata.featuresJson) {
          productsWithFeatures++;
        }
        if (product.metadata.custom === 'true') {
          customPlans++;
        }
      }

      return {
        totalProducts: products.data.length,
        totalPrices: prices.data.length,
        productsWithFeatures,
        customPlans
      };
    } catch (error) {
      console.error('Error getting plan statistics:', error);
      return {
        totalProducts: 0,
        totalPrices: 0,
        productsWithFeatures: 0,
        customPlans: 0
      };
    }
  }
}

/**
 * Create a Stripe sync service instance
 * @param stripe - Stripe instance
 * @returns StripeSyncService instance
 */
export function createStripeSyncService(stripe: Stripe): StripeSyncService {
  return new StripeSyncService(stripe);
}

/**
 * Parse features from various metadata formats
 * @param metadata - Stripe metadata
 * @returns Parsed features object
 */
export function parseFeaturesFromMetadata(metadata: Record<string, string>): Record<string, boolean> {
  const features: Record<string, boolean> = {};

  // Try features field first
  if (metadata.features) {
    if (typeof metadata.features === 'string') {
      try {
        const parsed = JSON.parse(metadata.features);
        Object.assign(features, parsed);
      } catch {
        // If not JSON, treat as comma-separated list
        const featureList = metadata.features.split(',').map(f => f.trim());
        for (const feature of featureList) {
          features[feature] = true;
        }
      }
    }
  }

  // Try featuresJson field
  if (metadata.featuresJson) {
    try {
      const parsed = JSON.parse(metadata.featuresJson);
      Object.assign(features, parsed);
    } catch (error) {
      console.warn('Failed to parse featuresJson:', error);
    }
  }

  return features;
}
