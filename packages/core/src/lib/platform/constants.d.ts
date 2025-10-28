/**
 * Platform Constants and Configurations
 * Business logic constants for supported platforms
 */
import { PlatformType, PlatformConfig, PlatformDisplayConfig } from './types';
export declare const PLATFORM_CONFIGS: Record<PlatformType, PlatformConfig>;
export declare const PLATFORM_DISPLAY_CONFIGS: Record<PlatformType, PlatformDisplayConfig>;
export declare const SOCIAL_PLATFORM_DISPLAY_CONFIGS: Record<string, PlatformDisplayConfig>;
export declare const PLATFORM_MAPPING: Record<PlatformType, string>;
export declare const SUPPORTED_PLATFORMS: PlatformType[];
export declare const PLATFORM_CATEGORIES: {
    readonly REVIEW_PLATFORMS: readonly ["GOOGLE", "FACEBOOK", "TRIPADVISOR", "BOOKING", "YELP"];
    readonly BUSINESS_PLATFORMS: readonly ["GOOGLE", "FACEBOOK", "TRIPADVISOR", "BOOKING", "YELP"];
};
export declare const PLATFORM_FEATURES: {
    readonly GOOGLE: readonly ["reviews", "ratings", "business_info", "photos", "posts"];
    readonly FACEBOOK: readonly ["reviews", "ratings", "posts", "events", "messaging"];
    readonly TRIPADVISOR: readonly ["reviews", "ratings", "photos", "business_info"];
    readonly BOOKING: readonly ["reviews", "ratings", "business_info", "availability"];
    readonly YELP: readonly ["reviews", "ratings", "business_info", "photos"];
};
//# sourceMappingURL=constants.d.ts.map