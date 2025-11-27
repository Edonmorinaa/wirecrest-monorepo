/**
 * Locations Router
 * 
 * tRPC router for location management and platform analytics:
 * - Location CRUD operations
 * - Per-platform procedures (Google, Facebook, TripAdvisor, Booking)
 *   - Profile data
 *   - Analytics computation
 *   - Reviews with aggregates
 *   - Enhanced graph data
 * 
 * All analytics are computed on-demand from review data.
 */

import { prisma } from '@wirecrest/db';
import { TRPCError } from '@trpc/server';

import { router, protectedProcedure } from '../trpc';
import {
  createLocationSchema,
  getEnhancedGraphDataSchema,
  getLocationAnalyticsSchema,
  getLocationProfileSchema,
  getLocationReviewsSchema,
  locationIdSchema,
  teamSlugSchema,
  updateLocationSchema,
  updateReviewMetadataSchema,
} from '../schemas/locations.schema';

/**
 * Helper: Verify team membership
 */
async function verifyTeamMembership(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: { teamId, userId },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied. You must be a member of this team.',
    });
  }

  return membership;
}

/**
 * Helper: Verify location ownership
 */
async function verifyLocationOwnership(locationId: string, userId: string) {
  console.log('verifyLocationOwnership', locationId, userId);
  const location = await prisma.businessLocation.findUnique({
    where: { id: locationId },
    include: { team: { include: { members: true } } },
  });

  if (!location) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Location not found',
    });
  }

  const isMember = location.team.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied. You must be a member of this team.',
    });
  }

  return location;
}

// ==========================================
// ANALYTICS CALCULATOR UTILITIES
// ==========================================

/**
 * Rating Distribution Calculator
 * Builds a distribution of ratings from 1-5 stars
 */
interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

function calculateRatingDistribution(ratings: number[]): RatingDistribution {
  const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach((rating) => {
    const rounded = Math.max(1, Math.min(5, Math.round(rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[rounded]++;
  });

  return distribution;
}

/**
 * Average Rating Calculator
 */
function calculateAverageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return sum / ratings.length;
}

/**
 * Sentiment Analysis from Ratings
 * Maps ratings to sentiment categories
 */
interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

function calculateSentimentFromRatings(ratings: number[], scale: 5 | 10 = 5): SentimentDistribution {
  const sentiment: SentimentDistribution = {
    positive: 0,
    neutral: 0,
    negative: 0,
    total: ratings.length,
  };

  ratings.forEach((rating) => {
    if (scale === 5) {
      if (rating >= 4) sentiment.positive++;
      else if (rating === 3) sentiment.neutral++;
      else sentiment.negative++;
    } else {
      // 10-point scale (Booking)
      if (rating >= 7) sentiment.positive++;
      else if (rating >= 5) sentiment.neutral++;
      else sentiment.negative++;
    }
  });

  return sentiment;
}

/**
 * Response Metrics Calculator
 * Analyzes response rates and response times
 */
interface ResponseMetrics {
  totalReviews: number;
  reviewsWithResponse: number;
  responseRate: number; // Percentage
  averageResponseTimeHours: number | null;
}

function calculateResponseMetrics<T extends {
  responseFromOwner?: string | null;
  responseFromOwnerDate?: Date | null;
  publishedAtDate?: Date | null;
}>(reviews: T[]): ResponseMetrics {
  const reviewsWithResponse = reviews.filter((r) => r.responseFromOwner);
  const responseTimes: number[] = [];

  reviewsWithResponse.forEach((review) => {
    if (review.publishedAtDate && review.responseFromOwnerDate) {
      const publishDate = new Date(review.publishedAtDate);
      const responseDate = new Date(review.responseFromOwnerDate);
      const diffMs = responseDate.getTime() - publishDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours >= 0) responseTimes.push(diffHours);
    }
  });

  return {
    totalReviews: reviews.length,
    reviewsWithResponse: reviewsWithResponse.length,
    responseRate: reviews.length > 0 ? (reviewsWithResponse.length / reviews.length) * 100 : 0,
    averageResponseTimeHours:
      responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : null,
  };
}

/**
 * Booking-specific: Convert 1-10 rating to 1-5 scale
 */
function convertBookingRatingTo5Scale(rating: number): number {
  return Math.max(1, Math.min(5, Math.round(rating)));
}

/**
 * Booking-specific: Calculate sub-ratings averages
 */
interface BookingSubRatings {
  cleanliness: number | null;
  comfort: number | null;
  location: number | null;
  facilities: number | null;
  staff: number | null;
  valueForMoney: number | null;
  wifi: number | null;
}

function calculateBookingSubRatings(reviews: any[]): BookingSubRatings {
  const ratings = {
    cleanliness: [] as number[],
    comfort: [] as number[],
    location: [] as number[],
    facilities: [] as number[],
    staff: [] as number[],
    valueForMoney: [] as number[],
    wifi: [] as number[],
  };

  reviews.forEach((review) => {
    if (review.cleanlinessRating) ratings.cleanliness.push(review.cleanlinessRating);
    if (review.comfortRating) ratings.comfort.push(review.comfortRating);
    if (review.locationRating) ratings.location.push(review.locationRating);
    if (review.facilitiesRating) ratings.facilities.push(review.facilitiesRating);
    if (review.staffRating) ratings.staff.push(review.staffRating);
    if (review.valueForMoneyRating) ratings.valueForMoney.push(review.valueForMoneyRating);
    if (review.wifiRating) ratings.wifi.push(review.wifiRating);
  });

  return {
    cleanliness: calculateAverageRating(ratings.cleanliness),
    comfort: calculateAverageRating(ratings.comfort),
    location: calculateAverageRating(ratings.location),
    facilities: calculateAverageRating(ratings.facilities),
    staff: calculateAverageRating(ratings.staff),
    valueForMoney: calculateAverageRating(ratings.valueForMoney),
    wifi: calculateAverageRating(ratings.wifi),
  };
}

/**
 * Booking-specific: Guest type distribution
 */
interface GuestTypeDistribution {
  soloTravelers: number;
  couples: number;
  families: number;
  groups: number;
  businessTravelers: number;
}

function calculateBookingGuestTypes(reviews: any[]): GuestTypeDistribution {
  const distribution: GuestTypeDistribution = {
    soloTravelers: 0,
    couples: 0,
    families: 0,
    groups: 0,
    businessTravelers: 0,
  };

  reviews.forEach((review) => {
    const guestType = review.guestType;
    if (guestType === 'SOLO_TRAVELER') distribution.soloTravelers++;
    else if (guestType === 'COUPLE') distribution.couples++;
    else if (guestType === 'FAMILY_WITH_YOUNG_CHILDREN' || guestType === 'FAMILY_WITH_OLDER_CHILDREN') distribution.families++;
    else if (guestType === 'GROUP_OF_FRIENDS') distribution.groups++;
    else if (guestType === 'BUSINESS_TRAVELER') distribution.businessTravelers++;
  });

  return distribution;
}

/**
 * TripAdvisor-specific: Sub-ratings averages
 */
interface TripAdvisorSubRatings {
  service: number | null;
  food: number | null;
  value: number | null;
  atmosphere: number | null;
  cleanliness: number | null;
  location: number | null;
  rooms: number | null;
  sleepQuality: number | null;
}

function calculateTripAdvisorSubRatings(reviews: any[]): TripAdvisorSubRatings {
  const ratings = {
    service: [] as number[],
    food: [] as number[],
    value: [] as number[],
    atmosphere: [] as number[],
    cleanliness: [] as number[],
    location: [] as number[],
    rooms: [] as number[],
    sleepQuality: [] as number[],
  };

  reviews.forEach((review) => {
    const subRating = review.subRatings;
    if (subRating) {
      if (subRating.service) ratings.service.push(subRating.service);
      if (subRating.food) ratings.food.push(subRating.food);
      if (subRating.value) ratings.value.push(subRating.value);
      if (subRating.atmosphere) ratings.atmosphere.push(subRating.atmosphere);
      if (subRating.cleanliness) ratings.cleanliness.push(subRating.cleanliness);
      if (subRating.location) ratings.location.push(subRating.location);
      if (subRating.rooms) ratings.rooms.push(subRating.rooms);
      if (subRating.sleepQuality) ratings.sleepQuality.push(subRating.sleepQuality);
    }
  });

  return {
    service: calculateAverageRating(ratings.service),
    food: calculateAverageRating(ratings.food),
    value: calculateAverageRating(ratings.value),
    atmosphere: calculateAverageRating(ratings.atmosphere),
    cleanliness: calculateAverageRating(ratings.cleanliness),
    location: calculateAverageRating(ratings.location),
    rooms: calculateAverageRating(ratings.rooms),
    sleepQuality: calculateAverageRating(ratings.sleepQuality),
  };
}

/**
 * TripAdvisor-specific: Trip type distribution
 */
interface TripTypeDistribution {
  family: number;
  couple: number;
  solo: number;
  business: number;
  friends: number;
}

function calculateTripAdvisorTripTypes(reviews: any[]): TripTypeDistribution {
  const distribution: TripTypeDistribution = {
    family: 0,
    couple: 0,
    solo: 0,
    business: 0,
    friends: 0,
  };

  reviews.forEach((review) => {
    const tripType = review.tripType;
    if (tripType === 'FAMILY') distribution.family++;
    else if (tripType === 'COUPLES') distribution.couple++;
    else if (tripType === 'SOLO') distribution.solo++;
    else if (tripType === 'BUSINESS') distribution.business++;
    else if (tripType === 'FRIENDS') distribution.friends++;
  });

  return distribution;
}

/**
 * Facebook-specific: Recommendation metrics
 */
interface FacebookRecommendationMetrics {
  recommendedCount: number;
  notRecommendedCount: number;
  recommendationRate: number;
}

function calculateFacebookRecommendations(reviews: any[]): FacebookRecommendationMetrics {
  const recommended = reviews.filter((r) => r.isRecommended === true).length;
  const notRecommended = reviews.filter((r) => r.isRecommended === false).length;
  const total = recommended + notRecommended;

  return {
    recommendedCount: recommended,
    notRecommendedCount: notRecommended,
    recommendationRate: total > 0 ? (recommended / total) * 100 : 0,
  };
}

/**
 * Facebook-specific: Engagement metrics
 */
interface FacebookEngagementMetrics {
  totalLikes: number;
  totalComments: number;
  totalPhotos: number;
  averageLikesPerReview: number;
  averageCommentsPerReview: number;
  engagementRate: number;
}

function calculateFacebookEngagement(reviews: any[]): FacebookEngagementMetrics {
  let totalLikes = 0;
  let totalComments = 0;
  let totalPhotos = 0;

  reviews.forEach((review) => {
    totalLikes += review.likesCount || 0;
    totalComments += review.commentsCount || 0;
    if (review.photos && review.photos.length > 0) totalPhotos++;
  });

  const totalReviews = reviews.length;
  const totalInteractions = totalLikes + totalComments + totalPhotos;

  return {
    totalLikes,
    totalComments,
    totalPhotos,
    averageLikesPerReview: totalReviews > 0 ? totalLikes / totalReviews : 0,
    averageCommentsPerReview: totalReviews > 0 ? totalComments / totalReviews : 0,
    engagementRate: totalReviews > 0 ? (totalInteractions / totalReviews) * 100 : 0,
  };
}

/**
 * Daily aggregation for enhanced graph data
 */
interface DailyAggregateData {
  date: string;
  count: number;
  averageRating: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
}

function aggregateReviewsByDay(reviews: any[], startDate: Date, endDate: Date): DailyAggregateData[] {
  const dailyMap = new Map<string, any[]>();

  // Initialize all days in range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyMap.set(dateKey, []);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group reviews by day
  reviews.forEach((review) => {
    const date = new Date(review.publishedAtDate || review.publishedDate || review.date);
    const dateKey = date.toISOString().split('T')[0];
    if (dailyMap.has(dateKey)) {
      dailyMap.get(dateKey)!.push(review);
    }
  });

  // Calculate aggregates for each day
  const result: DailyAggregateData[] = [];
  dailyMap.forEach((dayReviews, dateKey) => {
    const ratings = dayReviews.map((r) => r.stars || r.rating);
    const sentiment = calculateSentimentFromRatings(ratings);

    result.push({
      date: dateKey,
      count: dayReviews.length,
      averageRating: calculateAverageRating(ratings),
      positiveCount: sentiment.positive,
      neutralCount: sentiment.neutral,
      negativeCount: sentiment.negative,
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Facebook-specific: Daily aggregation for recommendation-based reviews
 */
interface FacebookDailyAggregateData {
  date: string;
  count: number;
  recommended: number;
  notRecommended: number;
  recommendedCount: number;
  notRecommendedCount: number;
}

function aggregateFacebookReviewsByDay(reviews: any[], startDate: Date, endDate: Date): FacebookDailyAggregateData[] {
  const dailyMap = new Map<string, any[]>();

  // Initialize all days in range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyMap.set(dateKey, []);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group reviews by day
  reviews.forEach((review) => {
    const date = new Date(review.date);
    const dateKey = date.toISOString().split('T')[0];
    if (dailyMap.has(dateKey)) {
      dailyMap.get(dateKey)!.push(review);
    }
  });

  // Calculate aggregates for each day
  const result: FacebookDailyAggregateData[] = [];
  dailyMap.forEach((dayReviews, dateKey) => {
    const recommended = dayReviews.filter((r) => r.isRecommended === true).length;
    const notRecommended = dayReviews.filter((r) => r.isRecommended === false).length;

    result.push({
      date: dateKey,
      count: dayReviews.length,
      recommended,
      notRecommended,
      recommendedCount: recommended,
      notRecommendedCount: notRecommended,
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// ==========================================
// LOCATIONS ROUTER
// ==========================================

export const locationsRouter = router({
  /**
   * Get all locations for a team
   */
  getAll: protectedProcedure
    .input(teamSlugSchema)
    .query(async ({ ctx, input }) => {
      const { teamSlug } = input;

      const team = await prisma.team.findUnique({
        where: { slug: teamSlug },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      await verifyTeamMembership(team.id, ctx.session.user.id);

      const locations = await prisma.businessLocation.findMany({
        where: { teamId: team.id },
        include: {
          googleBusinessProfile: { select: { id: true, displayName: true, rating: true, userRatingCount: true } },
          facebookBusinessProfile: { select: { id: true, title: true, likes: true } },
          tripAdvisorBusinessProfile: { select: { id: true, name: true, rating: true, numberOfReviews: true } },
          bookingBusinessProfile: { select: { id: true, name: true, rating: true, numberOfReviews: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Auto-generate slugs for locations that don't have one
      const locationsWithSlugs = await Promise.all(
        locations.map(async (location) => {
          if (!location.slug) {
            // Generate slug from name
            const autoSlug = location.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');

            // Ensure uniqueness by appending a counter if needed
            let uniqueSlug = autoSlug;
            let counter = 1;
            while (
              await prisma.businessLocation.findFirst({
                where: { teamId: team.id, slug: uniqueSlug },
              })
            ) {
              uniqueSlug = `${autoSlug}-${counter}`;
              counter++;
            }

            // Update the location with the generated slug
            await prisma.businessLocation.update({
              where: { id: location.id },
              data: { slug: uniqueSlug },
            });

            return { ...location, slug: uniqueSlug };
          }
          return location;
        })
      );

      return locationsWithSlugs;
    }),

  /**
   * Get location by ID
   */
  getById: protectedProcedure
    .input(locationIdSchema)
    .query(async ({ ctx, input }) => {
      await verifyLocationOwnership(input.locationId, ctx.session.user.id);

      const fullLocation = await prisma.businessLocation.findUnique({
        where: { id: input.locationId },
        include: {
          team: { select: { id: true, name: true, slug: true } },
          googleBusinessProfile: true,
          facebookBusinessProfile: true,
          tripAdvisorBusinessProfile: true,
          bookingBusinessProfile: true,
        },
      });

      return fullLocation;
    }),

  /**
   * Create a new location
   */
  create: protectedProcedure
    .input(createLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const { teamSlug, slug, name, address, city, country, timezone } = input;

      const team = await prisma.team.findUnique({
        where: { slug: teamSlug },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      await verifyTeamMembership(team.id, ctx.session.user.id);

      const location = await prisma.businessLocation.create({
        data: {
          teamId: team.id,
          slug,
          name,
          address,
          city,
          country,
          timezone,
        },
      });

      return location;
    }),

  /**
   * Update a location
   */
  update: protectedProcedure
    .input(updateLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const { locationId, ...updateData } = input;

      await verifyLocationOwnership(locationId, ctx.session.user.id);

      const location = await prisma.businessLocation.update({
        where: { id: locationId },
        data: updateData,
      });

      return location;
    }),

  /**
   * Delete a location
   */
  delete: protectedProcedure
    .input(locationIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyLocationOwnership(input.locationId, ctx.session.user.id);

      await prisma.businessLocation.delete({
        where: { id: input.locationId },
      });

      return { success: true };
    }),

  // ==========================================
  // GOOGLE PLATFORM PROCEDURES
  // ==========================================

  google: router({
    /**
     * Get Google Business Profile for location
     */
    getProfile: protectedProcedure
      .input(getLocationProfileSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.googleBusinessProfile.findUnique({
          where: { locationId: input.locationId },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Google Business Profile not found for this location',
          });
        }

        return {
          id: profile.id,
          displayName: profile.displayName,
          formattedAddress: profile.formattedAddress,
          websiteUri: profile.websiteUri,
          businessStatus: profile.businessStatus,
          rating: profile.rating,
          userRatingCount: profile.userRatingCount,
          placeId: profile.placeId,
        };
      }),

    /**
     * Get Google Analytics for date range
     */
    getAnalytics: protectedProcedure
      .input(getLocationAnalyticsSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.googleBusinessProfile.findUnique({
          where: { locationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Google Business Profile not found',
          });
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        const reviews = await prisma.googleReview.findMany({
          where: {
            businessProfileId: profile.id,
            publishedAtDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            reviewMetadata: true,
          },
        });

        const ratings = reviews.map((r) => r.stars);
        const ratingDistribution = calculateRatingDistribution(ratings);
        const avgRating = calculateAverageRating(ratings);
        const sentiment = calculateSentimentFromRatings(ratings);
        const responseMetrics = calculateResponseMetrics(reviews);

        return {
          reviewCount: reviews.length,
          averageRating: avgRating,
          ratingDistribution,
          sentiment,
          responseRate: responseMetrics.responseRate,
          averageResponseTimeHours: responseMetrics.averageResponseTimeHours,
        };
      }),

    /**
     * Get Google Reviews with computed stats
     */
    getReviews: protectedProcedure
      .input(getLocationReviewsSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.googleBusinessProfile.findUnique({
          where: { locationId: input.locationId },
          select: { id: true },
        });

        // Return empty data if profile not found (platform not set up)
        if (!profile) {
          return {
            reviews: [],
            pagination: {
              page: input.pagination?.page || 1,
              limit: input.pagination?.limit || 10,
              totalCount: 0,
              totalPages: 0,
            },
            aggregates: {
              ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              sentiment: { positive: 0, negative: 0, neutral: 0 },
            },
            allTimeStats: {
              totalReviews: 0,
              averageRating: 0,
              unread: 0,
              withResponse: 0,
            },
          };
        }

        const { filters = {}, pagination } = input;
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 10;
        const skip = (page - 1) * limit;

        const whereClause: any = {
          businessProfileId: profile.id,
        };

        // Handle rating/ratings filter (support both singular and plural)
        if (filters.rating) {
          if (Array.isArray(filters.rating)) {
            whereClause.stars = { in: filters.rating };
          } else {
            whereClause.stars = filters.rating;
          }
        }

        // Handle hasResponse filter
        if (filters.hasResponse !== undefined) {
          if (filters.hasResponse) {
            whereClause.responseFromOwnerText = { not: null };
          } else {
            whereClause.responseFromOwnerText = null;
          }
        }

        // Handle search filter
        if (filters.search) {
          whereClause.OR = [
            { text: { contains: filters.search, mode: 'insensitive' } },
            { name: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        // Handle sentiment filter
        if (filters.sentiment) {
          if (filters.sentiment === 'positive') {
            whereClause.stars = { gte: 4 };
          } else if (filters.sentiment === 'neutral') {
            whereClause.stars = 3;
          } else if (filters.sentiment === 'negative') {
            whereClause.stars = { lte: 2 };
          }
        }

        // Handle date range filters
        if (filters.startDate) {
          whereClause.publishedAtDate = { ...whereClause.publishedAtDate, gte: new Date(filters.startDate) };
        }

        if (filters.endDate) {
          whereClause.publishedAtDate = { ...whereClause.publishedAtDate, lte: new Date(filters.endDate) };
        }

        console.log('filters', filters);
        // Handle read status and importance filters
        if (filters.isRead !== undefined || filters.isImportant !== undefined) {
          whereClause.reviewMetadata = {
            is: {
              ...(filters.isRead !== undefined && { isRead: filters.isRead }),
              ...(filters.isImportant !== undefined && { isImportant: filters.isImportant }),
            },
          };
        }

        // Build orderBy based on sortBy and sortOrder
        let orderBy: any = { publishedAtDate: filters.sortOrder || 'desc' };
        if (filters.sortBy) {
          if (filters.sortBy === 'stars' || filters.sortBy === 'rating') {
            orderBy = { stars: filters.sortOrder || 'desc' };
          } else if (filters.sortBy === 'publishedAtDate') {
            orderBy = { publishedAtDate: filters.sortOrder || 'desc' };
          }
        }

        // Base where clause for all-time stats (no filters, just business profile)
        const allTimeWhereClause = {
          businessProfileId: profile.id,
        };

        // Fetch filtered reviews, total count, and all-time reviews for stats
        const [reviews, totalCount, allTimeReviews] = await Promise.all([
          prisma.googleReview.findMany({
            where: whereClause,
            include: { reviewMetadata: true },
            skip,
            take: limit,
            orderBy,
          }),
          prisma.googleReview.count({ where: whereClause }),
          // Fetch all reviews for all-time stats calculation
          prisma.googleReview.findMany({
            where: allTimeWhereClause,
            select: {
              stars: true,
              responseFromOwnerText: true,
              reviewMetadata: {
                select: {
                  isRead: true,
                },
              },
            },
          }),
        ]);

        // Calculate aggregates for filtered reviews (current view)
        const ratings = reviews.map((r) => r.stars);
        const sentimentAnalysis = calculateSentimentFromRatings(ratings);
        const ratingDistribution = calculateRatingDistribution(ratings);
        const responseMetrics = calculateResponseMetrics(reviews);

        // Calculate all-time stats for metric cards
        const allTimeRatings = allTimeReviews.map((r) => r.stars);
        const allTimeWithResponseCount = allTimeReviews.filter(
          (r) => r.responseFromOwnerText !== null && r.responseFromOwnerText !== undefined
        ).length;
        const allTimeUnreadCount = allTimeReviews.filter(
          (r) => r.reviewMetadata?.isRead === false || r.reviewMetadata === null
        ).length;

        return {
          reviews,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
          aggregates: {
            totalReviews: reviews.length,
            averageRating: calculateAverageRating(ratings),
            ratingDistribution,
            sentiment: sentimentAnalysis,
            sentimentBreakdown: {
              positive: sentimentAnalysis.positive,
              neutral: sentimentAnalysis.neutral,
              negative: sentimentAnalysis.negative,
            },
            respondedCount: responseMetrics.reviewsWithResponse,
            responseRate: responseMetrics.responseRate,
          },
          // All-time stats for metric cards
          allTimeStats: {
            totalReviews: allTimeReviews.length,
            averageRating: calculateAverageRating(allTimeRatings),
            withResponse: allTimeWithResponseCount,
            unread: allTimeUnreadCount,
          },
        };
      }),

    /**
     * Get Google Enhanced Graph Data
     */
    getEnhancedGraph: protectedProcedure
      .input(getEnhancedGraphDataSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.googleBusinessProfile.findUnique({
          where: { locationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Google Business Profile not found',
          });
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        const reviews = await prisma.googleReview.findMany({
          where: {
            businessProfileId: profile.id,
            publishedAtDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const daily = aggregateReviewsByDay(reviews, startDate, endDate);
        const ratings = reviews.map((r) => r.stars);

        return {
          daily,
          overview: {
            totalReviews: reviews.length,
            averageRating: calculateAverageRating(ratings),
          },
          trends: {
            ratingDistribution: calculateRatingDistribution(ratings),
            sentiment: calculateSentimentFromRatings(ratings),
          },
        };
      }),

    /**
     * Update Google Review Metadata
     */
    updateReviewMetadata: protectedProcedure
      .input(updateReviewMetadataSchema)
      .mutation(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.googleBusinessProfile.findUnique({
          where: { locationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Google Business Profile not found',
          });
        }

        // Check if review exists and belongs to this profile
        const review = await prisma.googleReview.findFirst({
          where: {
            id: input.reviewId,
            businessProfileId: profile.id,
          },
          select: {
            id: true,
            reviewMetadataId: true,
          },
        });

        if (!review) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Review not found',
          });
        }

        // Update metadata (should always exist since reviewMetadataId is required)
        const updatedMetadata = await prisma.reviewMetadata.update({
          where: { id: review.reviewMetadataId },
          data: {
            ...input.metadata,
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          metadata: updatedMetadata,
        };
      }),
  }),

  // ==========================================
  // FACEBOOK PLATFORM PROCEDURES
  // ==========================================

  facebook: router({
    /**
     * Get Facebook Business Profile for location
     */
    getProfile: protectedProcedure
      .input(getLocationProfileSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.facebookBusinessProfile.findUnique({
          where: { locationId: input.locationId },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facebook Business Profile not found for this location',
          });
        }

        return {
          id: profile.id,
          title: profile.title,
          pageName: profile.pageName,
          pageUrl: profile.pageUrl,
          likes: profile.likes,
          followers: profile.followers,
          categories: profile.categories,
        };
      }),

    /**
     * Get Facebook Analytics for date range
     */
    getAnalytics: protectedProcedure
      .input(getLocationAnalyticsSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.facebookBusinessProfile.findUnique({
          where: { locationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facebook Business Profile not found',
          });
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        const reviews = await prisma.facebookReview.findMany({
          where: {
            businessProfileId: profile.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const recommendations = calculateFacebookRecommendations(reviews);
        const engagement = calculateFacebookEngagement(reviews);

        // Calculate sentiment from recommendations (recommended = positive, not recommended = negative)
        const sentiment = {
          positive: recommendations.recommendedCount,
          neutral: 0, // Facebook doesn't have neutral recommendations
          negative: recommendations.notRecommendedCount,
          total: reviews.length,
        };

        // Calculate response metrics
        const reviewsWithResponse = reviews.filter((r) => r.responseFromOwner).length;
        const responseRate = reviews.length > 0 ? (reviewsWithResponse / reviews.length) * 100 : 0;

        // Calculate average response time in hours (if response data exists)
        let totalResponseTime = 0;
        let responsesWithTime = 0;
        reviews.forEach((review) => {
          if (review.responseFromOwner && review.responseDate && review.date) {
            const responseTime = new Date(review.responseDate).getTime() - new Date(review.date).getTime();
            totalResponseTime += responseTime;
            responsesWithTime++;
          }
        });
        const averageResponseTime = responsesWithTime > 0 ? totalResponseTime / responsesWithTime / (1000 * 60 * 60) : null;

        // Extract keywords from review texts (simple implementation)
        const keywords: Array<{ word: string; count: number }> = [];
        if (reviews.length > 0) {
          const wordCount = new Map<string, number>();
          const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);

          reviews.forEach((review) => {
            if (review.text) {
              const words = review.text.toLowerCase().match(/\b[a-z]+\b/g) || [];
              words.forEach((word) => {
                if (word.length > 3 && !stopWords.has(word)) {
                  wordCount.set(word, (wordCount.get(word) || 0) + 1);
                }
              });
            }
          });

          // Get top 10 keywords
          const sortedKeywords = Array.from(wordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

          keywords.push(...sortedKeywords);
        }

        // Calculate review quality metrics (length-based)
        const reviewLengths = reviews.map((r) => r.text?.length || 0);
        const totalLength = reviewLengths.reduce((sum, len) => sum + len, 0);
        const averageLength = reviews.length > 0 ? totalLength / reviews.length : 0;
        const shortReviews = reviewLengths.filter((len) => len < 100).length;
        const mediumReviews = reviewLengths.filter((len) => len >= 100 && len < 300).length;
        const longReviews = reviewLengths.filter((len) => len >= 300).length;

        const reviewQuality = {
          averageLength,
          shortReviews,
          mediumReviews,
          longReviews,
        };

        const contentLength = {
          short: shortReviews,
          medium: mediumReviews,
          long: longReviews,
          average: averageLength,
        };

        // Emotional analysis (basic sentiment mapping)
        const emotions = {
          happy: recommendations.recommendedCount,
          satisfied: 0,
          neutral: 0,
          frustrated: Math.floor(recommendations.notRecommendedCount / 2),
          angry: Math.ceil(recommendations.notRecommendedCount / 2),
        };

        return {
          reviewCount: reviews.length,
          recommendations,
          engagement,
          responseRate,
          averageResponseTime,
          sentiment,
          emotions,
          keywords,
          reviewQuality,
          contentLength,
        };
      }),

    /**
     * Get Facebook Reviews with computed stats
     */
    getReviews: protectedProcedure
      .input(getLocationReviewsSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.facebookBusinessProfile.findUnique({
          where: { locationId: input.locationId },
          select: { id: true },
        });

        // Return empty data if profile not found (platform not set up)
        if (!profile) {
          return {
            reviews: [],
            pagination: {
              page: input.pagination?.page || 1,
              limit: input.pagination?.limit || 10,
              totalCount: 0,
              totalPages: 0,
            },
            aggregates: {
              recommendations: { recommendedCount: 0, notRecommendedCount: 0, recommendationRate: 0 },
              engagement: { totalLikes: 0, totalComments: 0, totalPhotos: 0, averageEngagement: 0 },
            },
            allTimeStats: {
              totalReviews: 0,
              recommendationRate: 0,
              unread: 0,
              withResponse: 0,
            },
          };
        }

        const { filters = {}, pagination = { page: 1, limit: 10 } } = input;
        const skip = (pagination.page - 1) * pagination.limit;

        const whereClause: any = {
          businessProfileId: profile.id,
        };

        if (filters.hasResponse !== undefined) {
          if (filters.hasResponse) {
            whereClause.responseFromOwner = { not: null };
          } else {
            whereClause.responseFromOwner = null;
          }
        }

        if (filters.search) {
          whereClause.OR = [
            { text: { contains: filters.search, mode: 'insensitive' } },
            { reviewerName: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        if (filters.startDate) {
          whereClause.date = { ...whereClause.date, gte: new Date(filters.startDate) };
        }

        if (filters.endDate) {
          whereClause.date = { ...whereClause.date, lte: new Date(filters.endDate) };
        }

        const [reviews, totalCount, allReviews] = await Promise.all([
          prisma.facebookReview.findMany({
            where: whereClause,
            include: { reviewMetadata: true },
            skip,
            take: pagination.limit,
            orderBy: { date: filters.sortOrder || 'desc' },
          }),
          prisma.facebookReview.count({ where: whereClause }),
          // Get all reviews for allTimeStats (without pagination)
          prisma.facebookReview.findMany({
            where: { businessProfileId: profile.id },
            include: { reviewMetadata: true },
          }),
        ]);

        const recommendations = calculateFacebookRecommendations(reviews);
        const engagement = calculateFacebookEngagement(reviews);

        // Calculate allTimeStats from all reviews
        const allTimeRecommendations = calculateFacebookRecommendations(allReviews);
        const unreadCount = allReviews.filter((r) => !r.reviewMetadata?.isRead).length;
        const withResponseCount = allReviews.filter((r) => r.responseFromOwner).length;

        const allTimeStats = {
          totalReviews: allReviews.length,
          recommendationRate: allTimeRecommendations.recommendationRate,
          unread: unreadCount,
          withResponse: withResponseCount,
        };

        return {
          reviews,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            totalCount,
            totalPages: Math.ceil(totalCount / pagination.limit),
          },
          aggregates: {
            recommendations,
            engagement,
          },
          allTimeStats,
        };
      }),

    /**
     * Get Facebook Enhanced Graph Data
     */
    getEnhancedGraph: protectedProcedure
      .input(getEnhancedGraphDataSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.facebookBusinessProfile.findUnique({
          where: { locationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facebook Business Profile not found',
          });
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        const reviews = await prisma.facebookReview.findMany({
          where: {
            businessProfileId: profile.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            photos: true,
          },
        });

        console.log(`Facebook Enhanced Graph - Found ${reviews.length} reviews from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // Use Facebook-specific aggregation function
        const daily = aggregateFacebookReviewsByDay(reviews, startDate, endDate);
        const recommendations = calculateFacebookRecommendations(reviews);
        const engagement = calculateFacebookEngagement(reviews);

        console.log('Facebook Enhanced Graph - Daily data:', daily.length, 'days');
        console.log('Facebook Enhanced Graph - Sample daily data:', daily.slice(0, 3));

        return {
          daily,
          overview: {
            totalReviews: reviews.length,
            recommendations,
          },
          trends: {
            engagement,
          },
        };
      }),

    /**
     * Update Facebook Review Metadata
     */
    updateReviewMetadata: protectedProcedure
      .input(updateReviewMetadataSchema)
      .mutation(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.facebookBusinessProfile.findUnique({
          where: { locationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facebook Business Profile not found',
          });
        }

        // Verify the review belongs to this profile
        const review = await prisma.facebookReview.findUnique({
          where: { id: input.reviewId },
        });

        if (!review || review.businessProfileId !== profile.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Review not found or does not belong to this profile',
          });
        }

        // Get the existing review metadata
        const existingMetadata = await prisma.reviewMetadata.findUnique({
          where: { id: review.reviewMetadataId },
        });

        if (!existingMetadata) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Review metadata not found',
          });
        }

        // Update the review metadata
        const reviewMetadata = await prisma.reviewMetadata.update({
          where: { id: review.reviewMetadataId },
          data: input.metadata,
        });

        return reviewMetadata;
      }),
  }),

  // ==========================================
  // TRIPADVISOR PLATFORM PROCEDURES
  // ==========================================

  tripadvisor: router({
    /**
     * Get TripAdvisor Business Profile for location
     */
    getProfile: protectedProcedure
      .input(getLocationProfileSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.tripAdvisorBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'TripAdvisor Business Profile not found for this location',
          });
        }

        return {
          id: profile.id,
          name: profile.name,
          tripAdvisorUrl: profile.tripAdvisorUrl,
          rating: profile.rating,
          numberOfReviews: profile.numberOfReviews,
          type: profile.type,
          category: profile.category,
          rankingPosition: profile.rankingPosition,
        };
      }),

    /**
     * Get TripAdvisor Analytics for date range
     */
    getAnalytics: protectedProcedure
      .input(getLocationAnalyticsSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.tripAdvisorBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'TripAdvisor Business Profile not found',
          });
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        const reviews = await prisma.tripAdvisorReview.findMany({
          where: {
            businessProfileId: profile.id,
            publishedDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            reviewMetadata: true,
            subRatings: true,
          },
        });

        const ratings = reviews.map((r) => r.rating);
        const ratingDistribution = calculateRatingDistribution(ratings);
        const avgRating = calculateAverageRating(ratings);
        const sentiment = calculateSentimentFromRatings(ratings);
        const responseMetrics = calculateResponseMetrics(reviews.map((r) => ({
          ...r,
          publishedAtDate: r.publishedDate,
        })));
        const subRatings = calculateTripAdvisorSubRatings(reviews);
        const tripTypes = calculateTripAdvisorTripTypes(reviews);

        return {
          reviewCount: reviews.length,
          averageRating: avgRating,
          ratingDistribution,
          sentiment,
          responseRate: responseMetrics.responseRate,
          averageResponseTimeHours: responseMetrics.averageResponseTimeHours,
          subRatings,
          tripTypes,
        };
      }),

    /**
     * Get TripAdvisor Reviews with computed stats
     */
    getReviews: protectedProcedure
      .input(getLocationReviewsSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.tripAdvisorBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
          select: { id: true },
        });

        // Return empty data if profile not found (platform not set up)
        if (!profile) {
          return {
            reviews: [],
            pagination: {
              page: input.pagination?.page || 1,
              limit: input.pagination?.limit || 10,
              totalCount: 0,
              totalPages: 0,
            },
            aggregates: {
              ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              sentiment: { positive: 0, negative: 0, neutral: 0 },
            },
            allTimeStats: {
              totalReviews: 0,
              averageRating: 0,
              unread: 0,
              withResponse: 0,
            },
          };
        }

        const { filters = {}, pagination = { page: 1, limit: 10 } } = input;
        const skip = (pagination.page - 1) * pagination.limit;

        const whereClause: any = {
          businessProfileId: profile.id,
        };

        if (filters.rating) {
          if (Array.isArray(filters.rating)) {
            whereClause.rating = { in: filters.rating };
          } else {
            whereClause.rating = filters.rating;
          }
        }

        if (filters.hasResponse !== undefined) {
          if (filters.hasResponse) {
            whereClause.responseFromOwner = { not: null };
          } else {
            whereClause.responseFromOwner = null;
          }
        }

        if (filters.search) {
          whereClause.OR = [
            { text: { contains: filters.search, mode: 'insensitive' } },
            { title: { contains: filters.search, mode: 'insensitive' } },
            { reviewerUsername: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        if (filters.startDate) {
          whereClause.publishedDate = { ...whereClause.publishedDate, gte: new Date(filters.startDate) };
        }

        if (filters.endDate) {
          whereClause.publishedDate = { ...whereClause.publishedDate, lte: new Date(filters.endDate) };
        }

        const [reviews, totalCount, allReviews] = await Promise.all([
          prisma.tripAdvisorReview.findMany({
            where: whereClause,
            include: { reviewMetadata: true, subRatings: true },
            skip,
            take: pagination.limit,
            orderBy: { publishedDate: filters.sortOrder || 'desc' },
          }),
          prisma.tripAdvisorReview.count({ where: whereClause }),
          // Get all reviews for allTimeStats (without pagination)
          prisma.tripAdvisorReview.findMany({
            where: { businessProfileId: profile.id },
            include: { reviewMetadata: true },
          }),
        ]);

        const ratings = reviews.map((r) => r.rating);
        const sentiment = calculateSentimentFromRatings(ratings);
        const ratingDistribution = calculateRatingDistribution(ratings);
        const tripTypes = calculateTripAdvisorTripTypes(reviews);

        // Calculate allTimeStats from all reviews
        const allRatings = allReviews.map((r) => r.rating);
        const allTimeAverageRating = calculateAverageRating(allRatings);
        const unreadCount = allReviews.filter((r) => !r.reviewMetadata?.isRead).length;
        const withResponseCount = allReviews.filter((r) => r.responseFromOwner).length;
        const totalHelpfulVotes = allReviews.reduce((sum, r) => sum + (r.helpfulVotes || 0), 0);

        const allTimeStats = {
          totalReviews: allReviews.length,
          averageRating: allTimeAverageRating,
          totalHelpfulVotes,
          unread: unreadCount,
          withResponse: withResponseCount,
        };

        return {
          reviews,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            totalCount,
            totalPages: Math.ceil(totalCount / pagination.limit),
          },
          aggregates: {
            averageRating: calculateAverageRating(ratings),
            ratingDistribution,
            sentiment,
            tripTypes,
          },
          allTimeStats,
        };
      }),

    /**
     * Get TripAdvisor Enhanced Graph Data
     */
    getEnhancedGraph: protectedProcedure
      .input(getEnhancedGraphDataSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.tripAdvisorBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'TripAdvisor Business Profile not found',
          });
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        const reviews = await prisma.tripAdvisorReview.findMany({
          where: {
            businessProfileId: profile.id,
            publishedDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Map TripAdvisor reviews for daily aggregation
        const mappedReviews = reviews.map((r) => ({
          ...r,
          stars: r.rating,
          publishedAtDate: r.publishedDate,
        }));

        const daily = aggregateReviewsByDay(mappedReviews, startDate, endDate);
        const ratings = reviews.map((r) => r.rating);

        return {
          daily,
          overview: {
            totalReviews: reviews.length,
            averageRating: calculateAverageRating(ratings),
          },
          trends: {
            ratingDistribution: calculateRatingDistribution(ratings),
            sentiment: calculateSentimentFromRatings(ratings),
          },
        };
      }),

    /**
     * Update TripAdvisor Review Metadata
     */
    updateReviewMetadata: protectedProcedure
      .input(updateReviewMetadataSchema)
      .mutation(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.tripAdvisorBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'TripAdvisor Business Profile not found',
          });
        }

        // Verify the review belongs to this profile
        const review = await prisma.tripAdvisorReview.findUnique({
          where: { id: input.reviewId },
        });

        if (!review || review.businessProfileId !== profile.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Review not found or does not belong to this profile',
          });
        }

        // Get the existing review metadata
        const existingMetadata = await prisma.reviewMetadata.findUnique({
          where: { id: review.reviewMetadataId },
        });

        if (!existingMetadata) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Review metadata not found',
          });
        }

        // Update the review metadata
        const reviewMetadata = await prisma.reviewMetadata.update({
          where: { id: review.reviewMetadataId },
          data: input.metadata,
        });

        return reviewMetadata;
      }),
  }),

  // ==========================================
  // BOOKING PLATFORM PROCEDURES
  // ==========================================

  booking: router({
    /**
     * Get Booking Business Profile for location
     */
    getProfile: protectedProcedure
      .input(getLocationProfileSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.bookingBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Booking Business Profile not found for this location',
          });
        }

        return {
          id: profile.id,
          name: profile.name,
          bookingUrl: profile.bookingUrl,
          rating: profile.rating,
          numberOfReviews: profile.numberOfReviews,
          propertyType: profile.propertyType,
          stars: profile.stars,
        };
      }),

    /**
     * Get Booking Analytics for date range
     */
    getAnalytics: protectedProcedure
      .input(getLocationAnalyticsSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.bookingBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Booking Business Profile not found',
          });
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        const reviews = await prisma.bookingReview.findMany({
          where: {
            businessProfileId: profile.id,
            publishedDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            reviewMetadata: true,
          },
        });

        // Booking uses 1-10 scale
        const ratingsOn10Scale = reviews.map((r) => r.rating);
        const ratingsOn5Scale = ratingsOn10Scale.map(convertBookingRatingTo5Scale);

        const ratingDistribution = calculateRatingDistribution(ratingsOn5Scale);
        const avgRating = calculateAverageRating(ratingsOn10Scale); // Keep 1-10 for average
        const sentiment = calculateSentimentFromRatings(ratingsOn10Scale, 10);
        const responseMetrics = calculateResponseMetrics(reviews.map((r) => ({
          ...r,
          publishedAtDate: r.publishedDate,
        })));
        const subRatings = calculateBookingSubRatings(reviews);
        const guestTypes = calculateBookingGuestTypes(reviews);

        return {
          reviewCount: reviews.length,
          averageRating: avgRating, // 1-10 scale
          ratingDistribution, // Converted to 1-5 for compatibility
          sentiment,
          responseRate: responseMetrics.responseRate,
          averageResponseTimeHours: responseMetrics.averageResponseTimeHours,
          subRatings,
          guestTypes,
        };
      }),

    /**
     * Get Booking Reviews with computed stats
     */
    getReviews: protectedProcedure
      .input(getLocationReviewsSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.bookingBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
          select: { id: true },
        });

        // Return empty data if profile not found (platform not set up)
        if (!profile) {
          return {
            reviews: [],
            pagination: {
              page: input.pagination?.page || 1,
              limit: input.pagination?.limit || 10,
              totalCount: 0,
              totalPages: 0,
            },
            aggregates: {
              ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              sentiment: { positive: 0, negative: 0, neutral: 0 },
            },
            allTimeStats: {
              totalReviews: 0,
              averageRating: 0,
              unread: 0,
              withResponse: 0,
            },
          };
        }

        const { filters = {}, pagination = { page: 1, limit: 10 } } = input;
        const skip = (pagination.page - 1) * pagination.limit;

        const whereClause: any = {
          businessProfileId: profile.id,
        };

        if (filters.rating) {
          // Convert 1-5 filter to 1-10 range
          if (Array.isArray(filters.rating)) {
            const ranges = filters.rating.map((r) => {
              if (r === 5) return { gte: 9 };
              if (r === 4) return { gte: 7, lt: 9 };
              if (r === 3) return { gte: 5, lt: 7 };
              if (r === 2) return { gte: 3, lt: 5 };
              return { lt: 3 };
            });
            whereClause.OR = ranges.map((range) => ({ rating: range }));
          } else {
            const r = filters.rating;
            if (r === 5) whereClause.rating = { gte: 9 };
            else if (r === 4) whereClause.rating = { gte: 7, lt: 9 };
            else if (r === 3) whereClause.rating = { gte: 5, lt: 7 };
            else if (r === 2) whereClause.rating = { gte: 3, lt: 5 };
            else whereClause.rating = { lt: 3 };
          }
        }

        if (filters.hasResponse !== undefined) {
          if (filters.hasResponse) {
            whereClause.responseFromOwner = { not: null };
          } else {
            whereClause.responseFromOwner = null;
          }
        }

        if (filters.search) {
          whereClause.OR = [
            { positiveText: { contains: filters.search, mode: 'insensitive' } },
            { negativeText: { contains: filters.search, mode: 'insensitive' } },
            { reviewerName: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        if (filters.startDate) {
          whereClause.publishedDate = { ...whereClause.publishedDate, gte: new Date(filters.startDate) };
        }

        if (filters.endDate) {
          whereClause.publishedDate = { ...whereClause.publishedDate, lte: new Date(filters.endDate) };
        }

        const [reviews, totalCount, allReviews] = await Promise.all([
          prisma.bookingReview.findMany({
            where: whereClause,
            include: { reviewMetadata: true },
            skip,
            take: pagination.limit,
            orderBy: { publishedDate: filters.sortOrder || 'desc' },
          }),
          prisma.bookingReview.count({ where: whereClause }),
          // Get all reviews for allTimeStats (without pagination)
          prisma.bookingReview.findMany({
            where: { businessProfileId: profile.id },
            include: { reviewMetadata: true },
          }),
        ]);

        const ratingsOn10Scale = reviews.map((r) => r.rating);
        const ratingsOn5Scale = ratingsOn10Scale.map(convertBookingRatingTo5Scale);
        const sentiment = calculateSentimentFromRatings(ratingsOn10Scale, 10);
        const ratingDistribution = calculateRatingDistribution(ratingsOn5Scale);
        const guestTypes = calculateBookingGuestTypes(reviews);

        // Calculate allTimeStats from all reviews
        const allRatingsOn10Scale = allReviews.map((r) => r.rating);
        const allTimeAverageRating = calculateAverageRating(allRatingsOn10Scale);
        const unreadCount = allReviews.filter((r) => !r.reviewMetadata?.isRead).length;
        const withResponseCount = allReviews.filter((r) => r.responseFromOwner).length;
        const verifiedStaysCount = allReviews.filter((r) => r.isVerifiedStay).length;

        const allTimeStats = {
          totalReviews: allReviews.length,
          averageRating: allTimeAverageRating,
          verifiedStays: verifiedStaysCount,
          unread: unreadCount,
          withResponse: withResponseCount,
        };

        return {
          reviews,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            totalCount,
            totalPages: Math.ceil(totalCount / pagination.limit),
          },
          aggregates: {
            averageRating: calculateAverageRating(ratingsOn10Scale),
            ratingDistribution,
            sentiment,
            guestTypes,
            verifiedStays: reviews.filter((r) => r.isVerifiedStay).length,
          },
          allTimeStats,
        };
      }),

    /**
     * Get Booking Enhanced Graph Data
     */
    getEnhancedGraph: protectedProcedure
      .input(getEnhancedGraphDataSchema)
      .query(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.bookingBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Booking Business Profile not found',
          });
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        const reviews = await prisma.bookingReview.findMany({
          where: {
            businessProfileId: profile.id,
            publishedDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Map Booking reviews for daily aggregation (convert 1-10 to 1-5 for consistency)
        const mappedReviews = reviews.map((r) => ({
          ...r,
          stars: convertBookingRatingTo5Scale(r.rating),
          publishedAtDate: r.publishedDate,
        }));

        const daily = aggregateReviewsByDay(mappedReviews, startDate, endDate);
        const ratingsOn10Scale = reviews.map((r) => r.rating);

        return {
          daily,
          overview: {
            totalReviews: reviews.length,
            averageRating: calculateAverageRating(ratingsOn10Scale),
          },
          trends: {
            ratingDistribution: calculateRatingDistribution(ratingsOn10Scale.map(convertBookingRatingTo5Scale)),
            sentiment: calculateSentimentFromRatings(ratingsOn10Scale, 10),
          },
        };
      }),

    /**
     * Update Booking Review Metadata
     */
    updateReviewMetadata: protectedProcedure
      .input(updateReviewMetadataSchema)
      .mutation(async ({ ctx, input }) => {
        await verifyLocationOwnership(input.locationId, ctx.session.user.id);

        const profile = await prisma.bookingBusinessProfile.findUnique({
          where: { businessLocationId: input.locationId },
          select: { id: true },
        });

        if (!profile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Booking Business Profile not found',
          });
        }

        // Verify the review belongs to this profile
        const review = await prisma.bookingReview.findUnique({
          where: { id: input.reviewId },
        });

        if (!review || review.businessProfileId !== profile.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Review not found or does not belong to this profile',
          });
        }

        // Get the existing review metadata
        const existingMetadata = await prisma.reviewMetadata.findUnique({
          where: { id: review.reviewMetadataId },
        });

        if (!existingMetadata) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Review metadata not found',
          });
        }

        // Update the review metadata
        const reviewMetadata = await prisma.reviewMetadata.update({
          where: { id: review.reviewMetadataId },
          data: input.metadata,
        });

        return reviewMetadata;
      }),
  }),
});

