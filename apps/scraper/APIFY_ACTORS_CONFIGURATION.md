# Apify Actors Configuration

This document outlines the specialized review scrapers used for each platform and their input/output schemas.

## Overview

All platforms now use **specialized review scrapers** that are optimized for cost-effectiveness and performance. These actors focus purely on extracting reviews rather than general business data.

---

## 🔍 Google Maps Reviews Scraper

**Actor ID:** `Xb8osYTtOjlsgI6k9`  
**Actor Name:** Google Maps Reviews Scraper by compass  
**Purpose:** Extract reviews only from Google Maps places

### ✨ Key Benefits
- **Cost-Effective:** ~$0.50 per 1000 reviews (vs $4 per 1000 places in general scraper)
- **Batching Support:** Accepts array of `placeIds` - process multiple locations in single run
- **GDPR Compliant:** Option to exclude personal reviewer data
- **Review Focus:** Only Google reviews (excludes TripAdvisor reviews shown on Google Maps)

### 📥 Input Schema
```typescript
{
  placeIds: string[];              // Array of Google Place IDs (batched)
  maxReviews: number;              // Max reviews per place
  reviewsSort: 'newest' | 'most_relevant';
  language?: string;               // Default: 'en'
  reviewsOrigin?: 'google';        // Only Google reviews (not TripAdvisor)
  personalData?: boolean;          // Default: false (GDPR compliant)
  webhooks?: ApifyWebhookConfig[];
}
```

### 📤 Output Schema
```json
[
  {
    "name": "Place Name",
    "placeId": "ChIJ...",
    "reviewId": "...",
    "publishedAtDate": "2023-10-07",
    "text": "Review text...",
    "stars": 5,
    "reviewerName": "John D.",
    "reviewUrl": "https://...",
    "responseFromOwner": "Thank you...",
    "responseFromOwnerDate": "2023-10-08"
  }
]
```

### 💰 Pricing (FREE tier)
- Actor start: $0.006 per event
- Review extraction: ~$0.50 per 1000 reviews

---

## 📘 Facebook Reviews Scraper

**Actor ID:** `dX3d80hsNMilEwjXG`  
**Actor Name:** Facebook Reviews Scraper by Apify  
**Purpose:** Extract reviews from Facebook business pages

### ✨ Key Benefits
- **Residential Proxies Required:** For reliable Facebook scraping
- **Official Apify Actor:** Maintained by Apify team
- **Rich Review Data:** Includes likes, comments, reviewer info

### 📥 Input Schema
```typescript
{
  startUrls: Array<{ url: string }>;  // Facebook page URLs
  resultsLimit?: number;               // Max reviews per page (default: 50)
  proxy?: {
    apifyProxyGroups?: string[];       // e.g., ['RESIDENTIAL']
  };
  maxRequestRetries?: number;          // Default: 10
  webhooks?: ApifyWebhookConfig[];
}
```

### 📤 Output Schema
```json
[
  {
    "facebookUrl": "https://www.facebook.com/page",
    "id": "review_id",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "profileUrl": "https://...",
      "profilePic": "https://..."
    },
    "date": "2023-10-07T12:00:00.000Z",
    "url": "https://www.facebook.com/...",
    "isRecommended": true,
    "text": "Review text...",
    "likesCount": 5,
    "commentsCount": 2,
    "pageName": "Business Name"
  }
]
```

### 💰 Pricing (FREE tier)
- Actor start: $0.006 per event
- Review extraction: $0.0025 per review

---

## 🌍 TripAdvisor Reviews Scraper

**Actor ID:** `Hvp4YfFGyLM635Q2F`  
**Actor Name:** TripAdvisor Reviews Scraper by maxcopell  
**Purpose:** Extract reviews from TripAdvisor places

### ✨ Key Benefits
- **High Success Rate:** 99.7% run success rate
- **Reviewer Info:** Optional scraping of reviewer details
- **Multi-Language Support:** Filter reviews by language
- **Rating Filters:** Filter by review scores (1-5 stars)
- **Date Filtering:** Only scrape reviews since specific date

### 📥 Input Schema
```typescript
{
  startUrls: Array<{ url: string }>;   // TripAdvisor URLs
  maxItemsPerQuery?: number;           // Max reviews per place (default: 50)
  scrapeReviewerInfo?: boolean;        // Default: true
  lastReviewDate?: string;             // YYYY-MM-DD or "3 days"
  reviewRatings?: string[];            // ['ALL_REVIEW_RATINGS'] or ['4', '5']
  reviewsLanguages?: string[];         // ['ALL_REVIEW_LANGUAGES'] or ['en']
  webhooks?: ApifyWebhookConfig[];
}
```

### 📤 Output Schema
```json
[
  {
    "id": "review_id",
    "url": "https://www.tripadvisor.com/...",
    "title": "Great experience",
    "lang": "en",
    "locationId": "location_id",
    "publishedDate": "2023-10-07T12:00:00-04:00",
    "rating": 5,
    "helpfulVotes": 10,
    "travelDate": "2023-09",
    "text": "Review text...",
    "user": {
      "userId": "user_id",
      "username": "john_doe",
      "userLocation": {
        "name": "New York, USA",
        "id": "location_id"
      },
      "contributions": {
        "reviews": 50,
        "hotelReviews": 20,
        "restaurantReviews": 15
      }
    },
    "ownerResponse": {
      "id": "response_id",
      "text": "Thank you...",
      "publishedDate": "2023-10-08T10:00:00-04:00"
    },
    "placeInfo": {
      "id": "place_id",
      "name": "Hotel Name",
      "address": "123 Main St",
      "website": "https://..."
    }
  }
]
```

### 💰 Pricing
- $2 per 1000 reviews

---

## 🏨 Booking.com Reviews Scraper

**Actor ID:** `PbMHke3jW25J6hSOA`  
**Actor Name:** Booking Reviews Scraper by voyager  
**Purpose:** Extract reviews from Booking.com accommodations

### ✨ Key Benefits
- **High Reliability:** 99.9% run success rate
- **Detailed Reviews:** Includes liked/disliked parts, room info
- **Sort Options:** Multiple sorting strategies (newest, oldest, score)
- **Score Filtering:** Filter by review scores
- **Date Cutoff:** Stop scraping when reaching specific date

### 📥 Input Schema
```typescript
{
  startUrls: Array<{ url: string; userData?: any }>;  // Booking.com URLs
  maxReviewsPerHotel?: number;                        // Max reviews (default: 9999999)
  sortReviewsBy?: 'f_relevance' | 'f_recent_desc' |   // Sort strategy
                  'f_recent_asc' | 'f_score_desc' | 
                  'f_score_asc';
  cutoffDate?: string;                                 // UTC date for stopping
  reviewScores?: string[];                             // ['ALL'] or specific scores
  proxyConfiguration?: {
    useApifyProxy?: boolean;                           // Default: true
  };
  webhooks?: ApifyWebhookConfig[];
}
```

### 📤 Output Schema
```json
[
  {
    "id": "review_id",
    "hotelId": "hotel_id",
    "reviewPage": 1,
    "userName": "John Doe",
    "userLocation": "United States",
    "roomInfo": "King Room - Non-Smoking",
    "stayDate": "October 2023",
    "stayLength": "2 nights",
    "reviewDate": "October 10, 2023",
    "reviewTitle": "Excellent Stay",
    "rating": "9.5",
    "reviewTextParts": {
      "Liked": "Great location, clean rooms",
      "Disliked": "Breakfast could be better"
    },
    "customData": {}
  }
]
```

### 💰 Pricing
- $2 per 1000 reviews

---

## 🎯 Implementation Strategy

### Batching Strategy
- **Google Reviews:** Batch ALL `placeIds` into single schedule run per team
- **Other Platforms:** Batch ALL URLs into single schedule run per team

### Deduplication Strategy
1. **Sort by newest first:** Ensures latest reviews come first
2. **Track last review date:** Store in database per business profile
3. **Server-side filtering:** Check against existing reviews in database
4. **Efficient processing:** Stop early when no new reviews found

### Cost Optimization
1. **Use specialized actors:** Much cheaper than general scrapers
2. **Batch multiple locations:** Single run processes all team's locations
3. **Limit max reviews:** Set sensible limits per tier (50-200)
4. **Sort by newest:** Process latest reviews first
5. **Early termination:** Stop when hitting known reviews

### Schedule Configuration Per Tier

#### Free Tier
- **Reviews Schedule:** Every 7 days, max 50 reviews per location
- **Overview Schedule:** Every 30 days (if needed)

#### Starter Tier ($49/month)
- **Reviews Schedule:** Every 3 days, max 100 reviews per location
- **Overview Schedule:** Every 14 days

#### Professional Tier ($149/month)
- **Reviews Schedule:** Every 1 day, max 200 reviews per location
- **Overview Schedule:** Every 7 days

#### Enterprise Tier ($499/month)
- **Reviews Schedule:** Every 12 hours, max 500 reviews per location
- **Overview Schedule:** Every 3 days

---

## 🔗 Webhook Configuration

All actors are configured with webhooks to notify our system when scraping completes:

```typescript
{
  eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED'],
  requestUrl: 'https://your-domain.com/api/webhooks/apify',
  payloadTemplate: '...' // Optional custom payload
}
```

### Webhook Processing Flow
1. Apify sends webhook when actor run completes
2. `ApifyWebhookController` receives and validates payload
3. `ReviewDataProcessor` fetches dataset and processes reviews
4. Reviews are deduplicated and stored in database
5. `SyncRecord` is updated with results
6. Analytics are recalculated for affected businesses

---

## 📊 Monitoring & Logging

### Metrics to Track
- ✅ Successful runs per platform
- ⏱️ Average run duration
- 💰 Compute units consumed
- 📈 Reviews scraped per run
- 🔄 Duplicate rate
- ❌ Failed runs and error types

### Database Records
- **ApifySchedule:** Tracks active schedules and their configuration
- **SyncRecord:** Logs every run with detailed metrics
- **ApifyWebhookLog:** Raw webhook payloads for debugging

---

## 🚀 Next Steps

1. ✅ Update actor IDs to use specialized scrapers
2. ✅ Update input schemas for all platforms
3. ✅ Update type definitions
4. ⏳ Test each actor with sample data
5. ⏳ Validate output processing
6. ⏳ Deploy to production
7. ⏳ Monitor first runs

---

## 📚 References

- [Google Maps Reviews Scraper](https://apify.com/compass/google-maps-reviews-scraper)
- [Facebook Reviews Scraper](https://apify.com/apify/facebook-reviews-scraper)
- [TripAdvisor Reviews Scraper](https://apify.com/maxcopell/tripadvisor-reviews)
- [Booking Reviews Scraper](https://apify.com/voyager/booking-reviews-scraper)
- [Apify Webhooks Documentation](https://docs.apify.com/platform/integrations/webhooks)
- [Apify Schedules Documentation](https://docs.apify.com/platform/schedules)

