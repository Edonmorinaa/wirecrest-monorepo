#!/usr/bin/env tsx
/**
 * Initialize Default Tier Configurations Script
 * Run this script to create default subscription tier configurations
 * 
 * Usage: npx tsx packages/billing/scripts/initialize-tier-configs.ts
 */

import { prisma } from '@wirecrest/db';

const defaultTierConfigs = [
  {
    tier: 'FREE' as const,
    name: 'Free',
    description: 'Perfect for trying out Wirecrest',
    basePrice: 0,
    billingInterval: 'month',
    includedSeats: 1,
    includedLocations: 1,
    includedRefreshes: 6, // 4 times per day
    pricePerSeat: 0,
    pricePerLocation: 0,
    pricePerRefresh: 0,
    enabledFeatures: [
      'google_reviews_access',
      'facebook_reviews_access',
    ],
    popular: false,
    highlighted: false,
    sortOrder: 0,
    active: true,
  },
  {
    tier: 'STARTER' as const,
    name: 'Starter',
    description: 'For small businesses getting started',
    basePrice: 29,
    billingInterval: 'month',
    includedSeats: 2,
    includedLocations: 3,
    includedRefreshes: 24, // Every hour
    pricePerSeat: 10,
    pricePerLocation: 15,
    pricePerRefresh: 0.50,
    enabledFeatures: [
      'google_reviews_access',
      'facebook_reviews_access',
      'tripadvisor_reviews_access',
      'multi_location_support',
      'basic_analytics',
    ],
    popular: true,
    highlighted: false,
    sortOrder: 1,
    active: true,
  },
  {
    tier: 'PROFESSIONAL' as const,
    name: 'Professional',
    description: 'For growing businesses with advanced needs',
    basePrice: 99,
    billingInterval: 'month',
    includedSeats: 5,
    includedLocations: 10,
    includedRefreshes: 72, // Every 20 minutes
    pricePerSeat: 15,
    pricePerLocation: 10,
    pricePerRefresh: 0.25,
    enabledFeatures: [
      'google_reviews_access',
      'facebook_reviews_access',
      'tripadvisor_reviews_access',
      'booking_reviews_access',
      'yelp_reviews_access',
      'multi_location_support',
      'advanced_analytics',
      'api_access',
      'automation_features',
      'instagram_analytics',
      'tiktok_analytics',
      'custom_reporting',
    ],
    popular: false,
    highlighted: true,
    sortOrder: 2,
    active: true,
  },
  {
    tier: 'ENTERPRISE' as const,
    name: 'Enterprise',
    description: 'For large organizations with custom requirements',
    basePrice: 299,
    billingInterval: 'month',
    includedSeats: 20,
    includedLocations: 50,
    includedRefreshes: 288, // Every 5 minutes
    pricePerSeat: 12,
    pricePerLocation: 8,
    pricePerRefresh: 0.10,
    enabledFeatures: [
      // All features enabled
      'google_reviews_access',
      'facebook_reviews_access',
      'tripadvisor_reviews_access',
      'booking_reviews_access',
      'yelp_reviews_access',
      'multi_location_support',
      'advanced_analytics',
      'api_access',
      'automation_features',
      'instagram_analytics',
      'tiktok_analytics',
      'custom_reporting',
      'white_label_branding',
      'ai_sentiment_analysis',
      'real_time_alerts',
      'custom_integrations',
      'bulk_operations',
      'priority_support',
    ],
    popular: false,
    highlighted: false,
    sortOrder: 3,
    active: true,
  },
  {
    tier: 'CUSTOM' as const,
    name: 'Custom',
    description: 'Tailored pricing for your specific needs',
    basePrice: 0, // Will be set per customer
    billingInterval: 'month',
    includedSeats: 0,
    includedLocations: 0,
    includedRefreshes: 0,
    pricePerSeat: 0,
    pricePerLocation: 0,
    pricePerRefresh: 0,
    enabledFeatures: [], // Will be configured per customer
    popular: false,
    highlighted: false,
    sortOrder: 4,
    active: false, // Not shown by default
  },
];

async function main() {
  console.log('🚀 Initializing default tier configurations...');
  
  try {
    for (const config of defaultTierConfigs) {
      await prisma.subscriptionTierConfig.upsert({
        where: { tier: config.tier },
        create: config,
        update: {
          // Only update if not already customized
          name: config.name,
          description: config.description,
          enabledFeatures: config.enabledFeatures,
          popular: config.popular,
          highlighted: config.highlighted,
          sortOrder: config.sortOrder,
          active: config.active,
        },
      });
      
      console.log(`✅ Configured tier: ${config.name} (${config.tier})`);
    }
    
    console.log('\n✅ Tier configuration initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npx tsx packages/billing/scripts/initialize-products.ts');
    console.log('2. Run: npx prisma db push');
    console.log('3. Test the products: import { getProducts } from "@wirecrest/billing"');
    
  } catch (error) {
    console.error('\n❌ Tier configuration initialization failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
