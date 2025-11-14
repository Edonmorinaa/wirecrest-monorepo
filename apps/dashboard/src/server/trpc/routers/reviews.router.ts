/**
 * Reviews Router
 * 
 * tRPC router for review management operations across different platforms:
 * - Google Reviews
 * - Facebook Reviews
 * - TripAdvisor Reviews
 */

import { TRPCError } from '@trpc/server';
import { prisma } from '@wirecrest/db';
import { router, protectedProcedure } from '../trpc';
import {
  reviewTeamSlugSchema,
  reviewFiltersSchema,
  updateGoogleReviewMetadataSchema,
  updateReviewStatusSchema,
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
});

