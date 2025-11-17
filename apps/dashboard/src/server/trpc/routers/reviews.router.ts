/**
 * Reviews Router
 * 
 * tRPC router for review management operations across different platforms:
 * - Google Reviews
 * - Facebook Reviews
 * - TripAdvisor Reviews
 */

import { prisma } from '@wirecrest/db';
import { TRPCError } from '@trpc/server';

import { router, protectedProcedure } from '../trpc';
import {
  inboxFiltersSchema,
  reviewFiltersSchema,
  reviewTeamSlugSchema,
  updateReviewStatusSchema,
  googleEnhancedAnalyticsSchema,
  updateGoogleReviewMetadataSchema,
} from '../schemas/reviews.schema';

/**
 * Helper function to verify team membership
 */
async function verifyTeamMembership(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
    },
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
 * Helper function to safely convert values to boolean
 */
function safeBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value === 'true';
  }
  return Boolean(value);
}

/**
 * Reviews Router
 */
export const reviewsRouter = router({
  /**
   * Get all reviews for a team across platforms
   */
  all: protectedProcedure
    .input(reviewTeamSlugSchema)
    .query(async ({ ctx, input }) => {
      const team = await prisma.team.findUnique({
        where: { slug: input.teamSlug },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      // Get business profile
      const businessProfile = await prisma.googleBusinessProfile.findFirst({
        where: { teamId: team.id },
      });

      // Get reviews from different platforms
      const googleReviews = await prisma.googleReview.findMany({
        where: {
          businessProfile: {
            teamId: team.id,
          },
        },
        orderBy: { publishedAtDate: 'desc' },
      });

      const facebookReviews = await prisma.facebookReview.findMany({
        where: {
          businessProfile: {
            teamId: team.id,
          },
        },
        orderBy: { date: 'desc' },
      });

      return {
        businessProfile,
        reviews: {
          google: googleReviews,
          facebook: facebookReviews,
        },
      };
    }),

  /**
   * Get unified team reviews for inbox with filters and statistics
   */
  getTeamReviews: protectedProcedure
    .input(inboxFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { slug, filters = {} } = input;

      // 1. Verify team and membership
      const team = await prisma.team.findUnique({
        where: { slug },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      await verifyTeamMembership(team.id, ctx.session.user.id);

      console.log('🔍 [getTeamReviews] Team ID:', team.id);
      console.log('🔍 [getTeamReviews] Input filters:', JSON.stringify(filters, null, 2));

      // Quick test: Count total Google reviews for this team (no filters)
      const totalGoogleCount = await prisma.googleReview.count({
        where: {
          businessProfile: {
            teamId: team.id,
          },
        },
      });
      console.log('🔢 [getTeamReviews] Total Google reviews in DB for this team:', totalGoogleCount);

      // 2. Parse filters and calculate date ranges
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      const platforms = filters.platforms && filters.platforms.length > 0
        ? filters.platforms
        : ['google', 'facebook', 'tripadvisor', 'booking'];
      const status = filters.status || 'all';
      const sortBy = filters.sortBy || 'date';
      const sortOrder = filters.sortOrder || 'desc';

      console.log('🔍 [getTeamReviews] Querying platforms:', platforms);
      console.log('🔍 [getTeamReviews] Status filter:', status);

      // Calculate date range
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (filters.dateRange && filters.dateRange !== 'all') {
        endDate = new Date();
        startDate = new Date();

        switch (filters.dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          default:
            break;
        }
      } else if (filters.startDate && filters.endDate) {
        startDate = new Date(filters.startDate);
        endDate = new Date(filters.endDate);
      }

      // 3. Build where clauses for each platform
      const buildMetadataFilter = () => {
        const metadataFilter: any = {};

        // Status filters - need to handle case where reviewMetadata might not exist
        if (status === 'unread') {
          // Show reviews where metadata doesn't exist OR isRead is not true
          // Using NOT to match: reviews without metadata OR with isRead=false
          metadataFilter.NOT = {
            reviewMetadata: {
              isRead: true,
            },
          };
        } else if (status === 'read') {
          metadataFilter.reviewMetadata = { isRead: true };
        } else if (status === 'important') {
          metadataFilter.reviewMetadata = { isImportant: true };
        } else if (status === 'replied') {
          metadataFilter.reviewMetadata = { hasReply: true };
        } else if (status === 'not-replied') {
          // Show reviews where metadata doesn't exist OR hasReply is not true
          // Using NOT to match: reviews without metadata OR with hasReply=false
          metadataFilter.NOT = {
            reviewMetadata: {
              hasReply: true,
            },
          };
        }

        // Sentiment filter
        if (filters.sentiment) {
          const sentimentMap = {
            positive: { gte: 0.5 },
            neutral: { gte: -0.5, lt: 0.5 },
            negative: { lt: -0.5 },
          };
          metadataFilter.reviewMetadata = {
            ...(metadataFilter.reviewMetadata || {}),
            sentiment: sentimentMap[filters.sentiment],
          };
        }

        return metadataFilter;
      };

      const metadataFilter = buildMetadataFilter();

      // Build Google where clause
      const googleWhere: any = {
        businessProfile: { teamId: team.id },
        ...metadataFilter,
      };

      // Only add rating filter if ratings array is not empty
      if (filters.rating) {
        const ratings = Array.isArray(filters.rating) ? filters.rating : [filters.rating];
        if (ratings.length > 0) {
          googleWhere.stars = { in: ratings };
        }
      }

      if (filters.search) {
        googleWhere.text = { contains: filters.search, mode: 'insensitive' };
      }

      if (startDate && endDate) {
        googleWhere.publishedAtDate = { gte: startDate, lte: endDate };
      }

      // Build Facebook where clause
      const facebookWhere: any = {
        businessProfile: { teamId: team.id },
        ...metadataFilter,
      };

      if (filters.search) {
        facebookWhere.text = { contains: filters.search, mode: 'insensitive' };
      }

      if (startDate && endDate) {
        facebookWhere.date = { gte: startDate, lte: endDate };
      }

      // Build TripAdvisor where clause
      const tripadvisorWhere: any = {
        businessProfile: { teamId: team.id },
        ...metadataFilter,
      };

      // Only add rating filter if ratings array is not empty
      if (filters.rating) {
        const ratings = Array.isArray(filters.rating) ? filters.rating : [filters.rating];
        if (ratings.length > 0) {
          tripadvisorWhere.rating = { in: ratings };
        }
      }

      if (filters.search) {
        tripadvisorWhere.text = { contains: filters.search, mode: 'insensitive' };
      }

      if (startDate && endDate) {
        tripadvisorWhere.publishedDate = { gte: startDate, lte: endDate };
      }

      // Build Booking where clause
      const bookingWhere: any = {
        businessProfile: { teamId: team.id },
        ...metadataFilter,
      };

      // Only add rating filter if ratings array is not empty
      if (filters.rating) {
        // Booking uses 1-10 scale, convert 1-5 to 1-10
        const ratings = Array.isArray(filters.rating) ? filters.rating : [filters.rating];
        if (ratings.length > 0) {
          const bookingRatings = ratings.map((r) => r * 2); // Convert to 1-10 scale
          bookingWhere.rating = { in: bookingRatings };
        }
      }

      if (filters.search) {
        bookingWhere.OR = [
          { text: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (startDate && endDate) {
        bookingWhere.publishedDate = { gte: startDate, lte: endDate };
      }

      console.log('📋 [getTeamReviews] Final where clauses:');
      console.log('  - Google:', JSON.stringify(googleWhere, null, 2));
      console.log('  - Facebook:', JSON.stringify(facebookWhere, null, 2));
      console.log('  - TripAdvisor:', JSON.stringify(tripadvisorWhere, null, 2));
      console.log('  - Booking:', JSON.stringify(bookingWhere, null, 2));

      // 4. Fetch reviews from all platforms in parallel
      const reviewsPromises: Promise<any[]>[] = [];
      const countPromises: Promise<number>[] = [];

      if (platforms.includes('google')) {
        reviewsPromises.push(
          prisma.googleReview.findMany({
            where: googleWhere,
            include: { reviewMetadata: true },
            orderBy: { publishedAtDate: sortOrder },
          })
        );
        countPromises.push(prisma.googleReview.count({ where: googleWhere }));
      } else {
        reviewsPromises.push(Promise.resolve([]));
        countPromises.push(Promise.resolve(0));
      }

      if (platforms.includes('facebook')) {
        reviewsPromises.push(
          prisma.facebookReview.findMany({
            where: facebookWhere,
            include: { reviewMetadata: true },
            orderBy: { date: sortOrder },
          })
        );
        countPromises.push(prisma.facebookReview.count({ where: facebookWhere }));
      } else {
        reviewsPromises.push(Promise.resolve([]));
        countPromises.push(Promise.resolve(0));
      }

      if (platforms.includes('tripadvisor')) {
        reviewsPromises.push(
          prisma.tripAdvisorReview.findMany({
            where: tripadvisorWhere,
            include: { reviewMetadata: true },
            orderBy: { publishedDate: sortOrder },
          })
        );
        countPromises.push(prisma.tripAdvisorReview.count({ where: tripadvisorWhere }));
      } else {
        reviewsPromises.push(Promise.resolve([]));
        countPromises.push(Promise.resolve(0));
      }

      if (platforms.includes('booking')) {
        reviewsPromises.push(
          prisma.bookingReview.findMany({
            where: bookingWhere,
            include: { reviewMetadata: true },
            orderBy: { publishedDate: sortOrder },
          })
        );
        countPromises.push(prisma.bookingReview.count({ where: bookingWhere }));
      } else {
        reviewsPromises.push(Promise.resolve([]));
        countPromises.push(Promise.resolve(0));
      }

      const reviewsResults = await Promise.all(reviewsPromises);
      const countResults = await Promise.all(countPromises);

      const [googleReviews, facebookReviews, tripadvisorReviews, bookingReviews] = reviewsResults;
      const [googleCount, facebookCount, tripadvisorCount, bookingCount] = countResults;

      console.log('📊 [getTeamReviews] Review counts:', {
        google: googleCount,
        facebook: facebookCount,
        tripadvisor: tripadvisorCount,
        booking: bookingCount,
        total: googleCount + facebookCount + tripadvisorCount + bookingCount,
      });
      console.log('📊 [getTeamReviews] Raw review results lengths:', {
        google: googleReviews.length,
        facebook: facebookReviews.length,
        tripadvisor: tripadvisorReviews.length,
        booking: bookingReviews.length,
      });

      // 5. Combine and sort results
      interface UnifiedReview {
        id: string;
        platform: 'google' | 'facebook' | 'tripadvisor' | 'booking';
        author: string;
        authorImage?: string;
        rating: number;
        text?: string;
        date: string;
        images?: string[];
        replyText?: string;
        replyDate?: string;
        hasReply: boolean;
        sentiment?: number;
        keywords?: string[];
        isRead: boolean;
        isImportant: boolean;
        sourceUrl?: string;
        generatedReply?: string;
      }

      const unifiedReviews: UnifiedReview[] = [];

      // Add Google reviews
      googleReviews.forEach((review: any) => {
        unifiedReviews.push({
          id: review.id,
          platform: 'google',
          author: review.name || 'Anonymous',
          authorImage: review.reviewerPhotoUrl,
          rating: review.stars || 0,
          text: review.text,
          date: review.publishedAtDate.toISOString(),
          images: review.reviewImageUrls || [],
          replyText: review.responseFromOwnerText,
          replyDate: review.responseFromOwnerDate?.toISOString(),
          hasReply: !!review.responseFromOwnerText,
          sentiment: review.reviewMetadata?.sentiment,
          keywords: review.reviewMetadata?.keywords || [],
          isRead: review.reviewMetadata?.isRead || false,
          isImportant: review.reviewMetadata?.isImportant || false,
          sourceUrl: review.reviewUrl,
        });
      });

      // Add Facebook reviews
      facebookReviews.forEach((review: any) => {
        unifiedReviews.push({
          id: review.id,
          platform: 'facebook',
          author: review.userName || 'Anonymous',
          authorImage: review.userProfilePic,
          rating: review.isRecommended ? 5 : 1, // Convert boolean to rating
          text: review.text,
          date: review.date.toISOString(),
          images: review.photos?.map((p: any) => p.url) || [],
          replyText: review.responseFromOwnerText,
          replyDate: review.responseFromOwnerDate?.toISOString(),
          hasReply: !!review.responseFromOwnerText,
          sentiment: review.reviewMetadata?.sentiment,
          keywords: review.reviewMetadata?.keywords || [],
          isRead: review.reviewMetadata?.isRead || false,
          isImportant: review.reviewMetadata?.isImportant || false,
          sourceUrl: review.url,
        });
      });

      // Add TripAdvisor reviews
      tripadvisorReviews.forEach((review: any) => {
        unifiedReviews.push({
          id: review.id,
          platform: 'tripadvisor',
          author: review.reviewerName || 'Anonymous',
          authorImage: review.reviewerPhotoUrl,
          rating: review.rating || 0,
          text: review.text,
          date: review.publishedDate.toISOString(),
          images: review.photos?.map((p: any) => p.url) || [],
          replyText: review.responseFromOwnerText,
          replyDate: review.responseFromOwnerDate?.toISOString(),
          hasReply: review.hasOwnerResponse,
          sentiment: review.reviewMetadata?.sentiment,
          keywords: review.reviewMetadata?.keywords || [],
          isRead: review.reviewMetadata?.isRead || false,
          isImportant: review.reviewMetadata?.isImportant || false,
          sourceUrl: review.reviewUrl,
        });
      });

      // Add Booking reviews
      bookingReviews.forEach((review: any) => {
        unifiedReviews.push({
          id: review.id,
          platform: 'booking',
          author: review.reviewerName || 'Anonymous',
          authorImage: undefined,
          rating: review.rating || 0, // Keep 1-10 scale
          text: review.text,
          date: review.publishedDate.toISOString(),
          images: [],
          replyText: review.responseFromOwnerText,
          replyDate: review.responseFromOwnerDate?.toISOString(),
          hasReply: review.hasOwnerResponse,
          sentiment: review.reviewMetadata?.sentiment,
          keywords: review.reviewMetadata?.keywords || [],
          isRead: review.reviewMetadata?.isRead || false,
          isImportant: review.reviewMetadata?.isImportant || false,
          sourceUrl: undefined,
        });
      });

      // Sort unified reviews
      if (sortBy === 'date') {
        unifiedReviews.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
      } else if (sortBy === 'rating') {
        unifiedReviews.sort((a, b) =>
          sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating
        );
      } else if (sortBy === 'sentiment') {
        unifiedReviews.sort((a, b) => {
          const sentA = a.sentiment || 0;
          const sentB = b.sentiment || 0;
          return sortOrder === 'desc' ? sentB - sentA : sentA - sentB;
        });
      } else if (sortBy === 'platform') {
        unifiedReviews.sort((a, b) =>
          sortOrder === 'desc'
            ? b.platform.localeCompare(a.platform)
            : a.platform.localeCompare(b.platform)
        );
      }

      // 6. Apply pagination
      const total = unifiedReviews.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedReviews = unifiedReviews.slice(offset, offset + limit);

      // 7. Calculate unified statistics
      const totalReviews = googleCount + facebookCount + tripadvisorCount + bookingCount;
      const unreadCount = unifiedReviews.filter((r) => !r.isRead).length;
      const importantCount = unifiedReviews.filter((r) => r.isImportant).length;
      const repliedCount = unifiedReviews.filter((r) => r.hasReply).length;

      // Calculate average rating (excluding Facebook from average, keeping Booking on 1-10 scale)
      let totalRating = 0;
      let ratingCount = 0;

      googleReviews.forEach((review: any) => {
        totalRating += review.stars;
        ratingCount++;
      });

      tripadvisorReviews.forEach((review: any) => {
        totalRating += review.rating;
        ratingCount++;
      });

      bookingReviews.forEach((review: any) => {
        totalRating += review.rating;
        ratingCount++;
      });

      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      // 8. Return response
      return {
        reviews: paginatedReviews,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        stats: {
          total: totalReviews,
          unread: unreadCount,
          important: importantCount,
          withReply: repliedCount,
          averageRating: Math.round(averageRating * 10) / 10,
          platformBreakdown: {
            google: googleCount,
            facebook: facebookCount,
            tripadvisor: tripadvisorCount,
            booking: bookingCount,
          },
        },
      };
    }),

  /**
   * Get Google reviews with filters and pagination
   */
  google: protectedProcedure
    .input(reviewFiltersSchema)
    .query(async ({ ctx, input }) => {
      const team = await prisma.team.findUnique({
        where: { slug: input.teamSlug },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      const page = input.page || 1;
      const limit = Math.min(input.limit || 25, 100);
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {
        businessProfile: {
          teamId: team.id,
        },
      };

      if (input.rating) {
        if (Array.isArray(input.rating)) {
          whereClause.stars = { in: input.rating };
        } else {
          whereClause.stars = input.rating;
        }
      }

      if (input.hasResponse !== undefined) {
        if (input.hasResponse) {
          whereClause.responseFromOwnerText = { not: null };
        } else {
          whereClause.responseFromOwnerText = null;
        }
      }

      if (input.search) {
        whereClause.text = {
          contains: input.search,
          mode: 'insensitive',
        };
      }

      if (input.startDate && input.endDate) {
        whereClause.publishedAtDate = {
          gte: new Date(input.startDate),
          lte: new Date(input.endDate),
        };
      }

      // Handle read status filter
      const isRead = safeBoolean(input.isRead);
      if (isRead !== undefined) {
        whereClause.reviewMetadata = {
          ...whereClause.reviewMetadata,
          isRead,
        };
      }

      // Handle important status filter
      const isImportant = safeBoolean(input.isImportant);
      if (isImportant !== undefined) {
        whereClause.reviewMetadata = {
          ...whereClause.reviewMetadata,
          isImportant,
        };
      }

      // Build order by
      const orderBy: any = {};
      if (input.sortBy) {
        orderBy[input.sortBy] = input.sortOrder || 'desc';
      } else {
        orderBy.publishedAtDate = 'desc';
      }

      const [reviews, total] = await Promise.all([
        prisma.googleReview.findMany({
          where: whereClause,
          include: {
            reviewMetadata: true,
          },
          orderBy,
          skip: offset,
          take: limit,
        }),
        prisma.googleReview.count({ where: whereClause }),
      ]);

      // Calculate stats
      const stats = await prisma.googleReview.aggregate({
        where: {
          businessProfile: {
            teamId: team.id,
          },
        },
        _avg: {
          stars: true,
        },
        _count: {
          _all: true,
          responseFromOwnerText: true,
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        stats: {
          total: stats._count._all,
          averageRating: stats._avg.stars || 0,
          withResponse: stats._count.responseFromOwnerText || 0,
          unread: 0,
        },
      };
    }),

  /**
   * Update Google review metadata
   */
  updateGoogleMetadata: protectedProcedure
    .input(updateGoogleReviewMetadataSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await prisma.team.findUnique({
        where: { slug: input.teamSlug },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      // Find the review
      const review = await prisma.googleReview.findFirst({
        where: {
          id: input.reviewId,
          businessProfile: {
            teamId: team.id,
          },
        },
      });

      if (!review) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Review not found',
        });
      }

      const updateData: any = {};
      if (input.isRead !== undefined) updateData.isRead = input.isRead;
      if (input.isImportant !== undefined) updateData.isImportant = input.isImportant;

      // Update or create review metadata
      if (review.reviewMetadataId) {
        // Update existing metadata
        const metadata = await prisma.reviewMetadata.update({
          where: { id: review.reviewMetadataId },
          data: updateData,
        });
        return metadata;
      } else {
        // Create new metadata and link it to the review
        const metadata = await prisma.reviewMetadata.create({
          data: {
            ...updateData,
            externalId: review.id,
            source: 'GOOGLE_MAPS',
            author: review.name,
            rating: review.rating || 0,
            text: review.text || '',
            date: review.publishedAtDate,
            scrapedAt: review.scrapedAt,
          },
        });

        // Update the review to reference the new metadata
        await prisma.googleReview.update({
          where: { id: review.id },
          data: { reviewMetadataId: metadata.id },
        });

        return metadata;
      }
    }),

  /**
   * Get Facebook reviews with filters and pagination
   */
  facebook: protectedProcedure
    .input(reviewFiltersSchema)
    .query(async ({ ctx, input }) => {
      const team = await prisma.team.findUnique({
        where: { slug: input.teamSlug },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      const page = input.page || 1;
      const limit = Math.min(input.limit || 25, 100);
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {
        businessProfile: {
          teamId: team.id,
        },
      };

      // Handle recommendation filter (Facebook's equivalent of ratings)
      if (input.rating !== undefined) {
        if (input.rating === 5 || (Array.isArray(input.rating) && input.rating.includes(5))) {
          whereClause.isRecommended = true;
        } else if (input.rating === 1 || (Array.isArray(input.rating) && input.rating.includes(1))) {
          whereClause.isRecommended = false;
        }
      }

      // Handle sentiment filter
      if (input.sentiment) {
        whereClause.reviewMetadata = {
          sentiment: input.sentiment,
        };
      }

      // Handle search filter
      if (input.search) {
        whereClause.text = {
          contains: input.search,
          mode: 'insensitive',
        };
      }

      // Handle date range filter
      if (input.startDate && input.endDate) {
        whereClause.date = {
          gte: new Date(input.startDate),
          lte: new Date(input.endDate),
        };
      }

      // Handle read status filter
      if (input.isRead !== undefined) {
        whereClause.reviewMetadata = {
          ...whereClause.reviewMetadata,
          isRead: input.isRead,
        };
      }

      // Handle important status filter
      if (input.isImportant !== undefined) {
        whereClause.reviewMetadata = {
          ...whereClause.reviewMetadata,
          isImportant: input.isImportant,
        };
      }

      // Build order by
      const orderBy: any = {};
      if (input.sortBy) {
        orderBy[input.sortBy] = input.sortOrder || 'desc';
      } else {
        orderBy.date = 'desc';
      }

      const [reviews, total] = await Promise.all([
        prisma.facebookReview.findMany({
          where: whereClause,
          include: {
            reviewMetadata: true,
            photos: true,
            comments: true,
          },
          orderBy,
          skip: offset,
          take: limit,
        }),
        prisma.facebookReview.count({ where: whereClause }),
      ]);

      // Calculate filtered statistics
      const filteredReviews = await prisma.facebookReview.findMany({
        where: whereClause,
        select: {
          isRecommended: true,
          likesCount: true,
          commentsCount: true,
          tags: true,
          text: true,
          reviewMetadata: {
            select: {
              isRead: true,
              sentiment: true,
            },
          },
          photos: {
            select: {
              id: true,
            },
          },
        },
      });

      const recommendedCount = filteredReviews.filter((r) => r.isRecommended).length;
      const notRecommendedCount = filteredReviews.filter((r) => !r.isRecommended).length;
      const recommendationRate =
        filteredReviews.length > 0 ? (recommendedCount / filteredReviews.length) * 100 : 0;

      const totalLikes = filteredReviews.reduce((sum, r) => sum + r.likesCount, 0);
      const totalComments = filteredReviews.reduce((sum, r) => sum + r.commentsCount, 0);
      const totalPhotos = filteredReviews.reduce((sum, r) => sum + (r.photos?.length || 0), 0);
      const withPhotos = filteredReviews.filter((r) => r.photos && r.photos.length > 0).length;
      const withTags = filteredReviews.filter((r) => r.tags && r.tags.length > 0).length;
      const unread = filteredReviews.filter((r) => !r.reviewMetadata?.isRead).length;

      const averageEngagement =
        filteredReviews.length > 0 ? (totalLikes + totalComments) / filteredReviews.length : 0;

      const sentimentScores = filteredReviews
        .map((r) => r.reviewMetadata?.sentiment)
        .filter((s) => s !== null && s !== undefined) as number[];
      const sentimentScore =
        sentimentScores.length > 0
          ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
          : 0;

      const totalPages = Math.ceil(total / limit);

      return {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        stats: {
          total,
          recommendationRate,
          recommendedCount,
          notRecommendedCount,
          totalLikes,
          totalComments,
          totalPhotos,
          averageEngagement,
          sentimentScore,
          qualityScore: 0,
          unread,
          withPhotos,
          withTags,
        },
      };
    }),

  /**
   * Get TripAdvisor reviews with filters and pagination
   */
  tripadvisor: protectedProcedure
    .input(reviewFiltersSchema)
    .query(async ({ ctx, input }) => {
      const team = await prisma.team.findUnique({
        where: { slug: input.teamSlug },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      const page = input.page || 1;
      const limit = Math.min(input.limit || 25, 100);
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {
        businessProfile: {
          teamId: team.id,
        },
      };

      if (input.rating) {
        if (Array.isArray(input.rating)) {
          whereClause.rating = { in: input.rating };
        } else {
          whereClause.rating = input.rating;
        }
      }

      if (input.search) {
        whereClause.text = {
          contains: input.search,
          mode: 'insensitive',
        };
      }

      if (input.startDate && input.endDate) {
        whereClause.publishedDate = {
          gte: new Date(input.startDate),
          lte: new Date(input.endDate),
        };
      }

      // Build order by
      const orderBy: any = {};
      if (input.sortBy) {
        orderBy[input.sortBy] = input.sortOrder || 'desc';
      } else {
        orderBy.publishedDate = 'desc';
      }

      const [reviews, total] = await Promise.all([
        prisma.tripAdvisorReview.findMany({
          where: whereClause,
          include: {
            reviewMetadata: true,
            photos: true,
          },
          orderBy,
          skip: offset,
          take: limit,
        }),
        prisma.tripAdvisorReview.count({ where: whereClause }),
      ]);

      // Calculate stats
      const stats = await prisma.tripAdvisorReview.aggregate({
        where: {
          businessProfile: {
            teamId: team.id,
          },
        },
        _avg: {
          rating: true,
          helpfulVotes: true,
        },
        _count: {
          _all: true,
          hasOwnerResponse: true,
        },
        _sum: {
          helpfulVotes: true,
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        stats: {
          total: stats._count._all,
          averageRating: stats._avg.rating || 0,
          ratingDistribution: {
            oneStar: 0,
            twoStar: 0,
            threeStar: 0,
            fourStar: 0,
            fiveStar: 0,
          },
          tripTypeDistribution: {
            family: 0,
            couples: 0,
            solo: 0,
            business: 0,
            friends: 0,
          },
          totalHelpfulVotes: stats._sum.helpfulVotes || 0,
          totalPhotos: 0,
          averageHelpfulVotes: stats._avg.helpfulVotes || 0,
          sentimentScore: 0,
          qualityScore: 0,
          unread: 0,
          withPhotos: 0,
          withOwnerResponse: stats._count.hasOwnerResponse || 0,
          responseRate: stats._count.hasOwnerResponse
            ? (stats._count.hasOwnerResponse / stats._count._all) * 100
            : 0,
        },
      };
    }),

  /**
   * Update review status (generic)
   */
  updateStatus: protectedProcedure
    .input(updateReviewStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await prisma.team.findUnique({
        where: { slug: input.teamSlug },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      // For GoogleReview, we can only update the responseFromOwnerText field
      if (input.field === 'reply') {
        const updatedReview = await prisma.googleReview.update({
          where: {
            id: input.reviewId,
            businessProfile: {
              teamId: team.id,
            },
          },
          data: {
            responseFromOwnerText: input.value as string,
            responseFromOwnerDate: new Date(),
          },
        });

        return updatedReview;
      } else {
        return { message: 'Status field not supported yet' };
      }
    }),

  /**
   * Google Enhanced Review Analytics
   * Provides comprehensive analytics for Google reviews within a date range
   * Only requires date range - all other data fetched from team context
   */
  googleEnhancedAnalytics: protectedProcedure
    .input(googleEnhancedAnalyticsSchema)
    .query(async ({ ctx, input }) => {
      const { teamSlug, startDate, endDate } = input;

      // 1. Verify team and membership
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

      // 2. Get business profile for additional context
      const businessProfile = await prisma.googleBusinessProfile.findFirst({
        where: { teamId: team.id },
        select: {
          id: true,
          displayName: true,
          placeId: true,
          rating: true,
          userRatingCount: true,
        },
      });

      if (!businessProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No Google Business Profile found for this team',
        });
      }

      const dateStart = new Date(startDate);
      const dateEnd = new Date(endDate);

      // 3. Build base where clause for date range - use specific business profile ID
      const whereClause = {
        businessProfileId: businessProfile.id,
        publishedAtDate: {
          gte: dateStart,
          lte: dateEnd,
        },
      };

      // 4. Fetch all reviews in parallel with metadata
      const [reviews, totalReviewsCount] = await Promise.all([
        prisma.googleReview.findMany({
          where: whereClause,
          include: {
            reviewMetadata: true,
          },
          orderBy: { publishedAtDate: 'desc' },
        }),
        prisma.googleReview.count({
          where: {
            businessProfileId: businessProfile.id,
          },
        }),
      ]);

      // 5. Calculate Rating Distribution
      const ratingDistribution = {
        1: reviews.filter((r) => r.stars === 1).length,
        2: reviews.filter((r) => r.stars === 2).length,
        3: reviews.filter((r) => r.stars === 3).length,
        4: reviews.filter((r) => r.stars === 4).length,
        5: reviews.filter((r) => r.stars === 5).length,
      };

      // 6. Calculate Average Rating
      const totalRating = reviews.reduce((sum, r) => sum + r.stars, 0);
      const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      // 7. Calculate Response Metrics
      const reviewsWithResponse = reviews.filter((r) => r.responseFromOwnerText);
      const responseRate = reviews.length > 0 
        ? (reviewsWithResponse.length / reviews.length) * 100 
        : 0;

      // Calculate average response time (in hours)
      const responseTimes = reviewsWithResponse
        .filter((r) => r.responseFromOwnerDate)
        .map((r) => {
          const reviewDate = new Date(r.publishedAtDate).getTime();
          const responseDate = new Date(r.responseFromOwnerDate!).getTime();
          return (responseDate - reviewDate) / (1000 * 60 * 60); // Convert to hours
        })
        .filter((time) => time >= 0); // Only positive values

      const averageResponseTimeHours = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      // 8. Calculate Sentiment Analysis
      const reviewsWithSentiment = reviews.filter((r) => r.reviewMetadata?.sentiment !== null && r.reviewMetadata?.sentiment !== undefined);
      
      const sentimentDistribution = {
        positive: reviewsWithSentiment.filter((r) => r.reviewMetadata!.sentiment! >= 0.5).length,
        neutral: reviewsWithSentiment.filter((r) => r.reviewMetadata!.sentiment! >= -0.5 && r.reviewMetadata!.sentiment! < 0.5).length,
        negative: reviewsWithSentiment.filter((r) => r.reviewMetadata!.sentiment! < -0.5).length,
      };

      const averageSentiment = reviewsWithSentiment.length > 0
        ? reviewsWithSentiment.reduce((sum, r) => sum + r.reviewMetadata!.sentiment!, 0) / reviewsWithSentiment.length
        : 0;

      // 9. Calculate Content Metrics
      const reviewsWithPhotos = reviews.filter((r) => r.reviewImageUrls && r.reviewImageUrls.length > 0);
      const totalPhotos = reviews.reduce((sum, r) => sum + (r.reviewImageUrls?.length || 0), 0);
      const reviewsFromLocalGuides = reviews.filter((r) => r.isLocalGuide);
      const reviewsWithText = reviews.filter((r) => r.text && r.text.trim().length > 0);

      // 10. Calculate Engagement Metrics
      const totalLikes = reviews.reduce((sum, r) => sum + (r.likesCount || 0), 0);
      const averageLikes = reviews.length > 0 ? totalLikes / reviews.length : 0;

      // 11. Extract Top Keywords
      const allKeywords: string[] = [];
      reviews.forEach((r) => {
        if (r.reviewMetadata?.keywords && Array.isArray(r.reviewMetadata.keywords)) {
          allKeywords.push(...r.reviewMetadata.keywords);
        }
      });

      const keywordCounts = allKeywords.reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([keyword, count]) => ({ keyword, count }));

      // 12. Calculate Time-based Trends (daily breakdown with sentiment)
      const dailyBreakdown: Record<string, { 
        date: string; 
        count: number; 
        averageRating: number; 
        totalRating: number;
        positive: number;
        neutral: number;
        negative: number;
      }> = {};

      reviews.forEach((review) => {
        const dateKey = review.publishedAtDate.toISOString().split('T')[0];
        if (!dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey] = { 
            date: dateKey, 
            count: 0, 
            averageRating: 0, 
            totalRating: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
          };
        }
        dailyBreakdown[dateKey].count += 1;
        dailyBreakdown[dateKey].totalRating += review.stars;

        // Add sentiment breakdown
        const sentiment = review.reviewMetadata?.sentiment;
        if (sentiment !== null && sentiment !== undefined) {
          if (sentiment >= 0.5) {
            dailyBreakdown[dateKey].positive += 1;
          } else if (sentiment >= -0.5) {
            dailyBreakdown[dateKey].neutral += 1;
          } else {
            dailyBreakdown[dateKey].negative += 1;
          }
        } else {
          // If no sentiment data, classify by star rating
          if (review.stars >= 4) {
            dailyBreakdown[dateKey].positive += 1;
          } else if (review.stars === 3) {
            dailyBreakdown[dateKey].neutral += 1;
          } else {
            dailyBreakdown[dateKey].negative += 1;
          }
        }
      });

      // Calculate average ratings for each day
      Object.values(dailyBreakdown).forEach((day) => {
        day.averageRating = day.count > 0 ? day.totalRating / day.count : 0;
      });

      const trendsOverTime = Object.values(dailyBreakdown).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // 13. Calculate Read/Unread Statistics
      const unreadReviews = reviews.filter((r) => !r.reviewMetadata?.isRead);
      const importantReviews = reviews.filter((r) => r.reviewMetadata?.isImportant);

      // 14. Calculate Review Length Statistics
      const reviewLengths = reviewsWithText.map((r) => r.text!.length);
      const averageReviewLength = reviewLengths.length > 0
        ? reviewLengths.reduce((sum, len) => sum + len, 0) / reviewLengths.length
        : 0;

      // 15. Return Comprehensive Analytics
      return {
        // Period Information
        period: {
          startDate: dateStart.toISOString(),
          endDate: dateEnd.toISOString(),
          daysInPeriod: Math.ceil((dateEnd.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)),
        },

        // Business Profile Context
        businessProfile: {
          id: businessProfile.id,
          name: businessProfile.displayName,
          placeId: businessProfile.placeId,
          overallRating: businessProfile.rating,
          totalReviewsAllTime: totalReviewsCount,
        },

        // Overall Metrics
        overview: {
          totalReviews: reviews.length,
          averageRating: Math.round(averageRating * 100) / 100,
          responseRate: Math.round(responseRate * 100) / 100,
          averageResponseTimeHours: Math.round(averageResponseTimeHours * 100) / 100,
          reviewsPerDay: reviews.length > 0 
            ? Math.round((reviews.length / Math.max(1, trendsOverTime.length)) * 100) / 100
            : 0,
        },

        // Rating Distribution
        ratingDistribution: {
          breakdown: ratingDistribution,
          percentages: {
            1: reviews.length > 0 ? Math.round((ratingDistribution[1] / reviews.length) * 10000) / 100 : 0,
            2: reviews.length > 0 ? Math.round((ratingDistribution[2] / reviews.length) * 10000) / 100 : 0,
            3: reviews.length > 0 ? Math.round((ratingDistribution[3] / reviews.length) * 10000) / 100 : 0,
            4: reviews.length > 0 ? Math.round((ratingDistribution[4] / reviews.length) * 10000) / 100 : 0,
            5: reviews.length > 0 ? Math.round((ratingDistribution[5] / reviews.length) * 10000) / 100 : 0,
          },
        },

        // Sentiment Analysis
        sentiment: {
          distribution: sentimentDistribution,
          averageSentiment: Math.round(averageSentiment * 1000) / 1000,
          percentages: {
            positive: reviewsWithSentiment.length > 0 
              ? Math.round((sentimentDistribution.positive / reviewsWithSentiment.length) * 10000) / 100 
              : 0,
            neutral: reviewsWithSentiment.length > 0 
              ? Math.round((sentimentDistribution.neutral / reviewsWithSentiment.length) * 10000) / 100 
              : 0,
            negative: reviewsWithSentiment.length > 0 
              ? Math.round((sentimentDistribution.negative / reviewsWithSentiment.length) * 10000) / 100 
              : 0,
          },
          analyzedCount: reviewsWithSentiment.length,
        },

        // Response Metrics
        responses: {
          totalWithResponse: reviewsWithResponse.length,
          responseRate: Math.round(responseRate * 100) / 100,
          averageResponseTimeHours: Math.round(averageResponseTimeHours * 100) / 100,
          averageResponseTimeDays: Math.round((averageResponseTimeHours / 24) * 100) / 100,
        },

        // Content Metrics
        content: {
          reviewsWithText: reviewsWithText.length,
          reviewsWithPhotos: reviewsWithPhotos.length,
          totalPhotos,
          averagePhotosPerReview: reviews.length > 0 
            ? Math.round((totalPhotos / reviews.length) * 100) / 100 
            : 0,
          reviewsFromLocalGuides: reviewsFromLocalGuides.length,
          localGuidePercentage: reviews.length > 0 
            ? Math.round((reviewsFromLocalGuides.length / reviews.length) * 10000) / 100 
            : 0,
          averageReviewLength: Math.round(averageReviewLength),
        },

        // Engagement Metrics
        engagement: {
          totalLikes,
          averageLikes: Math.round(averageLikes * 100) / 100,
          reviewsWithLikes: reviews.filter((r) => r.likesCount > 0).length,
        },

        // Keywords and Topics
        keywords: {
          topKeywords,
          totalUniqueKeywords: Object.keys(keywordCounts).length,
        },

        // Status Metrics
        status: {
          unreadReviews: unreadReviews.length,
          importantReviews: importantReviews.length,
          readPercentage: reviews.length > 0 
            ? Math.round(((reviews.length - unreadReviews.length) / reviews.length) * 10000) / 100 
            : 0,
        },

        // Time-based Trends
        trends: {
          daily: trendsOverTime,
          summary: {
            peakDay: trendsOverTime.length > 0 
              ? trendsOverTime.reduce((max, day) => day.count > max.count ? day : max, trendsOverTime[0])
              : null,
            lowestDay: trendsOverTime.length > 0 
              ? trendsOverTime.reduce((min, day) => day.count < min.count ? day : min, trendsOverTime[0])
              : null,
          },
        },
      };
    }),
});

