# @wirecrest/core

Core business logic package for the Wirecrest platform. This package contains all the essential business logic, constants, types, and utilities that are shared across the entire Wirecrest ecosystem.

## 🎯 **Purpose**

The `@wirecrest/core` package serves as the single source of truth for:
- **Business Logic**: Core business rules and calculations
- **Platform Configuration**: Supported platforms and their settings
- **Automation Logic**: Automation rules and safety measures
- **Business Constants**: Industry standards and business rules
- **Type Definitions**: TypeScript interfaces and types
- **Utility Functions**: Helper functions for business operations

## 📦 **Installation**

```bash
# Install the package
yarn add @wirecrest/core

# Or with npm
npm install @wirecrest/core
```

## 🚀 **Usage**

### **Basic Import**

```typescript
import { 
  PlatformType, 
  getPlatformConfig, 
  validatePlatformIdentifier,
  calculateBusinessMetrics 
} from '@wirecrest/core';
```

### **Platform Operations**

```typescript
import { 
  PlatformType, 
  getPlatformConfig, 
  supportsReviews,
  validatePlatformIdentifier 
} from '@wirecrest/core';

// Get platform configuration
const googleConfig = getPlatformConfig('GOOGLE');
console.log(googleConfig.name); // "Google"

// Check if platform supports reviews
const supportsReviews = supportsReviews('GOOGLE'); // true

// Validate platform identifier
const isValid = validatePlatformIdentifier('GOOGLE', 'ChIJ...'); // true
```

### **Business Operations**

```typescript
import { 
  BusinessProfile, 
  calculateBusinessMetrics,
  validateBusinessProfile,
  isBusinessActive 
} from '@wirecrest/core';

// Calculate business metrics
const metrics = calculateBusinessMetrics(businessProfile, reviews);

// Validate business profile
const errors = validateBusinessProfile(profileData);

// Check if business is active
const isActive = isBusinessActive(businessProfile);
```

### **Automation Operations**

```typescript
import { 
  AutomationConfig, 
  validateAutomationConfig,
  shouldRunAutomation,
  isContentSafe 
} from '@wirecrest/core';

// Validate automation configuration
const errors = validateAutomationConfig(automationConfig);

// Check if automation should run
const shouldRun = shouldRunAutomation(config);

// Check if content is safe
const isSafe = isContentSafe(content, config);
```

### **Application Configuration**

```typescript
import { 
  getAppConfig, 
  isFeatureEnabled, 
  getLimit 
} from '@wirecrest/core';

// Get application configuration
const config = getAppConfig();

// Check if feature is enabled
const isSSOEnabled = isFeatureEnabled('sso');

// Get limit value
const maxTeams = getLimit('maxTeamsPerUser');
```

## 📋 **Features**

### **Platform Management**
- ✅ Support for 7 major platforms (Google, Facebook, TripAdvisor, Booking, Yelp, Instagram, TikTok)
- ✅ Platform-specific configurations and limits
- ✅ Identifier validation and normalization
- ✅ Platform feature detection

### **Business Logic**
- ✅ Business profile validation
- ✅ Metrics calculation
- ✅ Business status detection
- ✅ Contact information management

### **Automation Engine**
- ✅ Automation configuration validation
- ✅ Safety rules and content filtering
- ✅ Performance monitoring
- ✅ Recommendation system

### **Application Configuration**
- ✅ Feature flags management
- ✅ Limits and quotas
- ✅ Security policies
- ✅ Integration settings

## 🔧 **API Reference**

### **Types**

#### **Platform Types**
```typescript
type PlatformType = 'GOOGLE' | 'FACEBOOK' | 'TRIPADVISOR' | 'BOOKING' | 'YELP' | 'INSTAGRAM' | 'TIKTOK';
type MarketPlatform = 'GOOGLE_MAPS' | 'FACEBOOK' | 'TRIPADVISOR' | 'BOOKING' | 'INSTAGRAM' | 'TIKTOK';
type RatingType = 'stars' | 'numeric' | 'recommendation';
```

#### **Business Types**
```typescript
interface BusinessProfile {
  id: string;
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  // ... more fields
}
```

#### **Automation Types**
```typescript
interface AutomationConfig {
  enabled: boolean;
  schedule: AutomationSchedule;
  actions: AutomationActions;
  limits: AutomationLimits;
  targeting: AutomationTargeting;
  safety: AutomationSafety;
}
```

### **Constants**

#### **Platform Constants**
```typescript
import { PLATFORM_CONFIGS, SUPPORTED_PLATFORMS } from '@wirecrest/core';

// Get all supported platforms
const platforms = SUPPORTED_PLATFORMS; // ['GOOGLE', 'FACEBOOK', ...]

// Get platform configuration
const googleConfig = PLATFORM_CONFIGS.GOOGLE;
```

#### **Business Constants**
```typescript
import { BUSINESS_TYPES, SUBSCRIPTION_TIERS } from '@wirecrest/core';

// Business types
const businessType = BUSINESS_TYPES.HOSPITALITY;

// Subscription tiers
const tier = SUBSCRIPTION_TIERS.PROFESSIONAL;
```

### **Utilities**

#### **Platform Utilities**
```typescript
import { 
  getPlatformConfig, 
  validatePlatformIdentifier,
  supportsReviews 
} from '@wirecrest/core';

// Get platform configuration
const config = getPlatformConfig('GOOGLE');

// Validate identifier
const isValid = validatePlatformIdentifier('GOOGLE', 'ChIJ...');

// Check platform features
const hasReviews = supportsReviews('GOOGLE');
```

#### **Business Utilities**
```typescript
import { 
  calculateBusinessMetrics,
  validateBusinessProfile,
  isBusinessActive 
} from '@wirecrest/core';

// Calculate metrics
const metrics = calculateBusinessMetrics(profile, reviews);

// Validate profile
const errors = validateBusinessProfile(profile);

// Check status
const isActive = isBusinessActive(profile);
```

#### **Automation Utilities**
```typescript
import { 
  validateAutomationConfig,
  shouldRunAutomation,
  isContentSafe 
} from '@wirecrest/core';

// Validate configuration
const errors = validateAutomationConfig(config);

// Check schedule
const shouldRun = shouldRunAutomation(config);

// Check content safety
const isSafe = isContentSafe(content, config);
```

## 🏗️ **Architecture**

### **Package Structure**
```
packages/core/
├── src/
│   ├── types/           # TypeScript interfaces
│   ├── constants/       # Business constants
│   ├── config/         # Application configuration
│   ├── utils/          # Utility functions
│   └── index.ts        # Main exports
├── package.json
├── tsconfig.json
└── README.md
```

### **Design Principles**

1. **Framework Agnostic**: No dependencies on specific frameworks
2. **Type Safe**: Full TypeScript support with strict typing
3. **Modular**: Organized into logical modules
4. **Extensible**: Easy to add new platforms and features
5. **Testable**: All functions are pure and testable
6. **Documented**: Comprehensive JSDoc documentation

## 🔄 **Migration Guide**

### **From Dashboard Constants**

**Before:**
```typescript
// In dashboard app
const PLATFORM_CONFIGS = {
  GOOGLE: { name: 'Google', icon: 'logos:google-icon', ... }
};
```

**After:**
```typescript
// Using @wirecrest/core
import { PLATFORM_CONFIGS } from '@wirecrest/core';
const googleConfig = PLATFORM_CONFIGS.GOOGLE;
```

### **From Business Logic**

**Before:**
```typescript
// In dashboard app
function calculateRating(reviews) {
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}
```

**After:**
```typescript
// Using @wirecrest/core
import { calculateBusinessMetrics } from '@wirecrest/core';
const metrics = calculateBusinessMetrics(profile, reviews);
```

## 🧪 **Testing**

```typescript
import { 
  validatePlatformIdentifier, 
  calculateBusinessMetrics 
} from '@wirecrest/core';

// Test platform validation
expect(validatePlatformIdentifier('GOOGLE', 'ChIJ...')).toBe(true);

// Test business metrics
const metrics = calculateBusinessMetrics(profile, reviews);
expect(metrics.averageRating).toBeGreaterThan(0);
```

## 📈 **Performance**

- **Zero Runtime Dependencies**: Only TypeScript types and constants
- **Tree Shaking**: Unused code is automatically removed
- **Fast Imports**: Optimized for quick loading
- **Memory Efficient**: Minimal memory footprint

## 🔒 **Security**

- **Input Validation**: All inputs are validated
- **Content Filtering**: Safe content detection
- **Rate Limiting**: Built-in rate limit checks
- **Safety Rules**: Automation safety measures

## 🤝 **Contributing**

1. **Add New Platforms**: Extend `PLATFORM_CONFIGS` and add validation
2. **Add Business Logic**: Create new utility functions
3. **Add Constants**: Define new business constants
4. **Add Types**: Create new TypeScript interfaces

## 📚 **Examples**

### **Complete Platform Setup**

```typescript
import { 
  PlatformType, 
  getPlatformConfig, 
  validatePlatformIdentifier,
  normalizePlatformIdentifier 
} from '@wirecrest/core';

function setupPlatform(platform: PlatformType, identifier: string) {
  // Validate identifier
  if (!validatePlatformIdentifier(platform, identifier)) {
    throw new Error('Invalid platform identifier');
  }
  
  // Normalize identifier
  const normalized = normalizePlatformIdentifier(platform, identifier);
  
  // Get platform configuration
  const config = getPlatformConfig(platform);
  
  return {
    platform,
    identifier: normalized,
    config,
  };
}
```

### **Business Analytics**

```typescript
import { 
  calculateBusinessMetrics,
  getBusinessSize,
  isEligibleForPremium 
} from '@wirecrest/core';

function analyzeBusiness(profile: BusinessProfile, reviews: any[]) {
  const metrics = calculateBusinessMetrics(profile, reviews);
  const size = getBusinessSize(profile.employeeCount);
  const isPremium = isEligibleForPremium(profile, 'professional');
  
  return {
    metrics,
    size,
    isPremium,
    recommendations: generateRecommendations(metrics),
  };
}
```

### **Automation Management**

```typescript
import { 
  validateAutomationConfig,
  shouldRunAutomation,
  isContentSafe,
  getAutomationRecommendations 
} from '@wirecrest/core';

function manageAutomation(config: AutomationConfig, content: string) {
  // Validate configuration
  const errors = validateAutomationConfig(config);
  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join(', ')}`);
  }
  
  // Check if should run
  if (!shouldRunAutomation(config)) {
    return { shouldRun: false, reason: 'Outside schedule' };
  }
  
  // Check content safety
  if (!isContentSafe(content, config)) {
    return { shouldRun: false, reason: 'Content not safe' };
  }
  
  // Get recommendations
  const recommendations = getAutomationRecommendations(config, stats);
  
  return { shouldRun: true, recommendations };
}
```

The `@wirecrest/core` package provides a solid foundation for all Wirecrest applications with consistent business logic, type safety, and comprehensive utilities! 🎉
