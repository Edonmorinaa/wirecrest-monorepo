/**
 * Simple Product Features Service
 * 
 * Gets features directly from Stripe products using consumerId.
 * Simple, clean, and focused.
 */

import Stripe from 'stripe';
import { StripeFeatureLookupKey, isValidStripeFeatureKey } from '../../shared/constants/stripe-features.js';
import { StripeService } from '../services/stripe-service.js';

export interface ProductFeaturesConfig {
  stripeSecretKey: string;
}

export class ProductFeaturesService {
  private stripe: Stripe;

  constructor(config: ProductFeaturesConfig) {
    this.stripe = StripeService.getStripeInstance();
  }

  /**
   * Get features for a product using Stripe's products.listFeatures API
   */
  async getProductFeatures(productId: string): Promise<Set<StripeFeatureLookupKey>> {
    try {
      console.log('🔍 Fetching features for product:', productId);
      
      // Get features directly from the product
      const { data: features } = await this.stripe.products.listFeatures(productId);
      
      console.log('📋 Raw features from Stripe:', features);
      
      const validFeatures = new Set<StripeFeatureLookupKey>();
      
      for (const feature of features) {
        if (feature.entitlement_feature.lookup_key && isValidStripeFeatureKey(feature.entitlement_feature.lookup_key)) {
          validFeatures.add(feature.entitlement_feature.lookup_key);
          console.log('✅ Valid feature found:', feature.entitlement_feature.lookup_key);
        } else {
          console.log('❌ Invalid feature skipped:', feature.entitlement_feature.lookup_key);
        }
      }
      
      console.log('🎯 Final features:', Array.from(validFeatures));
      return validFeatures;
      
    } catch (error) {
      console.error('❌ Error fetching product features:', error);
      return new Set();
    }
  }

  /**
   * Check if a product has a specific feature
   */
  async productHasFeature(productId: string, featureKey: StripeFeatureLookupKey): Promise<boolean> {
    const features = await this.getProductFeatures(productId);
    return features.has(featureKey);
  }
}

/**
 * Factory function
 */
export function createProductFeaturesService(config: ProductFeaturesConfig): ProductFeaturesService {
  return new ProductFeaturesService(config);
}
