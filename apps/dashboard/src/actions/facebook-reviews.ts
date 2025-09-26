'use server';

import { getSession } from '@wirecrest/auth/server';
import { ApiError } from './lib/errors';
import { prisma } from '@wirecrest/db';

interface FacebookReviewFilters {
  page?: number;
  limit?: number;
  isRecommended?: boolean | string;
  hasLikes?: boolean | string;
  hasComments?: boolean | string;
  hasPhotos?: boolean | string;
  hasTags?: boolean | string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  isRead?: boolean | string;
  isImportant?: boolean | string;
  minLikes?: number;
  maxLikes?: number;
  minComments?: number;
  maxComments?: number;
}

// Helper function to safely convert values to boolean
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

export async function getFacebookReviews(
  teamSlug: string,
  filters: FacebookReviewFilters = {}
) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 25, 100);
  const offset = (page - 1) * limit;

  // Build where clause
  const whereClause: any = {
    businessProfile: {
      teamId: team.id,
    },
  };

  // Handle recommendation filter
  const isRecommended = safeBoolean(filters.isRecommended);
  if (isRecommended !== undefined) {
    whereClause.isRecommended = isRecommended;
  }

  // Handle engagement filters
  if (filters.hasLikes) {
    whereClause.likesCount = { gt: 0 };
  }

  if (filters.hasComments) {
    whereClause.commentsCount = { gt: 0 };
  }

  if (filters.hasPhotos) {
    whereClause.photos = { some: {} };
  }

  if (filters.hasTags) {
    whereClause.tags = { isEmpty: false };
  }

  // Handle sentiment filter
  if (filters.sentiment) {
    whereClause.reviewMetadata = {
      sentiment: filters.sentiment,
    };
  }

  // Handle search filter
  if (filters.search) {
    whereClause.text = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  // Handle date range filter
  if (filters.startDate && filters.endDate) {
    whereClause.date = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  }

  // Handle read status filter
  const isRead = safeBoolean(filters.isRead);
  if (isRead !== undefined) {
    whereClause.reviewMetadata = {
      ...whereClause.reviewMetadata,
      isRead,
    };
  }

  // Handle important status filter
  const isImportant = safeBoolean(filters.isImportant);
  if (isImportant !== undefined) {
    whereClause.reviewMetadata = {
      ...whereClause.reviewMetadata,
      isImportant,
    };
  }

  // Handle likes range filter
  if (filters.minLikes || filters.maxLikes) {
    whereClause.likesCount = {
      ...(filters.minLikes && { gte: filters.minLikes }),
      ...(filters.maxLikes && { lte: filters.maxLikes }),
    };
  }

  // Handle comments range filter
  if (filters.minComments || filters.maxComments) {
    whereClause.commentsCount = {
      ...(filters.minComments && { gte: filters.minComments }),
      ...(filters.maxComments && { lte: filters.maxComments }),
    };
  }

  // Build order by
  const orderBy: any = {};
  orderBy[filters.sortBy || 'date'] = filters.sortOrder || 'desc';

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

  // Calculate engagement and sentiment metrics
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
      qualityScore: 0, // TODO: Implement quality score
      unread,
      withPhotos,
      withTags,
    },
  };
}

export async function updateFacebookReviewMetadata(
  teamSlug: string,
  reviewId: string,
  data: { isRead?: boolean; isImportant?: boolean }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  // Get the review to ensure it belongs to this team
  const review = await prisma.facebookReview.findFirst({
    where: {
      id: reviewId,
      businessProfile: {
        teamId: team.id,
      },
    },
    include: {
      reviewMetadata: true,
    },
  });

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Update the review metadata
  const metadata = await prisma.reviewMetadata.update({
    where: { id: review.reviewMetadataId },
    data: {
      ...(data.isRead !== undefined && { isRead: data.isRead }),
      ...(data.isImportant !== undefined && { isImportant: data.isImportant }),
    },
  });

  return metadata;
}
