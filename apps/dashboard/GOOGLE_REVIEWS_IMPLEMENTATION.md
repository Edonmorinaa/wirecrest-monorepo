# Google Reviews Implementation

This document describes the implementation of the Google Reviews feature for the next-js project.

## Overview

The Google Reviews feature allows users to view, filter, and manage Google Business Profile reviews for their teams. The implementation follows the same patterns as the wirecrest_dashboard project but adapted for the next-js structure.

## Files Created/Modified

### API Endpoint
- `src/app/api/google/[slug]/reviews/route.ts` - Main API endpoint for fetching Google reviews

### Page Component
- `src/app/dashboard/teams/[slug]/google/reviews/page.jsx` - Main page component for displaying reviews
- `src/app/dashboard/teams/[slug]/google/reviews/layout.jsx` - Layout wrapper

### Custom Hook
- `src/hooks/use-google-reviews.ts` - Custom hook for managing reviews data and state

## Features Implemented

### 1. API Endpoint (`/api/google/[slug]/reviews`)
- **Authentication**: Requires user session and team membership verification
- **Pagination**: Supports page and limit parameters
- **Filtering**: 
  - Rating filters (min/max rating, specific ratings)
  - Response status (with/without response)
  - Search (review text and reviewer name)
  - Sentiment analysis
  - Read/Unread status
  - Important flag
  - Date range filtering
- **Sorting**: By date, rating, reviewer name
- **Statistics**: Returns aggregated stats including total reviews, average rating, rating distribution, response count, and unread count

### 2. Page Component
- **Stats Dashboard**: Shows key metrics in card format
- **Advanced Filters**: Comprehensive filtering options
- **Review List**: Displays reviews with reviewer info, rating, text, and response
- **Pagination**: Server-side pagination with customizable page sizes
- **Responsive Design**: Mobile-friendly layout using MUI Grid system
- **Loading States**: Skeleton loading and error handling
- **URL State**: Filters are reflected in URL parameters for bookmarking/sharing

### 3. Custom Hook
- **Data Management**: Handles API calls and state management
- **Filter Management**: Manages filter state and URL synchronization
- **Error Handling**: Provides error states and retry functionality
- **Caching**: Built-in caching and refresh capabilities

## Data Models Used

The implementation uses the following Prisma models:
- `GoogleReview` - Main review data
- `ReviewMetadata` - Review metadata including read status, importance, sentiment
- `GoogleBusinessProfile` - Business profile information
- `TeamMember` - Team membership verification

## Usage

### Accessing the Page
Navigate to: `/dashboard/teams/{team-slug}/google/reviews`

### API Usage
```javascript
// Fetch reviews with filters
const response = await fetch('/api/google/team-slug/reviews?page=1&limit=10&search=great');
const data = await response.json();
```

### Hook Usage
```javascript
import useGoogleReviews from 'src/hooks/use-google-reviews';

const { reviews, pagination, stats, isLoading, refreshReviews } = useGoogleReviews(teamSlug, filters);
```

## Design Patterns

### MUI Components Used
- **Cards**: For stats display and content containers
- **Grid**: For responsive layout
- **TextField**: For search input
- **Select**: For filter dropdowns
- **Rating**: For star display
- **Avatar**: For reviewer photos
- **Chip**: For status indicators
- **Skeleton**: For loading states
- **TablePaginationCustom**: For pagination

### State Management
- Uses React hooks for local state
- URL parameters for filter persistence
- Custom hook for API data management

### Error Handling
- API error responses with proper HTTP status codes
- User-friendly error messages
- Loading states and retry functionality

## Security

- **Authentication**: Requires valid user session
- **Authorization**: Verifies team membership before data access
- **Input Validation**: Validates all query parameters
- **Rate Limiting**: Built into the API structure

## Performance

- **Pagination**: Server-side pagination to limit data transfer
- **Filtering**: Database-level filtering for efficiency
- **Caching**: Hook-level caching for better UX
- **Lazy Loading**: Reviews loaded on demand

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live review updates
2. **Bulk Actions**: Mark multiple reviews as read/important
3. **Export Functionality**: Export reviews to CSV/PDF
4. **Analytics Dashboard**: More detailed analytics and charts
5. **Review Response**: Ability to respond to reviews directly
6. **Notification System**: Alerts for new reviews

## Testing

The implementation includes:
- Error handling for API failures
- Loading states for better UX
- Input validation for all filters
- Responsive design testing

## Dependencies

- Next.js 14+ with App Router
- Material-UI (MUI) components
- Prisma for database access
- NextAuth for authentication
