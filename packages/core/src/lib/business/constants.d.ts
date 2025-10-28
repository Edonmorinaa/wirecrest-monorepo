/**
 * Business Constants and Default Configurations
 * Core business logic constants for the Wirecrest platform
 */
export declare const BUSINESS_TYPES: {
    readonly HOSPITALITY: "hospitality";
    readonly RETAIL: "retail";
    readonly HEALTHCARE: "healthcare";
    readonly EDUCATION: "education";
    readonly FINANCE: "finance";
    readonly TECHNOLOGY: "technology";
    readonly MANUFACTURING: "manufacturing";
    readonly CONSULTING: "consulting";
    readonly REAL_ESTATE: "real_estate";
    readonly ENTERTAINMENT: "entertainment";
    readonly FOOD_BEVERAGE: "food_beverage";
    readonly FITNESS: "fitness";
    readonly BEAUTY: "beauty";
    readonly AUTOMOTIVE: "automotive";
    readonly TRAVEL: "travel";
    readonly OTHER: "other";
};
export declare const EMPLOYEE_COUNTS: {
    readonly SOLO: "1";
    readonly SMALL: "2-10";
    readonly MEDIUM: "11-50";
    readonly LARGE: "51-200";
    readonly ENTERPRISE: "201-1000";
    readonly CORPORATE: "1000+";
};
export declare const REVENUE_RANGES: {
    readonly STARTUP: "0-100K";
    readonly SMALL: "100K-500K";
    readonly MEDIUM: "500K-2M";
    readonly LARGE: "2M-10M";
    readonly ENTERPRISE: "10M-50M";
    readonly CORPORATE: "50M+";
};
export declare const BUSINESS_STATUS: {
    readonly ACTIVE: "active";
    readonly INACTIVE: "inactive";
    readonly PENDING: "pending";
    readonly SUSPENDED: "suspended";
    readonly CLOSED: "closed";
};
export declare const VERIFICATION_STATUS: {
    readonly UNVERIFIED: "unverified";
    readonly PENDING: "pending";
    readonly VERIFIED: "verified";
    readonly REJECTED: "rejected";
};
export declare const SUBSCRIPTION_TIERS: {
    readonly FREE: "free";
    readonly BASIC: "basic";
    readonly PROFESSIONAL: "professional";
    readonly ENTERPRISE: "enterprise";
    readonly CUSTOM: "custom";
};
export declare const TIER_FEATURES: {
    readonly FREE: {
        readonly maxPlatforms: 2;
        readonly maxReviews: 100;
        readonly analytics: false;
        readonly automation: false;
        readonly apiAccess: false;
        readonly prioritySupport: false;
    };
    readonly BASIC: {
        readonly maxPlatforms: 5;
        readonly maxReviews: 1000;
        readonly analytics: true;
        readonly automation: false;
        readonly apiAccess: false;
        readonly prioritySupport: false;
    };
    readonly PROFESSIONAL: {
        readonly maxPlatforms: 10;
        readonly maxReviews: 10000;
        readonly analytics: true;
        readonly automation: true;
        readonly apiAccess: true;
        readonly prioritySupport: true;
    };
    readonly ENTERPRISE: {
        readonly maxPlatforms: -1;
        readonly maxReviews: -1;
        readonly analytics: true;
        readonly automation: true;
        readonly apiAccess: true;
        readonly prioritySupport: true;
    };
};
export declare const NOTIFICATION_TYPES: {
    readonly NEW_REVIEW: "new_review";
    readonly RATING_CHANGE: "rating_change";
    readonly COMPETITOR_ACTIVITY: "competitor_activity";
    readonly WEEKLY_REPORT: "weekly_report";
    readonly MONTHLY_REPORT: "monthly_report";
    readonly SYSTEM_ALERT: "system_alert";
    readonly FEATURE_UPDATE: "feature_update";
};
export declare const INTEGRATION_TYPES: {
    readonly CRM: "crm";
    readonly ANALYTICS: "analytics";
    readonly SOCIAL_MEDIA: "social_media";
    readonly EMAIL: "email";
    readonly SMS: "sms";
    readonly WEBHOOK: "webhook";
    readonly API: "api";
};
export declare const AUTOMATION_TRIGGERS: {
    readonly NEW_REVIEW: "new_review";
    readonly RATING_DROP: "rating_drop";
    readonly NEGATIVE_REVIEW: "negative_review";
    readonly COMPETITOR_MENTION: "competitor_mention";
    readonly KEYWORD_MENTION: "keyword_mention";
    readonly SCHEDULED: "scheduled";
    readonly MANUAL: "manual";
};
export declare const RESPONSE_TEMPLATES: {
    readonly THANK_YOU: "Thank you for your review! We appreciate your feedback.";
    readonly APOLOGY: "We apologize for any inconvenience. Please contact us directly to resolve this issue.";
    readonly FOLLOW_UP: "Thank you for your feedback. We would love to hear more about your experience.";
    readonly GENERIC: "Thank you for taking the time to share your experience with us.";
};
export declare const METRICS_THRESHOLDS: {
    readonly RATING_ALERT: 3;
    readonly RESPONSE_TIME_ALERT: 24;
    readonly REVIEW_VOLUME_ALERT: 10;
    readonly SENTIMENT_ALERT: -0.5;
};
export declare const SUPPORTED_TIMEZONES: readonly ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"];
export declare const SUPPORTED_LANGUAGES: readonly ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "ar", "hi"];
export declare const SUPPORTED_CURRENCIES: readonly ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "BRL"];
//# sourceMappingURL=constants.d.ts.map