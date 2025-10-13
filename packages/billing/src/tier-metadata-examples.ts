/**
 * TierMetadata Usage Examples
 * Demonstrates how to use TierMetadata and TierMetadataUtils in UI components
 */

import { TierMetadata, TierMetadataUtils } from './types';

// Example 1: Basic tier metadata access
export function getTierInfo(metadata: TierMetadata) {
  return {
    name: metadata.tier,
    price: TierMetadataUtils.getFormattedPrice(metadata),
    isRecommended: TierMetadataUtils.isRecommended(metadata),
    displayName: TierMetadataUtils.getDisplayName(metadata),
    limits: TierMetadataUtils.getUsageLimits(metadata)
  };
}

// Example 2: Feature checking
export function checkTierFeatures(metadata: TierMetadata, requiredFeatures: string[]) {
  return {
    hasAllFeatures: requiredFeatures.every(feature => 
      TierMetadataUtils.hasFeature(metadata, feature)
    ),
    missingFeatures: requiredFeatures.filter(feature => 
      !TierMetadataUtils.hasFeature(metadata, feature)
    ),
    supportsAnalytics: TierMetadataUtils.supportsCategory(metadata, 'analytics'),
    supportsAutomation: TierMetadataUtils.supportsCategory(metadata, 'automation')
  };
}

// Example 3: Cost calculation
export function calculateTierCost(
  metadata: TierMetadata, 
  currentUsage: { seats: number; locations: number; refreshes: number }
) {
  const totalCost = TierMetadataUtils.calculateCost(
    metadata,
    currentUsage.seats,
    currentUsage.locations,
    currentUsage.refreshes
  );
  
  const baseCost = metadata.basePrice;
  const overageCost = totalCost - baseCost;
  
  return {
    baseCost,
    overageCost,
    totalCost,
    hasOverage: overageCost > 0,
    breakdown: {
      seats: Math.max(0, currentUsage.seats - metadata.includedSeats),
      locations: Math.max(0, currentUsage.locations - metadata.includedLocations),
      refreshes: Math.max(0, currentUsage.refreshes - metadata.includedRefreshes)
    }
  };
}

// Example 4: Tier comparison
export function compareTiers(metadata1: TierMetadata, metadata2: TierMetadata) {
  return {
    priceDifference: metadata1.basePrice - metadata2.basePrice,
    featureDifference: {
      added: metadata1.featureFlags.filter(f => !metadata2.featureFlags.includes(f)),
      removed: metadata2.featureFlags.filter(f => !metadata1.featureFlags.includes(f))
    },
    limitsComparison: {
      seats: metadata1.includedSeats - metadata2.includedSeats,
      locations: metadata1.includedLocations - metadata2.includedLocations,
      refreshes: metadata1.includedRefreshes - metadata2.includedRefreshes
    }
  };
}

// Example 5: UI component usage
export function TierCard({ metadata }: { metadata: TierMetadata }) {
  const tierInfo = getTierInfo(metadata);
  const features = checkTierFeatures(metadata, ['api_access', 'advanced_analytics']);
  
  return {
    title: tierInfo.displayName,
    price: tierInfo.price,
    isRecommended: tierInfo.isRecommended,
    features: metadata.featureFlags,
    limits: tierInfo.limits,
    hasRequiredFeatures: features.hasAllFeatures,
    missingFeatures: features.missingFeatures
  };
}
