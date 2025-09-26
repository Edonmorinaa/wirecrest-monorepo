/**
 * Business Constants and Default Configurations
 * Core business logic constants for the Wirecrest platform
 */

// Business types and industries
export const BUSINESS_TYPES = {
    HOSPITALITY: 'hospitality',
    RETAIL: 'retail',
    HEALTHCARE: 'healthcare',
    EDUCATION: 'education',
    FINANCE: 'finance',
    TECHNOLOGY: 'technology',
    MANUFACTURING: 'manufacturing',
    CONSULTING: 'consulting',
    REAL_ESTATE: 'real_estate',
    ENTERTAINMENT: 'entertainment',
    FOOD_BEVERAGE: 'food_beverage',
    FITNESS: 'fitness',
    BEAUTY: 'beauty',
    AUTOMOTIVE: 'automotive',
    TRAVEL: 'travel',
    OTHER: 'other',
  } as const;
  
  // Employee count ranges
  export const EMPLOYEE_COUNTS = {
    SOLO: '1',
    SMALL: '2-10',
    MEDIUM: '11-50',
    LARGE: '51-200',
    ENTERPRISE: '201-1000',
    CORPORATE: '1000+',
  } as const;
  
  // Revenue ranges
  export const REVENUE_RANGES = {
    STARTUP: '0-100K',
    SMALL: '100K-500K',
    MEDIUM: '500K-2M',
    LARGE: '2M-10M',
    ENTERPRISE: '10M-50M',
    CORPORATE: '50M+',
  } as const;
  
  // Business status types
  export const BUSINESS_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    SUSPENDED: 'suspended',
    CLOSED: 'closed',
  } as const;
  
  // Business verification status
  export const VERIFICATION_STATUS = {
    UNVERIFIED: 'unverified',
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
  } as const;
  
  // Business subscription tiers
  export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    BASIC: 'basic',
    PROFESSIONAL: 'professional',
    ENTERPRISE: 'enterprise',
    CUSTOM: 'custom',
  } as const;
  
  // Business features by tier
  export const TIER_FEATURES = {
    FREE: {
      maxPlatforms: 2,
      maxReviews: 100,
      analytics: false,
      automation: false,
      apiAccess: false,
      prioritySupport: false,
    },
    BASIC: {
      maxPlatforms: 5,
      maxReviews: 1000,
      analytics: true,
      automation: false,
      apiAccess: false,
      prioritySupport: false,
    },
    PROFESSIONAL: {
      maxPlatforms: 10,
      maxReviews: 10000,
      analytics: true,
      automation: true,
      apiAccess: true,
      prioritySupport: true,
    },
    ENTERPRISE: {
      maxPlatforms: -1, // unlimited
      maxReviews: -1, // unlimited
      analytics: true,
      automation: true,
      apiAccess: true,
      prioritySupport: true,
    },
  } as const;
  
  // Business notification types
  export const NOTIFICATION_TYPES = {
    NEW_REVIEW: 'new_review',
    RATING_CHANGE: 'rating_change',
    COMPETITOR_ACTIVITY: 'competitor_activity',
    WEEKLY_REPORT: 'weekly_report',
    MONTHLY_REPORT: 'monthly_report',
    SYSTEM_ALERT: 'system_alert',
    FEATURE_UPDATE: 'feature_update',
  } as const;
  
  // Business integration types
  export const INTEGRATION_TYPES = {
    CRM: 'crm',
    ANALYTICS: 'analytics',
    SOCIAL_MEDIA: 'social_media',
    EMAIL: 'email',
    SMS: 'sms',
    WEBHOOK: 'webhook',
    API: 'api',
  } as const;
  
  // Business automation triggers
  export const AUTOMATION_TRIGGERS = {
    NEW_REVIEW: 'new_review',
    RATING_DROP: 'rating_drop',
    NEGATIVE_REVIEW: 'negative_review',
    COMPETITOR_MENTION: 'competitor_mention',
    KEYWORD_MENTION: 'keyword_mention',
    SCHEDULED: 'scheduled',
    MANUAL: 'manual',
  } as const;
  
  // Business response templates
  export const RESPONSE_TEMPLATES = {
    THANK_YOU: 'Thank you for your review! We appreciate your feedback.',
    APOLOGY: 'We apologize for any inconvenience. Please contact us directly to resolve this issue.',
    FOLLOW_UP: 'Thank you for your feedback. We would love to hear more about your experience.',
    GENERIC: 'Thank you for taking the time to share your experience with us.',
  } as const;
  
  // Business metrics thresholds
  export const METRICS_THRESHOLDS = {
    RATING_ALERT: 3.0,
    RESPONSE_TIME_ALERT: 24, // hours
    REVIEW_VOLUME_ALERT: 10, // reviews per day
    SENTIMENT_ALERT: -0.5, // negative sentiment
  } as const;
  
  // Business timezone support
  export const SUPPORTED_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ] as const;
  
  // Business language support
  export const SUPPORTED_LANGUAGES = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'
  ] as const;
  
  // Business currency support
  export const SUPPORTED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'
  ] as const;
  