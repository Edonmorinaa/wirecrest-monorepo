# @wirecrest/core - Usage Examples

This document provides comprehensive examples of how to use the `@wirecrest/core` package in your applications.

## 🚀 **Quick Start**

```typescript
import { 
  PlatformType, 
  getPlatformConfig, 
  validatePlatformIdentifier,
  calculateBusinessMetrics 
} from '@wirecrest/core';

// Basic platform operations
const googleConfig = getPlatformConfig('GOOGLE');
const isValid = validatePlatformIdentifier('GOOGLE', 'ChIJ...');

// Business metrics
const metrics = calculateBusinessMetrics(businessProfile, reviews);
```

## 📱 **Platform Management**

### **Platform Configuration**

```typescript
import { 
  PlatformType, 
  getPlatformConfig, 
  getPlatformDisplayConfig,
  SUPPORTED_PLATFORMS 
} from '@wirecrest/core';

// Get all supported platforms
const platforms = SUPPORTED_PLATFORMS;
// ['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING', 'YELP', 'INSTAGRAM', 'TIKTOK']

// Get platform configuration
const googleConfig = getPlatformConfig('GOOGLE');
console.log(googleConfig.name); // "Google"
console.log(googleConfig.ratingType); // "stars"
console.log(googleConfig.maxRating); // 5

// Get display configuration
const displayConfig = getPlatformDisplayConfig('GOOGLE');
console.log(displayConfig.color); // "#4285F4"
console.log(displayConfig.identifierLabel); // "Google Place ID"
```

### **Platform Validation**

```typescript
import { 
  validatePlatformIdentifier,
  normalizePlatformIdentifier,
  supportsReviews,
  supportsAnalytics 
} from '@wirecrest/core';

// Validate platform identifiers
const isValidGoogle = validatePlatformIdentifier('GOOGLE', 'ChIJN1t_tDeuEmsRUsoyG83frY4');
const isValidFacebook = validatePlatformIdentifier('FACEBOOK', 'https://facebook.com/mybusiness');
const isValidInstagram = validatePlatformIdentifier('INSTAGRAM', '@mybusiness');

// Normalize identifiers
const normalizedInstagram = normalizePlatformIdentifier('INSTAGRAM', 'mybusiness');
// Returns: "@mybusiness"

// Check platform capabilities
const hasReviews = supportsReviews('GOOGLE'); // true
const hasAnalytics = supportsAnalytics('INSTAGRAM'); // true
```

### **Platform Mapping**

```typescript
import { 
  platformTypeToMarketPlatform,
  marketPlatformToPlatformType 
} from '@wirecrest/core';

// Convert between platform types
const marketPlatform = platformTypeToMarketPlatform('GOOGLE');
// Returns: "GOOGLE_MAPS"

const platformType = marketPlatformToPlatformType('GOOGLE_MAPS');
// Returns: "GOOGLE"
```

## 🏢 **Business Management**

### **Business Profile Validation**

```typescript
import { 
  BusinessProfile, 
  validateBusinessProfile,
  isBusinessActive,
  getBusinessAge 
} from '@wirecrest/core';

const businessProfile: BusinessProfile = {
  id: '1',
  name: 'My Business',
  email: 'contact@mybusiness.com',
  website: 'https://mybusiness.com',
  phone: '+1234567890',
  address: '123 Main St',
  city: 'New York',
  state: 'NY',
  country: 'USA',
  businessType: 'technology',
  employeeCount: '11-50',
  revenue: '500K-2M',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-12-01'),
};

// Validate business profile
const errors = validateBusinessProfile(businessProfile);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}

// Check business status
const isActive = isBusinessActive(businessProfile);
const ageInDays = getBusinessAge(businessProfile);
```

### **Business Metrics Calculation**

```typescript
import { 
  calculateBusinessMetrics,
  getBusinessSize,
  getRevenueCategory,
  getBusinessTypeDisplayName 
} from '@wirecrest/core';

const reviews = [
  { rating: 5, content: 'Excellent service!', createdAt: new Date('2023-11-01') },
  { rating: 4, content: 'Good experience', createdAt: new Date('2023-11-15') },
  { rating: 3, content: 'Average service', createdAt: new Date('2023-11-20') },
  { rating: 5, content: 'Amazing!', createdAt: new Date('2023-11-25') },
];

// Calculate business metrics
const metrics = calculateBusinessMetrics(businessProfile, reviews);
console.log(metrics);
// {
//   totalReviews: 4,
//   averageRating: 4.25,
//   ratingDistribution: { '1': 0, '2': 0, '3': 1, '4': 1, '5': 2 },
//   monthlyReviews: 4,
//   responseRate: 0,
//   responseTime: 0,
//   sentimentScore: 0,
//   topKeywords: ['service', 'experience', 'amazing']
// }

// Get business information
const size = getBusinessSize('11-50'); // "Medium Business"
const revenue = getRevenueCategory('500K-2M'); // "Medium Revenue"
const type = getBusinessTypeDisplayName('technology'); // "Technology"
```

### **Business Contact Information**

```typescript
import { 
  getBusinessContactInfo,
  getBusinessSocialMedia,
  hasSocialMediaPresence 
} from '@wirecrest/core';

// Get contact information
const contactInfo = getBusinessContactInfo(businessProfile);
console.log(contactInfo);
// {
//   email: 'contact@mybusiness.com',
//   phone: '+1234567890',
//   website: 'https://mybusiness.com',
//   address: '123 Main St',
//   city: 'New York',
//   state: 'NY',
//   country: 'USA',
//   postalCode: '10001'
// }

// Get social media links
const socialMedia = getBusinessSocialMedia(businessProfile);
const hasSocial = hasSocialMediaPresence(businessProfile);
```

## 🤖 **Automation Management**

### **Automation Configuration**

```typescript
import { 
  AutomationConfig, 
  validateAutomationConfig,
  getDefaultAutomationConfig,
  shouldRunAutomation 
} from '@wirecrest/core';

const automationConfig: AutomationConfig = {
  enabled: true,
  schedule: {
    type: 'daily',
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    intervalMinutes: 120,
  },
  actions: {
    like: true,
    retweet: false,
    comment: true,
    follow: false,
    unfollow: false,
    share: false,
  },
  limits: {
    maxActionsPerDay: 50,
    maxActionsPerProfile: 10,
    cooldownMinutes: 30,
    maxActionsPerHour: 5,
    maxFollowsPerDay: 20,
    maxUnfollowsPerDay: 20,
  },
  targeting: {
    keywords: ['technology', 'AI', 'automation'],
    excludeKeywords: ['spam', 'advertisement'],
    minFollowers: 100,
    maxFollowers: 10000,
    languages: ['en'],
    locations: [],
    interests: [],
    hashtags: [],
    mentions: [],
  },
  safety: {
    avoidControversialTopics: true,
    avoidPoliticalContent: true,
    avoidSpamAccounts: true,
    maxActionsPerHour: 5,
    humanLikeBehavior: true,
    randomizeTiming: true,
    respectRateLimits: true,
  },
};

// Validate configuration
const errors = validateAutomationConfig(automationConfig);
if (errors.length > 0) {
  console.error('Configuration errors:', errors);
}

// Check if automation should run
const shouldRun = shouldRunAutomation(automationConfig);
console.log('Should run automation:', shouldRun);
```

### **Content Safety**

```typescript
import { isContentSafe } from '@wirecrest/core';

const safeContent = 'This is a great technology post about AI and automation!';
const unsafeContent = 'This is about politics and controversial topics';

const isSafe = isContentSafe(safeContent, automationConfig); // true
const isUnsafe = isContentSafe(unsafeContent, automationConfig); // false
```

### **Automation Performance**

```typescript
import { 
  calculateSuccessRate,
  calculateErrorRate,
  getAutomationRecommendations 
} from '@wirecrest/core';

const actions = [
  { status: 'completed', type: 'like' },
  { status: 'completed', type: 'comment' },
  { status: 'failed', type: 'like' },
  { status: 'completed', type: 'follow' },
];

const successRate = calculateSuccessRate(actions); // 75%
const errorRate = calculateErrorRate(actions); // 25%

const recommendations = getAutomationRecommendations(automationConfig, stats);
console.log('Recommendations:', recommendations);
```

## ⚙️ **Application Configuration**

### **App Configuration**

```typescript
import { 
  getAppConfig, 
  isFeatureEnabled, 
  getLimit,
  isLimitExceeded 
} from '@wirecrest/core';

// Get application configuration
const appConfig = getAppConfig();
console.log('App name:', appConfig.name); // "Wirecrest"
console.log('App version:', appConfig.version); // "1.0.0"
console.log('App URL:', appConfig.url);

// Check feature flags
const isSSOEnabled = isFeatureEnabled('sso');
const isAPIEEnabled = isFeatureEnabled('api');
const isAutomationEnabled = isFeatureEnabled('automation');

// Get limits
const maxTeams = getLimit('maxTeamsPerUser'); // 5
const maxPlatforms = getLimit('maxPlatformsPerTeam'); // 10

// Check if limits are exceeded
const isTeamsLimitExceeded = isLimitExceeded('maxTeamsPerUser', 3); // false
const isPlatformsLimitExceeded = isLimitExceeded('maxPlatformsPerTeam', 12); // true
```

### **Feature Management**

```typescript
import { isFeatureEnabled } from '@wirecrest/core';

// Check multiple features
const features = {
  multiTenant: isFeatureEnabled('multiTenant'),
  sso: isFeatureEnabled('sso'),
  api: isFeatureEnabled('api'),
  webhooks: isFeatureEnabled('webhooks'),
  analytics: isFeatureEnabled('analytics'),
  automation: isFeatureEnabled('automation'),
  whiteLabel: isFeatureEnabled('whiteLabel'),
};

console.log('Available features:', features);
```

## 📊 **Constants Usage**

### **Business Constants**

```typescript
import { 
  BUSINESS_TYPES, 
  EMPLOYEE_COUNTS, 
  REVENUE_RANGES,
  SUBSCRIPTION_TIERS 
} from '@wirecrest/core';

// Business types
const businessType = BUSINESS_TYPES.TECHNOLOGY;
const employeeCount = EMPLOYEE_COUNTS.MEDIUM;
const revenue = REVENUE_RANGES.MEDIUM;
const subscription = SUBSCRIPTION_TIERS.PROFESSIONAL;

// Use in forms
const businessTypeOptions = Object.values(BUSINESS_TYPES);
const employeeCountOptions = Object.values(EMPLOYEE_COUNTS);
const revenueOptions = Object.values(REVENUE_RANGES);
```

### **Platform Constants**

```typescript
import { 
  PLATFORM_CONFIGS, 
  SUPPORTED_PLATFORMS,
  PLATFORM_CATEGORIES 
} from '@wirecrest/core';

// Get platform configurations
const googleConfig = PLATFORM_CONFIGS.GOOGLE;
const facebookConfig = PLATFORM_CONFIGS.FACEBOOK;

// Get platform categories
const reviewPlatforms = PLATFORM_CATEGORIES.REVIEW_PLATFORMS;
const socialPlatforms = PLATFORM_CATEGORIES.SOCIAL_PLATFORMS;
const businessPlatforms = PLATFORM_CATEGORIES.BUSINESS_PLATFORMS;
```

## 🔄 **Real-World Examples**

### **Platform Setup Wizard**

```typescript
import { 
  PlatformType, 
  validatePlatformIdentifier,
  getPlatformConfig,
  getPlatformDisplayConfig 
} from '@wirecrest/core';

function setupPlatform(platform: PlatformType, identifier: string) {
  // Validate identifier
  if (!validatePlatformIdentifier(platform, identifier)) {
    throw new Error(`Invalid ${platform} identifier: ${identifier}`);
  }
  
  // Get platform configuration
  const config = getPlatformConfig(platform);
  const displayConfig = getPlatformDisplayConfig(platform);
  
  return {
    platform,
    identifier,
    name: config.name,
    icon: config.icon,
    color: displayConfig.color,
    features: {
      supportsReviews: config.ratingType !== undefined,
      supportsAnalytics: platform === 'INSTAGRAM' || platform === 'TIKTOK',
    },
  };
}

// Usage
const googleSetup = setupPlatform('GOOGLE', 'ChIJN1t_tDeuEmsRUsoyG83frY4');
const instagramSetup = setupPlatform('INSTAGRAM', '@mybusiness');
```

### **Business Analytics Dashboard**

```typescript
import { 
  calculateBusinessMetrics,
  getBusinessSize,
  isBusinessActive,
  getBusinessAge 
} from '@wirecrest/core';

function generateBusinessReport(profile: BusinessProfile, reviews: any[]) {
  const metrics = calculateBusinessMetrics(profile, reviews);
  const size = getBusinessSize(profile.employeeCount);
  const isActive = isBusinessActive(profile);
  const age = getBusinessAge(profile);
  
  return {
    overview: {
      name: profile.name,
      size,
      age,
      isActive,
    },
    metrics,
    insights: {
      topPerformingPlatform: 'Google', // This would be calculated
      improvementAreas: ['Response Time', 'Review Volume'],
      opportunities: ['Social Media', 'Local SEO'],
    },
  };
}
```

### **Automation Manager**

```typescript
import { 
  validateAutomationConfig,
  shouldRunAutomation,
  isContentSafe,
  getAutomationRecommendations 
} from '@wirecrest/core';

class AutomationManager {
  constructor(private config: AutomationConfig) {
    // Validate configuration on initialization
    const errors = validateAutomationConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid automation config: ${errors.join(', ')}`);
    }
  }
  
  shouldExecute(content: string): { execute: boolean; reason?: string } {
    // Check if automation should run
    if (!shouldRunAutomation(this.config)) {
      return { execute: false, reason: 'Outside schedule' };
    }
    
    // Check content safety
    if (!isContentSafe(content, this.config)) {
      return { execute: false, reason: 'Content not safe' };
    }
    
    return { execute: true };
  }
  
  getRecommendations(stats: any): string[] {
    return getAutomationRecommendations(this.config, stats);
  }
}
```

## 🧪 **Testing Examples**

```typescript
import { 
  validatePlatformIdentifier,
  calculateBusinessMetrics,
  validateAutomationConfig 
} from '@wirecrest/core';

// Test platform validation
describe('Platform Validation', () => {
  test('validates Google Place ID', () => {
    expect(validatePlatformIdentifier('GOOGLE', 'ChIJ...')).toBe(true);
    expect(validatePlatformIdentifier('GOOGLE', 'invalid')).toBe(false);
  });
  
  test('validates Facebook URL', () => {
    expect(validatePlatformIdentifier('FACEBOOK', 'https://facebook.com/business')).toBe(true);
    expect(validatePlatformIdentifier('FACEBOOK', 'invalid')).toBe(false);
  });
});

// Test business metrics
describe('Business Metrics', () => {
  test('calculates average rating', () => {
    const reviews = [
      { rating: 5, content: 'Great!' },
      { rating: 4, content: 'Good' },
      { rating: 3, content: 'Average' },
    ];
    
    const metrics = calculateBusinessMetrics(profile, reviews);
    expect(metrics.averageRating).toBe(4);
  });
});

// Test automation config
describe('Automation Config', () => {
  test('validates configuration', () => {
    const config = { /* valid config */ };
    const errors = validateAutomationConfig(config);
    expect(errors).toHaveLength(0);
  });
});
```

The `@wirecrest/core` package provides a comprehensive set of business logic utilities that can be used across all Wirecrest applications! 🎉
