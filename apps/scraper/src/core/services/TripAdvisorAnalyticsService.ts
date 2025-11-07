/**
 * TripAdvisor Analytics Service
 * Implements analytics for TripAdvisor reviews using SOLID principles
 * TripAdvisor uses 1-5 bubble ratings with 8 sub-ratings and trip type categorization
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
  HistogramBuilder,
  RatingDistribution,
} from "./analytics/HistogramBuilder";
import type {
  KeywordExtractor,
  KeywordFrequency,
} from "./analytics/KeywordExtractor";
import type { ResponseAnalyzer } from "./analytics/ResponseAnalyzer";
import type {
  TripAdvisorMetricsCalculator,
  TripAdvisorSubRatings,
  TripAdvisorSubRatingAverages,
  TripTypeCounts,
  HelpfulVotesMetrics,
} from "./analytics/TripAdvisorMetricsCalculator";

/**
 * TripAdvisor Review with metadata
 * TripAdvisor uses 1-5 bubble ratings (same as Google stars)
 */
interface TripAdvisorReviewWithMetadata {
  rating: number; // 1-5 bubbles
  publishedAtDate: Date;
  visitDate?: Date | null;
  helpfulVotes: number;
  tripType?: string | null;
  roomTip?: string | null;
  hasOwnerResponse: boolean;
  responseFromOwnerDate?: Date | null;
  subRatings?: TripAdvisorSubRatings | null;
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
 * Period-specific metrics for TripAdvisor
 */
interface PeriodMetrics {
  totalReviews: number;
  avgRating: number | null;
  ratingDistribution: RatingDistribution;
  subRatingAverages: TripAdvisorSubRatingAverages;
  tripTypeCounts: TripTypeCounts;
  helpfulVotesMetrics: HelpfulVotesMetrics;
  reviewsWithPhotos: number;
  reviewsWithRoomTips: number;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  topKeywords: KeywordFrequency[];
  responseRatePercent: number;
  avgResponseTimeHours: number | null;
}

export class TripAdvisorAnalyticsService implements IAnalyticsService {
  constructor(
    private reviewRepository: IReviewRepository<TripAdvisorReviewWithMetadata>,
    private sentimentAnalyzer?: ISentimentAnalyzer,
  ) {}

  /**
   * Process all reviews for a TripAdvisor business profile and update analytics
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
        `[TripAdvisor Analytics] Error processing reviews for ${businessProfileId}:`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get current analytics for a TripAdvisor business profile
   */
  async getAnalytics(businessProfileId: string): Promise<AnalyticsData | null> {
    try {
      const overview = await prisma.tripAdvisorOverview.findUnique({
        where: { businessProfileId },
      });

      if (!overview) {
        return null;
      }

      return {
        businessId: businessProfileId,
        totalReviews: overview.totalReviews,
        averageRating: overview.averageRating || 0,
        sentimentScore: overview.averageRating
          ? (overview.averageRating / 5) * 100
          : 0,
        lastUpdated: overview.lastUpdated,
        platform: "tripadvisor",
      };
    } catch (error) {
      console.error(
        `[TripAdvisor Analytics] Error fetching analytics for ${businessProfileId}:`,
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
    await prisma.tripAdvisorOverview.deleteMany({
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
      `[TripAdvisor Analytics] Starting review processing for businessProfileId: ${businessProfileId}`,
    );

    try {
      // Fetch all reviews with metadata and sub-ratings using Prisma
      const allReviewsData = await prisma.tripAdvisorReview.findMany({
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
          subRatings: true,
        },
        orderBy: { publishedDate: "desc" },
      });

      console.log(
        `[TripAdvisor Analytics] Fetched ${allReviewsData.length} reviews`,
      );

      if (allReviewsData.length === 0) {
        console.log(
          `[TripAdvisor Analytics] No reviews found for businessProfileId: ${businessProfileId}`,
        );
        return;
      }

      // Map to our internal interface
      const allReviews: TripAdvisorReviewWithMetadata[] = allReviewsData.map(
        (review) => {
          return {
            rating: review.rating,
            publishedAtDate: review.publishedDate,
            visitDate: review.visitDate,
            helpfulVotes: review.helpfulVotes || 0,
            tripType: review.tripType,
            roomTip: review.roomTip,
            hasOwnerResponse: review.hasOwnerResponse,
            responseFromOwnerDate: review.responseFromOwnerDate,
            subRatings: review.subRatings || null,
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
          };
        },
      );

      // Calculate all-time metrics
      const allTimeMetrics = this.calculateMetricsForPeriod(allReviews);

      // Upsert TripAdvisorOverview
      await prisma.tripAdvisorOverview.upsert({
        where: { businessProfileId },
        create: {
          businessProfileId,
          totalReviews: allTimeMetrics.totalReviews,
          averageRating: allTimeMetrics.avgRating,
          oneStarCount: allTimeMetrics.ratingDistribution["1"] || 0,
          twoStarCount: allTimeMetrics.ratingDistribution["2"] || 0,
          threeStarCount: allTimeMetrics.ratingDistribution["3"] || 0,
          fourStarCount: allTimeMetrics.ratingDistribution["4"] || 0,
          fiveStarCount: allTimeMetrics.ratingDistribution["5"] || 0,
          averageServiceRating:
            allTimeMetrics.subRatingAverages.averageServiceRating,
          averageFoodRating: allTimeMetrics.subRatingAverages.averageFoodRating,
          averageValueRating:
            allTimeMetrics.subRatingAverages.averageValueRating,
          averageAtmosphereRating:
            allTimeMetrics.subRatingAverages.averageAtmosphereRating,
          averageCleanlinessRating:
            allTimeMetrics.subRatingAverages.averageCleanlinessRating,
          averageLocationRating:
            allTimeMetrics.subRatingAverages.averageLocationRating,
          averageRoomsRating:
            allTimeMetrics.subRatingAverages.averageRoomsRating,
          averageSleepQualityRating:
            allTimeMetrics.subRatingAverages.averageSleepQualityRating,
          familyReviews: allTimeMetrics.tripTypeCounts.familyReviews,
          couplesReviews: allTimeMetrics.tripTypeCounts.couplesReviews,
          soloReviews: allTimeMetrics.tripTypeCounts.soloReviews,
          businessReviews: allTimeMetrics.tripTypeCounts.businessReviews,
          friendsReviews: allTimeMetrics.tripTypeCounts.friendsReviews,
          helpfulVotesTotal:
            allTimeMetrics.helpfulVotesMetrics.totalHelpfulVotes,
          averageHelpfulVotes:
            allTimeMetrics.helpfulVotesMetrics.averageHelpfulVotes,
          responseRate: allTimeMetrics.responseRatePercent,
          averageResponseTime: allTimeMetrics.avgResponseTimeHours,
          lastUpdated: new Date(),
        },
        update: {
          totalReviews: allTimeMetrics.totalReviews,
          averageRating: allTimeMetrics.avgRating,
          oneStarCount: allTimeMetrics.ratingDistribution["1"] || 0,
          twoStarCount: allTimeMetrics.ratingDistribution["2"] || 0,
          threeStarCount: allTimeMetrics.ratingDistribution["3"] || 0,
          fourStarCount: allTimeMetrics.ratingDistribution["4"] || 0,
          fiveStarCount: allTimeMetrics.ratingDistribution["5"] || 0,
          averageServiceRating:
            allTimeMetrics.subRatingAverages.averageServiceRating,
          averageFoodRating: allTimeMetrics.subRatingAverages.averageFoodRating,
          averageValueRating:
            allTimeMetrics.subRatingAverages.averageValueRating,
          averageAtmosphereRating:
            allTimeMetrics.subRatingAverages.averageAtmosphereRating,
          averageCleanlinessRating:
            allTimeMetrics.subRatingAverages.averageCleanlinessRating,
          averageLocationRating:
            allTimeMetrics.subRatingAverages.averageLocationRating,
          averageRoomsRating:
            allTimeMetrics.subRatingAverages.averageRoomsRating,
          averageSleepQualityRating:
            allTimeMetrics.subRatingAverages.averageSleepQualityRating,
          familyReviews: allTimeMetrics.tripTypeCounts.familyReviews,
          couplesReviews: allTimeMetrics.tripTypeCounts.couplesReviews,
          soloReviews: allTimeMetrics.tripTypeCounts.soloReviews,
          businessReviews: allTimeMetrics.tripTypeCounts.businessReviews,
          friendsReviews: allTimeMetrics.tripTypeCounts.friendsReviews,
          helpfulVotesTotal:
            allTimeMetrics.helpfulVotesMetrics.totalHelpfulVotes,
          averageHelpfulVotes:
            allTimeMetrics.helpfulVotesMetrics.averageHelpfulVotes,
          responseRate: allTimeMetrics.responseRatePercent,
          averageResponseTime: allTimeMetrics.avgResponseTimeHours,
          lastUpdated: new Date(),
        },
      });

      console.log(
        `[TripAdvisor Analytics] Updated TripAdvisorOverview for businessProfileId: ${businessProfileId}`,
      );

      // Get the overview ID for linking period metrics
      const overview = await prisma.tripAdvisorOverview.findUnique({
        where: { businessProfileId },
        select: { id: true },
      });

      if (!overview) {
        throw new Error("Failed to create/update TripAdvisorOverview");
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

        // Calculate sentiment score
        const sentimentScore =
          periodMetrics.sentimentCounts.total > 0
            ? ((periodMetrics.sentimentCounts.positive -
                periodMetrics.sentimentCounts.negative) /
                periodMetrics.sentimentCounts.total) *
              100
            : 0;

        // Upsert period metrics (Note: TripAdvisor doesn't have unique constraint on periodKey)
        // So we need to delete existing and create new
        await prisma.tripAdvisorPeriodicalMetric.deleteMany({
          where: {
            tripAdvisorOverviewId: overview.id,
            periodKey: periodKey,
          },
        });

        await prisma.tripAdvisorPeriodicalMetric.create({
          data: {
            tripAdvisorOverviewId: overview.id,
            periodKey: periodKey,
            periodLabel: period.label,
            averageRating: periodMetrics.avgRating || 0,
            oneStarCount: periodMetrics.ratingDistribution["1"] || 0,
            twoStarCount: periodMetrics.ratingDistribution["2"] || 0,
            threeStarCount: periodMetrics.ratingDistribution["3"] || 0,
            fourStarCount: periodMetrics.ratingDistribution["4"] || 0,
            fiveStarCount: periodMetrics.ratingDistribution["5"] || 0,
            reviewCount: periodMetrics.totalReviews,
            averageServiceRating:
              periodMetrics.subRatingAverages.averageServiceRating,
            averageFoodRating:
              periodMetrics.subRatingAverages.averageFoodRating,
            averageValueRating:
              periodMetrics.subRatingAverages.averageValueRating,
            averageAtmosphereRating:
              periodMetrics.subRatingAverages.averageAtmosphereRating,
            averageCleanlinessRating:
              periodMetrics.subRatingAverages.averageCleanlinessRating,
            averageLocationRating:
              periodMetrics.subRatingAverages.averageLocationRating,
            averageRoomsRating:
              periodMetrics.subRatingAverages.averageRoomsRating,
            averageSleepQualityRating:
              periodMetrics.subRatingAverages.averageSleepQualityRating,
            familyReviews: periodMetrics.tripTypeCounts.familyReviews,
            couplesReviews: periodMetrics.tripTypeCounts.couplesReviews,
            soloReviews: periodMetrics.tripTypeCounts.soloReviews,
            businessReviews: periodMetrics.tripTypeCounts.businessReviews,
            friendsReviews: periodMetrics.tripTypeCounts.friendsReviews,
            totalHelpfulVotes:
              periodMetrics.helpfulVotesMetrics.totalHelpfulVotes,
            averageHelpfulVotes:
              periodMetrics.helpfulVotesMetrics.averageHelpfulVotes,
            reviewsWithPhotos: periodMetrics.reviewsWithPhotos,
            responseRatePercent: periodMetrics.responseRatePercent,
            avgResponseTimeHours: periodMetrics.avgResponseTimeHours,
            sentimentPositive: periodMetrics.sentimentCounts.positive,
            sentimentNeutral: periodMetrics.sentimentCounts.neutral,
            sentimentNegative: periodMetrics.sentimentCounts.negative,
            sentimentTotal: periodMetrics.sentimentCounts.total,
            sentimentScore,
          },
        });

        console.log(
          `[TripAdvisor Analytics] Updated period ${period.label} with ${periodMetrics.totalReviews} reviews`,
        );
      }

      console.log(
        `[TripAdvisor Analytics] Successfully completed processing for businessProfileId: ${businessProfileId}`,
      );
    } catch (error) {
      console.error(
        `[TripAdvisor Analytics] Error in processReviewsAndUpdateDashboard:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Calculate metrics for a given set of reviews
   */
  private calculateMetricsForPeriod(
    reviews: TripAdvisorReviewWithMetadata[],
  ): PeriodMetrics {
    const reviewCount = reviews.length;

    if (reviewCount === 0) {
      return {
        totalReviews: 0,
        avgRating: null,
        ratingDistribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        subRatingAverages: {
          averageServiceRating: null,
          averageFoodRating: null,
          averageValueRating: null,
          averageAtmosphereRating: null,
          averageCleanlinessRating: null,
          averageLocationRating: null,
          averageRoomsRating: null,
          averageSleepQualityRating: null,
        },
        tripTypeCounts: {
          familyReviews: 0,
          couplesReviews: 0,
          soloReviews: 0,
          businessReviews: 0,
          friendsReviews: 0,
        },
        helpfulVotesMetrics: {
          totalHelpfulVotes: 0,
          averageHelpfulVotes: 0,
        },
        reviewsWithPhotos: 0,
        reviewsWithRoomTips: 0,
        sentimentCounts: { positive: 0, neutral: 0, negative: 0, total: 0 },
        topKeywords: [],
        responseRatePercent: 0,
        avgResponseTimeHours: null,
      };
    }

    // Calculate rating distribution and average (1-5 scale)
    const ratings = reviews.map((r) => r.rating);
    const ratingDistribution =
      HistogramBuilder.buildRatingDistribution(ratings);
    const avgRating = HistogramBuilder.calculateAverageRating(ratings);

    // Calculate sub-rating averages
    const subRatingAverages =
      TripAdvisorMetricsCalculator.calculateSubRatings(reviews);

    // Calculate trip type distribution
    const tripTypeCounts =
      TripAdvisorMetricsCalculator.calculateTripTypeDistribution(reviews);

    // Calculate helpful votes metrics
    const helpfulVotesMetrics =
      TripAdvisorMetricsCalculator.calculateHelpfulVotesMetrics(reviews);

    // Count reviews with photos
    const reviewsWithPhotos =
      TripAdvisorMetricsCalculator.countReviewsWithPhotos(
        reviews.map((r) => ({ photoCount: r.reviewMetadata?.photoCount })),
      );

    // Count reviews with room tips
    const reviewsWithRoomTips =
      TripAdvisorMetricsCalculator.countReviewsWithRoomTips(reviews);

    // Calculate sentiment from rating-based bucketing
    const sentimentCounts = HistogramBuilder.buildSentimentFromRatings(ratings);

    // Extract top keywords
    const topKeywords = KeywordExtractor.extractFromReviews(
      reviews.map((r) => ({
        text: null, // TripAdvisor doesn't have text field in this context
        reviewMetadata: r.reviewMetadata,
      })),
      10,
    );

    // Calculate response metrics
    const { responseRate, averageResponseTimeHours } =
      ResponseAnalyzer.calculateResponseMetrics(
        reviews.map((r) => ({
          publishedAtDate: r.publishedAtDate,
          responseFromOwnerText: r.hasOwnerResponse ? "yes" : null,
          responseFromOwnerDate: r.responseFromOwnerDate,
          reviewMetadata: r.reviewMetadata,
        })),
      );

    return {
      totalReviews: reviewCount,
      avgRating,
      ratingDistribution,
      subRatingAverages,
      tripTypeCounts,
      helpfulVotesMetrics,
      reviewsWithPhotos,
      reviewsWithRoomTips,
      sentimentCounts,
      topKeywords,
      responseRatePercent: responseRate,
      avgResponseTimeHours: averageResponseTimeHours,
    };
  }
}
