# Scraper Calculation Review Findings

**Review Date:** 2025-11-07  
**Reviewer:** AI Code Auditor  
**Scope:** All platform scrapers - Google, Facebook, TripAdvisor, Booking, Instagram, TikTok

---

## Executive Summary

This document contains detailed findings from a comprehensive review of all scraper service calculations, date filtering logic, and data mapping implementations. Issues are categorized by severity:

- 🔴 **CRITICAL**: Produces incorrect results, data loss, or crashes
- 🟡 **WARNING**: Inconsistencies or potential issues
- 🟢 **INFO**: Best practice recommendations

---

## Instagram & TikTok Status

### Finding: Both platforms still use deprecated Supabase services

**Status:** 🟡 WARNING

- **Instagram**: Has `enhancedInstagramDataService.ts` but it's marked LEGACY and uses Supabase
- **TikTok**: Has new `core/services/` wrappers (TikTokAnalyticsService, TikTokBusinessService) but they only wrap the deprecated `tiktokDataService.ts` which uses Supabase
- **Recommendation**: Complete Prisma migration or remove these platforms if not in use

---

## Google Reviews Platform

### 1. Rating Distribution Rounding Inconsistency

**Status:** 🔴 **CRITICAL**

**File:** `apps/scraper/src/services/googleReviewAnalyticsService.ts`  
**Lines:** 277-281

**Issue:**
```typescript
const rating = review.stars || review.rating || 0;
if (rating >= 1 && rating <= 5) {
  const ratingKey = Math.floor(rating).toString();  // ❌ PROBLEM
  ratingDistribution[ratingKey]++;
```

**Problem:**
- Uses `Math.floor(rating)` which rounds DOWN
- A 4.9 rating goes into bucket "4" instead of "5"
- A 3.5 rating goes into bucket "3" instead of "4"
- This misrepresents the rating distribution

**Expected Behavior:**
- Should use `Math.round(rating)` to round to nearest integer
- Or use `Math.ceil(rating)` if platform ratings are already integers

**Impact:** High - Skews rating distribution charts and statistics

**Recommendation:**
```typescript
const ratingKey = Math.round(rating).toString();  // ✓ CORRECT
```

---

### 2. Sentiment Calculation Logic

**Status:** 🟢 **INFO** (Intentional difference)

**File:** `apps/scraper/src/services/googleReviewAnalyticsService.ts`  
**Lines:** 290-303

**Current Implementation:**
```typescript
const rating = review.stars || review.rating || 0;
if (rating >= 4) {
  sentimentCounts.positive++;
} else if (rating === 3) {
  sentimentCounts.neutral++;
} else if (rating >= 1 && rating <= 2) {
  sentimentCounts.negative++;
}
```

**Analysis:**
- Uses **exact** rating value (not floored)
- Positive: >= 4 (includes 4.0, 4.5, 5.0)
- Neutral: == 3 (only 3.0)
- Negative: 1-2 (includes 1.0, 1.5, 2.0, 2.5)

**Issue:** Inconsistent with rating distribution which uses `Math.floor()`:
- A 3.5 review counts as bucket "3" in distribution
- But counts as "positive" (>= 4 is false, so checks next condition... wait, 3.5 == 3 is false too)
- **Actually, 3.5 would be NEGATIVE** because it fails >= 4, fails == 3, and 3.5 >= 1 && 3.5 <= 2 is false, so it falls through and is not counted!

**This is a BUG!** Reviews with ratings between 2.1-2.9 and 3.1-3.9 are not counted in sentiment at all!

**Recommendation:**
```typescript
// Use consistent rounding
const roundedRating = Math.round(rating);
if (roundedRating >= 4) {
  sentimentCounts.positive++;
} else if (roundedRating === 3) {
  sentimentCounts.neutral++;
} else if (roundedRating >= 1 && roundedRating <= 2) {
  sentimentCounts.negative++;
}
```

---

### 3. Response Rate Calculation

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/googleReviewAnalyticsService.ts`  
**Lines:** 341-342

```typescript
const responseRatePercent = reviews.length > 0 ? (respondedReviewsCount / reviews.length) * 100 : 0;
```

**Analysis:** ✓ Correctly checks for division by zero

---

### 4. Average Response Time Calculation

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/googleReviewAnalyticsService.ts`  
**Lines:** 326-342

```typescript
for (const review of reviews) {
  const reviewDate = review.publishedAtDate;
  const responseText = review.reviewMetadata?.reply;
  const responseDate = review.reviewMetadata?.replyDate;

  if (responseText && responseDate && reviewDate) {
    respondedReviewsCount++;
    const timeDiffMs = responseDate.getTime() - reviewDate.getTime();
    if (timeDiffMs > 0) {  // ✓ Only counts positive differences
      totalResponseTimeHours += timeDiffMs / (1000 * 60 * 60);
      reviewsWithResponseTime++;
    }
  }
}

const avgResponseTimeHours = reviewsWithResponseTime > 0 
  ? totalResponseTimeHours / reviewsWithResponseTime 
  : null;  // ✓ Returns null instead of 0 for no data
```

**Analysis:** ✓ Correctly handles edge cases

---

### 5. Average Rating Calculation

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/googleReviewAnalyticsService.ts`  
**Lines:** 287

```typescript
const avgRating = ratingCount > 0 ? totalRating / ratingCount : null;
```

**Analysis:** ✓ Correctly checks for division by zero, returns null for no data

---

## Date Filtering (All Platforms)

### Common Pattern Analysis

**Status:** ✅ **CORRECT**

**Pattern Used Across All Platforms:**
```typescript
const now = new Date();
const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
const startDate = new Date(endDate.getTime() - (periodInfo.days! * 24 * 60 * 60 * 1000));
startDate.setHours(0, 0, 0, 0);

reviewsInPeriod = allReviews.filter(r => {
  const reviewDate = new Date(r.publishedDate);
  return reviewDate >= startDate && reviewDate <= endDate;
});
```

**Analysis:**
- ✓ Creates proper boundaries: start of day to end of day
- ✓ Uses millisecond math (handles leap years correctly)
- ✓ Inclusive boundaries (>= and <=)
- ✓ Consistent across Google, Facebook, TripAdvisor, Booking

**Potential Issue:** Timezone handling
- All dates are in local server timezone
- If reviews are stored in different timezones, this could cause boundary issues
- **Recommendation:** Use UTC consistently or store timezone with dates

---

### 6. Google Data Mapping

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/supabase/database.ts`  
**Lines:** 750-763

**Analysis:**
```typescript
stars: review.stars || review.rating || 0,
rating: review.rating || null,
name: this.sanitizeText(review.name || review.author, 255),
reviewerId: review.reviewerId || review.userId || `reviewer-${randomUUID()}`,
```

✓ Good fallback logic for multiple possible field names  
✓ Sanitization prevents overflow  
✓ Default values for required fields

---

## Facebook Reviews Platform

### 1. Recommendation Rate Calculation Error

**Status:** 🔴 **CRITICAL**

**File:** `apps/scraper/src/services/facebookReviewAnalyticsService.ts`  
**Line:** 286

**Issue:**
```typescript
const recommendationRate = recommendedCount > 0 
  ? (recommendedCount / reviewCount) * 100 
  : 0;  // ❌ WRONG CHECK
```

**Problem:**
- Checks `recommendedCount > 0` instead of `reviewCount > 0`
- If there are 0 recommended reviews but 100 not-recommended reviews, this would return 0% instead of calculating (0 / 100) * 100 = 0%
- **Actually, this is protected by the early return at line 262**, so it's not a critical bug in practice
- However, the logic is still incorrect and misleading

**Recommendation:**
```typescript
const recommendationRate = reviewCount > 0 
  ? (recommendedCount / reviewCount) * 100 
  : 0;  // ✓ CORRECT
```

**Impact:** Low - Protected by early return, but incorrect logic

---

### 2. Average Likes/Comments Calculation

**Status:** ✅ **CORRECT** (Protected by early return)

**File:** `apps/scraper/src/services/facebookReviewAnalyticsService.ts`  
**Lines:** 296-297

```typescript
const averageLikesPerReview = totalLikes / reviewCount;
const averageCommentsPerReview = totalComments / reviewCount;
```

**Analysis:**
- No explicit division-by-zero check
- **BUT** protected by early return at line 262: `if (reviewCount === 0) return {...}`
- ✓ Safe in practice

---

### 3. Engagement Score Calculation

**Status:** ⚠️ **NEEDS REVIEW**

**File:** `apps/scraper/src/services/facebookReviewAnalyticsService.ts`  
**Lines:** 705-714

```typescript
private calculateEngagementScore(metrics: PeriodMetricsData): number {
  if (metrics.totalReviews === 0) return 0;
  
  const engagementRate = (metrics.totalLikes + metrics.totalComments) / metrics.totalReviews;
  const photoRate = metrics.totalPhotos / metrics.totalReviews;
  const responseRate = metrics.responseRatePercent / 100;
  
  // Weighted engagement score
  const score = (engagementRate * 50) + (photoRate * 25) + (responseRate * 25);
  return Math.min(100, Math.max(0, score));
}
```

**Analysis:**
- ✓ Checks for division by zero
- ⚠️ **Potential issue:** `engagementRate` has no upper bound
  - If average likes + comments per review is 100, engagementRate = 100
  - Score would be: (100 * 50) + (photoRate * 25) + (responseRate * 25) = 5000+
  - Then clamped to 100
  - **This makes the weighting meaningless for high-engagement pages**

**Recommendation:**
```typescript
// Normalize engagement rate to 0-1 scale first
const avgEngagementPerReview = (metrics.totalLikes + metrics.totalComments) / metrics.totalReviews;
const normalizedEngagementRate = Math.min(1, avgEngagementPerReview / 10); // Assume 10 engagements is "max"
const normalizedPhotoRate = Math.min(1, metrics.totalPhotos / metrics.totalReviews);
const responseRate = metrics.responseRatePercent / 100;

const score = (normalizedEngagementRate * 50) + (normalizedPhotoRate * 25) + (responseRate * 25);
return Math.min(100, Math.max(0, score));
```

---

### 4. Virality Score Calculation

**Status:** ⚠️ **NEEDS REVIEW**

**File:** `apps/scraper/src/services/facebookReviewAnalyticsService.ts`  
**Lines:** 720-730

```typescript
private calculateViralityScore(metrics: PeriodMetricsData): number {
  if (metrics.totalReviews === 0) return 0;
  
  const likesPerReview = metrics.averageLikesPerReview;
  const commentsPerReview = metrics.averageCommentsPerReview;
  const recommendationRate = metrics.recommendationRate / 100;
  
  // Virality based on engagement and recommendation rate
  const score = (likesPerReview * 30) + (commentsPerReview * 40) + (recommendationRate * 30);
  return Math.min(100, Math.max(0, score));
}
```

**Analysis:**
- Same issue as engagement score
- ⚠️ No normalization of likesPerReview or commentsPerReview
- If likesPerReview = 50, score = 1500+ before clamping
- Makes the weighting meaningless

**Recommendation:** Same normalization approach as engagement score

---

### 5. Sentiment Calculation

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/facebookReviewAnalyticsService.ts`  
**Lines:** 329-340

```typescript
private calculateSentimentCounts(reviews: FacebookReviewWithMetadata[]): {
  positive: number; neutral: number; negative: number; total: number 
} {
  let positive = 0, neutral = 0, negative = 0;

  reviews.forEach(review => {
    const emotional = review.reviewMetadata?.emotional?.toLowerCase();
    if (emotional === 'positive') positive++;
    else if (emotional === 'negative') negative++;
    else neutral++;  // ✓ Default to neutral
  });

  return { positive, neutral, negative, total: reviews.length };
}
```

**Analysis:**
- ✓ All reviews are counted (defaults to neutral)
- ✓ Uses metadata emotional field
- Different from Google (which uses rating-based sentiment)

---

### 6. Response Metrics Calculation

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/facebookReviewAnalyticsService.ts`  
**Lines:** 385-410

```typescript
const reviewsWithReplies = reviews.filter(r => r.reviewMetadata?.reply);
const responseRatePercent = reviews.length > 0 
  ? (reviewsWithReplies.length / reviews.length) * 100 
  : 0;  // ✓ Checks division by zero

// Calculate average response time
const responseTimes: number[] = [];
reviewsWithReplies.forEach(review => {
  const reviewDate = new Date(review.date);
  const replyDate = review.reviewMetadata?.replyDate 
    ? new Date(review.reviewMetadata.replyDate) 
    : null;
  
  if (replyDate && replyDate > reviewDate) {  // ✓ Only positive times
    const responseTimeHours = (replyDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);
    responseTimes.push(responseTimeHours);
  }
});

const avgResponseTimeHours = responseTimes.length > 0 
  ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
  : null;  // ✓ Returns null for no data
```

**Analysis:** ✓ Correctly implemented

---

### 7. Facebook Uses Supabase

**Status:** 🟡 **WARNING**

**Finding:** Facebook analytics service still uses Supabase instead of Prisma
- Lines 181-257 have Supabase calls: `this.supabase.from('FacebookOverview')`
- Other platforms (Google, TripAdvisor, Booking) use Prisma
- **Recommendation:** Migrate to Prisma for consistency

---

## TripAdvisor Reviews Platform

### 1. Rating Distribution and Averages

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/tripAdvisorReviewAnalyticsService.ts`  
**Lines:** 346-356, 417

```typescript
const rating = Math.round(review.rating);
if (rating >= 1 && rating <= 5) {
  ratingCounts[rating as keyof typeof ratingCounts]++;
  totalRating += review.rating;  // ✓ Uses original for average
}

// Later...
averageRating: totalRating / reviewsInPeriod.length  // ✓ Protected by early return
```

**Analysis:**
- ✓ Uses `Math.round()` for distribution (correct)
- ✓ Uses original rating value for average calculation
- ✓ Protected from division by zero via early return

---

### 2. Sub-Rating Averages

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/tripAdvisorReviewAnalyticsService.ts`  
**Lines:** 423-430

```typescript
averageServiceRating: subRatingTotals.service.count > 0 
  ? subRatingTotals.service.sum / subRatingTotals.service.count 
  : null
```

**Analysis:**
- ✓ All 8 sub-ratings check for division by zero
- ✓ Returns null when no data available
- ✓ Properly accumulates only non-null values

---

### 3. Trip Type Distribution

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/tripAdvisorReviewAnalyticsService.ts`  
**Lines:** 382-398

**Analysis:**
- ✓ Case-insensitive matching with `toUpperCase()`
- ✓ Validates trip type exists in enum before counting
- ✓ Handles missing trip types gracefully

---

### 4. Helpful Votes Calculation

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/tripAdvisorReviewAnalyticsService.ts`  
**Lines:** 401, 437

```typescript
const totalHelpfulVotes = reviewsInPeriod.reduce(
  (sum, review) => sum + (review.helpfulVotes || 0), 
  0
);
averageHelpfulVotes: totalHelpfulVotes / reviewsInPeriod.length
```

**Analysis:**
- ✓ Defaults missing helpfulVotes to 0
- ✓ Average protected by early return

---

### 5. Sentiment Calculation

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/tripAdvisorReviewAnalyticsService.ts`  
**Lines:** 448-459

```typescript
reviews.forEach(review => {
  const emotional = review.reviewMetadata?.emotional?.toLowerCase();
  if (emotional === 'positive') positive++;
  else if (emotional === 'negative') negative++;
  else neutral++;  // ✓ Defaults to neutral
});
```

**Analysis:**
- ✓ Same pattern as Facebook (uses metadata emotional field)
- ✓ All reviews counted

---

## Booking.com Reviews Platform

### 1. Rating Distribution with Clamping

**Status:** ✅ **CORRECT** (Best implementation!)

**File:** `apps/scraper/src/services/bookingReviewAnalyticsService.ts`  
**Lines:** 718-721

```typescript
const rating = Math.max(1, Math.min(5, Math.round(review.rating)));
ratingCounts[rating as keyof typeof ratingCounts]++;
totalRating += review.rating;  // ✓ Uses original
```

**Analysis:**
- ✓ Uses `Math.round()` for distribution
- ✓ **Clamps to 1-5 range** with `Math.max(1, Math.min(5, ...))`
- ✓ Handles out-of-range ratings gracefully (unlike Google)
- ✓ Uses original rating for average

**This is the BEST approach** - should be adopted by all platforms!

---

### 2. Sub-Rating Averages

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/bookingReviewAnalyticsService.ts`  
**Lines:** 735-763, 807-813

```typescript
if (review.cleanlinessRating) {
  subRatingTotals.cleanliness.sum += review.cleanlinessRating;
  subRatingTotals.cleanliness.count++;
}

// Later...
averageCleanlinessRating: subRatingTotals.cleanliness.count > 0 
  ? subRatingTotals.cleanliness.sum / subRatingTotals.cleanliness.count 
  : null
```

**Analysis:**
- ✓ All 7 sub-ratings check for division by zero
- ✓ Only counts non-null/non-undefined values
- ✓ Returns null when no data

---

### 3. Stay Length Distribution

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/bookingReviewAnalyticsService.ts`  
**Lines:** 782-786

```typescript
const stayLengths = reviewsInPeriod.filter(r => r.lengthOfStay).map(r => r.lengthOfStay!);
const avgStayLength = stayLengths.length > 0 
  ? stayLengths.reduce((a, b) => a + b, 0) / stayLengths.length 
  : null;
const shortStays = stayLengths.filter(l => l <= 2).length;
const mediumStays = stayLengths.filter(l => l >= 3 && l <= 7).length;
const longStays = stayLengths.filter(l => l >= 8).length;
```

**Analysis:**
- ✓ Filters out null/undefined values first
- ✓ Checks for division by zero
- ✓ Categorizes stays correctly (short ≤2, medium 3-7, long ≥8)

---

### 4. Guest Type Mapping

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/bookingReviewAnalyticsService.ts`  
**Lines:** 845-873

**Analysis:**
- ✓ Case-insensitive matching
- ✓ Comprehensive mapping for various input formats
- ✓ Falls back to 'OTHER' for unknown types
- ✓ Handles multiple variations of same type

---

### 5. Sentiment Calculation

**Status:** ✅ **CORRECT**

**File:** `apps/scraper/src/services/bookingReviewAnalyticsService.ts`  
**Lines:** 935-948

```typescript
reviews.forEach(review => {
  const emotional = review.reviewMetadata?.emotional?.toLowerCase();
  if (emotional === 'positive') positive++;
  else if (emotional === 'negative') negative++;
  else neutral++;
});
```

**Analysis:**
- ✓ Same pattern as Facebook and TripAdvisor
- ✓ All reviews counted

---

## Common Patterns Review

### 1. Rating Rounding Inconsistency Across Platforms

**Status:** 🔴 **CRITICAL INCONSISTENCY**

| Platform | Method | Status |
|----------|--------|--------|
| Google | `Math.floor()` | ❌ WRONG |
| Facebook | N/A (no ratings) | - |
| TripAdvisor | `Math.round()` | ✅ CORRECT |
| Booking | `Math.max(1, Math.min(5, Math.round()))` | ✅ BEST |

**Recommendation:** All platforms should use Booking's approach:
```typescript
const rating = Math.max(1, Math.min(5, Math.round(review.rating)));
```

---

### 2. Sentiment Calculation Methods

**Status:** 🟡 **INTENTIONAL DIFFERENCES**

| Platform | Method | Logic |
|----------|--------|-------|
| Google | Rating-based | ≥4 positive, =3 neutral, ≤2 negative (BUGGY) |
| Facebook | Metadata-based | Uses `reviewMetadata.emotional` field |
| TripAdvisor | Metadata-based | Uses `reviewMetadata.emotional` field |
| Booking | Metadata-based | Uses `reviewMetadata.emotional` field |

**Finding:** Different methods are intentional:
- Google uses rating thresholds (but has bugs)
- Others use analyzed emotional metadata

**Recommendation:** Fix Google's sentiment logic to handle all rating values

---

### 3. Division by Zero Protection

**Status:** ✅ **CORRECT** (with one pattern note)

**Pattern 1:** Early return for empty arrays
```typescript
if (reviewCount === 0) return { /* default values */ };
// Then all divisions are safe
```
Used by: Google, Facebook, TripAdvisor, Booking

**Pattern 2:** Explicit check before division
```typescript
const average = count > 0 ? sum / count : null;
```
Used by: All platforms for sub-ratings

**Analysis:** ✓ Both patterns are safe and used appropriately

---

### 4. Date Filtering Logic

**Status:** ✅ **CORRECT** (Consistent across all platforms)

```typescript
const now = new Date();
const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
startDate.setHours(0, 0, 0, 0);

reviewsInPeriod = allReviews.filter(r => {
  const reviewDate = new Date(r.publishedDate);
  return reviewDate >= startDate && reviewDate <= endDate;
});
```

**Analysis:** ✓ Implemented identically across all platforms

---

### 5. Database Technology Consistency

**Status:** 🟡 **WARNING**

| Platform | Database | Status |
|----------|----------|--------|
| Google | Prisma | ✅ Migrated |
| Facebook | Supabase | ⚠️ Not migrated |
| TripAdvisor | Supabase | ⚠️ Not migrated |
| Booking | Prisma | ✅ Migrated |
| Instagram | Supabase | ⚠️ Deprecated/Legacy |
| TikTok | Supabase | ⚠️ Deprecated/Legacy |

**Recommendation:** Migrate Facebook and TripAdvisor to Prisma for consistency

---

## Summary of Critical Findings

### 🔴 Critical Issues (Must Fix)

1. **Google Rating Distribution Bug** - Uses `Math.floor()` instead of `Math.round()`
2. **Google Sentiment Calculation Bug** - Doesn't count reviews with ratings 2.1-2.9 and 3.1-3.9

### 🟡 Warnings (Should Fix)

3. **Facebook Recommendation Rate Logic** - Checks wrong variable (protected but incorrect)
4. **Facebook Engagement Score** - No normalization, makes weighting meaningless
5. **Facebook Virality Score** - No normalization, makes weighting meaningless
6. **Database Inconsistency** - Facebook/TripAdvisor/Instagram/TikTok still on Supabase

### 🟢 Best Practices Found

7. **Booking Rating Clamping** - Excellent implementation should be adopted everywhere
8. **Division by Zero Protection** - Excellent patterns used consistently
9. **Date Filtering** - Implemented correctly and consistently
10. **Sub-Rating Calculations** - All platforms handle these correctly

---

## Recommendations Priority Order

### P0 - Critical (Fix Immediately)
1. Fix Google `Math.floor()` → `Math.round()` for rating distribution
2. Fix Google sentiment calculation to handle all rating values (2.1-2.9, 3.1-3.9)

### P1 - High Priority
3. Adopt Booking's rating clamping approach for Google and TripAdvisor
4. Fix Facebook recommendation rate check (reviewCount instead of recommendedCount)
5. Add normalization to Facebook engagement and virality scores

### P2 - Medium Priority
6. Migrate Facebook to Prisma
7. Migrate TripAdvisor to Prisma
8. Add timezone handling documentation/standardization

### P3 - Low Priority (Cleanup)
9. Remove or fully migrate deprecated Instagram service
10. Remove or fully migrate deprecated TikTok service

---

**Review Complete:** 2025-11-07  
**Total Issues Found:** 10 (2 critical, 4 warnings, 4 best practices noted)

