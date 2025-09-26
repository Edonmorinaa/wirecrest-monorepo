# Instagram Analytics Service V2

A comprehensive, SOLID-principle-based analytics service for Instagram business profiles.

## Architecture Overview

This service follows SOLID principles and Next.js best practices:

- **Single Responsibility Principle**: Each class has one clear purpose
- **Open/Closed Principle**: Easy to extend without modifying existing code
- **Liskov Substitution Principle**: All calculators are interchangeable
- **Interface Segregation Principle**: Small, focused interfaces
- **Dependency Inversion Principle**: Depends on abstractions, not concretions

## File Structure

```
src/services/
├── calculations/
│   ├── general-metrics-calculator.ts      # General profile metrics
│   ├── overview-metrics-calculator.ts     # Overview dashboard metrics
│   ├── growth-metrics-calculator.ts       # Growth analysis metrics
│   ├── engagement-metrics-calculator.ts   # Engagement analysis metrics
│   ├── history-metrics-calculator.ts      # Historical data metrics
│   └── instagram-calculation-utils.ts     # Shared calculation utilities
├── validation/
│   └── instagram-data-validator.ts        # Data validation service
├── processors/
│   └── instagram-data-processor.ts        # Data processing and storage
├── instagram-analytics-service-v2.ts      # Main service orchestrator
└── __tests__/
    └── instagram-analytics-service.test.ts # Comprehensive test suite
```

## Key Features

### 1. Accurate Calculations

All calculations are based on the actual database schema and use proper formulas:

- **Engagement Rate**: `(likes + comments + saves + shares) / followers * 100`
- **Comments Ratio**: `(comments / likes) * 100`
- **Followers Ratio**: `followers / following`
- **Growth Rates**: Proper percentage calculations with validation

### 2. Data Validation

Comprehensive validation ensures data integrity:

- Input parameter validation
- Database field validation
- Date range validation
- Business logic validation

### 3. Error Handling

Robust error handling with meaningful messages:

- Graceful degradation
- Detailed error logging
- User-friendly error messages
- Fallback values for missing data

### 4. Performance Optimization

- Caching with TTL
- Pre-calculated fields
- Efficient database queries
- Batch processing

## Usage Examples

### Basic Analytics

```typescript
import { InstagramAnalyticsServiceV2 } from '@/services/instagram-analytics-service-v2';

const service = new InstagramAnalyticsServiceV2();

// Get analytics for a date range
const result = await service.getAnalyticsData(
  'business-profile-id',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

if (result.success) {
  console.log('Analytics data:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### Cached Analytics

```typescript
// Get cached data (faster, uses TTL)
const cachedResult = await service.getCachedAnalyticsData(
  'business-profile-id',
  startDate,
  endDate,
  false // Don't force refresh
);
```

### Data Processing

```typescript
import { InstagramDataProcessor } from '@/services/processors/instagram-data-processor';

// Process all snapshots for a business profile
await InstagramDataProcessor.processBusinessProfileSnapshots('business-profile-id');

// Process a specific snapshot
await InstagramDataProcessor.processSnapshot('snapshot-id');
```

## API Endpoints

### GET /api/instagram/analytics

Get analytics data with caching.

**Query Parameters:**
- `businessProfileId` (required): Instagram business profile ID
- `startDate` (required): Start date (ISO string)
- `endDate` (required): End date (ISO string)
- `forceRefresh` (optional): Force refresh cache (boolean)

**Response:**
```json
{
  "success": true,
  "data": {
    "general": { ... },
    "overview": { ... },
    "growth": { ... },
    "engagement": { ... },
    "history": [ ... ]
  }
}
```

### POST /api/instagram/analytics

Get analytics data without caching.

**Request Body:**
```json
{
  "businessProfileId": "string",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

## Database Schema

The service works with the existing `InstagramDailySnapshot` table which already includes all necessary calculated fields:

- `engagementRate` - Engagement rate percentage
- `avgLikesPerPost` - Average likes per post
- `avgCommentsPerPost` - Average comments per post
- `commentsRatio` - Comments per 100 likes
- `followersRatio` - Followers to following ratio
- `followersGrowth` - Daily followers growth
- `followingGrowth` - Daily following growth
- `mediaGrowth` - Daily media growth
- `weeklyFollowersGrowth` - Weekly followers growth
- `monthlyFollowersGrowth` - Monthly followers growth

**No schema changes are required** - the existing Prisma schema is already properly configured.

## Testing

Run the test suite:

```bash
npm test instagram-analytics-service.test.ts
```

The test suite includes:
- Unit tests for all calculation utilities
- Integration tests for the main service
- Edge case testing
- Data validation testing

## Migration from V1

To migrate from the old service:

1. Update imports:
   ```typescript
   // Old
   import { InstagramAnalyticsService } from '@/services/instagramAnalyticsService';
   
   // New
   import { InstagramAnalyticsServiceV2 } from '@/services/instagram-analytics-service-v2';
   ```

2. Update API routes to use the new service
3. Process existing data using `InstagramDataProcessor` to populate calculated fields
4. No database schema changes required - the existing schema is already correct

## Performance Considerations

- **Caching**: 24-hour TTL for analytics data
- **Batch Processing**: Process multiple snapshots efficiently
- **Database Indexes**: Optimized queries with proper indexing
- **Memory Usage**: Efficient data structures and cleanup

## Error Handling

The service provides comprehensive error handling:

- **Validation Errors**: Input parameter validation
- **Data Errors**: Database field validation
- **Calculation Errors**: Mathematical operation validation
- **Network Errors**: API and database connection errors

All errors are logged and returned with meaningful messages for debugging.

## Future Enhancements

- Real-time analytics updates
- Advanced prediction algorithms
- Machine learning integration
- Custom metric definitions
- Export functionality
