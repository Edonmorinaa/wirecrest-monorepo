import type { IAnalyticsService, AnalyticsResult, AnalyticsData } from '../interfaces/IAnalyticsService';
import type { IReviewRepository } from '../interfaces/IReviewRepository';
import type { ISentimentAnalyzer } from '../interfaces/ISentimentAnalyzer';
import type { GoogleReviewWithMetadata } from '../../types/extended-types.js';
import { prisma } from '@wirecrest/db';
import type { Prisma } from '@prisma/client';
import type { PeriodCalculator, PeriodKey, PERIOD_DEFINITIONS } from './analytics/PeriodCalculator';
import type { HistogramBuilder, RatingDistribution } from './analytics/HistogramBuilder';
import type { KeywordExtractor, KeywordFrequency } from './analytics/KeywordExtractor';
import type { ResponseAnalyzer } from './analytics/ResponseAnalyzer';

/**
 * Google Analytics Service
 * Follows Single Responsibility Principle (SRP) - only handles Google analytics
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 * 
 * Complete implementation with:
 * - Period-based metrics (1d, 3d, 7d, 30d, 180d, 365d, all-time)
 * - Rating distribution histograms
 * - Sentiment analysis
 * - Keyword extraction
 * - Response rate tracking
 * - Dashboard table updates
 */

interface ReviewWithMetadata {
  rating: number | null;
  stars: number | null;
  publishedAtDate: Date;
  reviewMetadata?: {
    emotional?: string | null;
    keywords?: string[] | null;
    reply?: string | null;
    replyDate?: Date | null;
    sentiment?: number | null;
  } | null;
  responseFromOwnerText?: string | null;
  responseFromOwnerDate?: Date | null;
}

interface PeriodMetrics {
  avgRating: number | null;
  reviewCount: number;
  ratingDistribution: RatingDistribution;
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

export class GoogleAnalyticsService implements IAnalyticsService {
  constructor(
    private reviewRepository: IReviewRepository<GoogleReviewWithMetadata>,
    private sentimentAnalyzer?: ISentimentAnalyzer
  ) {}

  /**
   * Main analytics processing method
   * Processes all reviews and updates dashboard with period-based metrics
   */
  async processReviewsAndUpdateDashboard(businessProfileId: string): Promise<void> {
    console.log(`[Google Analytics] Starting analytics processing for businessProfileId: ${businessProfileId}`);
    
    try {
      // Fetch business profile
      const businessProfile = await prisma.googleBusinessProfile.findUnique({
        where: { id: businessProfileId },
        select: {
          id: true,
          teamId: true,
          displayName: true,
          formattedAddress: true,
          websiteUri: true,
          businessStatus: true,
        },
      });

      if (!businessProfile) {
        throw new Error(`Business profile ${businessProfileId} not found`);
      }

      console.log(`[Google Analytics] Processing for "${businessProfile.displayName}" (Team: ${businessProfile.teamId})`);

      // Fetch all reviews with metadata
      const allReviews = await prisma.googleReview.findMany({
        where: { businessProfileId },
        select: {
          rating: true,
          stars: true,
          publishedAtDate: true,
          responseFromOwnerText: true,
          responseFromOwnerDate: true,
          reviewMetadata: {
            select: {
              emotional: true,
              keywords: true,
              reply: true,
              replyDate: true,
              sentiment: true,
            },
          },
        },
        orderBy: { publishedAtDate: 'desc' },
      });

      console.log(`[Google Analytics] Fetched ${allReviews.length} reviews with metadata`);

      // Calculate all-time metrics for overview
      const allTimeMetrics = this.calculateMetricsForPeriod(allReviews);

      // Upsert GoogleOverview record
      await prisma.googleOverview.upsert({
        where: { businessProfileId },
        create: {
          businessProfileId,
          teamId: businessProfile.teamId,
          lastRefreshedAt: new Date(),
          profileDisplayName: businessProfile.displayName,
          profileFormattedAddress: businessProfile.formattedAddress,
          profileWebsiteUri: businessProfile.websiteUri,
          profileBusinessStatus: businessProfile.businessStatus,
          currentOverallRating: allTimeMetrics.avgRating,
          currentTotalReviews: allTimeMetrics.reviewCount,
          isOpenNow: null,
        },
        update: {
          lastRefreshedAt: new Date(),
          profileDisplayName: businessProfile.displayName,
          profileFormattedAddress: businessProfile.formattedAddress,
          profileWebsiteUri: businessProfile.websiteUri,
          profileBusinessStatus: businessProfile.businessStatus,
          currentOverallRating: allTimeMetrics.avgRating,
          currentTotalReviews: allTimeMetrics.reviewCount,
        },
      });

      // Get the overview ID for linking period metrics
      const overview = await prisma.googleOverview.findUnique({
        where: { businessProfileId },
        select: { id: true },
      });

      if (!overview) {
        throw new Error('Failed to create/update GoogleOverview');
      }

      // Process all periods
      const periods = PeriodCalculator.getAllPeriods();
      
      for (const periodKey of periods) {
        const periodReviews = PeriodCalculator.filterByPeriod<typeof allReviews[number]>(allReviews, periodKey);
        const periodMetrics = this.calculateMetricsForPeriod(periodReviews);
        const period = PERIOD_DEFINITIONS[periodKey];

        // Upsert period metrics
        await prisma.periodicalMetric.upsert({
          where: {
            googleOverviewId_periodKey: {
              googleOverviewId: overview.id,
              periodKey: periodKey,
            },
          },
          create: {
            googleOverviewId: overview.id,
            periodKey: periodKey,
            periodLabel: period.label,
            avgRating: periodMetrics.avgRating,
            reviewCount: periodMetrics.reviewCount,
            ratingDistribution: periodMetrics.ratingDistribution as unknown as Prisma.InputJsonValue,
            sentimentPositive: periodMetrics.sentimentCounts.positive,
            sentimentNeutral: periodMetrics.sentimentCounts.neutral,
            sentimentNegative: periodMetrics.sentimentCounts.negative,
            sentimentTotal: periodMetrics.sentimentCounts.total,
            topKeywords: periodMetrics.topKeywords as unknown as Prisma.InputJsonValue,
            responseRatePercent: periodMetrics.responseRatePercent,
            avgResponseTimeHours: periodMetrics.avgResponseTimeHours,
          },
          update: {
            periodLabel: period.label,
            avgRating: periodMetrics.avgRating,
            reviewCount: periodMetrics.reviewCount,
            ratingDistribution: periodMetrics.ratingDistribution as unknown as Prisma.InputJsonValue,
            sentimentPositive: periodMetrics.sentimentCounts.positive,
            sentimentNeutral: periodMetrics.sentimentCounts.neutral,
            sentimentNegative: periodMetrics.sentimentCounts.negative,
            sentimentTotal: periodMetrics.sentimentCounts.total,
            topKeywords: periodMetrics.topKeywords as unknown as Prisma.InputJsonValue,
            responseRatePercent: periodMetrics.responseRatePercent,
            avgResponseTimeHours: periodMetrics.avgResponseTimeHours,
          },
        });
      }

      console.log(`✅ [Google Analytics] Successfully updated dashboard for ${businessProfile.displayName}`);
    } catch (error) {
      console.error(`❌ [Google Analytics] Error processing analytics:`, error);
      throw error;
    }
  }

  /**
   * Calculate metrics for a specific period
   */
  private calculateMetricsForPeriod<T extends {
    rating?: number | null;
    stars?: number | null;
    publishedAtDate: Date | string;
    reviewMetadata?: {
      emotional?: string | null;
      keywords?: string[] | null;
      reply?: string | null;
      replyDate?: Date | null;
      sentiment?: number | null;
    } | null;
    responseFromOwnerText?: string | null;
    responseFromOwnerDate?: Date | null;
  }>(reviews: T[]): PeriodMetrics {
    const reviewCount = reviews.length;

    if (reviewCount === 0) {
      return {
        avgRating: null,
        reviewCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        sentimentCounts: { positive: 0, neutral: 0, negative: 0, total: 0 },
        topKeywords: [],
        responseRatePercent: 0,
        avgResponseTimeHours: null,
      };
    }

    // Extract ratings (prefer stars over rating field)
    const ratings = reviews.map(r => r.stars ?? r.rating ?? 0).filter(r => r > 0);

    // Calculate average rating
    const avgRating = HistogramBuilder.calculateAverageRating(ratings);

    // Build rating distribution
    const ratingDistribution = HistogramBuilder.buildRatingDistribution(ratings);

    // Build sentiment distribution
    const sentimentCounts = HistogramBuilder.buildSentimentFromRatings(ratings);

    // Extract top keywords
    const topKeywords = KeywordExtractor.extractFromReviews(
      reviews.map(r => ({
        text: null, // Google reviews don't always have text in our sample
        reviewMetadata: r.reviewMetadata,
      })),
      20
    );

    // Calculate response metrics
    const responseMetrics = ResponseAnalyzer.calculateResponseMetrics(reviews);

    return {
      avgRating,
      reviewCount,
      ratingDistribution,
      sentimentCounts,
      topKeywords,
      responseRatePercent: responseMetrics.responseRate,
      avgResponseTimeHours: responseMetrics.averageResponseTimeHours,
    };
  }

  async processReviews(businessId: string): Promise<AnalyticsResult> {
    try {
      await this.processReviewsAndUpdateDashboard(businessId);
      
      // Fetch the analytics data
      const analyticsData = await this.getAnalytics(businessId);
      
      if (!analyticsData) {
        return {
          success: false,
          error: 'Failed to retrieve analytics after processing',
        };
      }

      return {
        success: true,
        analyticsData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getAnalytics(businessId: string): Promise<AnalyticsData | null> {
    try {
      const overview = await prisma.googleOverview.findUnique({
        where: { businessProfileId: businessId },
      });

      if (!overview) {
        return null;
      }

      return {
        businessId,
        totalReviews: overview.currentTotalReviews ?? 0,
        averageRating: overview.currentOverallRating ?? 0,
        sentimentScore: 0, // Calculate from sentiment counts if needed
        lastUpdated: overview.lastRefreshedAt ?? new Date(),
        platform: 'Google',
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return null;
    }
  }

  async updateAnalytics(businessId: string, data: AnalyticsData): Promise<void> {
    // This is handled by processReviewsAndUpdateDashboard
    await this.processReviewsAndUpdateDashboard(businessId);
  }

  async deleteAnalytics(businessId: string): Promise<void> {
    try {
      await prisma.googleOverview.delete({
        where: { businessProfileId: businessId },
      });
    } catch (error) {
      console.error('Error deleting analytics:', error);
      throw error;
    }
  }
}
