/**
 * Feature Flags - Stripe-Driven System
 * Enums that match Stripe product metadata structure
 */

/**
 * Core platform features
 */
export enum PlatformFeature {
  GOOGLE_REVIEWS = 'google_reviews',
  FACEBOOK_REVIEWS = 'facebook_reviews',
  TRIPADVISOR_REVIEWS = 'tripadvisor_reviews',
  BOOKING_REVIEWS = 'booking_reviews',
  YELP_REVIEWS = 'yelp_reviews',
}

/**
 * Analytics features
 */
export enum AnalyticsFeature {
  BASIC_ANALYTICS = 'basic_analytics',
  ADVANCED_ANALYTICS = 'advanced_analytics',
  INSTAGRAM_ANALYTICS = 'instagram_analytics',
  TIKTOK_ANALYTICS = 'tiktok_analytics',
  CUSTOM_REPORTING = 'custom_reporting',
}

/**
 * Automation features
 */
export enum AutomationFeature {
  AUTOMATION = 'automation',
  REAL_TIME_ALERTS = 'real_time_alerts',
  TWITTER_AUTOMATION = 'twitter_automation',
  EMAIL_NOTIFICATIONS = 'email_notifications',
}

/**
 * API and integration features
 */
export enum IntegrationFeature {
  API_ACCESS = 'api_access',
  CUSTOM_INTEGRATIONS = 'custom_integrations',
  WEBHOOK_SUPPORT = 'webhook_support',
  BULK_OPERATIONS = 'bulk_operations',
}

/**
 * Business features
 */
export enum BusinessFeature {
  MULTI_LOCATION = 'multi_location',
  WHITE_LABEL = 'white_label',
  PRIORITY_SUPPORT = 'priority_support',
  DEDICATED_SUPPORT = 'dedicated_support',
}

/**
 * Advanced features
 */
export enum AdvancedFeature {
  AI_SENTIMENT_ANALYSIS = 'ai_sentiment_analysis',
  ADVANCED_FILTERING = 'advanced_filtering',
  EXPORT_DATA = 'export_data',
  SCHEDULED_REPORTS = 'scheduled_reports',
}

/**
 * Admin features
 */
export enum AdminFeature {
  TEAM_MANAGEMENT = 'team_management',
  BILLING_MANAGEMENT = 'billing_management',
  USER_ROLES = 'user_roles',
  AUDIT_LOGS = 'audit_logs',
}

/**
 * Union type of all features
 */
export type FeatureFlag = 
  | PlatformFeature
  | AnalyticsFeature
  | AutomationFeature
  | IntegrationFeature
  | BusinessFeature
  | AdvancedFeature
  | AdminFeature;

/**
 * Feature categories for easier management
 */
export const FEATURE_CATEGORIES = {
  PLATFORM: Object.values(PlatformFeature),
  ANALYTICS: Object.values(AnalyticsFeature),
  AUTOMATION: Object.values(AutomationFeature),
  INTEGRATION: Object.values(IntegrationFeature),
  BUSINESS: Object.values(BusinessFeature),
  ADVANCED: Object.values(AdvancedFeature),
  ADMIN: Object.values(AdminFeature),
} as const;

/**
 * All available features as a flat array
 */
export const ALL_FEATURES: FeatureFlag[] = [
  ...Object.values(PlatformFeature),
  ...Object.values(AnalyticsFeature),
  ...Object.values(AutomationFeature),
  ...Object.values(IntegrationFeature),
  ...Object.values(BusinessFeature),
  ...Object.values(AdvancedFeature),
  ...Object.values(AdminFeature),
];

/**
 * Feature descriptions for UI display
 */
export const FEATURE_DESCRIPTIONS: Record<FeatureFlag, string> = {
  // Platform features
  [PlatformFeature.GOOGLE_REVIEWS]: 'Google Reviews Management',
  [PlatformFeature.FACEBOOK_REVIEWS]: 'Facebook Reviews Management',
  [PlatformFeature.TRIPADVISOR_REVIEWS]: 'TripAdvisor Reviews Management',
  [PlatformFeature.BOOKING_REVIEWS]: 'Booking.com Reviews Management',
  [PlatformFeature.YELP_REVIEWS]: 'Yelp Reviews Management',
  
  // Analytics features
  [AnalyticsFeature.BASIC_ANALYTICS]: 'Basic Analytics Dashboard',
  [AnalyticsFeature.ADVANCED_ANALYTICS]: 'Advanced Analytics & Insights',
  [AnalyticsFeature.INSTAGRAM_ANALYTICS]: 'Instagram Analytics',
  [AnalyticsFeature.TIKTOK_ANALYTICS]: 'TikTok Analytics',
  [AnalyticsFeature.CUSTOM_REPORTING]: 'Custom Reports & Dashboards',
  
  // Automation features
  [AutomationFeature.AUTOMATION]: 'Automated Review Monitoring',
  [AutomationFeature.REAL_TIME_ALERTS]: 'Real-time Alerts',
  [AutomationFeature.TWITTER_AUTOMATION]: 'Twitter Automation',
  [AutomationFeature.EMAIL_NOTIFICATIONS]: 'Email Notifications',
  
  // Integration features
  [IntegrationFeature.API_ACCESS]: 'API Access',
  [IntegrationFeature.CUSTOM_INTEGRATIONS]: 'Custom Integrations',
  [IntegrationFeature.WEBHOOK_SUPPORT]: 'Webhook Support',
  [IntegrationFeature.BULK_OPERATIONS]: 'Bulk Operations',
  
  // Business features
  [BusinessFeature.MULTI_LOCATION]: 'Multi-Location Management',
  [BusinessFeature.WHITE_LABEL]: 'White Label Branding',
  [BusinessFeature.PRIORITY_SUPPORT]: 'Priority Support',
  [BusinessFeature.DEDICATED_SUPPORT]: 'Dedicated Support',
  
  // Advanced features
  [AdvancedFeature.AI_SENTIMENT_ANALYSIS]: 'AI Sentiment Analysis',
  [AdvancedFeature.ADVANCED_FILTERING]: 'Advanced Filtering',
  [AdvancedFeature.EXPORT_DATA]: 'Data Export',
  [AdvancedFeature.SCHEDULED_REPORTS]: 'Scheduled Reports',
  
  // Admin features
  [AdminFeature.TEAM_MANAGEMENT]: 'Team Management',
  [AdminFeature.BILLING_MANAGEMENT]: 'Billing Management',
  [AdminFeature.USER_ROLES]: 'User Role Management',
  [AdminFeature.AUDIT_LOGS]: 'Audit Logs',
};

/**
 * Helper function to get feature description
 */
export function getFeatureDescription(feature: FeatureFlag): string {
  return FEATURE_DESCRIPTIONS[feature] || feature;
}

/**
 * Helper function to check if feature belongs to a category
 */
export function isFeatureInCategory(feature: FeatureFlag, category: keyof typeof FEATURE_CATEGORIES): boolean {
  return FEATURE_CATEGORIES[category].includes(feature);
}

/**
 * Helper function to get features by category
 */
export function getFeaturesByCategory(category: keyof typeof FEATURE_CATEGORIES): FeatureFlag[] {
  return FEATURE_CATEGORIES[category];
}
