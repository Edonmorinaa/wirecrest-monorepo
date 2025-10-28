/**
 * Stripe Features Configuration
 * 
 * This defines the Stripe Features (Entitlements API) used throughout the application.
 * These features should be created in Stripe Dashboard and attached to products.
 */

/**
 * Stripe Feature lookup keys
 * These must match the lookup_key values in Stripe
 */
export const StripeFeatureLookupKeys = {
  // Google
  GOOGLE_OVERVIEW: 'google_overview',
  GOOGLE_REVIEWS: 'google_reviews',
  
  // Facebook
  FACEBOOK_OVERVIEW: 'facebook_overview',
  FACEBOOK_REVIEWS: 'facebook_reviews',
  
  // TripAdvisor
  TRIPADVISOR_OVERVIEW: 'tripadvisor_overview',
  TRIPADVISOR_REVIEWS: 'tripadvisor_reviews',
  
  // Booking
  BOOKING_OVERVIEW: 'booking_overview',
  BOOKING_REVIEWS: 'booking_reviews',
  
  // Instagram
  INSTAGRAM_OVERVIEW: 'instagram_overview',
  INSTAGRAM_ANALYTICS: 'instagram_analytics',
  
  // TikTok
  TIKTOK_OVERVIEW: 'tiktok_overview',
  TIKTOK_ANALYTICS: 'tiktok_analytics',
} as const;

export type StripeFeatureLookupKey = typeof StripeFeatureLookupKeys[keyof typeof StripeFeatureLookupKeys];
/**
 * Get all available feature keys
 */
export function getAllStripeFeatureKeys(): StripeFeatureLookupKey[] {
  return Object.values(StripeFeatureLookupKeys);
}

/**
 * Check if a feature key is valid
 */
export function isValidStripeFeatureKey(key: string): key is StripeFeatureLookupKey {
  return Object.values(StripeFeatureLookupKeys).includes(key as StripeFeatureLookupKey);
}

