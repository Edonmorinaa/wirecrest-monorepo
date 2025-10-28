"use strict";
/**
 * Platform Constants and Configurations
 * Business logic constants for supported platforms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_FEATURES = exports.PLATFORM_CATEGORIES = exports.SUPPORTED_PLATFORMS = exports.PLATFORM_MAPPING = exports.SOCIAL_PLATFORM_DISPLAY_CONFIGS = exports.PLATFORM_DISPLAY_CONFIGS = exports.PLATFORM_CONFIGS = void 0;
// Platform configurations for review display
exports.PLATFORM_CONFIGS = {
    GOOGLE: {
        name: 'Google',
        icon: 'logos:google-icon',
        ratingType: 'stars',
        maxRating: 5,
        hasLocalGuide: true,
        hasEngagementMetrics: false,
        hasVisitedIn: true,
        hasReviewerStats: true,
        buttonText: 'View on Google',
        buttonIcon: 'eva:external-link-fill',
    },
    FACEBOOK: {
        name: 'Facebook',
        icon: 'logos:facebook',
        ratingType: 'recommendation',
        hasEngagementMetrics: true,
        hasVisitedIn: false,
        hasReviewerStats: false,
        buttonText: 'View on Facebook',
        buttonIcon: 'mdi:external-link',
        recommendationLabels: {
            positive: 'Recommended',
            negative: 'Not Recommended',
        },
    },
    TRIPADVISOR: {
        name: 'TripAdvisor',
        icon: 'logos:tripadvisor-icon',
        ratingType: 'stars',
        maxRating: 5,
        hasEngagementMetrics: false,
        hasVisitedIn: false,
        hasReviewerStats: false,
        buttonText: 'View on TripAdvisor',
        buttonIcon: 'eva:external-link-fill',
    },
    BOOKING: {
        name: 'Booking.com',
        icon: 'logos:bookingcom',
        ratingType: 'numeric',
        maxRating: 10,
        hasEngagementMetrics: false,
        hasVisitedIn: false,
        hasReviewerStats: false,
        buttonText: 'View on Booking.com',
        buttonIcon: 'eva:external-link-fill',
    },
    YELP: {
        name: 'Yelp',
        icon: 'logos:yelp',
        ratingType: 'stars',
        maxRating: 5,
        hasEngagementMetrics: false,
        hasVisitedIn: false,
        hasReviewerStats: false,
        buttonText: 'View on Yelp',
        buttonIcon: 'eva:external-link-fill',
    },
};
// Platform display configurations for admin interface
exports.PLATFORM_DISPLAY_CONFIGS = {
    GOOGLE: {
        name: 'Google Business',
        icon: 'logos:google',
        color: '#4285F4',
        identifierLabel: 'Google Place ID',
        identifierPlaceholder: 'ChIJ...',
        identifierPrefix: '',
    },
    FACEBOOK: {
        name: 'Facebook Business',
        icon: 'logos:facebook',
        color: '#1877F2',
        identifierLabel: 'Facebook URL',
        identifierPlaceholder: 'https://facebook.com/...',
        identifierPrefix: '',
    },
    TRIPADVISOR: {
        name: 'TripAdvisor',
        icon: 'logos:tripadvisor',
        color: '#00AA6C',
        identifierLabel: 'TripAdvisor URL',
        identifierPlaceholder: 'https://tripadvisor.com/...',
        identifierPrefix: '',
    },
    BOOKING: {
        name: 'Booking.com',
        icon: 'logos:booking',
        color: '#003580',
        identifierLabel: 'Booking.com URL',
        identifierPlaceholder: 'https://booking.com/...',
        identifierPrefix: '',
    },
    YELP: {
        name: 'Yelp',
        icon: 'logos:yelp',
        color: '#FF1A1A',
        identifierLabel: 'Yelp URL',
        identifierPlaceholder: 'https://yelp.com/...',
        identifierPrefix: '',
    },
};
// Extended platform display configurations for social media platforms
exports.SOCIAL_PLATFORM_DISPLAY_CONFIGS = {
    INSTAGRAM: {
        name: 'Instagram Business',
        icon: 'logos:instagram',
        color: '#E4405F',
        identifierLabel: 'Instagram Username',
        identifierPlaceholder: '@username',
        identifierPrefix: '@',
    },
    TIKTOK: {
        name: 'TikTok Business',
        icon: 'logos:tiktok',
        color: '#000000',
        identifierLabel: 'TikTok Username',
        identifierPlaceholder: '@username',
        identifierPrefix: '@',
    },
};
// Platform mapping for frontend to backend
exports.PLATFORM_MAPPING = {
    GOOGLE: 'google',
    FACEBOOK: 'facebook',
    TRIPADVISOR: 'tripadvisor',
    BOOKING: 'booking',
    YELP: 'yelp',
};
// Supported platforms list
exports.SUPPORTED_PLATFORMS = [
    'GOOGLE',
    'FACEBOOK',
    'TRIPADVISOR',
    'BOOKING',
    'YELP',
];
// Platform categories
exports.PLATFORM_CATEGORIES = {
    REVIEW_PLATFORMS: ['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING', 'YELP'],
    BUSINESS_PLATFORMS: ['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING', 'YELP'],
};
// Platform features
exports.PLATFORM_FEATURES = {
    GOOGLE: ['reviews', 'ratings', 'business_info', 'photos', 'posts'],
    FACEBOOK: ['reviews', 'ratings', 'posts', 'events', 'messaging'],
    TRIPADVISOR: ['reviews', 'ratings', 'photos', 'business_info'],
    BOOKING: ['reviews', 'ratings', 'business_info', 'availability'],
    YELP: ['reviews', 'ratings', 'business_info', 'photos'],
};
//# sourceMappingURL=constants.js.map