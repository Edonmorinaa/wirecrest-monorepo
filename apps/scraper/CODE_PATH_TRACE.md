# Scraper Code Path Trace from server.ts

## Executive Summary

**Primary Entry Point**: `src/server.ts`  
**Architecture**: Webhook-driven (Stripe + Apify)  
**Database**: **Prisma** (via `@wirecrest/db`)  
**SOLID Services (`src/core/`)**: **❌ NOT USED** (incomplete migration, orphaned code)  
**Active Services (`src/services/`)**: **✅ PRODUCTION**

---

## Complete Production Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         server.ts (ENTRY POINT)                 │
│  - Express server on PORT from env                               │
│  - Initializes all controllers and services                     │
│  - Exports sentimentAnalyzer for legacy actors                  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
           ┌────────▼────────┐ ┌──▼────────┐ ┌───▼──────┐
           │  Stripe Webhook  │ │  Apify    │ │ Platform │
           │   Controller     │ │ Webhook   │ │  Config  │
           └─────────────────┘ └───────────┘ └──────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
          ┌───────▼──────────┐  ┌───▼────────────┐  ┌──▼─────────┐
          │ApifyDataSyncService│  │ReviewData      │  │Analytics   │
          │ (fetch from Apify) │  │Processor       │  │Services    │
          └────────────────────┘  │(MAIN PIPELINE) │  └────────────┘
                                  └────┬───────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │              │              │
                  ┌─────▼─────┐ ┌─────▼─────┐  ┌────▼──────┐
                  │Database   │ │Analytics  │  │Notification│
                  │Service    │ │ Services  │  │  Helper    │
                  │(Prisma)   │ │(per-plat) │  └────────────┘
                  └───────────┘ └───────────┘
```

---

## 1. Server Initialization (`server.ts` lines 59-81)

### Services Created at Startup
```typescript
server.ts (initializeServices)
├── StripeWebhookController          // Subscription lifecycle
├── ApifyWebhookController            // ✅ MAIN DATA PIPELINE
│   ├── ApifyDataSyncService          // Fetches from Apify
│   └── ReviewDataProcessor           // Processes & saves reviews
├── PlatformConfigWebhookController   // Platform setup
├── SubscriptionOrchestrator          // Subscription management
├── ApifyScheduleService              // Schedule CRUD
├── ApifyTaskService                  // Task management
├── FeatureExtractor                  // Feature flags
└── SentimentAnalyzer                 // ⚠️ EXPORTED (legacy actor usage)
```

### Database Access Pattern
- **Direct Prisma**: `@wirecrest/db` imported inline for simple queries
- **DatabaseService**: `src/supabase/database.ts` for complex review operations
- **NO Supabase Client**: Fully migrated to Prisma

---

## 2. Main Data Flow: Apify Webhook → Database

### The Production Pipeline (Most Important!)

```
1. Apify Actor Completes
   └── Sends webhook → POST /webhooks/apify

2. ApifyWebhookController.handleWebhook()
   ├── Validates webhook token
   ├── Checks for duplicate processing (idempotency)
   ├── Logs webhook in database
   └── Handles event type:
       ├── ACTOR.RUN.SUCCEEDED → handleRunSucceeded()
       ├── ACTOR.RUN.FAILED → handleRunFailed()
       └── ACTOR.RUN.ABORTED → handleRunAborted()

3. handleRunSucceeded()
   ├── Fetches dataset from Apify
   ├── Gets sync record (if manual trigger)
   └── Calls ReviewDataProcessor.processReviews()

4. ReviewDataProcessor.processReviews()
   ├── Routes by platform:
   │   ├── google_reviews → processGoogleReviews()
   │   ├── facebook → processFacebookReviews()
   │   ├── tripadvisor → processTripAdvisorReviews()
   │   └── booking → processBookingReviews()
   └── Sends notification to team

5. processGoogleReviews() (example)
   ├── Groups reviews by placeId
   ├── Looks up GoogleBusinessProfile (Prisma)
   ├── Calls DatabaseService.saveGoogleReviewsWithMetadata()
   └── Calls GoogleReviewAnalyticsService.processReviewsAndUpdateDashboard()

6. DatabaseService.saveGoogleReviewsWithMetadata()
   ├── Validates review data
   ├── Calls reviewAnalysisService.analyzeReview()  ← ✅ NEW CENTRALIZED
   ├── Creates/updates ReviewMetadata (Prisma)
   └── Creates/updates GoogleReview (Prisma)

7. GoogleReviewAnalyticsService.processReviewsAndUpdateDashboard()
   ├── Queries reviews from database
   ├── Calculates analytics (sentiment trends, etc.)
   └── Updates GoogleOverview table
```

---

## 3. Active Files in Production

### ✅ USED (Production Code)

#### Core Server
- `src/server.ts` - Main entry point
- `src/config/env.ts` - Environment validation

#### Controllers
- `src/controllers/ApifyWebhookController.ts` - **Main data pipeline**
- `src/controllers/StripeWebhookController.ts` - Subscription management
- `src/controllers/PlatformConfigWebhookController.ts` - Platform setup
- `src/controllers/AdminController.ts` - Admin operations

#### Services (Active Layer - `src/services/`)
- `src/services/apify/ApifyDataSyncService.ts` - Fetch from Apify
- `src/services/apify/ApifyScheduleService.ts` - Schedule management
- `src/services/apify/ApifyTaskService.ts` - Task management
- `src/services/processing/ReviewDataProcessor.ts` - **Main processor**
- `src/services/googleReviewAnalyticsService.ts` - Google analytics
- `src/services/facebookReviewAnalyticsService.ts` - Facebook analytics
- `src/services/tripAdvisorReviewAnalyticsService.ts` - TripAdvisor analytics
- `src/services/bookingReviewAnalyticsService.ts` - Booking analytics
- `src/services/subscription/SubscriptionOrchestrator.ts` - Subscriptions
- `src/services/subscription/FeatureExtractor.ts` - Feature flags
- `src/services/analysis/ReviewAnalysisService.ts` - **✅ NEW CENTRALIZED**

#### Database Layer
- `src/supabase/database.ts` - **Main database service (Prisma)**
- `src/supabase/teamService.ts` - Team operations
- `src/supabase/googleOverviewService.ts` - Google analytics storage
- `src/supabase/bookingOverviewService.ts` - Booking analytics storage
- `src/supabase/tripAdvisorOverviewService.ts` - TripAdvisor analytics storage

#### Utilities
- `src/sentimentAnalyzer/sentimentAnalyzer.ts` - Sentiment analysis
- `src/utils/logger.ts` - Logging
- `src/utils/notificationHelper.ts` - Notifications

---

## 4. NOT USED (Legacy/Orphaned Code)

### ❌ NOT USED (Incomplete SOLID Refactor)

#### SOLID Services Layer (`src/core/services/`)
All these files are **NOT imported or used**:
- `src/core/services/GoogleBusinessService.ts`
- `src/core/services/GoogleReviewService.ts`
- `src/core/services/GoogleAnalyticsService.ts`
- `src/core/services/FacebookBusinessService.ts`
- `src/core/services/FacebookReviewService.ts`
- `src/core/services/FacebookAnalyticsService.ts`
- `src/core/services/TripAdvisorBusinessService.ts`
- `src/core/services/TripAdvisorReviewService.ts`
- `src/core/services/TripAdvisorAnalyticsService.ts`
- `src/core/services/BookingBusinessService.ts`
- `src/core/services/BookingReviewService.ts`
- `src/core/services/BookingAnalyticsService.ts`
- `src/core/services/UnifiedBusinessService.ts`
- `src/core/services/ModernBusinessService.ts`
- `src/core/services/TaskTrackerService.ts`
- `src/core/services/BackendOrchestrator.ts`

#### SOLID Repositories (`src/core/repositories/`)
All these files are **NOT imported or used**:
- `src/core/repositories/BaseRepository.ts`
- `src/core/repositories/GoogleBusinessRepository.ts`
- `src/core/repositories/GoogleReviewRepository.ts`
- `src/core/repositories/FacebookBusinessRepository.ts`
- `src/core/repositories/FacebookReviewRepository.ts`
- `src/core/repositories/TripAdvisorBusinessRepository.ts`
- `src/core/repositories/TripAdvisorReviewRepository.ts`
- `src/core/repositories/BookingBusinessRepository.ts`
- `src/core/repositories/BookingReviewRepository.ts`
- `src/core/repositories/TikTokBusinessRepository.ts`
- `src/core/repositories/TikTokReviewRepository.ts`

#### SOLID Infrastructure (`src/core/`)
- `src/core/container/DependencyContainer.ts` - Not used
- `src/core/container/ServiceFactory.ts` - Not used
- `src/core/api/controllers/*` - Not used
- `src/core/interfaces/*` - Not used
- `src/core/examples/*` - Example files, not production
- `src/core/migration/*` - Migration utilities, not production
- `src/core/README.md` - Documentation for unused code

#### Legacy Actor Files
These actors define classes but are **not instantiated** by `server.ts`:
- `src/apifyService/actors/googleBusinessReviewsActor.ts`
- `src/apifyService/actors/googleBusinessReviewsBatchActor.ts`
- `src/apifyService/actors/facebookBusinessReviewsActor.ts`
- `src/apifyService/actors/tripAdvisorBusinessReviewsActor.ts`
- `src/apifyService/actors/bookingBusinessReviewsActor.ts`
- `src/apifyService/actors/bookingBusinessProfileActor.ts`

**Note**: These actors were previously called but the architecture changed to webhook-driven. Apify now runs actors via schedules and sends webhooks. The actors themselves run in Apify's cloud, not in this codebase.

#### Deleted During Cleanup
- ~~`src/supabase/database-supabase-backup.ts`~~ - ✅ Deleted (Supabase legacy)
- ~~`src/supabase/database-prisma.ts`~~ - ✅ Deleted (duplicate)
- ~~`src/core/old-index.ts`~~ - ✅ Deleted (old exports)

---

## 5. Key Decision Points

### Database Implementation
**ACTIVE**: `src/supabase/database.ts` (Prisma)
- Used by `ReviewDataProcessor`
- Has method: `saveGoogleReviewsWithMetadata()`
- ⚠️ **CRITICAL BUG**: Missing methods:
  - `saveFacebookReviewsWithMetadata()` 
  - `saveTripAdvisorReviewsWithMetadata()`
  - `saveBookingReviewsWithMetadata()`

### Service Architecture
**ACTIVE**: `src/services/` (flat service layer)
- `ReviewDataProcessor` - Main coordinator
- Platform-specific analytics services
- Apify services
- Subscription services

**INACTIVE**: `src/core/` (SOLID refactor)
- Complete alternative implementation
- Repository pattern, DI container, interfaces
- Never wired into `server.ts`
- Should be removed or completed

### Sentiment Analysis
**OLD**: Duplicated `analyzeReview()` functions in multiple files
**NEW** ✅: Centralized `ReviewAnalysisService` 
- Used by: `database.ts`, actors (if they were active)
- Singleton pattern
- Consistent BUSINESS_TERMS and COMMON_WORDS

---

## 6. Critical Issues Found

### 1. Missing Database Methods (BLOCKING PRODUCTION)
**Severity**: 🔴 **CRITICAL**

The `DatabaseService` only has:
- ✅ `saveGoogleReviewsWithMetadata()` - Works
- ❌ `saveFacebookReviewsWithMetadata()` - Missing
- ❌ `saveTripAdvisorReviewsWithMetadata()` - Missing
- ❌ `saveBookingReviewsWithMetadata()` - Missing

**Impact**: Facebook, TripAdvisor, and Booking review scraping will fail at the save step.

**Called by**:
- `ReviewDataProcessor.processFacebookReviews()` (line ~250)
- `ReviewDataProcessor.processTripAdvisorReviews()` (line ~400)
- `ReviewDataProcessor.processBookingReviews()` (line ~550)

### 2. Orphaned SOLID Architecture
**Severity**: 🟡 **MEDIUM** (cleanup needed)

The entire `src/core/` directory (~25 files, thousands of lines) is unused:
- Not imported by `server.ts`
- Not imported by any active service
- Complete parallel implementation
- Migration was started but never completed

**Recommendation**: Remove or complete the migration.

### 3. Legacy Actor Files
**Severity**: 🟢 **LOW** (documentation issue)

The actor files in `src/apifyService/actors/` define classes but aren't instantiated:
- They used to be called directly
- Now Apify runs them as cloud functions
- The code still exists but isn't used by this codebase
- May be useful as reference for Apify actor configurations

**Recommendation**: Move to `docs/` or clarify their purpose.

---

## 7. Data Flow Example: Google Review Sync

```
1. User adds Google Business Profile in dashboard
   └── Creates GoogleBusinessProfile record (Prisma)

2. SubscriptionOrchestrator creates Apify schedule
   └── Schedule runs Google Maps Reviews Scraper hourly

3. Apify actor completes → sends webhook
   POST /webhooks/apify
   {
     "eventType": "ACTOR.RUN.SUCCEEDED",
     "eventData": { "actorRunId": "abc123" },
     "resource": { "defaultDatasetId": "xyz789" }
   }

4. ApifyWebhookController.handleWebhook()
   └── handleRunSucceeded()
       ├── fetchDatasetItems("xyz789")
       │   └── Returns: [{ placeId: "ChIJ...", reviewerId: "...", stars: 5, text: "Great!" }, ...]
       │
       └── reviewDataProcessor.processReviews()
           └── processGoogleReviews()
               ├── Groups by placeId
               ├── Finds GoogleBusinessProfile (Prisma query)
               │   SELECT * FROM GoogleBusinessProfile WHERE placeId = 'ChIJ...'
               │
               ├── databaseService.saveGoogleReviewsWithMetadata()
               │   ├── reviewAnalysisService.analyzeReview("Great!", 5)
               │   │   └── Returns: { sentiment: 0.85, keywords: ["great"], urgency: 2 }
               │   │
               │   ├── Creates ReviewMetadata (Prisma)
               │   │   INSERT INTO ReviewMetadata (id, externalId, source, rating, text, sentiment...)
               │   │
               │   └── Creates GoogleReview (Prisma)
               │       INSERT INTO GoogleReview (id, businessProfileId, reviewMetadataId, stars...)
               │
               └── googleAnalyticsService.processReviewsAndUpdateDashboard()
                   ├── SELECT * FROM GoogleReview WHERE businessProfileId = '...'
                   ├── Calculate sentiment trends, rating distribution
                   └── UPDATE GoogleOverview SET avgRating = 4.5, sentimentScore = 0.72...

5. Send notification to team
   └── "3 new reviews from Google Maps"
```

---

## 8. Testing Checklist

To verify production flow:

1. ✅ **Google Reviews** - Should work (method exists)
2. ❌ **Facebook Reviews** - Will fail (method missing)
3. ❌ **TripAdvisor Reviews** - Will fail (method missing)
4. ❌ **Booking Reviews** - Will fail (method missing)

Check logs for:
```
✅ "Successfully processed ACTOR.RUN.SUCCEEDED event"
❌ "Error processing succeeded run: DatabaseService.saveFacebookReviewsWithMetadata is not a function"
```

---

## 9. Recommendations

### Immediate (Critical)
1. Implement missing database methods:
   - `saveFacebookReviewsWithMetadata()`
   - `saveTripAdvisorReviewsWithMetadata()`
   - `saveBookingReviewsWithMetadata()`
2. Test all platforms end-to-end
3. Monitor production logs for errors

### Short-term (Cleanup)
1. Remove or document `src/core/` SOLID architecture
2. Move unused actor files to `docs/actors-reference/`
3. Update README with actual architecture (not planned SOLID refactor)

### Long-term (Architecture)
1. Decide: Complete SOLID refactor OR stay with current flat services
2. Consider consolidating analytics services (similar logic across platforms)
3. Add comprehensive integration tests

---

## 10. File Import Analysis

### What `server.ts` Actually Imports

```typescript
// USED Controllers
import { StripeWebhookController } from './controllers/StripeWebhookController';
import { ApifyWebhookController } from './controllers/ApifyWebhookController';
import { PlatformConfigWebhookController } from './controllers/PlatformConfigWebhookController';
import { AdminController } from './controllers/AdminController';

// USED Services
import { SubscriptionOrchestrator } from './services/subscription/SubscriptionOrchestrator';
import { ApifyScheduleService } from './services/apify/ApifyScheduleService';
import { ApifyTaskService } from './services/apify/ApifyTaskService';
import { FeatureExtractor } from './services/subscription/FeatureExtractor';
import { ApifyDataSyncService } from './services/apify/ApifyDataSyncService';

// USED Utilities
import { SentimentAnalyzer } from './sentimentAnalyzer/sentimentAnalyzer';
import { validateEnv } from './config/env';
import { authenticate, requireAdminAuth, requireTeamAccess } from './middleware/authMiddleware';

// USED Database
import { prisma } from '@wirecrest/db'; // Direct Prisma import
```

### What Controllers Import (Transitive Dependencies)

```typescript
// ApifyWebhookController imports:
import { ApifyDataSyncService } from '../services/apify/ApifyDataSyncService';
import { ReviewDataProcessor } from '../services/processing/ReviewDataProcessor';

// ReviewDataProcessor imports:
import { DatabaseService } from '../../supabase/database';           // ✅ ACTIVE
import { GoogleReviewAnalyticsService } from '../googleReviewAnalyticsService';
import { FacebookReviewAnalyticsService } from '../facebookReviewAnalyticsService';
import { TripAdvisorReviewAnalyticsService } from '../tripAdvisorReviewAnalyticsService';
import { BookingReviewAnalyticsService } from '../bookingReviewAnalyticsService';

// DatabaseService imports:
import { reviewAnalysisService } from '../services/analysis/ReviewAnalysisService'; // ✅ NEW
import { prisma } from '@wirecrest/db';                              // ✅ Prisma only
```

### What is NOT Imported (Dead Code)

```typescript
// ❌ NEVER imported from server.ts or its dependencies:
// - Anything in src/core/services/*
// - Anything in src/core/repositories/*
// - Anything in src/core/container/*
// - Anything in src/apifyService/actors/* (classes defined but not instantiated)
```

---

## Summary

**The scraper is webhook-driven, not actor-driven.**

Apify runs actors as cloud functions on schedules. When they complete, they send webhooks to this service. This service then:
1. Fetches the data from Apify datasets
2. Processes and saves to database (Prisma)
3. Calculates analytics
4. Sends notifications

The actor class files in this codebase are **legacy code** from when actors were called directly. Now they're orphaned. The SOLID refactor in `src/core/` was never completed and is also orphaned code.

The **actual production path** is:
```
server.ts → ApifyWebhookController → ReviewDataProcessor → DatabaseService (Prisma) → Analytics
```
