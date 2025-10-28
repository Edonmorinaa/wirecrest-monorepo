/**
 * Business Utility Functions
 * Core business logic utilities for business operations
 */
import { BusinessProfile, BusinessMetrics } from './types';
/**
 * Calculate business metrics
 */
export declare const calculateBusinessMetrics: (profile: BusinessProfile, reviews: any[]) => BusinessMetrics;
/**
 * Validate business profile
 */
export declare const validateBusinessProfile: (profile: Partial<BusinessProfile>) => string[];
/**
 * Check if business is active
 */
export declare const isBusinessActive: (profile: BusinessProfile) => boolean;
/**
 * Get business age in days
 */
export declare const getBusinessAge: (profile: BusinessProfile) => number;
/**
 * Check if business needs verification
 */
export declare const needsVerification: (profile: BusinessProfile) => boolean;
/**
 * Get business size category
 */
export declare const getBusinessSize: (employeeCount: string) => string;
/**
 * Get revenue category
 */
export declare const getRevenueCategory: (revenue: string) => string;
/**
 * Get business type display name
 */
export declare const getBusinessTypeDisplayName: (businessType: string) => string;
/**
 * Check if business is eligible for premium features
 */
export declare const isEligibleForPremium: (profile: BusinessProfile, subscriptionTier: string) => boolean;
/**
 * Get business contact information
 */
export declare const getBusinessContactInfo: (profile: BusinessProfile) => {
    email: string | undefined;
    phone: string | undefined;
    website: string | undefined;
    address: string | undefined;
    city: string | undefined;
    state: string | undefined;
    country: string | undefined;
    postalCode: string | undefined;
};
/**
 * Get business social media links
 */
export declare const getBusinessSocialMedia: (profile: BusinessProfile) => {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
};
/**
 * Check if business has social media presence
 */
export declare const hasSocialMediaPresence: (profile: BusinessProfile) => boolean;
//# sourceMappingURL=utils.d.ts.map