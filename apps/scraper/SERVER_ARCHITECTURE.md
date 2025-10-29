# Server Architecture - Hybrid System

## Overview

The Wirecrest Scraper Worker API now runs on a **hybrid architecture** that combines:

1. **Legacy Webhook System** - For handling Stripe subscriptions, Apify webhooks, and platform configurations
2. **SOLID-Compliant Analytics** - New architecture for all analytics operations using dependency injection

This allows us to:
- ✅ Keep existing webhook integrations working
- ✅ Use modern, testable analytics services
- ✅ Gradually migrate other services to SOLID architecture
- ✅ Maintain backward compatibility

---

## File Structure

```
src/
├── server.ts                    # NEW: Hybrid server (webhooks + SOLID analytics)
├── server.legacy.ts             # OLD: Preserved for reference
├── core/                        # SOLID-compliant architecture
│   ├── services/
│   │   ├── GoogleAnalyticsService.ts      ✅ NEW
│   │   ├── FacebookAnalyticsService.ts    ✅ NEW
│   │   ├── TripAdvisorAnalyticsService.ts ✅ NEW
│   │   ├── BookingAnalyticsService.ts     ✅ NEW
│   │   └── analytics/
│   │       ├── PeriodCalculator.ts        ✅ Shared utility
│   │       ├── HistogramBuilder.ts        ✅ Shared utility
│   │       ├── KeywordExtractor.ts        ✅ Shared utility
│   │       ├── ResponseAnalyzer.ts        ✅ Shared utility
│   │       ├── FacebookMetricsCalculator.ts    ✅ Platform-specific
│   │       ├── TripAdvisorMetricsCalculator.ts ✅ Platform-specific
│   │       └── BookingMetricsCalculator.ts     ✅ Platform-specific
│   ├── api/controllers/
│   │   ├── AnalyticsApiController.ts      ✅ Handles all analytics requests
│   │   ├── BusinessApiController.ts
│   │   ├── ReviewApiController.ts
│   │   └── TaskApiController.ts
│   └── container/
│       ├── DependencyContainer.ts         ✅ DI container
│       └── ServiceFactory.ts              ✅ Registers all services
└── controllers/                 # Legacy controllers (webhooks)
    ├── StripeWebhookController.ts
    ├── ApifyWebhookController.ts
    ├── PlatformConfigWebhookController.ts
    └── AdminController.ts
```

---

## Service Initialization

### Legacy Services (Webhooks)
```typescript
- StripeWebhookController
- ApifyWebhookController
- PlatformConfigWebhookController
- SubscriptionOrchestrator
- ApifyScheduleService
- ApifyTaskService
- AdminController
```

### SOLID Services (Analytics)
```typescript
- ServiceFactory (DI Container)
- GoogleAnalyticsService
- FacebookAnalyticsService
- TripAdvisorAnalyticsService
- BookingAnalyticsService
- AnalyticsApiController
```

---

## API Endpoints

### Health Check
```bash
GET /health
```

Returns service status and architecture info.

---

### Analytics Endpoints (NEW - SOLID Architecture)

All analytics endpoints follow this pattern:

#### Get Analytics
```bash
GET /api/analytics/{platform}/:businessProfileId
```

**Platforms:**
- `google` - Google Maps reviews
- `facebook` - Facebook reviews (recommendation-based)
- `tripadvisor` - TripAdvisor reviews (bubbles)
- `booking` - Booking.com reviews (1-10 scale)

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "platform": "GOOGLE_MAPS",
  "data": {
    "businessId": "abc123",
    "totalReviews": 150,
    "averageRating": 4.5,
    "sentimentScore": 85.2,
    "lastUpdated": "2024-01-15T10:00:00Z",
    "platform": "google"
  }
}
```

#### Process Analytics
```bash
POST /api/analytics/{platform}/:businessProfileId/process
```

Triggers analytics calculation for a business profile.

**Examples:**
```bash
# Get Google analytics
GET /api/analytics/google/business-profile-123

# Process Facebook analytics
POST /api/analytics/facebook/facebook-profile-456/process

# Get TripAdvisor analytics
GET /api/analytics/tripadvisor/ta-profile-789

# Process Booking analytics
POST /api/analytics/booking/booking-profile-101/process
```

---

### Webhook Endpoints (Legacy System)

#### Stripe Webhook
```bash
POST /webhooks/stripe
```

Handles subscription lifecycle events (created, updated, cancelled).

#### Apify Webhook
```bash
POST /webhooks/apify
```

Handles actor run completion, processes review data.

#### Platform Configuration Webhook
```bash
POST /api/webhooks/platform-configured
```

Handles platform setup from dashboard.

---

### Dashboard Endpoints (Read-Only)

#### Get Sync Status
```bash
GET /api/sync-status/:teamId
```

Returns recent sync records and active schedules.

#### Get Schedules
```bash
GET /api/schedules/:teamId
```

Returns team's Apify schedules.

---

### Admin Endpoints (Protected)

All admin endpoints require authentication.

```bash
GET    /api/admin/teams
GET    /api/admin/teams/:teamId/status
POST   /api/admin/teams/:teamId/setup
POST   /api/admin/teams/:teamId/platforms/:platform/sync
POST   /api/admin/teams/:teamId/schedules/refresh
DELETE /api/admin/teams/:teamId/schedules
POST   /api/admin/cleanup
```

---

## Architecture Comparison

### Legacy System (server.legacy.ts)

**Characteristics:**
- Direct service instantiation
- Hardcoded dependencies
- Supabase client usage
- Monolithic service classes
- No dependency injection

**Structure:**
```typescript
// Direct instantiation
const service = new GoogleAnalyticsService();
service.processReviews(id);
```

### Modern System (server.ts)

**Characteristics:**
- Dependency injection
- Repository pattern
- Prisma ORM (type-safe)
- SOLID principles
- Testable services

**Structure:**
```typescript
// Dependency injection
const container = serviceFactory.getContainer();
const service = container.getService(SERVICE_TOKENS.GOOGLE_ANALYTICS_SERVICE);
await service.processReviews(id);
```

---

## SOLID Principles Applied

### 1. Single Responsibility Principle (SRP)
- ✅ Each service handles one platform
- ✅ Calculators handle specific metric types
- ✅ Controllers handle one type of request

### 2. Open/Closed Principle (OCP)
- ✅ Easy to add new platforms without modifying existing code
- ✅ New calculators extend functionality
- ✅ Interfaces define contracts

### 3. Liskov Substitution Principle (LSP)
- ✅ All analytics services implement `IAnalyticsService`
- ✅ All can be used interchangeably

### 4. Interface Segregation Principle (ISP)
- ✅ Focused interfaces (`IAnalyticsService`, `IReviewRepository`)
- ✅ Clients only depend on what they use

### 5. Dependency Inversion Principle (DIP)
- ✅ Services depend on interfaces, not concrete implementations
- ✅ Repository pattern for data access
- ✅ Dependency injection throughout

---

## Platform-Specific Features

### Google (1-5 Stars)
- Rating histogram (5 buckets)
- Period-based metrics
- Keyword extraction
- Response rate tracking

### Facebook (Recommendations)
- **NO star ratings!**
- Recommendation rate (% recommended)
- Engagement score (likes, comments, photos)
- Virality score
- Tag analysis

### TripAdvisor (1-5 Bubbles)
- Bubble ratings (same scale as Google)
- **8 sub-ratings** (service, food, value, atmosphere, cleanliness, location, rooms, sleepQuality)
- Trip type distribution
- Helpful votes tracking

### Booking.com (1-10 Scale)
- **1-10 rating scale** (converted to 1-5 for histogram)
- **7 sub-ratings** (cleanliness, comfort, location, facilities, staff, valueForMoney, wifi)
- Guest type distribution
- Stay length metrics
- Nationality tracking

---

## Running the Server

### Development
```bash
npm run dev
# or
yarn dev
```

### Production
```bash
npm run build
npm start
# or
yarn build
yarn start
```

---

## Environment Variables

Required variables:

```env
# Port
PORT=3001

# Apify
APIFY_TOKEN=your_apify_token
APIFY_API_TOKEN=your_apify_token

# Stripe
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Database (Prisma)
DATABASE_URL=your_database_url

# Webhook URL
WEBHOOK_BASE_URL=https://your-domain.com

# Environment
NODE_ENV=production
```

---

## Migration Status

| Component | Status | Architecture |
|-----------|--------|--------------|
| Analytics Services | ✅ Migrated | SOLID |
| Webhook Handlers | ⚠️ Legacy | Monolithic |
| Admin Controllers | ⚠️ Legacy | Monolithic |
| Business Services | 🔄 Partial | Mixed |
| Review Services | 🔄 Partial | Mixed |

**Legend:**
- ✅ Fully migrated to SOLID
- 🔄 Partial migration (both systems available)
- ⚠️ Still using legacy system

---

## Next Steps

### Recommended Migration Order

1. ✅ **Analytics Services** (COMPLETED)
   - Google, Facebook, TripAdvisor, Booking analytics
   - Platform-specific calculators
   - Period-based metrics

2. 🔄 **Business Services** (In Progress)
   - Migrate business profile management
   - Use repository pattern

3. 🔄 **Review Services** (In Progress)
   - Migrate review data handling
   - Integrate with new analytics

4. ⚠️ **Webhook Handlers** (TODO)
   - Keep current functionality
   - Add SOLID wrappers

5. ⚠️ **Admin Services** (TODO)
   - Migrate to SOLID architecture
   - Add proper testing

---

## Testing

### Test Analytics Endpoints

```bash
# Get Google analytics
curl http://localhost:3001/api/analytics/google/your-business-id

# Process Facebook analytics
curl -X POST http://localhost:3001/api/analytics/facebook/your-business-id/process

# Health check
curl http://localhost:3001/health
```

### Expected Response

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "port": 3001,
  "architecture": "SOLID + Legacy Webhooks",
  "services": {
    "legacy": "ready",
    "solid": "ready",
    "analytics": "ready"
  }
}
```

---

## Troubleshooting

### Service Not Ready (503)

If you see "Service not ready" errors:

1. Check service initialization logs
2. Verify environment variables
3. Check database connectivity
4. Ensure all dependencies are installed

### Analytics Not Processing

If analytics aren't being calculated:

1. Check business profile exists in database
2. Verify reviews exist for the business
3. Check Prisma connection
4. Look for errors in console logs

### Webhooks Not Working

If webhooks fail:

1. Verify webhook secrets are correct
2. Check webhook URLs are accessible
3. Ensure raw body parser is working for Stripe
4. Check Apify webhook configuration

---

## Support

For questions or issues:
1. Check the logs for error messages
2. Review `MIGRATION_PROGRESS.md` for implementation details
3. See `ANALYTICS_IMPLEMENTATION_SUMMARY.md` for analytics specifics
4. Refer to legacy server at `server.legacy.ts` for original implementation

---

## Summary

The hybrid server architecture provides:

✅ **Modern analytics** with SOLID principles
✅ **Legacy webhooks** working as before
✅ **Gradual migration** path
✅ **Type safety** with Prisma
✅ **Testability** with dependency injection
✅ **Platform-specific** features for each review source
✅ **Production-ready** code

This architecture allows the system to evolve while maintaining stability! 🚀

