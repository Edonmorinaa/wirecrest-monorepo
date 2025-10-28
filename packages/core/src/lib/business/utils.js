"use strict";
/**
 * Business Utility Functions
 * Core business logic utilities for business operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSocialMediaPresence = exports.getBusinessSocialMedia = exports.getBusinessContactInfo = exports.isEligibleForPremium = exports.getBusinessTypeDisplayName = exports.getRevenueCategory = exports.getBusinessSize = exports.needsVerification = exports.getBusinessAge = exports.isBusinessActive = exports.validateBusinessProfile = exports.calculateBusinessMetrics = void 0;
const constants_1 = require("./constants");
/**
 * Calculate business metrics
 */
const calculateBusinessMetrics = (profile, reviews) => {
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews
        : 0;
    // Calculate rating distribution
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
        ratingDistribution[i.toString()] = reviews.filter(r => r.rating === i).length;
    }
    // Calculate monthly reviews (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyReviews = reviews.filter(r => new Date(r.createdAt) >= thirtyDaysAgo).length;
    // Calculate response rate
    const respondedReviews = reviews.filter(r => r.response && r.response.trim() !== '').length;
    const responseRate = totalReviews > 0 ? (respondedReviews / totalReviews) * 100 : 0;
    // Calculate average response time (in hours)
    const responseTimes = reviews
        .filter(r => r.response && r.responseTime)
        .map(r => r.responseTime);
    const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;
    // Calculate sentiment score (-1 to 1)
    const sentimentScores = reviews
        .filter(r => r.sentiment !== undefined)
        .map(r => r.sentiment);
    const sentimentScore = sentimentScores.length > 0
        ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
        : 0;
    // Extract top keywords from reviews
    const allText = reviews
        .map(r => `${r.title || ''} ${r.content || ''}`)
        .join(' ')
        .toLowerCase();
    const words = allText
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
    const wordCount = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });
    const topKeywords = Object.entries(wordCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
    return {
        totalReviews,
        averageRating,
        ratingDistribution,
        monthlyReviews,
        responseRate,
        responseTime: averageResponseTime,
        sentimentScore,
        topKeywords,
    };
};
exports.calculateBusinessMetrics = calculateBusinessMetrics;
/**
 * Validate business profile
 */
const validateBusinessProfile = (profile) => {
    const errors = [];
    if (!profile.name || profile.name.trim() === '') {
        errors.push('Business name is required');
    }
    if (profile.email && !isValidEmail(profile.email)) {
        errors.push('Invalid email format');
    }
    if (profile.website && !isValidUrl(profile.website)) {
        errors.push('Invalid website URL');
    }
    if (profile.phone && !isValidPhone(profile.phone)) {
        errors.push('Invalid phone number format');
    }
    if (profile.latitude && (profile.latitude < -90 || profile.latitude > 90)) {
        errors.push('Invalid latitude value');
    }
    if (profile.longitude && (profile.longitude < -180 || profile.longitude > 180)) {
        errors.push('Invalid longitude value');
    }
    return errors;
};
exports.validateBusinessProfile = validateBusinessProfile;
/**
 * Check if business is active
 */
const isBusinessActive = (profile) => {
    return profile.createdAt && profile.updatedAt &&
        new Date(profile.updatedAt) > new Date(profile.createdAt);
};
exports.isBusinessActive = isBusinessActive;
/**
 * Get business age in days
 */
const getBusinessAge = (profile) => {
    const now = new Date();
    const created = new Date(profile.createdAt);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
};
exports.getBusinessAge = getBusinessAge;
/**
 * Check if business needs verification
 */
const needsVerification = (profile) => {
    return !profile.email || !profile.phone || !profile.address;
};
exports.needsVerification = needsVerification;
/**
 * Get business size category
 */
const getBusinessSize = (employeeCount) => {
    switch (employeeCount) {
        case constants_1.EMPLOYEE_COUNTS.SOLO:
            return 'Solo';
        case constants_1.EMPLOYEE_COUNTS.SMALL:
            return 'Small Business';
        case constants_1.EMPLOYEE_COUNTS.MEDIUM:
            return 'Medium Business';
        case constants_1.EMPLOYEE_COUNTS.LARGE:
            return 'Large Business';
        case constants_1.EMPLOYEE_COUNTS.ENTERPRISE:
            return 'Enterprise';
        case constants_1.EMPLOYEE_COUNTS.CORPORATE:
            return 'Corporate';
        default:
            return 'Unknown';
    }
};
exports.getBusinessSize = getBusinessSize;
/**
 * Get revenue category
 */
const getRevenueCategory = (revenue) => {
    switch (revenue) {
        case constants_1.REVENUE_RANGES.STARTUP:
            return 'Startup';
        case constants_1.REVENUE_RANGES.SMALL:
            return 'Small Revenue';
        case constants_1.REVENUE_RANGES.MEDIUM:
            return 'Medium Revenue';
        case constants_1.REVENUE_RANGES.LARGE:
            return 'Large Revenue';
        case constants_1.REVENUE_RANGES.ENTERPRISE:
            return 'Enterprise Revenue';
        case constants_1.REVENUE_RANGES.CORPORATE:
            return 'Corporate Revenue';
        default:
            return 'Unknown';
    }
};
exports.getRevenueCategory = getRevenueCategory;
/**
 * Get business type display name
 */
const getBusinessTypeDisplayName = (businessType) => {
    const typeMap = {
        [constants_1.BUSINESS_TYPES.HOSPITALITY]: 'Hospitality',
        [constants_1.BUSINESS_TYPES.RETAIL]: 'Retail',
        [constants_1.BUSINESS_TYPES.HEALTHCARE]: 'Healthcare',
        [constants_1.BUSINESS_TYPES.EDUCATION]: 'Education',
        [constants_1.BUSINESS_TYPES.FINANCE]: 'Finance',
        [constants_1.BUSINESS_TYPES.TECHNOLOGY]: 'Technology',
        [constants_1.BUSINESS_TYPES.MANUFACTURING]: 'Manufacturing',
        [constants_1.BUSINESS_TYPES.CONSULTING]: 'Consulting',
        [constants_1.BUSINESS_TYPES.REAL_ESTATE]: 'Real Estate',
        [constants_1.BUSINESS_TYPES.ENTERTAINMENT]: 'Entertainment',
        [constants_1.BUSINESS_TYPES.FOOD_BEVERAGE]: 'Food & Beverage',
        [constants_1.BUSINESS_TYPES.FITNESS]: 'Fitness',
        [constants_1.BUSINESS_TYPES.BEAUTY]: 'Beauty',
        [constants_1.BUSINESS_TYPES.AUTOMOTIVE]: 'Automotive',
        [constants_1.BUSINESS_TYPES.TRAVEL]: 'Travel',
        [constants_1.BUSINESS_TYPES.OTHER]: 'Other',
    };
    return typeMap[businessType] || 'Unknown';
};
exports.getBusinessTypeDisplayName = getBusinessTypeDisplayName;
/**
 * Check if business is eligible for premium features
 */
const isEligibleForPremium = (profile, subscriptionTier) => {
    return subscriptionTier !== constants_1.SUBSCRIPTION_TIERS.FREE && (0, exports.isBusinessActive)(profile);
};
exports.isEligibleForPremium = isEligibleForPremium;
/**
 * Get business contact information
 */
const getBusinessContactInfo = (profile) => {
    return {
        email: profile.email,
        phone: profile.phone,
        website: profile.website,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        postalCode: profile.postalCode,
    };
};
exports.getBusinessContactInfo = getBusinessContactInfo;
/**
 * Get business social media links
 */
const getBusinessSocialMedia = (profile) => {
    return profile.socialMedia || {};
};
exports.getBusinessSocialMedia = getBusinessSocialMedia;
/**
 * Check if business has social media presence
 */
const hasSocialMediaPresence = (profile) => {
    const socialMedia = (0, exports.getBusinessSocialMedia)(profile);
    return Object.values(socialMedia).some(link => link && link.trim() !== '');
};
exports.hasSocialMediaPresence = hasSocialMediaPresence;
// Helper functions
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
const isValidPhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};
//# sourceMappingURL=utils.js.map