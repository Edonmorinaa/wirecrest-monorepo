/**
 * Platform Utility Functions
 * Business logic utilities for platform operations
 */
import { PlatformType, MarketPlatform, PlatformConfig, PlatformDisplayConfig } from './types';
/**
 * Convert PlatformType to MarketPlatform
 */
export declare const platformTypeToMarketPlatform: (platformType: PlatformType) => MarketPlatform;
/**
 * Convert MarketPlatform to PlatformType
 */
export declare const marketPlatformToPlatformType: (marketPlatform: MarketPlatform) => PlatformType;
/**
 * Get platform configuration
 */
export declare const getPlatformConfig: (platform: PlatformType) => PlatformConfig;
/**
 * Get platform display configuration
 */
export declare const getPlatformDisplayConfig: (platform: PlatformType) => PlatformDisplayConfig;
/**
 * Get platform mapping key
 */
export declare const getPlatformMappingKey: (platform: PlatformType) => string;
/**
 * Check if platform supports reviews
 */
export declare const supportsReviews: (platform: PlatformType) => boolean;
/**
 * Check if platform supports analytics
 */
export declare const supportsAnalytics: (platform: PlatformType) => boolean;
/**
 * Check if platform supports business profiles
 */
export declare const supportsBusinessProfiles: (platform: PlatformType) => boolean;
/**
 * Get platform identifier label
 */
export declare const getPlatformIdentifierLabel: (platform: PlatformType) => string;
/**
 * Get platform identifier placeholder
 */
export declare const getPlatformIdentifierPlaceholder: (platform: PlatformType) => string;
/**
 * Get platform identifier prefix
 */
export declare const getPlatformIdentifierPrefix: (platform: PlatformType) => string;
/**
 * Validate platform identifier
 */
export declare const validatePlatformIdentifier: (platform: PlatformType, identifier: string) => boolean;
/**
 * Normalize platform identifier
 */
export declare const normalizePlatformIdentifier: (platform: PlatformType, identifier: string) => string;
/**
 * Get platform icon
 */
export declare const getPlatformIcon: (platform: PlatformType) => string;
/**
 * Get platform color
 */
export declare const getPlatformColor: (platform: PlatformType) => string;
/**
 * Get platform name
 */
export declare const getPlatformName: (platform: PlatformType) => string;
/**
 * Get platform button text
 */
export declare const getPlatformButtonText: (platform: PlatformType) => string;
/**
 * Get platform button icon
 */
export declare const getPlatformButtonIcon: (platform: PlatformType) => string;
//# sourceMappingURL=utils.d.ts.map