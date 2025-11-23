/**
 * Billing Types and Interfaces
 * Type-safe billing and subscription management with Stripe-derived types
 */

import { SubscriptionTier, SubscriptionStatus, UsageType } from '@prisma/client';
import Stripe from 'stripe';
import { Decimal } from 'decimal.js';
import { Metadata } from '@stripe/stripe-js';

// Re-export types from database
export type { SubscriptionTier, SubscriptionStatus, UsageType };

// Stripe-derived types
export interface StripeServiceOption {
  product: Stripe.Product;
  price: Stripe.Price;
}
export interface PaymentMethodData {
  id: string;
  stripePaymentMethodId: string;
  type: Stripe.PaymentMethod.Type;
  isDefault: boolean;
  nickname?: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    funding?: string;
    country?: string;
  };
  billingDetails?: Stripe.PaymentMethod.BillingDetails;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingAddressData {
  id: string;
  teamId: string;
  isDefault: boolean;
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  taxId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductData {
  id: string;
  stripeProductId: string;
  stripePriceId?: string;
  name: string;
  description?: string;
  tier?: SubscriptionTier;
  price: {
    amount: number; // in cents
    currency: string;
    interval: Stripe.Price.Recurring.Interval;
    intervalCount: number;
    formatted: string;
  };
  features: string[];
  active: boolean;
  metadata?: TierMetadata;
}

export interface SetupIntentResult {
  clientSecret: string;
  setupIntentId: string;
}

export interface AttachPaymentMethodResult {
  paymentMethod: PaymentMethodData;
  isDefault: boolean;
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  
  // Base pricing
  basePrice: Decimal;
  billingInterval: 'month' | 'year';
  
  // Included limits
  includedSeats: number;
  includedLocations: number;
  includedRefreshes: number; // per day
  
  // Per-unit pricing
  pricePerSeat: Decimal;
  pricePerLocation: Decimal;
  pricePerRefresh: Decimal;
  
  // Features
  enabledFeatures: string[];
  
  // Stripe configuration
  stripePriceId?: string;
  stripeProductId?: string;
  
  // Display
  popular?: boolean;
  highlighted?: boolean;
}

export interface UsageLimit {
  type: UsageType;
  category: string;
  limit: number;
  period: 'hour' | 'day' | 'month';
  overageAllowed: boolean;
  overagePrice?: Decimal;
}

export interface SubscriptionDetails {
  id: string;
  teamId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentSeats: number;
  currentLocations: number;
  enabledFeatures: string[];
  trialEnd?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionCalculation {
  baseAmount: Decimal;
  seatAmount: Decimal;
  locationAmount: Decimal;
  usageAmount: Decimal;
  totalAmount: Decimal;
  
  breakdown: {
    description: string;
    quantity: number;
    unitPrice: Decimal;
    amount: Decimal;
  }[];
  
  nextBillingDate: Date;
  prorationAmount?: Decimal;
}

export interface UsageRecord {
  teamId: string;
  type: UsageType;
  category: string;
  resource?: string;
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface QuotaCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: Date;
  overagePrice?: Decimal;
}

export interface SubscriptionServiceConfig {
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  features: {
    enableUsageTracking: boolean;
    enableQuotaEnforcement: boolean;
    enableWebhooks: boolean;
  };
}

export interface CreateSubscriptionInput {
  teamId: string;
  tier: SubscriptionTier;
  paymentMethodId?: string;
  trialDays?: number;
  customPricing?: {
    basePrice?: Decimal;
    pricePerSeat?: Decimal;
    pricePerLocation?: Decimal;
    pricePerRefresh?: Decimal;
  };
}

export interface UpdateSubscriptionInput {
  tier?: SubscriptionTier;
  seats?: number;
  locations?: number;
  customPricing?: {
    basePrice?: Decimal;
    pricePerSeat?: Decimal;
    pricePerLocation?: Decimal;
    pricePerRefresh?: Decimal;
  };
  enabledFeatures?: string[];
}

export interface BillingOverride {
  type: 'FEATURE' | 'LIMIT' | 'QUOTA' | 'PRICING';
  key: string;
  value: any;
  reason?: string;
  expiresAt?: Date;
}

/**
 * Extended Stripe Metadata that includes tier configuration
 * This type extends Stripe.Metadata and adds structured tier config data
 */
export interface StripeTierMetadata extends Stripe.Metadata {
  basePrice?: string;
  billingInterval?: string;
  configId?: string;
  featureFlags?: string; // JSON string of feature flags array
  highlighted?: string;
  includedLocations?: string;
  includedRefreshes?: string;
  includedSeats?: string;
  popular?: string;
  pricePerLocation?: string;
  pricePerRefresh?: string;
  pricePerSeat?: string;
  sortOrder?: string;
  tier?: string;
}

export interface ParsedTierMetadata {
  basePrice: number;
  billingInterval: string;
  configId: string;
  featureFlags: string[];
  highlighted: boolean;
  includedLocations: number;
  includedRefreshes: number;
  includedSeats: number;
  popular: boolean;
  pricePerLocation: number;
  pricePerRefresh: number;
  pricePerSeat: number;
  sortOrder: number;
  tier: SubscriptionTier;
}

// Export as both interface and type alias for convenience
export type TierMetadata = ParsedTierMetadata;

// Feature flag integration interface
export interface FeatureFlagChecker {
  /**
   * Check if a feature flag is enabled for the current tier
   */
  hasFeature: (feature: string) => boolean;
  
  /**
   * Check if multiple features are enabled
   */
  hasFeatures: (features: string[]) => boolean;
  
  /**
   * Get all enabled features for the tier
   */
  getEnabledFeatures: () => string[];
  
  /**
   * Check if tier supports a feature category
   */
  supportsCategory: (category: string) => boolean;
}

// Utility object for easy tier metadata access
export const TierMetadataUtils = {
  /**
   * Check if a tier has a specific feature
   */
  hasFeature: (metadata: TierMetadata, feature: string): boolean => {
    return metadata.featureFlags.includes(feature);
  },

  /**
   * Get formatted price string
   */
  getFormattedPrice: (metadata: TierMetadata): string => {
    return `$${metadata.basePrice}/${metadata.billingInterval}`;
  },

  /**
   * Check if tier is popular or highlighted
   */
  isRecommended: (metadata: TierMetadata): boolean => {
    return metadata.popular || metadata.highlighted;
  },

  /**
   * Get tier display name with status
   */
  getDisplayName: (metadata: TierMetadata): string => {
    let name = metadata.tier;
    if (metadata.popular) name += ' (Popular)';
    if (metadata.highlighted) name += ' (Recommended)';
    return name;
  },

  /**
   * Calculate total cost for given usage
   */
  calculateCost: (
    metadata: TierMetadata, 
    seats: number, 
    locations: number, 
    refreshes: number
  ): number => {
    const baseCost = metadata.basePrice;
    const seatCost = Math.max(0, seats - metadata.includedSeats) * metadata.pricePerSeat;
    const locationCost = Math.max(0, locations - metadata.includedLocations) * metadata.pricePerLocation;
    const refreshCost = Math.max(0, refreshes - metadata.includedRefreshes) * metadata.pricePerRefresh;
    
    return baseCost + seatCost + locationCost + refreshCost;
  },

  /**
   * Get usage limits summary
   */
  getUsageLimits: (metadata: TierMetadata) => ({
    seats: metadata.includedSeats,
    locations: metadata.includedLocations,
    refreshes: metadata.includedRefreshes,
    features: metadata.featureFlags.length
  }),

  /**
   * Check if tier supports a specific feature category
   */
  supportsCategory: (metadata: TierMetadata, category: string): boolean => {
    const categoryFeatures = {
      'analytics': ['basic_analytics', 'advanced_analytics'],
      'automation': ['automation_features', 'real_time_alerts'],
      'integrations': ['api_access', 'custom_integrations'],
      'support': ['email_support', 'priority_support', 'dedicated_support']
    };
    
    const features = categoryFeatures[category as keyof typeof categoryFeatures] || [];
    return features.some(feature => metadata.featureFlags.includes(feature));
  }
};

/**
 * Create a FeatureFlagChecker from TierMetadata
 * This provides a convenient interface for checking features
 */
export function createFeatureFlagChecker(metadata: TierMetadata): FeatureFlagChecker {
  return {
    hasFeature: (feature: string): boolean => {
      return metadata.featureFlags.includes(feature);
    },
    
    hasFeatures: (features: string[]): boolean => {
      return features.every(feature => metadata.featureFlags.includes(feature));
    },
    
    getEnabledFeatures: (): string[] => {
      return [...metadata.featureFlags];
    },
    
    supportsCategory: (category: string): boolean => {
      const categoryFeatures = {
        'analytics': ['basic_analytics', 'advanced_analytics'],
        'automation': ['automation_features', 'real_time_alerts'],
        'integrations': ['api_access', 'custom_integrations'],
        'support': ['email_support', 'priority_support', 'dedicated_support'],
        'reviews': ['google_reviews_access', 'facebook_reviews_access', 'tripadvisor_reviews_access', 'booking_reviews_access', 'yelp_reviews_access'],
        'social': ['instagram_analytics', 'tiktok_analytics', 'twitter_automation'],
        'advanced': ['ai_sentiment_analysis', 'white_label_branding', 'bulk_operations']
      };
      
      const features = categoryFeatures[category as keyof typeof categoryFeatures] || [];
      return features.some(feature => metadata.featureFlags.includes(feature));
    }
  };
}


/**
 * Utility function to parse Stripe metadata into structured tier configuration
 */
export function parseTierMetadata(meta: StripeTierMetadata): ParsedTierMetadata {
  return {
    basePrice: Number(meta.basePrice ?? 0),
    billingInterval: meta.billingInterval ?? "month",
    configId: meta.configId ?? "",
    featureFlags: meta.featureFlags ? JSON.parse(meta.featureFlags) : [],
    highlighted: meta.highlighted === "true",
    includedLocations: Number(meta.includedLocations ?? 0),
    includedRefreshes: Number(meta.includedRefreshes ?? 0),
    includedSeats: Number(meta.includedSeats ?? 0),
    popular: meta.popular === "true",
    pricePerLocation: Number(meta.pricePerLocation ?? 0),
    pricePerRefresh: Number(meta.pricePerRefresh ?? 0),
    pricePerSeat: Number(meta.pricePerSeat ?? 0),
    sortOrder: Number(meta.sortOrder ?? 0),
    tier: meta.tier as SubscriptionTier,
  };
}

// Usage limits by tier
export const USAGE_LIMITS: Record<SubscriptionTier, UsageLimit[]> = {
  FREE: [
    {
      type: 'SCRAPER_REFRESH',
      category: 'all',
      limit: 6,
      period: 'day',
      overageAllowed: false,
    },
    {
      type: 'API_CALL',
      category: 'all',
      limit: 100,
      period: 'day',
      overageAllowed: false,
    },
    {
      type: 'LOCATION',
      category: 'all',
      limit: 1,
      period: 'month',
      overageAllowed: false,
    },
  ],
  
  STARTER: [
    {
      type: 'SCRAPER_REFRESH',
      category: 'all',
      limit: 24,
      period: 'day',
      overageAllowed: true,
      overagePrice: new Decimal(0.50),
    },
    {
      type: 'API_CALL',
      category: 'all',
      limit: 1000,
      period: 'day',
      overageAllowed: true,
      overagePrice: new Decimal(0.01),
    },
    {
      type: 'LOCATION',
      category: 'all',
      limit: 3,
      period: 'month',
      overageAllowed: true,
      overagePrice: new Decimal(15),
    },
  ],
  
  PROFESSIONAL: [
    {
      type: 'SCRAPER_REFRESH',
      category: 'all',
      limit: 72,
      period: 'day',
      overageAllowed: true,
      overagePrice: new Decimal(0.25),
    },
    {
      type: 'API_CALL',
      category: 'all',
      limit: 10000,
      period: 'day',
      overageAllowed: true,
      overagePrice: new Decimal(0.005),
    },
    {
      type: 'LOCATION',
      category: 'all',
      limit: 10,
      period: 'month',
      overageAllowed: true,
      overagePrice: new Decimal(10),
    },
  ],
  
  ENTERPRISE: [
    {
      type: 'SCRAPER_REFRESH',
      category: 'all',
      limit: 288,
      period: 'day',
      overageAllowed: true,
      overagePrice: new Decimal(0.10),
    },
    {
      type: 'API_CALL',
      category: 'all',
      limit: 100000,
      period: 'day',
      overageAllowed: true,
      overagePrice: new Decimal(0.001),
    },
    {
      type: 'LOCATION',
      category: 'all',
      limit: 50,
      period: 'month',
      overageAllowed: true,
      overagePrice: new Decimal(8),
    },
  ],
  
  CUSTOM: [],
};

// Note: SUBSCRIPTION_PLANS is now dynamically loaded from the database
// Use getProducts() or getTierConfigs() to get current subscription plans

