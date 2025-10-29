/**
 * Booking.com Analytics Service
 * Implements analytics for Booking.com reviews using SOLID principles
 * Booking uses 1-10 rating scale (converted to 1-5 for histogram) with 7 sub-ratings
 */

import { IAnalyticsService, AnalyticsResult, AnalyticsData } from '../interfaces/IAnalyticsService';
import { IReviewRepository } from '../interfaces/IReviewRepository';
import { ISentimentAnalyzer } from '../interfaces/ISentimentAnalyzer';
import { prisma } from '@wirecrest/db';
import type { Prisma } from '@prisma/client';
import { PeriodCalculator, PeriodKey, PERIOD_DEFINITIONS } from './analytics/PeriodCalculator';
import { KeywordExtractor, KeywordFrequency } from './analytics/KeywordExtractor';
import { ResponseAnalyzer } from './analytics/ResponseAnalyzer';
import {
  BookingMetricsCalculator,
  RatingDistribution,
  BookingSubRatings,
  BookingSubRatingAverages,
  GuestTypeCounts,
  StayLengthMetrics,
} from './analytics/BookingMetricsCalculator';

/**
 * Booking Review with metadata
 * Booking uses 1-10 rating scale (NOT 1-5!)
 */
interface BookingReviewWithMetadata {
  rating: number; // 1-10 scale!
  publishedAtDate: Date;
  stayDate?: Date | null;
  lengthOfStay?: number | null;
  roomType?: string | null;
  guestType: string;
  reviewerNationality?: string | null;
  hasOwnerResponse: boolean;
  responseFromOwnerDate?: Date | null;
  isVerifiedStay: boolean;
  cleanlinessRating?: number | null;
  comfortRating?: number | null;
  locationRating?: number | null;
  facilitiesRating?: number | null;
  staffRating?: number | null;
  valueForMoneyRating?: number | null;
  wifiRating?: number | null;
  reviewMetadata?: {
    keywords?: string[] | null;
    reply?: string | null;
    replyDate?: Date | null;
    sentiment?: number | null;
  } | null;
}

/**
 * Period-specific metrics for Booking
 */
interface PeriodMetrics {
  totalReviews: number;
  avgRating: number | null; // On original 1-10 scale
  ratingDistribution: RatingDistribution; // Converted to 1-5
  subRatingAverages: BookingSubRatingAverages;
  guestTypeCounts: GuestTypeCounts;
  stayLengthMetrics: StayLengthMetrics;
  topNationalities: string[];
  mostPopularRoomTypes: string[];
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

export class BookingAnalyticsService implements IAnalyticsService {
  constructor(
    private reviewRepository: IReviewRepository<BookingReviewWithMetadata>,
    private sentimentAnalyzer?: ISentimentAnalyzer
  ) {}

  /**
   * Process all reviews for a Booking business profile and update analytics
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
      console.error(`[Booking Analytics] Error processing reviews for ${businessProfileId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current analytics for a Booking business profile
   */
  async getAnalytics(businessProfileId: string): Promise<AnalyticsData | null> {
    try {
      const overview = await prisma.bookingOverview.findUnique({
        where: { businessProfileId },
      });

      if (!overview) {
    return null;
  }

      return {
        businessId: businessProfileId,
        totalReviews: overview.totalReviews,
        averageRating: overview.averageRating || 0,
        sentimentScore: overview.averageRating ? (overview.averageRating / 10) * 100 : 0, // Convert 1-10 to percentage
        lastUpdated: overview.lastUpdated,
        platform: 'booking',
      };
    } catch (error) {
      console.error(`[Booking Analytics] Error fetching analytics for ${businessProfileId}:`, error);
      return null;
    }
  }

  /**
   * Update analytics with new data
   */
  async updateAnalytics(businessProfileId: string, data: AnalyticsData): Promise<void> {
    await this.processReviewsAndUpdateDashboard(businessProfileId);
  }

  /**
   * Delete analytics for a business profile
   */
  async deleteAnalytics(businessProfileId: string): Promise<void> {
    await prisma.bookingOverview.deleteMany({
      where: { businessProfileId },
    });
  }

  /**
   * Main processing method - calculates all metrics and updates database
   */
  async processReviewsAndUpdateDashboard(businessProfileId: string): Promise<void> {
    console.log(`[Booking Analytics] Starting review processing for businessProfileId: ${businessProfileId}`);

    try {
      // Fetch all reviews with metadata using Prisma
      const allReviewsData = await prisma.bookingReview.findMany({
        where: { businessProfileId },
        include: {
          reviewMetadata: {
            select: {
              keywords: true,
              reply: true,
              replyDate: true,
              sentiment: true,
            },
          },
        },
        orderBy: { publishedDate: 'desc' },
      });

      console.log(`[Booking Analytics] Fetched ${allReviewsData.length} reviews`);

      if (allReviewsData.length === 0) {
        console.log(`[Booking Analytics] No reviews found for businessProfileId: ${businessProfileId}`);
        return;
      }

      // Map to our internal interface
      const allReviews: BookingReviewWithMetadata[] = allReviewsData.map((review) => ({
        rating: review.rating,
        publishedAtDate: review.publishedDate,
        stayDate: review.stayDate,
        lengthOfStay: review.lengthOfStay,
        roomType: review.roomType,
        guestType: review.guestType,
        reviewerNationality: review.reviewerNationality,
        hasOwnerResponse: review.hasOwnerResponse,
        responseFromOwnerDate: review.responseFromOwnerDate,
        isVerifiedStay: review.isVerifiedStay,
        cleanlinessRating: review.cleanlinessRating,
        comfortRating: review.comfortRating,
        locationRating: review.locationRating,
        facilitiesRating: review.facilitiesRating,
        staffRating: review.staffRating,
        valueForMoneyRating: review.valueForMoneyRating,
        wifiRating: review.wifiRating,
        reviewMetadata: review.reviewMetadata ? {
          keywords: review.reviewMetadata.keywords,
          reply: review.reviewMetadata.reply,
          replyDate: review.reviewMetadata.replyDate,
          sentiment: review.reviewMetadata.sentiment,
        } : null,
      }));

      // Calculate all-time metrics
      const allTimeMetrics = this.calculateMetricsForPeriod(allReviews);

      // Upsert BookingOverview
      await prisma.bookingOverview.upsert({
        where: { businessProfileId },
        create: {
          businessProfileId,
          totalReviews: allTimeMetrics.totalReviews,
          averageRating: allTimeMetrics.avgRating,
          oneStarCount: allTimeMetrics.ratingDistribution['1'] || 0,
          twoStarCount: allTimeMetrics.ratingDistribution['2'] || 0,
          threeStarCount: allTimeMetrics.ratingDistribution['3'] || 0,
          fourStarCount: allTimeMetrics.ratingDistribution['4'] || 0,
          fiveStarCount: allTimeMetrics.ratingDistribution['5'] || 0,
          averageCleanlinessRating: allTimeMetrics.subRatingAverages.averageCleanlinessRating,
          averageComfortRating: allTimeMetrics.subRatingAverages.averageComfortRating,
          averageLocationRating: allTimeMetrics.subRatingAverages.averageLocationRating,
          averageFacilitiesRating: allTimeMetrics.subRatingAverages.averageFacilitiesRating,
          averageStaffRating: allTimeMetrics.subRatingAverages.averageStaffRating,
          averageValueForMoneyRating: allTimeMetrics.subRatingAverages.averageValueForMoneyRating,
          averageWifiRating: allTimeMetrics.subRatingAverages.averageWifiRating,
          soloTravelers: allTimeMetrics.guestTypeCounts.soloTravelers,
          couples: allTimeMetrics.guestTypeCounts.couples,
          familiesWithYoungChildren: allTimeMetrics.guestTypeCounts.familiesWithYoungChildren,
          familiesWithOlderChildren: allTimeMetrics.guestTypeCounts.familiesWithOlderChildren,
          groupsOfFriends: allTimeMetrics.guestTypeCounts.groupsOfFriends,
          businessTravelers: allTimeMetrics.guestTypeCounts.businessTravelers,
          averageLengthOfStay: allTimeMetrics.stayLengthMetrics.averageLengthOfStay,
          shortStays: allTimeMetrics.stayLengthMetrics.shortStays,
          mediumStays: allTimeMetrics.stayLengthMetrics.mediumStays,
          longStays: allTimeMetrics.stayLengthMetrics.longStays,
          topNationalities: allTimeMetrics.topNationalities,
          mostPopularRoomTypes: allTimeMetrics.mostPopularRoomTypes,
          responseRate: allTimeMetrics.responseRatePercent,
          averageResponseTime: allTimeMetrics.avgResponseTimeHours,
          lastUpdated: new Date(),
        },
        update: {
          totalReviews: allTimeMetrics.totalReviews,
          averageRating: allTimeMetrics.avgRating,
          oneStarCount: allTimeMetrics.ratingDistribution['1'] || 0,
          twoStarCount: allTimeMetrics.ratingDistribution['2'] || 0,
          threeStarCount: allTimeMetrics.ratingDistribution['3'] || 0,
          fourStarCount: allTimeMetrics.ratingDistribution['4'] || 0,
          fiveStarCount: allTimeMetrics.ratingDistribution['5'] || 0,
          averageCleanlinessRating: allTimeMetrics.subRatingAverages.averageCleanlinessRating,
          averageComfortRating: allTimeMetrics.subRatingAverages.averageComfortRating,
          averageLocationRating: allTimeMetrics.subRatingAverages.averageLocationRating,
          averageFacilitiesRating: allTimeMetrics.subRatingAverages.averageFacilitiesRating,
          averageStaffRating: allTimeMetrics.subRatingAverages.averageStaffRating,
          averageValueForMoneyRating: allTimeMetrics.subRatingAverages.averageValueForMoneyRating,
          averageWifiRating: allTimeMetrics.subRatingAverages.averageWifiRating,
          soloTravelers: allTimeMetrics.guestTypeCounts.soloTravelers,
          couples: allTimeMetrics.guestTypeCounts.couples,
          familiesWithYoungChildren: allTimeMetrics.guestTypeCounts.familiesWithYoungChildren,
          familiesWithOlderChildren: allTimeMetrics.guestTypeCounts.familiesWithOlderChildren,
          groupsOfFriends: allTimeMetrics.guestTypeCounts.groupsOfFriends,
          businessTravelers: allTimeMetrics.guestTypeCounts.businessTravelers,
          averageLengthOfStay: allTimeMetrics.stayLengthMetrics.averageLengthOfStay,
          shortStays: allTimeMetrics.stayLengthMetrics.shortStays,
          mediumStays: allTimeMetrics.stayLengthMetrics.mediumStays,
          longStays: allTimeMetrics.stayLengthMetrics.longStays,
          topNationalities: allTimeMetrics.topNationalities,
          mostPopularRoomTypes: allTimeMetrics.mostPopularRoomTypes,
          responseRate: allTimeMetrics.responseRatePercent,
          averageResponseTime: allTimeMetrics.avgResponseTimeHours,
          lastUpdated: new Date(),
        },
      });

      console.log(`[Booking Analytics] Updated BookingOverview for businessProfileId: ${businessProfileId}`);

      // Get the overview ID for linking period metrics
      const overview = await prisma.bookingOverview.findUnique({
        where: { businessProfileId },
        select: { id: true },
      });

      if (!overview) {
        throw new Error('Failed to create/update BookingOverview');
      }

      // Process all periods
      const periods = PeriodCalculator.getAllPeriods();

      for (const periodKey of periods) {
        const periodReviews = PeriodCalculator.filterByPeriod(allReviews, periodKey);
        const periodMetrics = this.calculateMetricsForPeriod(periodReviews);
        const period = PERIOD_DEFINITIONS[periodKey];

        // Calculate sentiment score
        const sentimentScore =
          periodMetrics.sentimentCounts.total > 0
            ? ((periodMetrics.sentimentCounts.positive - periodMetrics.sentimentCounts.negative) /
                periodMetrics.sentimentCounts.total) *
              100
            : 0;

        // Upsert period metrics
        await prisma.bookingPeriodicalMetric.upsert({
          where: {
            bookingOverviewId_periodKey: {
              bookingOverviewId: overview.id,
              periodKey: periodKey,
            },
          },
          create: {
            bookingOverviewId: overview.id,
            periodKey: periodKey,
            periodLabel: period.label,
            averageRating: periodMetrics.avgRating || 0,
            oneStarCount: periodMetrics.ratingDistribution['1'] || 0,
            twoStarCount: periodMetrics.ratingDistribution['2'] || 0,
            threeStarCount: periodMetrics.ratingDistribution['3'] || 0,
            fourStarCount: periodMetrics.ratingDistribution['4'] || 0,
            fiveStarCount: periodMetrics.ratingDistribution['5'] || 0,
            reviewCount: periodMetrics.totalReviews,
            averageCleanlinessRating: periodMetrics.subRatingAverages.averageCleanlinessRating,
            averageComfortRating: periodMetrics.subRatingAverages.averageComfortRating,
            averageLocationRating: periodMetrics.subRatingAverages.averageLocationRating,
            averageFacilitiesRating: periodMetrics.subRatingAverages.averageFacilitiesRating,
            averageStaffRating: periodMetrics.subRatingAverages.averageStaffRating,
            averageValueForMoneyRating: periodMetrics.subRatingAverages.averageValueForMoneyRating,
            averageWifiRating: periodMetrics.subRatingAverages.averageWifiRating,
            soloTravelers: periodMetrics.guestTypeCounts.soloTravelers,
            couples: periodMetrics.guestTypeCounts.couples,
            families:
              periodMetrics.guestTypeCounts.familiesWithYoungChildren +
              periodMetrics.guestTypeCounts.familiesWithOlderChildren,
            groups: periodMetrics.guestTypeCounts.groupsOfFriends,
            businessTravelers: periodMetrics.guestTypeCounts.businessTravelers,
            averageLengthOfStay: periodMetrics.stayLengthMetrics.averageLengthOfStay,
            totalNights: Math.round(
              (periodMetrics.stayLengthMetrics.averageLengthOfStay || 0) * periodMetrics.totalReviews
            ),
            responseRatePercent: periodMetrics.responseRatePercent,
            avgResponseTimeHours: periodMetrics.avgResponseTimeHours,
            sentimentPositive: periodMetrics.sentimentCounts.positive,
            sentimentNeutral: periodMetrics.sentimentCounts.neutral,
            sentimentNegative: periodMetrics.sentimentCounts.negative,
            sentimentTotal: periodMetrics.sentimentCounts.total,
            sentimentScore,
          },
          update: {
            periodLabel: period.label,
            averageRating: periodMetrics.avgRating || 0,
            oneStarCount: periodMetrics.ratingDistribution['1'] || 0,
            twoStarCount: periodMetrics.ratingDistribution['2'] || 0,
            threeStarCount: periodMetrics.ratingDistribution['3'] || 0,
            fourStarCount: periodMetrics.ratingDistribution['4'] || 0,
            fiveStarCount: periodMetrics.ratingDistribution['5'] || 0,
            reviewCount: periodMetrics.totalReviews,
            averageCleanlinessRating: periodMetrics.subRatingAverages.averageCleanlinessRating,
            averageComfortRating: periodMetrics.subRatingAverages.averageComfortRating,
            averageLocationRating: periodMetrics.subRatingAverages.averageLocationRating,
            averageFacilitiesRating: periodMetrics.subRatingAverages.averageFacilitiesRating,
            averageStaffRating: periodMetrics.subRatingAverages.averageStaffRating,
            averageValueForMoneyRating: periodMetrics.subRatingAverages.averageValueForMoneyRating,
            averageWifiRating: periodMetrics.subRatingAverages.averageWifiRating,
            soloTravelers: periodMetrics.guestTypeCounts.soloTravelers,
            couples: periodMetrics.guestTypeCounts.couples,
            families:
              periodMetrics.guestTypeCounts.familiesWithYoungChildren +
              periodMetrics.guestTypeCounts.familiesWithOlderChildren,
            groups: periodMetrics.guestTypeCounts.groupsOfFriends,
            businessTravelers: periodMetrics.guestTypeCounts.businessTravelers,
            averageLengthOfStay: periodMetrics.stayLengthMetrics.averageLengthOfStay,
            totalNights: Math.round(
              (periodMetrics.stayLengthMetrics.averageLengthOfStay || 0) * periodMetrics.totalReviews
            ),
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
          `[Booking Analytics] Updated period ${period.label} with ${periodMetrics.totalReviews} reviews`
        );
      }

      console.log(`[Booking Analytics] Successfully completed processing for businessProfileId: ${businessProfileId}`);
    } catch (error) {
      console.error(`[Booking Analytics] Error in processReviewsAndUpdateDashboard:`, error);
      throw error;
    }
  }

  /**
   * Calculate metrics for a given set of reviews
   */
  private calculateMetricsForPeriod(reviews: BookingReviewWithMetadata[]): PeriodMetrics {
    const reviewCount = reviews.length;

    if (reviewCount === 0) {
      return {
        totalReviews: 0,
        avgRating: null,
        ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        subRatingAverages: {
          averageCleanlinessRating: null,
          averageComfortRating: null,
          averageLocationRating: null,
          averageFacilitiesRating: null,
          averageStaffRating: null,
          averageValueForMoneyRating: null,
          averageWifiRating: null,
        },
        guestTypeCounts: {
          soloTravelers: 0,
          couples: 0,
          familiesWithYoungChildren: 0,
          familiesWithOlderChildren: 0,
          groupsOfFriends: 0,
          businessTravelers: 0,
        },
        stayLengthMetrics: {
          averageLengthOfStay: null,
          shortStays: 0,
          mediumStays: 0,
          longStays: 0,
        },
        topNationalities: [],
        mostPopularRoomTypes: [],
        sentimentCounts: { positive: 0, neutral: 0, negative: 0, total: 0 },
        topKeywords: [],
        responseRatePercent: 0,
        avgResponseTimeHours: null,
      };
    }

    // Calculate rating distribution and average (1-10 scale)
    const ratings = reviews.map((r) => r.rating);
    const ratingDistribution = BookingMetricsCalculator.buildRatingDistribution10To5Scale(ratings);
    const avgRating = BookingMetricsCalculator.calculateAverageRating10Scale(ratings);

    // Calculate sub-rating averages
    const subRatingAverages = BookingMetricsCalculator.calculateSubRatings(
      reviews.map((r) => ({
        subRatings: {
          cleanlinessRating: r.cleanlinessRating,
          comfortRating: r.comfortRating,
          locationRating: r.locationRating,
          facilitiesRating: r.facilitiesRating,
          staffRating: r.staffRating,
          valueForMoneyRating: r.valueForMoneyRating,
          wifiRating: r.wifiRating,
        },
      }))
    );

    // Calculate guest type distribution
    const guestTypeCounts = BookingMetricsCalculator.calculateGuestTypeDistribution(reviews);

    // Calculate stay length metrics
    const stayLengthMetrics = BookingMetricsCalculator.calculateStayLengthMetrics(reviews);

    // Get top nationalities
    const topNationalities = BookingMetricsCalculator.getTopNationalities(reviews, 10);

    // Get most popular room types
    const mostPopularRoomTypes = BookingMetricsCalculator.getMostPopularRoomTypes(reviews, 10);

    // Calculate sentiment from 1-10 rating scale
    const sentimentCounts = BookingMetricsCalculator.buildSentimentFromRatings10Scale(ratings);

    // Extract top keywords
    const topKeywords = KeywordExtractor.extractFromReviews(
      reviews.map((r) => ({
        text: null,
        reviewMetadata: r.reviewMetadata,
      })),
      10
    );

    // Calculate response metrics
    const { responseRate, averageResponseTimeHours } = ResponseAnalyzer.calculateResponseMetrics(
      reviews.map((r) => ({
        publishedAtDate: r.publishedAtDate,
        responseFromOwnerText: r.hasOwnerResponse ? 'yes' : null,
        responseFromOwnerDate: r.responseFromOwnerDate,
        reviewMetadata: r.reviewMetadata,
      }))
    );

    return {
      totalReviews: reviewCount,
      avgRating,
      ratingDistribution,
      subRatingAverages,
      guestTypeCounts,
      stayLengthMetrics,
      topNationalities,
      mostPopularRoomTypes,
      sentimentCounts,
      topKeywords,
      responseRatePercent: responseRate,
      avgResponseTimeHours: averageResponseTimeHours,
    };
  }
}
