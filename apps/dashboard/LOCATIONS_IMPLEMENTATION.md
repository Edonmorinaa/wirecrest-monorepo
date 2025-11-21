# Locations System Implementation

## Overview

This document describes the new locations-based architecture that replaces the team-centric platform ownership model. Each team can now own multiple locations, and each location owns its platform profiles (Google, Facebook, TripAdvisor, Booking).

## Architecture Changes

### Database Schema Changes

The `BusinessLocation` model has been added to `schema.prisma`:

```prisma
model BusinessLocation {
  id        String   @id @default(uuid())
  teamId    String
  name      String
  address   String?
  city      String?
  country   String?
  timezone  String?  @default("UTC")
  
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  // Platform profiles (one-to-one relationships)
  googleBusinessProfile      GoogleBusinessProfile?
  facebookBusinessProfile    FacebookBusinessProfile?
  tripAdvisorBusinessProfile TripAdvisorBusinessProfile?
  bookingBusinessProfile     BookingBusinessProfile?
}
```

### Key Changes:
- **Location Model**: Added `BusinessLocation` as the owner of platform profiles
- **Platform Profiles**: Updated `GoogleBusinessProfile`, `FacebookBusinessProfile`, `TripAdvisorBusinessProfile`, and `BookingBusinessProfile` to reference `locationId` instead of `teamId`
- **Removed Models**: All `Overview` and `PeriodicalMetric` models for each platform have been removed
- **Real-time Analytics**: Analytics are now computed on-demand via tRPC procedures

## tRPC Procedures

All procedures are located in `apps/dashboard/src/server/trpc/routers/locations.router.ts`.

### Location CRUD Procedures

1. **getAll** - Get all locations for a team
   - Input: `{ teamSlug: string }`
   - Returns: Array of locations with platform profiles

2. **create** - Create a new location
   - Input: `{ teamSlug, name, address?, city?, country?, timezone? }`
   - Returns: Created location

3. **getById** - Get a single location
   - Input: `{ locationId: string }`
   - Returns: Location with all platform profiles

4. **update** - Update a location
   - Input: `{ locationId, name?, address?, city?, country?, timezone? }`
   - Returns: Updated location

5. **delete** - Delete a location
   - Input: `{ locationId: string }`
   - Returns: Success message

### Platform-Specific Procedures (per platform)

Each platform (Google, Facebook, TripAdvisor, Booking) has 4 procedures:

#### 1. Get Profile
- **Route**: `locations.{platform}.getProfile`
- **Purpose**: Get platform profile information (user/business data)
- **Input**: `{ locationId, platform }`
- **Returns**: Profile data with business information

#### 2. Get Analytics
- **Route**: `locations.{platform}.getAnalytics`
- **Purpose**: Calculate analytics for a given date range
- **Input**: `{ locationId, platform, startDate, endDate }`
- **Returns**: 
  - Review counts
  - Average ratings
  - Rating distribution
  - Sentiment analysis
  - Response rates
  - Engagement metrics
  - Platform-specific metrics

#### 3. Get Reviews
- **Route**: `locations.{platform}.getReviews`
- **Purpose**: Get reviews with filtering and pagination
- **Input**: `{ locationId, platform, filters?, pagination? }`
- **Returns**:
  - Array of reviews
  - Pagination info
  - Aggregated statistics

#### 4. Get Enhanced Graph
- **Route**: `locations.{platform}.getEnhancedGraph`
- **Purpose**: Get daily trend data for graphing
- **Input**: `{ locationId, platform, startDate, endDate }`
- **Returns**:
  - Daily data points
  - Overview statistics
  - Trend analysis

## React Hooks

All hooks are in `apps/dashboard/src/hooks/useLocations.ts`.

### Location CRUD Hooks

```typescript
// Get all locations for a team
const { locations, isLoading, error, refetch } = useLocations(teamSlug);

// Get a single location
const { location, isLoading, error, refetch } = useLocation(locationId);

// Create a location
const { createLocation, createLocationAsync, isCreating, error } = useCreateLocation();
createLocation({ teamSlug, name, address, city, country, timezone });

// Update a location
const { updateLocation, updateLocationAsync, isUpdating, error } = useUpdateLocation();
updateLocation({ locationId, name, address });

// Delete a location
const { deleteLocation, deleteLocationAsync, isDeleting, error } = useDeleteLocation();
deleteLocation({ locationId });
```

### Google Platform Hooks

```typescript
// Get Google Business Profile
const { profile, isLoading, error, refetch } = useGoogleProfile(locationId);

// Get Google Analytics
const { analytics, isLoading, error, refetch } = useGoogleAnalytics(
  locationId,
  startDate,
  endDate
);

// Get Google Reviews
const { reviews, pagination, aggregates, isLoading, error, refetch } = useGoogleReviews(
  locationId,
  filters,
  pagination
);

// Get Google Enhanced Graph Data
const { daily, overview, trends, isLoading, error, refetch } = useGoogleEnhancedGraph(
  locationId,
  startDate,
  endDate
);
```

### Facebook Platform Hooks

```typescript
// Similar pattern to Google
useFacebookProfile(locationId, enabled?)
useFacebookAnalytics(locationId, startDate, endDate, enabled?)
useFacebookReviews(locationId, filters?, pagination?, enabled?)
useFacebookEnhancedGraph(locationId, startDate, endDate, enabled?)
```

### TripAdvisor Platform Hooks

```typescript
// Similar pattern
useTripAdvisorProfile(locationId, enabled?)
useTripAdvisorAnalytics(locationId, startDate, endDate, enabled?)
useTripAdvisorReviews(locationId, filters?, pagination?, enabled?)
useTripAdvisorEnhancedGraph(locationId, startDate, endDate, enabled?)
```

### Booking Platform Hooks

```typescript
// Similar pattern
useBookingProfile(locationId, enabled?)
useBookingAnalytics(locationId, startDate, endDate, enabled?)
useBookingReviews(locationId, filters?, pagination?, enabled?)
useBookingEnhancedGraph(locationId, startDate, endDate, enabled?)
```

## Frontend Components

### Location Management Pages

1. **Locations List** (`/locations`)
   - Component: `LocationsListView`
   - File: `apps/dashboard/src/sections/locations/locations-list-view.tsx`
   - Features:
     - Table view of all locations
     - Create, edit, delete actions
     - Shows connected platforms with chips
     - Navigate to location details

2. **Location Details** (`/locations/[locationId]`)
   - Component: `LocationDetailView`
   - File: `apps/dashboard/src/sections/locations/location-detail-view.tsx`
   - Features:
     - Location information card
     - Platform tabs (Google, Facebook, TripAdvisor, Booking)
     - Dynamic platform views

3. **Location Form Dialog**
   - Component: `LocationFormDialog`
   - File: `apps/dashboard/src/sections/locations/location-form-dialog.tsx`
   - Used for: Creating and editing locations

### Platform View Components

Each platform has its own view component:

1. **GooglePlatformView**
   - File: `apps/dashboard/src/sections/locations/platforms/google-platform-view.tsx`
   - Features:
     - Profile information
     - Date range selector
     - Analytics cards (Reviews, Rating, Response Rate, Sentiment)
     - Rating distribution chart
     - Sentiment analysis breakdown
     - Recent reviews list
     - Trend graph (with daily data)

2. **FacebookPlatformView**
   - File: `apps/dashboard/src/sections/locations/platforms/facebook-platform-view.tsx`
   - Features:
     - Profile with followers/likes
     - Reviews, recommendation rate, engagement metrics

3. **TripAdvisorPlatformView**
   - File: `apps/dashboard/src/sections/locations/platforms/tripadvisor-platform-view.tsx`
   - Features:
     - Profile with rating and rank
     - Trip types distribution

4. **BookingPlatformView**
   - File: `apps/dashboard/src/sections/locations/platforms/booking-platform-view.tsx`
   - Features:
     - Profile with rating (out of 10) and stars
     - Guest types distribution

## Routes

Routes are defined in `apps/dashboard/src/routes/paths.js`:

```javascript
locations: {
  root: `/locations`,
  create: `/locations/create`,
  details: (locationId) => `/locations/${locationId}`,
}
```

## Usage Examples

### Example 1: Creating a Location

```typescript
import { useCreateLocation } from 'src/hooks/useLocations';

function CreateLocationButton() {
  const { createLocationAsync, isCreating } = useCreateLocation();

  const handleCreate = async () => {
    await createLocationAsync({
      teamSlug: 'my-team',
      name: 'Downtown Office',
      address: '123 Main St',
      city: 'San Francisco',
      country: 'USA',
      timezone: 'America/Los_Angeles',
    });
  };

  return (
    <button onClick={handleCreate} disabled={isCreating}>
      Create Location
    </button>
  );
}
```

### Example 2: Displaying Google Analytics

```typescript
import { useGoogleAnalytics } from 'src/hooks/useLocations';

function GoogleAnalyticsDashboard({ locationId }) {
  const startDate = '2025-01-01T00:00:00Z';
  const endDate = '2025-01-31T23:59:59Z';
  
  const { analytics, isLoading } = useGoogleAnalytics(
    locationId,
    startDate,
    endDate
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Google Analytics</h2>
      <p>Total Reviews: {analytics?.reviewCount}</p>
      <p>Average Rating: {analytics?.averageRating?.toFixed(1)}</p>
      <p>Response Rate: {analytics?.responseRate?.toFixed(0)}%</p>
      
      {analytics?.sentiment && (
        <div>
          <h3>Sentiment</h3>
          <p>Positive: {analytics.sentiment.positive}</p>
          <p>Neutral: {analytics.sentiment.neutral}</p>
          <p>Negative: {analytics.sentiment.negative}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Fetching Reviews with Filters

```typescript
import { useGoogleReviews } from 'src/hooks/useLocations';

function ReviewsList({ locationId }) {
  const filters = {
    minRating: 4,
    hasResponse: false,
  };
  
  const pagination = {
    page: 1,
    limit: 20,
  };
  
  const { reviews, pagination: paginationInfo, aggregates } = useGoogleReviews(
    locationId,
    filters,
    pagination
  );

  return (
    <div>
      <h2>Reviews ({paginationInfo.totalCount})</h2>
      {reviews.map((review) => (
        <div key={review.id}>
          <p>{review.reviewerDisplayName} - {review.stars} stars</p>
          <p>{review.text}</p>
        </div>
      ))}
    </div>
  );
}
```

## Migration Steps

To migrate from the old system to the new locations system:

1. **Run Prisma Commands**:
   ```bash
   cd packages/db
   npx prisma generate
   npx prisma migrate dev --name add-locations-system
   ```

2. **Data Migration** (Manual):
   - Create locations for each team
   - Update platform profiles to reference locations instead of teams
   - Delete old overview and periodical metric data

3. **Update Frontend**:
   - Replace old team-based platform hooks with location-based hooks
   - Update navigation to include locations
   - Update platform pages to work with location IDs

4. **Update Scraper Integration**:
   - Ensure scrapers store data with location context
   - Update webhook handlers to work with locations

## Benefits

1. **Multi-Location Support**: Teams can manage multiple physical locations
2. **Real-Time Analytics**: No more stale pre-computed data
3. **Better Data Organization**: Clear ownership hierarchy (Team → Location → Platform)
4. **Flexible Date Ranges**: Calculate analytics for any date range on-demand
5. **Improved Performance**: Only compute data when needed
6. **Easier Maintenance**: No background jobs for metric calculation
7. **Scalability**: Better suited for teams with many locations

## Notes

- All analytics are computed in real-time from review data
- The system uses React Query (via tRPC) for automatic caching and refetching
- Platform profile data is fetched separately from analytics for better performance
- Date range calculations are done in UTC by default but respect location timezone
- The enhanced graph data follows the same pattern as the existing Google reviews implementation

