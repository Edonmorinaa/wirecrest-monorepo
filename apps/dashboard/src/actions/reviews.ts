'use server';

import type {
  GoogleReviewWithMetadata,
  FacebookReviewWithMetadata,
  TripAdvisorReviewWithMetadata,
} from './types/reviews';

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';

import { ApiError } from './lib/errors';

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

interface ReviewFilters {
  page?: number;
  limit?: number;
  rating?: number | number[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
  hasResponse?: boolean;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

// Get all reviews for a team across platforms
export async function getTeamReviews(teamSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Get team
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
}

// Google Reviews Actions
export async function getGoogleReviews(
  teamSlug: string,
  filters: ReviewFilters = {}
): Promise<{
  reviews: GoogleReviewWithMetadata[];
  pagination: any;
  stats: any;
}> {
  const session = await auth();
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

  if (filters.rating) {
    if (Array.isArray(filters.rating)) {
      whereClause.stars = { in: filters.rating };
    } else {
      whereClause.stars = filters.rating;
    }
  }

  if (filters.hasResponse !== undefined) {
    if (filters.hasResponse) {
      whereClause.responseFromOwnerText = { not: null };
    } else {
      whereClause.responseFromOwnerText = null;
    }
  }

  if (filters.search) {
    whereClause.text = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  if (filters.startDate && filters.endDate) {
    whereClause.publishedAtDate = {
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

  // Build order by
  const orderBy: any = {};
  if (filters.sortBy) {
    orderBy[filters.sortBy] = filters.sortOrder || 'desc';
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
    reviews: reviews as GoogleReviewWithMetadata[],
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
      unread: 0, // TODO: Implement unread count
    },
  };
}

export async function updateGoogleReviewMetadata(
  teamSlug: string,
  reviewId: string,
  data: { isRead?: boolean; isImportant?: boolean }
) {
  const session = await auth();
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

  // Find the review
  const review = await prisma.googleReview.findFirst({
    where: {
      id: reviewId,
      businessProfile: {
        teamId: team.id,
      },
    },
  });

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Update or create review metadata
  if (review.reviewMetadataId) {
    // Update existing metadata
    const metadata = await prisma.reviewMetadata.update({
      where: { id: review.reviewMetadataId },
      data,
    });
    return metadata;
  } else {
    // Create new metadata and link it to the review
    const metadata = await prisma.reviewMetadata.create({
      data: {
        ...data,
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
}

// Facebook Reviews Actions
export async function getFacebookReviews(
  teamSlug: string,
  filters: ReviewFilters = {}
): Promise<{
  reviews: FacebookReviewWithMetadata[];
  pagination: any;
  stats: any;
}> {
  const session = await auth();
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

  // Handle recommendation filter (Facebook's equivalent of ratings)
  if (filters.rating !== undefined) {
    // Convert rating filter to isRecommended for Facebook
    if (filters.rating === 5 || (Array.isArray(filters.rating) && filters.rating.includes(5))) {
      whereClause.isRecommended = true;
    } else if (filters.rating === 1 || (Array.isArray(filters.rating) && filters.rating.includes(1))) {
      whereClause.isRecommended = false;
    }
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
  if (filters.isRead !== undefined) {
    whereClause.reviewMetadata = {
      ...whereClause.reviewMetadata,
      isRead: filters.isRead,
    };
  }

  // Handle important status filter
  if (filters.isImportant !== undefined) {
    whereClause.reviewMetadata = {
      ...whereClause.reviewMetadata,
      isImportant: filters.isImportant,
    };
  }

  // Build order by
  const orderBy: any = {};
  if (filters.sortBy) {
    orderBy[filters.sortBy] = filters.sortOrder || 'desc';
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
    reviews: reviews as FacebookReviewWithMetadata[],
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

// TripAdvisor Reviews Actions
export async function getTripAdvisorReviews(
  teamSlug: string,
  filters: ReviewFilters = {}
): Promise<{
  reviews: TripAdvisorReviewWithMetadata[];
  pagination: any;
  stats: any;
}> {
  const session = await auth();
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

  if (filters.rating) {
    if (Array.isArray(filters.rating)) {
      whereClause.rating = { in: filters.rating };
    } else {
      whereClause.rating = filters.rating;
    }
  }

  if (filters.search) {
    whereClause.text = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  if (filters.startDate && filters.endDate) {
    whereClause.publishedDate = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  }

  // Build order by
  const orderBy: any = {};
  if (filters.sortBy) {
    orderBy[filters.sortBy] = filters.sortOrder || 'desc';
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
    reviews: reviews as TripAdvisorReviewWithMetadata[],
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
        oneStar: 0, // TODO: Calculate distribution
        twoStar: 0,
        threeStar: 0,
        fourStar: 0,
        fiveStar: 0,
      },
      tripTypeDistribution: {
        family: 0, // TODO: Calculate distribution
        couples: 0,
        solo: 0,
        business: 0,
        friends: 0,
      },
      totalHelpfulVotes: stats._sum.helpfulVotes || 0,
      totalPhotos: 0, // TODO: Implement photo count
      averageHelpfulVotes: stats._avg.helpfulVotes || 0,
      sentimentScore: 0, // TODO: Calculate sentiment
      qualityScore: 0, // TODO: Calculate quality
      unread: 0, // TODO: Implement unread count
      withPhotos: 0, // TODO: Implement photo count
      withOwnerResponse: stats._count.hasOwnerResponse || 0,
      responseRate: stats._count.hasOwnerResponse
        ? (stats._count.hasOwnerResponse / stats._count._all) * 100
        : 0,
    },
  };
}

// Booking.com Reviews Actions
export async function getBookingReviews(
  teamSlug: string,
  filters: ReviewFilters = {}
): Promise<{
  reviews: any[];
  pagination: any;
  stats: any;
}> {
  const session = await auth();
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

  if (filters.rating) {
    if (Array.isArray(filters.rating)) {
      whereClause.rating = { in: filters.rating };
    } else {
      whereClause.rating = filters.rating;
    }
  }

  if (filters.search) {
    whereClause.OR = [
      { text: { contains: filters.search, mode: 'insensitive' } },
      { title: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.startDate && filters.endDate) {
    whereClause.publishedDate = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  }

  // Build order by
  const orderBy: any = {};
  if (filters.sortBy) {
    orderBy[filters.sortBy] = filters.sortOrder || 'desc';
  } else {
    orderBy.publishedDate = 'desc';
  }

  const [reviews, total] = await Promise.all([
    prisma.bookingReview.findMany({
      where: whereClause,
      include: {
        reviewMetadata: true,
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.bookingReview.count({ where: whereClause }),
  ]);

  // Calculate stats
  const stats = await prisma.bookingReview.aggregate({
    where: {
      businessProfile: {
        teamId: team.id,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      _all: true,
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
    },
  };
}

// Generic review status update
export async function updateReviewStatus(
  teamSlug: string,
  reviewId: string,
  field: string,
  value: any
) {
  const session = await auth();
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

  // For GoogleReview, we can only update the responseFromOwnerText field
  // Other status fields like isRead, isImportant would need to be in ReviewMetadata
  if (field === 'reply') {
    const updatedReview = await prisma.googleReview.update({
      where: {
        id: reviewId,
        businessProfile: {
          teamId: team.id,
        },
      },
      data: {
        responseFromOwnerText: value as string,
        responseFromOwnerDate: new Date(),
      },
    });

    return updatedReview;
  } else {
    // For now, return success but don't update anything for isRead/isImportant
    // These would need to be stored in ReviewMetadata or a separate table
    return { message: 'Status field not supported yet' };
  }
}
