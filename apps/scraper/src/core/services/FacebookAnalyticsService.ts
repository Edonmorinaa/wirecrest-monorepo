/**
 * Facebook Analytics Service
 * Implements analytics for Facebook reviews using the SOLID principles
 * Facebook uses recommendation-based system (no star ratings)
 */

import type {
  IAnalyticsService,
  AnalyticsResult,
  AnalyticsData,
} from "../interfaces/IAnalyticsService";
import type { IReviewRepository } from "../interfaces/IReviewRepository";
import type { ISentimentAnalyzer } from "../interfaces/ISentimentAnalyzer";
import { prisma } from "@wirecrest/db";
import type { Prisma } from "@prisma/client";
import type {
  PeriodCalculator,
  PeriodKey,
  PERIOD_DEFINITIONS,
} from "./analytics/PeriodCalculator";
import type {
  KeywordExtractor,
  KeywordFrequency,
} from "./analytics/KeywordExtractor";
import type { ResponseAnalyzer } from "./analytics/ResponseAnalyzer";
import type {
  FacebookMetricsCalculator,
  FacebookRecommendationMetrics,
  FacebookEngagementMetrics,
  TagFrequency,
} from "./analytics/FacebookMetricsCalculator";

/**
 * Facebook Review with metadata
 * Facebook doesn't use star ratings - uses isRecommended boolean
 */
interface FacebookReviewWithMetadata {
  isRecommended: boolean;
  publishedAtDate: Date; // Changed from 'date' to match PeriodCalculator interface
  likesCount: number;
  commentsCount: number;
  tags: string[] | null;
  reviewMetadata?: {
    emotional?: string | null;
    keywords?: string[] | null;
    reply?: string | null;
    replyDate?: Date | null;
    sentiment?: number | null;
    photoCount?: number | null;
  } | null;
}

/**
 * Period-specific metrics for Facebook
 */
interface PeriodMetrics {
  totalReviews: number;
  recommendedCount: number;
  notRecommendedCount: number;
  recommendationRate: number;
  totalLikes: number;
  totalComments: number;
  totalPhotos: number;
  averageLikesPerReview: number;
  averageCommentsPerReview: number;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  topKeywords: KeywordFrequency[];
  topTags: TagFrequency[];
  responseRatePercent: number;
  avgResponseTimeHours: number | null;
}

export class FacebookAnalyticsService implements IAnalyticsService {
  constructor(
    private reviewRepository: IReviewRepository<FacebookReviewWithMetadata>,
    private sentimentAnalyzer?: ISentimentAnalyzer,
  ) {}

  /**
   * Process all reviews for a Facebook business profile and update analytics
   */
  async processReviews(businessProfileId: string): Promise<AnalyticsResult> {
    try {
      await this.processReviewsAndUpdateDashboard(businessProfileId);

      const analyticsData = await this.getAnalytics(businessProfileId);

      return {
        success: true,
        analyticsData: analyticsData || undefined,
      };
    } catch (error) {
      console.error(
        `[Facebook Analytics] Error processing reviews for ${businessProfileId}:`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get current analytics for a Facebook business profile
   */
  async getAnalytics(businessProfileId: string): Promise<AnalyticsData | null> {
    try {
      const overview = await prisma.facebookOverview.findUnique({
        where: { businessProfileId },
      });

      if (!overview) {
        return null;
      }

      return {
        businessId: businessProfileId,
        totalReviews: overview.totalReviews,
        averageRating: overview.recommendationRate / 20, // Convert 0-100% to 0-5 equivalent
        sentimentScore: overview.recommendationRate, // Use recommendation rate as sentiment
        lastUpdated: overview.lastUpdated,
        platform: "facebook",
      };
    } catch (error) {
      console.error(
        `[Facebook Analytics] Error fetching analytics for ${businessProfileId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Update analytics with new data
   */
  async updateAnalytics(
    businessProfileId: string,
    data: AnalyticsData,
  ): Promise<void> {
    await this.processReviewsAndUpdateDashboard(businessProfileId);
  }

  /**
   * Delete analytics for a business profile
   */
  async deleteAnalytics(businessProfileId: string): Promise<void> {
    await prisma.facebookOverview.deleteMany({
      where: { businessProfileId },
    });
  }

  /**
   * Main processing method - calculates all metrics and updates database
   */
  async processReviewsAndUpdateDashboard(
    businessProfileId: string,
  ): Promise<void> {
    console.log(
      `[Facebook Analytics] Starting review processing for businessProfileId: ${businessProfileId}`,
    );

    try {
      // Fetch all reviews with metadata using Prisma
      const allReviewsData = await prisma.facebookReview.findMany({
        where: { businessProfileId },
        include: {
          reviewMetadata: {
            select: {
              emotional: true,
              keywords: true,
              reply: true,
              replyDate: true,
              sentiment: true,
              photoCount: true,
            },
          },
        },
        orderBy: { date: "desc" },
      });

      console.log(
        `[Facebook Analytics] Fetched ${allReviewsData.length} reviews`,
      );

      if (allReviewsData.length === 0) {
        console.log(
          `[Facebook Analytics] No reviews found for businessProfileId: ${businessProfileId}`,
        );
        return;
      }

      // Map to our internal interface
      const allReviews: FacebookReviewWithMetadata[] = allReviewsData.map(
        (review) => ({
          isRecommended: review.isRecommended,
          publishedAtDate: review.date, // Map date to publishedAtDate
          likesCount: review.likesCount || 0,
          commentsCount: review.commentsCount || 0,
          tags: review.tags,
          reviewMetadata: review.reviewMetadata
            ? {
                emotional: review.reviewMetadata.emotional,
                keywords: review.reviewMetadata.keywords,
                reply: review.reviewMetadata.reply,
                replyDate: review.reviewMetadata.replyDate,
                sentiment: review.reviewMetadata.sentiment,
                photoCount: review.reviewMetadata.photoCount,
              }
            : null,
        }),
      );

      // Calculate all-time metrics
      const allTimeMetrics = this.calculateMetricsForPeriod(allReviews);

      // Calculate engagement and virality scores
      const engagementScore =
        FacebookMetricsCalculator.calculateEngagementScore(
          allTimeMetrics.totalReviews,
          allTimeMetrics.totalLikes,
          allTimeMetrics.totalComments,
          allTimeMetrics.totalPhotos,
          allTimeMetrics.responseRatePercent,
        );

      const viralityScore = FacebookMetricsCalculator.calculateViralityScore(
        allTimeMetrics.averageLikesPerReview,
        allTimeMetrics.averageCommentsPerReview,
        allTimeMetrics.recommendationRate,
      );

      // Upsert FacebookOverview
      await prisma.facebookOverview.upsert({
        where: { businessProfileId },
        create: {
          businessProfileId,
          totalReviews: allTimeMetrics.totalReviews,
          recommendedCount: allTimeMetrics.recommendedCount,
          notRecommendedCount: allTimeMetrics.notRecommendedCount,
          recommendationRate: allTimeMetrics.recommendationRate,
          totalLikes: allTimeMetrics.totalLikes,
          totalComments: allTimeMetrics.totalComments,
          totalPhotos: allTimeMetrics.totalPhotos,
          averageLikesPerReview: allTimeMetrics.averageLikesPerReview,
          averageCommentsPerReview: allTimeMetrics.averageCommentsPerReview,
          responseRate: allTimeMetrics.responseRatePercent,
          averageResponseTime: allTimeMetrics.avgResponseTimeHours,
          engagementScore,
          viralityScore,
          lastUpdated: new Date(),
        },
        update: {
          totalReviews: allTimeMetrics.totalReviews,
          recommendedCount: allTimeMetrics.recommendedCount,
          notRecommendedCount: allTimeMetrics.notRecommendedCount,
          recommendationRate: allTimeMetrics.recommendationRate,
          totalLikes: allTimeMetrics.totalLikes,
          totalComments: allTimeMetrics.totalComments,
          totalPhotos: allTimeMetrics.totalPhotos,
          averageLikesPerReview: allTimeMetrics.averageLikesPerReview,
          averageCommentsPerReview: allTimeMetrics.averageCommentsPerReview,
          responseRate: allTimeMetrics.responseRatePercent,
          averageResponseTime: allTimeMetrics.avgResponseTimeHours,
          engagementScore,
          viralityScore,
          lastUpdated: new Date(),
        },
      });

      console.log(
        `[Facebook Analytics] Updated FacebookOverview for businessProfileId: ${businessProfileId}`,
      );

      // Get the overview ID for linking period metrics
      const overview = await prisma.facebookOverview.findUnique({
        where: { businessProfileId },
        select: { id: true },
      });

      if (!overview) {
        throw new Error("Failed to create/update FacebookOverview");
      }

      // Process all periods
      const periods = PeriodCalculator.getAllPeriods();

      for (const periodKey of periods) {
        const periodReviews = PeriodCalculator.filterByPeriod(
          allReviews,
          periodKey,
        );
        const periodMetrics = this.calculateMetricsForPeriod(periodReviews);
        const period = PERIOD_DEFINITIONS[periodKey];

        // Calculate period-specific engagement metrics
        const averageEngagement =
          periodMetrics.totalReviews > 0
            ? (periodMetrics.totalLikes + periodMetrics.totalComments) /
              periodMetrics.totalReviews
            : 0;

        const sentimentScore =
          periodMetrics.sentimentCounts.total > 0
            ? ((periodMetrics.sentimentCounts.positive -
                periodMetrics.sentimentCounts.negative) /
                periodMetrics.sentimentCounts.total) *
              100
            : 0;

        const engagementRate = averageEngagement;

        const viralityIndex = FacebookMetricsCalculator.calculateViralityScore(
          periodMetrics.averageLikesPerReview,
          periodMetrics.averageCommentsPerReview,
          periodMetrics.recommendationRate,
        );

        // Upsert period metrics
        await prisma.facebookPeriodicalMetric.upsert({
          where: {
            facebookOverviewId_periodKey: {
              facebookOverviewId: overview.id,
              periodKey: periodKey,
            },
          },
          create: {
            facebookOverviewId: overview.id,
            periodKey: periodKey,
            periodLabel: period.label,
            recommendedCount: periodMetrics.recommendedCount,
            notRecommendedCount: periodMetrics.notRecommendedCount,
            recommendationRate: periodMetrics.recommendationRate,
            totalLikes: periodMetrics.totalLikes,
            totalComments: periodMetrics.totalComments,
            totalPhotos: periodMetrics.totalPhotos,
            averageEngagement,
            reviewCount: periodMetrics.totalReviews,
            sentimentPositive: periodMetrics.sentimentCounts.positive,
            sentimentNeutral: periodMetrics.sentimentCounts.neutral,
            sentimentNegative: periodMetrics.sentimentCounts.negative,
            sentimentTotal: periodMetrics.sentimentCounts.total,
            sentimentScore,
            responseRatePercent: periodMetrics.responseRatePercent,
            avgResponseTimeHours: periodMetrics.avgResponseTimeHours,
            engagementRate,
            viralityIndex,
          },
          update: {
            periodLabel: period.label,
            recommendedCount: periodMetrics.recommendedCount,
            notRecommendedCount: periodMetrics.notRecommendedCount,
            recommendationRate: periodMetrics.recommendationRate,
            totalLikes: periodMetrics.totalLikes,
            totalComments: periodMetrics.totalComments,
            totalPhotos: periodMetrics.totalPhotos,
            averageEngagement,
            reviewCount: periodMetrics.totalReviews,
            sentimentPositive: periodMetrics.sentimentCounts.positive,
            sentimentNeutral: periodMetrics.sentimentCounts.neutral,
            sentimentNegative: periodMetrics.sentimentCounts.negative,
            sentimentTotal: periodMetrics.sentimentCounts.total,
            sentimentScore,
            responseRatePercent: periodMetrics.responseRatePercent,
            avgResponseTimeHours: periodMetrics.avgResponseTimeHours,
            engagementRate,
            viralityIndex,
          },
        });

        console.log(
          `[Facebook Analytics] Updated period ${period.label} with ${periodMetrics.totalReviews} reviews`,
        );
      }

      console.log(
        `[Facebook Analytics] Successfully completed processing for businessProfileId: ${businessProfileId}`,
      );
    } catch (error) {
      console.error(
        `[Facebook Analytics] Error in processReviewsAndUpdateDashboard:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Calculate metrics for a given set of reviews
   */
  private calculateMetricsForPeriod(
    reviews: FacebookReviewWithMetadata[],
  ): PeriodMetrics {
    const reviewCount = reviews.length;

    if (reviewCount === 0) {
      return {
        totalReviews: 0,
        recommendedCount: 0,
        notRecommendedCount: 0,
        recommendationRate: 0,
        totalLikes: 0,
        totalComments: 0,
        totalPhotos: 0,
        averageLikesPerReview: 0,
        averageCommentsPerReview: 0,
        sentimentCounts: { positive: 0, neutral: 0, negative: 0, total: 0 },
        topKeywords: [],
        topTags: [],
        responseRatePercent: 0,
        avgResponseTimeHours: null,
      };
    }

    // Calculate recommendation metrics
    const recommendationMetrics =
      FacebookMetricsCalculator.calculateRecommendationMetrics(reviews);

    // Calculate engagement metrics
    const engagementMetrics =
      FacebookMetricsCalculator.calculateEngagementMetrics(reviews);

    // Calculate sentiment counts from emotional field
    const sentimentCounts = this.calculateSentimentCounts(reviews);

    // Extract top keywords
    const topKeywords = KeywordExtractor.extractFromReviews(reviews, 10);

    // Extract top tags with recommendation rates
    const topTags = FacebookMetricsCalculator.calculateTagFrequency(
      reviews,
      20,
    );

    // Calculate response metrics
    const { responseRate, averageResponseTimeHours } =
      ResponseAnalyzer.calculateResponseMetrics(
        reviews.map((r) => ({
          publishedAtDate: r.publishedAtDate,
          reviewMetadata: r.reviewMetadata,
        })),
      );

    return {
      totalReviews: reviewCount,
      recommendedCount: recommendationMetrics.recommendedCount,
      notRecommendedCount: recommendationMetrics.notRecommendedCount,
      recommendationRate: recommendationMetrics.recommendationRate,
      totalLikes: engagementMetrics.totalLikes,
      totalComments: engagementMetrics.totalComments,
      totalPhotos: engagementMetrics.totalPhotos,
      averageLikesPerReview: engagementMetrics.averageLikesPerReview,
      averageCommentsPerReview: engagementMetrics.averageCommentsPerReview,
      sentimentCounts,
      topKeywords,
      topTags,
      responseRatePercent: responseRate,
      avgResponseTimeHours: averageResponseTimeHours,
    };
  }

  /**
   * Calculate sentiment counts from emotional field
   * Facebook uses emotional analysis instead of numeric sentiment
   */
  private calculateSentimentCounts(reviews: FacebookReviewWithMetadata[]): {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  } {
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    reviews.forEach((review) => {
      const emotional = review.reviewMetadata?.emotional?.toLowerCase();
      if (emotional === "positive") {
        positive++;
      } else if (emotional === "negative") {
        negative++;
      } else {
        neutral++;
      }
    });

    return { positive, neutral, negative, total: reviews.length };
  }
}
