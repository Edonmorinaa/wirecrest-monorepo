# API Route Fixes Required

## Current Issues in `pages/api/teams/[slug]/google-business-profile.ts`

### 1. **Incorrect Table/Relationship Names**

The current API route includes these problematic relationships:

```javascript
// CURRENT (INCORRECT)
reviewsDistribution: true,        // Should be: reviewsDistribution (correct)
categories: true,                 // Relationship doesn't exist as expected
imageCategories: true,           // Relationship doesn't exist
popularTimesHistogram: {         // Complex relationship issues
  include: {
    days: {
      include: {
        hours: true
      }
    }
  }
},
openingHours: {                  // Should be different relationship name
  include: {
    periods: true,
    specialHours: true
  }
},
currentOpeningHours: {           // Relationship doesn't exist
  include: {
    periods: true,
    specialHours: true
  }
},
regularOpeningHours: {           // Relationship doesn't exist
  include: {
    periods: true,
    specialHours: true
  }
}
```

### 2. **Fixed API Route Query**

```javascript
// CORRECTED VERSION
const businessProfile = await prisma.googleBusinessProfile.findFirst({
  where: {
    teamId: user.team.id,
    placeId: googleIdentifier.identifier,
  },
  include: {
    overview: {
      include: {
        periodicalMetrics: {
          orderBy: {
            updatedAt: 'desc'
          }
        }
      }
    },
    metadata: true,
    // Add only the relationships that actually exist in your schema
    // Remove all the problematic ones until you verify the actual relationships
  },
});
```

### 3. **Key Issues Identified**

1. **Missing PeriodicalMetrics**: The overview exists but has 0 periodicalMetrics, which is why analytics shows empty data
2. **Missing Location**: No location data is being stored
3. **Missing Opening Hours**: The opening hours relationships don't exist as expected
4. **Reviews Exist But No Analytics**: You have 5 recent reviews but no periodical metrics

### 4. **Root Cause Analysis**

The main issue is that:
- **GoogleReview records exist** (5 recent reviews found)
- **ReviewMetadata records exist** (as confirmed earlier)
- **GoogleOverview exists** but has no PeriodicalMetric records
- **Analytics service is not running** or not creating PeriodicalMetric records

This suggests the **Analytics Service is not processing the reviews** into aggregated metrics.

## Recommendations

### Immediate Fixes:
1. Update the API route to remove problematic relationships
2. Run the Analytics Service manually to populate PeriodicalMetric data
3. Verify the Analytics Service is scheduled to run automatically

### Long-term Fixes:
1. Audit all relationship names against the actual Prisma schema
2. Add proper error handling for missing relationships
3. Implement fallback data generation for missing analytics 