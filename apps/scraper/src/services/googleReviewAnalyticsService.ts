/**
 * @deprecated This file is kept for reference only
 * Analytics are now computed on-demand via tRPC procedures in the dashboard app
 * DO NOT USE - will be removed in future cleanup
 * 
 * Historical note: This previously calculated periodical metrics
 * and updated GoogleOverview and PeriodicalMetric tables (now removed from schema)
 * 
 * See: apps/dashboard/src/server/trpc/routers/locations.router.ts for new implementation
 */

import { prisma } from '@wirecrest/db';
import type { Prisma } from '@prisma/client';
import { sendNotification } from '../utils/notificationHelper';

// Define specific types for reviews with metadata for clarity in functions
interface ReviewWithMetadata {
  rating: number | null;
  stars: number | null;
  publishedAtDate: Date;
  reviewMetadata: {
    emotional?: string | null;
    keywords?: string[] | null;
    reply?: string | null;
    replyDate?: Date | null;
    date?: Date | null;
  } | null;
}

interface KeywordFrequency {
  keyword: string;
  count: number;
}

// Structure for period-based aggregated metrics
interface PeriodMetricsData {
  avgRating: number | null;
  reviewCount: number;
  ratingDistribution: { [key: string]: number }; // { "1": count, "2": count, "3": count, "4": count, "5": count }
  sentimentCounts: { positive: number; neutral: number; negative: number; total: number };
  topKeywords: KeywordFrequency[];
  responseRatePercent: number;
  avgResponseTimeHours: number | null;
}

// Define the keys for our periods explicitly for type safety and iteration
const PERIOD_DEFINITIONS: Record<number, { days: number | null; label: string }> = {
  1: { days: 1, label: 'Last 1 Day' },
  3: { days: 3, label: 'Last 3 Days' },
  7: { days: 7, label: 'Last 7 Days' },
  30: { days: 30, label: 'Last 30 Days' },
  180: { days: 180, label: 'Last 6 Months' }, // Approx 6 months
  365: { days: 365, label: 'Last 12 Months' }, // Approx 12 months
  0: { days: null, label: 'All Time' } // Special case for all reviews
};

type PeriodKeys = keyof typeof PERIOD_DEFINITIONS;

export class GoogleReviewAnalyticsService {
  constructor() {
    // No initialization needed for Prisma
  }

  /**
   * Processes all reviews for a given business profile and updates its dashboard.
   * This should be called after new reviews are fetched or on a scheduled basis.
   */
  async processReviewsAndUpdateDashboard(businessProfileId: string): Promise<void> {
    console.log(`[Analytics] Starting review processing for businessProfileId: ${businessProfileId}`);
    try {
      const businessProfile = await prisma.googleBusinessProfile.findUnique({
        where: { id: businessProfileId },
        select: {
          id: true,
          teamId: true,
          displayName: true,
          formattedAddress: true,
          websiteUri: true,
          businessStatus: true
        }
      });

      if (!businessProfile) {
        console.error(`[Analytics] Error fetching business profile ${businessProfileId}`);
        throw new Error(`Business profile ${businessProfileId} not found.`);
      }
      console.log(`[Analytics] Processing for "${businessProfile.displayName}" (Team: ${businessProfile.teamId})`);

      // Fetch reviews with metadata using Prisma
      const allReviewsData = await prisma.googleReview.findMany({
        where: { businessProfileId },
        select: {
          rating: true,
          stars: true,
          publishedAtDate: true,
          reviewMetadata: {
            select: {
              emotional: true,
              keywords: true,
              reply: true,
              replyDate: true,
              date: true
            }
          }
        },
        orderBy: { publishedAtDate: 'desc' }
      });

      console.log(`[Analytics] Fetched ${allReviewsData?.length || 0} reviews with metadata`);

      // Map the Prisma response to our expected interface structure
      const allReviews: ReviewWithMetadata[] = allReviewsData.map(review => ({
        rating: review.rating,
        stars: review.stars,
        publishedAtDate: review.publishedAtDate,
        reviewMetadata: review.reviewMetadata
      }));

      // Fetch existing overview to compare for rating changes
      const existingOverview = await prisma.googleOverview.findUnique({
        where: { businessProfileId },
        select: { currentOverallRating: true, currentTotalReviews: true }
      });

      const currentDate = new Date();
      const allTimeMetricsForSnapshot = this.calculateMetricsForPeriod(allReviews);

      // Upsert GoogleOverview using Prisma
      const upsertedOverview = await prisma.googleOverview.upsert({
        where: { businessProfileId },
        create: {
          businessProfileId: businessProfileId,
          teamId: businessProfile.teamId,
          lastRefreshedAt: currentDate,
          profileDisplayName: businessProfile.displayName,
          profileFormattedAddress: businessProfile.formattedAddress,
          profileWebsiteUri: businessProfile.websiteUri,
          profileBusinessStatus: businessProfile.businessStatus,
          currentOverallRating: allTimeMetricsForSnapshot.avgRating,
          currentTotalReviews: allTimeMetricsForSnapshot.reviewCount,
          isOpenNow: null,
        },
        update: {
          lastRefreshedAt: currentDate,
          profileDisplayName: businessProfile.displayName,
          profileFormattedAddress: businessProfile.formattedAddress,
          profileWebsiteUri: businessProfile.websiteUri,
          profileBusinessStatus: businessProfile.businessStatus,
          currentOverallRating: allTimeMetricsForSnapshot.avgRating,
          currentTotalReviews: allTimeMetricsForSnapshot.reviewCount,
          isOpenNow: null,
        },
        select: { id: true }
      });

      const GoogleOverviewId = upsertedOverview.id;
      console.log(`[Analytics] Upserted GoogleOverview with id: ${GoogleOverviewId}`);

      // Calculate and upsert PeriodicalMetric records
      for (const periodKeyStr of Object.keys(PERIOD_DEFINITIONS)) {
        const periodKey = parseInt(periodKeyStr) as PeriodKeys;
        const periodInfo = PERIOD_DEFINITIONS[periodKey];
        let reviewsInPeriod: ReviewWithMetadata[];

        if (periodKey === 0) {
          reviewsInPeriod = allReviews;
        } else {
          const now = new Date();
          const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          const startDate = new Date(endDate.getTime() - (periodInfo.days! * 24 * 60 * 60 * 1000));
          startDate.setHours(0, 0, 0, 0);

          reviewsInPeriod = allReviews.filter(r => {
            const reviewDate = r.publishedAtDate;
            return reviewDate >= startDate && reviewDate <= endDate;
          });
        }

        console.log(`[Analytics] Found ${reviewsInPeriod.length} reviews for period: ${periodInfo.label}`);
        const metrics = this.calculateMetricsForPeriod(reviewsInPeriod);

        // Upsert period metrics
        await prisma.periodicalMetric.upsert({
          where: {
            googleOverviewId_periodKey: {
              googleOverviewId: GoogleOverviewId,
              periodKey: periodKey,
            },
          },
          create: {
            googleOverviewId: GoogleOverviewId,
            periodKey: periodKey,
            periodLabel: periodInfo.label,
            avgRating: metrics.avgRating,
            reviewCount: metrics.reviewCount,
            ratingDistribution: metrics.ratingDistribution as unknown as Prisma.InputJsonValue,
            sentimentPositive: metrics.sentimentCounts.positive,
            sentimentNeutral: metrics.sentimentCounts.neutral,
            sentimentNegative: metrics.sentimentCounts.negative,
            sentimentTotal: metrics.sentimentCounts.total,
            topKeywords: metrics.topKeywords as unknown as Prisma.InputJsonValue,
            responseRatePercent: metrics.responseRatePercent,
            avgResponseTimeHours: metrics.avgResponseTimeHours,
          },
          update: {
            periodLabel: periodInfo.label,
            avgRating: metrics.avgRating,
            reviewCount: metrics.reviewCount,
            ratingDistribution: metrics.ratingDistribution as unknown as Prisma.InputJsonValue,
            sentimentPositive: metrics.sentimentCounts.positive,
            sentimentNeutral: metrics.sentimentCounts.neutral,
            sentimentNegative: metrics.sentimentCounts.negative,
            sentimentTotal: metrics.sentimentCounts.total,
            topKeywords: metrics.topKeywords as unknown as Prisma.InputJsonValue,
            responseRatePercent: metrics.responseRatePercent,
            avgResponseTimeHours: metrics.avgResponseTimeHours,
          },
        });
      }

      console.log(`[Analytics] Successfully processed and upserted all periodical metrics`);

      // Check for rating changes and send notifications
      if (existingOverview) {
        const currentRating = allTimeMetricsForSnapshot.avgRating || 0;
        const previousRating = existingOverview.currentOverallRating || 0;
        const ratingDrop = previousRating - currentRating;

        if (ratingDrop >= 0.5) {
          await sendNotification({
            type: 'project',
            scope: 'team',
            teamId: businessProfile.teamId,
            title: 'Rating Alert',
            category: `Rating dropped by ${ratingDrop.toFixed(1)} stars`,
            avatarUrl: null,
            metadata: {
              businessProfileId,
              businessName: businessProfile.displayName,
              previousRating,
              currentRating,
              drop: ratingDrop
            },
            expiresInDays: 14
          });
        }

        // Review milestone notifications
        const milestones = [50, 100, 250, 500, 1000];
        const currentTotal = allTimeMetricsForSnapshot.reviewCount;
        const previousTotal = existingOverview.currentTotalReviews || 0;

        if (milestones.includes(currentTotal) && currentTotal !== previousTotal) {
          await sendNotification({
            type: 'tags',
            scope: 'team',
            teamId: businessProfile.teamId,
            title: 'Milestone Achieved',
            category: `Reached ${currentTotal} reviews!`,
            avatarUrl: null,
            metadata: {
              businessProfileId,
              businessName: businessProfile.displayName,
              milestone: currentTotal
            },
            expiresInDays: 30
          });
        }
      }

      console.log(`[Analytics] Successfully processed reviews and updated dashboard for (normalized) PERIODICAL ${businessProfileId}`);

    } catch (error) {
      console.error(`[Analytics] Failed to process reviews for (normalized) PERIODICAL dashboard ${businessProfileId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate metrics for a set of reviews (used for both all-time and period-based analytics)
   * 
   * Note: Uses dual-loop pattern for rating distribution and sentiment to ensure:
   * - Rating distribution uses rounded values for bucketing
   * - Average rating calculation uses precise original values
   * - Both loops apply the same validation (>= 1 && <= 5) which filters NaN/Infinity
   */
  private calculateMetricsForPeriod(reviews: ReviewWithMetadata[]): PeriodMetricsData {
    // Rating distribution
    const ratingDistribution: { [key: string]: number } = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let totalRating = 0;
    let ratingCount = 0;

    for (const review of reviews) {
      const rating = review.stars || review.rating || 0;
      // Validation check filters out NaN, Infinity, and out-of-range values
      if (rating >= 1 && rating <= 5) {
        // Use clamped rounding for distribution (adopting Booking.com's best practice)
        const roundedRating = Math.max(1, Math.min(5, Math.round(rating)));
        const ratingKey = roundedRating.toString();
        ratingDistribution[ratingKey]++;
        // Use original rating value for precise average calculation
        totalRating += rating;
        ratingCount++;
      }
    }

    const avgRating = ratingCount > 0 ? totalRating / ratingCount : null;

    // Sentiment counts
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0, total: 0 };
    for (const review of reviews) {
      const rating = review.stars || review.rating || 0;
      if (rating >= 1 && rating <= 5) {
        // Round rating first to ensure all valid ratings are categorized
        const roundedRating = Math.round(rating);
        
        if (roundedRating >= 4) {
          sentimentCounts.positive++;
        } else if (roundedRating === 3) {
          sentimentCounts.neutral++;
        } else if (roundedRating >= 1 && roundedRating <= 2) {
          sentimentCounts.negative++;
        }
        sentimentCounts.total++;
      }
    }

    // Top keywords
    const keywordMap = new Map<string, number>();
    for (const review of reviews) {
      const keywords = review.reviewMetadata?.keywords;
      if (keywords && Array.isArray(keywords)) {
        for (const keyword of keywords) {
          keywordMap.set(keyword.toLowerCase(), (keywordMap.get(keyword.toLowerCase()) || 0) + 1);
        }
      }
    }

    const topKeywords: KeywordFrequency[] = Array.from(keywordMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Response metrics
    let respondedReviewsCount = 0;
    let totalResponseTimeHours = 0;
    let reviewsWithResponseTime = 0;

    for (const review of reviews) {
      const reviewDate = review.publishedAtDate;
      const responseText = review.reviewMetadata?.reply;
      const responseDate = review.reviewMetadata?.replyDate;

      if (responseText && responseDate && reviewDate) {
        respondedReviewsCount++;
        const timeDiffMs = responseDate.getTime() - reviewDate.getTime();
        if (timeDiffMs > 0) {
          totalResponseTimeHours += timeDiffMs / (1000 * 60 * 60);
          reviewsWithResponseTime++;
        }
      }
    }

    const responseRatePercent = reviews.length > 0 ? (respondedReviewsCount / reviews.length) * 100 : 0;
    const avgResponseTimeHours = reviewsWithResponseTime > 0 ? totalResponseTimeHours / reviewsWithResponseTime : null;

    return {
      avgRating,
      reviewCount: reviews.length,
      ratingDistribution,
      sentimentCounts,
      topKeywords,
      responseRatePercent,
      avgResponseTimeHours,
    };
  }

  async close(): Promise<void> {
    // Prisma client is managed globally, no need to close
  }
}
