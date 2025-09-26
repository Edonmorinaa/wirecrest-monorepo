/**
 * Platform Utility Functions
 * Business logic utilities for platform operations
 */

import { PlatformType, MarketPlatform, PlatformConfig, PlatformDisplayConfig } from './types';
import { PLATFORM_CONFIGS, PLATFORM_DISPLAY_CONFIGS, PLATFORM_MAPPING } from './constants';

/**
 * Convert PlatformType to MarketPlatform
 */
export const platformTypeToMarketPlatform = (platformType: PlatformType): MarketPlatform => {
  switch (platformType) {
    case 'GOOGLE':
      return 'GOOGLE_MAPS';
    case 'FACEBOOK':
      return 'FACEBOOK';
    case 'TRIPADVISOR':
      return 'TRIPADVISOR';
    case 'BOOKING':
      return 'BOOKING';
    default:
      throw new Error(`Unknown platform type: ${platformType}`);
  }
};

/**
 * Convert MarketPlatform to PlatformType
 */
export const marketPlatformToPlatformType = (marketPlatform: MarketPlatform): PlatformType => {
  switch (marketPlatform) {
    case 'GOOGLE_MAPS':
      return 'GOOGLE';
    case 'FACEBOOK':
      return 'FACEBOOK';
    case 'TRIPADVISOR':
      return 'TRIPADVISOR';
    case 'BOOKING':
      return 'BOOKING';
    default:
      throw new Error(`Unknown market platform: ${marketPlatform}`);
  }
};

/**
 * Get platform configuration
 */
export const getPlatformConfig = (platform: PlatformType): PlatformConfig => {
  return PLATFORM_CONFIGS[platform];
};

/**
 * Get platform display configuration
 */
export const getPlatformDisplayConfig = (platform: PlatformType): PlatformDisplayConfig => {
  return PLATFORM_DISPLAY_CONFIGS[platform];
};

/**
 * Get platform mapping key
 */
export const getPlatformMappingKey = (platform: PlatformType): string => {
  return PLATFORM_MAPPING[platform];
};

/**
 * Check if platform supports reviews
 */
export const supportsReviews = (platform: PlatformType): boolean => {
  const config = getPlatformConfig(platform);
  return config.ratingType === 'stars' || config.ratingType === 'numeric' || config.ratingType === 'recommendation';
};

/**
 * Check if platform supports analytics
 */
export const supportsAnalytics = (platform: PlatformType): boolean => {
  return false; // No analytics platforms in current PlatformType
};

/**
 * Check if platform supports business profiles
 */
export const supportsBusinessProfiles = (platform: PlatformType): boolean => {
  return ['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING', 'YELP'].includes(platform);
};

/**
 * Get platform identifier label
 */
export const getPlatformIdentifierLabel = (platform: PlatformType): string => {
  const displayConfig = getPlatformDisplayConfig(platform);
  return displayConfig.identifierLabel;
};

/**
 * Get platform identifier placeholder
 */
export const getPlatformIdentifierPlaceholder = (platform: PlatformType): string => {
  const displayConfig = getPlatformDisplayConfig(platform);
  return displayConfig.identifierPlaceholder;
};

/**
 * Get platform identifier prefix
 */
export const getPlatformIdentifierPrefix = (platform: PlatformType): string => {
  const displayConfig = getPlatformDisplayConfig(platform);
  return displayConfig.identifierPrefix;
};

/**
 * Validate platform identifier
 */
export const validatePlatformIdentifier = (platform: PlatformType, identifier: string): boolean => {
  if (!identifier || identifier.trim() === '') {
    return false;
  }

  const prefix = getPlatformIdentifierPrefix(platform);
  const placeholder = getPlatformIdentifierPlaceholder(platform);

  switch (platform) {
    case 'GOOGLE':
      // Google Place ID format: ChIJ...
      return identifier.startsWith('ChIJ') && identifier.length > 10;
    case 'FACEBOOK':
      // Facebook URL format: https://facebook.com/...
      return identifier.startsWith('https://facebook.com/') || identifier.startsWith('https://www.facebook.com/');
    case 'TRIPADVISOR':
      // TripAdvisor URL format: https://tripadvisor.com/...
      return identifier.startsWith('https://tripadvisor.com/') || identifier.startsWith('https://www.tripadvisor.com/');
    case 'BOOKING':
      // Booking.com URL format: https://booking.com/...
      return identifier.startsWith('https://booking.com/') || identifier.startsWith('https://www.booking.com/');
    case 'YELP':
      // Yelp URL format: https://yelp.com/...
      return identifier.startsWith('https://yelp.com/') || identifier.startsWith('https://www.yelp.com/');
    default:
      return false;
  }
};

/**
 * Normalize platform identifier
 */
export const normalizePlatformIdentifier = (platform: PlatformType, identifier: string): string => {
  if (!identifier || identifier.trim() === '') {
    return '';
  }

  const prefix = getPlatformIdentifierPrefix(platform);
  const trimmed = identifier.trim();

  switch (platform) {
    case 'GOOGLE':
      // Ensure Place ID is uppercase
      return trimmed.toUpperCase();
    default:
      return trimmed;
  }
};

/**
 * Get platform icon
 */
export const getPlatformIcon = (platform: PlatformType): string => {
  const config = getPlatformConfig(platform);
  return config.icon;
};

/**
 * Get platform color
 */
export const getPlatformColor = (platform: PlatformType): string => {
  const displayConfig = getPlatformDisplayConfig(platform);
  return displayConfig.color;
};

/**
 * Get platform name
 */
export const getPlatformName = (platform: PlatformType): string => {
  const config = getPlatformConfig(platform);
  return config.name;
};

/**
 * Get platform button text
 */
export const getPlatformButtonText = (platform: PlatformType): string => {
  const config = getPlatformConfig(platform);
  return config.buttonText;
};

/**
 * Get platform button icon
 */
export const getPlatformButtonIcon = (platform: PlatformType): string => {
  const config = getPlatformConfig(platform);
  return config.buttonIcon;
};
