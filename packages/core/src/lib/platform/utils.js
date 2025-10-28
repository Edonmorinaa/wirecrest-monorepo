"use strict";
/**
 * Platform Utility Functions
 * Business logic utilities for platform operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformButtonIcon = exports.getPlatformButtonText = exports.getPlatformName = exports.getPlatformColor = exports.getPlatformIcon = exports.normalizePlatformIdentifier = exports.validatePlatformIdentifier = exports.getPlatformIdentifierPrefix = exports.getPlatformIdentifierPlaceholder = exports.getPlatformIdentifierLabel = exports.supportsBusinessProfiles = exports.supportsAnalytics = exports.supportsReviews = exports.getPlatformMappingKey = exports.getPlatformDisplayConfig = exports.getPlatformConfig = exports.marketPlatformToPlatformType = exports.platformTypeToMarketPlatform = void 0;
const constants_1 = require("./constants");
/**
 * Convert PlatformType to MarketPlatform
 */
const platformTypeToMarketPlatform = (platformType) => {
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
exports.platformTypeToMarketPlatform = platformTypeToMarketPlatform;
/**
 * Convert MarketPlatform to PlatformType
 */
const marketPlatformToPlatformType = (marketPlatform) => {
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
exports.marketPlatformToPlatformType = marketPlatformToPlatformType;
/**
 * Get platform configuration
 */
const getPlatformConfig = (platform) => {
    return constants_1.PLATFORM_CONFIGS[platform];
};
exports.getPlatformConfig = getPlatformConfig;
/**
 * Get platform display configuration
 */
const getPlatformDisplayConfig = (platform) => {
    return constants_1.PLATFORM_DISPLAY_CONFIGS[platform];
};
exports.getPlatformDisplayConfig = getPlatformDisplayConfig;
/**
 * Get platform mapping key
 */
const getPlatformMappingKey = (platform) => {
    return constants_1.PLATFORM_MAPPING[platform];
};
exports.getPlatformMappingKey = getPlatformMappingKey;
/**
 * Check if platform supports reviews
 */
const supportsReviews = (platform) => {
    const config = (0, exports.getPlatformConfig)(platform);
    return config.ratingType === 'stars' || config.ratingType === 'numeric' || config.ratingType === 'recommendation';
};
exports.supportsReviews = supportsReviews;
/**
 * Check if platform supports analytics
 */
const supportsAnalytics = (platform) => {
    return false; // No analytics platforms in current PlatformType
};
exports.supportsAnalytics = supportsAnalytics;
/**
 * Check if platform supports business profiles
 */
const supportsBusinessProfiles = (platform) => {
    return ['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING', 'YELP'].includes(platform);
};
exports.supportsBusinessProfiles = supportsBusinessProfiles;
/**
 * Get platform identifier label
 */
const getPlatformIdentifierLabel = (platform) => {
    const displayConfig = (0, exports.getPlatformDisplayConfig)(platform);
    return displayConfig.identifierLabel;
};
exports.getPlatformIdentifierLabel = getPlatformIdentifierLabel;
/**
 * Get platform identifier placeholder
 */
const getPlatformIdentifierPlaceholder = (platform) => {
    const displayConfig = (0, exports.getPlatformDisplayConfig)(platform);
    return displayConfig.identifierPlaceholder;
};
exports.getPlatformIdentifierPlaceholder = getPlatformIdentifierPlaceholder;
/**
 * Get platform identifier prefix
 */
const getPlatformIdentifierPrefix = (platform) => {
    const displayConfig = (0, exports.getPlatformDisplayConfig)(platform);
    return displayConfig.identifierPrefix;
};
exports.getPlatformIdentifierPrefix = getPlatformIdentifierPrefix;
/**
 * Validate platform identifier
 */
const validatePlatformIdentifier = (platform, identifier) => {
    if (!identifier || identifier.trim() === '') {
        return false;
    }
    const prefix = (0, exports.getPlatformIdentifierPrefix)(platform);
    const placeholder = (0, exports.getPlatformIdentifierPlaceholder)(platform);
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
exports.validatePlatformIdentifier = validatePlatformIdentifier;
/**
 * Normalize platform identifier
 */
const normalizePlatformIdentifier = (platform, identifier) => {
    if (!identifier || identifier.trim() === '') {
        return '';
    }
    const prefix = (0, exports.getPlatformIdentifierPrefix)(platform);
    const trimmed = identifier.trim();
    switch (platform) {
        case 'GOOGLE':
            // Ensure Place ID is uppercase
            return trimmed.toUpperCase();
        default:
            return trimmed;
    }
};
exports.normalizePlatformIdentifier = normalizePlatformIdentifier;
/**
 * Get platform icon
 */
const getPlatformIcon = (platform) => {
    const config = (0, exports.getPlatformConfig)(platform);
    return config.icon;
};
exports.getPlatformIcon = getPlatformIcon;
/**
 * Get platform color
 */
const getPlatformColor = (platform) => {
    const displayConfig = (0, exports.getPlatformDisplayConfig)(platform);
    return displayConfig.color;
};
exports.getPlatformColor = getPlatformColor;
/**
 * Get platform name
 */
const getPlatformName = (platform) => {
    const config = (0, exports.getPlatformConfig)(platform);
    return config.name;
};
exports.getPlatformName = getPlatformName;
/**
 * Get platform button text
 */
const getPlatformButtonText = (platform) => {
    const config = (0, exports.getPlatformConfig)(platform);
    return config.buttonText;
};
exports.getPlatformButtonText = getPlatformButtonText;
/**
 * Get platform button icon
 */
const getPlatformButtonIcon = (platform) => {
    const config = (0, exports.getPlatformConfig)(platform);
    return config.buttonIcon;
};
exports.getPlatformButtonIcon = getPlatformButtonIcon;
//# sourceMappingURL=utils.js.map