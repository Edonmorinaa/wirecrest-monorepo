/**
 * TripAdvisor Review Analytics Service - Prisma Implementation
 */

import { prisma } from '@wirecrest/db';
import { randomUUID } from 'crypto';

interface TripAdvisorReviewWithMetadata {
  rating: number;
  publishedDate: string;
  visitDate?: string | null;
  helpfulVotes: number;
  subRatings?: {
    service?: number | null;
    food?: number | null;
    value?: number | null;
    atmosphere?: number | null;
    cleanliness?: number | null;
    location?: number | null;
    rooms?: number | null;
    sleepQuality?: number | null;
  } | null;
  tripType?: string | null;
  roomTip?: string | null;
  hasOwnerResponse: boolean;
  responseFromOwnerDate?: string | null;
  photoCount: number;
  reviewMetadata: {
    emotional?: string | null;
    keywords?: string[] | null;
    reply?: string | null;
    replyDate?: string | null;
    date?: string | null;
    sentiment?: number | null;
    photoCount?: number | null;
  } | null;
}

interface KeywordFrequency {
  keyword: string;
  count: number;
  sentiment?: number;
}

interface TagFrequency {
  tag: string;
  count: number;
  averageRating: number;
  averageSentiment: number;
}

// Structure for period-based aggregated metrics adapted for TripAdvisor
interface PeriodMetricsData {
  totalReviews: number;
  averageRating: number;
  
  // Rating distribution
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
  
  // Sub-rating averages (varies by business type)
  averageServiceRating?: number | null;
  averageFoodRating?: number | null;
  averageValueRating?: number | null;
  averageAtmosphereRating?: number | null;
  averageCleanlinessRating?: number | null;
  averageLocationRating?: number | null;
  averageRoomsRating?: number | null;
  averageSleepQualityRating?: number | null;
  
  // Trip type breakdown
  familyReviews: number;
  couplesReviews: number;
  soloReviews: number;
  businessReviews: number;
  friendsReviews: number;
  
  // Engagement metrics
  totalHelpfulVotes: number;
  averageHelpfulVotes: number;
  reviewsWithPhotos: number;
  reviewsWithRoomTips: number;
  
  // Content analysis
  sentimentCounts: { positive: number; neutral: number; negative: number; total: number };
  topKeywords: KeywordFrequency[];
  topTags: TagFrequency[];
  
  // Response metrics
  responseRatePercent: number;
  avgResponseTimeHours: number | null;
}

// Define the keys for our periods explicitly for type safety and iteration
const PERIOD_DEFINITIONS: Record<number, { days: number | null; label: string }> = {
  1: { days: 1, label: 'Last 1 Day' },
  3: { days: 3, label: 'Last 3 Days' },
  7: { days: 7, label: 'Last 7 Days' },
  30: { days: 30, label: 'Last 30 Days' },
  180: { days: 180, label: 'Last 6 Months' },
  365: { days: 365, label: 'Last 12 Months' },
  0: { days: null, label: 'All Time' }
};

type PeriodKeys = keyof typeof PERIOD_DEFINITIONS;

export class TripAdvisorReviewAnalyticsService {
  constructor() {
    // No initialization needed with Prisma - it's a singleton
  }

  /**
   * Processes all reviews for a given TripAdvisor business profile and updates its dashboard.
   */
  async processReviewsAndUpdateDashboard(businessProfileId: string): Promise<void> {
    console.log(`[TripAdvisor Analytics] Starting review processing for businessProfileId: ${businessProfileId} (Prisma Implementation)`);
    
    try {
      const businessProfile = await prisma.tripAdvisorBusinessProfile.findUnique({
        where: { id: businessProfileId },
        select: {
          id: true,
          teamId: true,
          name: true,
          tripAdvisorUrl: true,
          locationId: true,
          type: true
        }
      });

      if (!businessProfile) {
        console.error(`[TripAdvisor Analytics] TripAdvisor business profile ${businessProfileId} not found`);
        throw new Error(`TripAdvisor business profile ${businessProfileId} not found.`);
      }

      console.log(`[TripAdvisor Analytics] Processing for "${businessProfile.name}" (Team: ${businessProfile.teamId})`);

      // Fetch reviews with metadata and subratings using Prisma
      const allReviewsData = await prisma.tripAdvisorReview.findMany({
        where: { businessProfileId },
        select: {
          rating: true,
          publishedDate: true,
          visitDate: true,
          helpfulVotes: true,
          tripType: true,
          roomTip: true,
          hasOwnerResponse: true,
          responseFromOwnerDate: true,
          reviewMetadataId: true,
          reviewMetadata: {
            select: {
              emotional: true,
              keywords: true,
              reply: true,
              replyDate: true,
              date: true,
              sentiment: true,
              photoCount: true
            }
          },
          subRatings: {
            select: {
              service: true,
              food: true,
              value: true,
              atmosphere: true,
              cleanliness: true,
              location: true,
              rooms: true,
              sleepQuality: true
            }
          },
          photos: {
            select: {
              id: true,
              url: true
            }
          }
        },
        orderBy: { publishedDate: 'desc' }
      });

      console.log(`[TripAdvisor Analytics] Fetched ${allReviewsData?.length || 0} reviews`);

      // Map the Prisma response to our expected interface structure
      const allReviews: TripAdvisorReviewWithMetadata[] = (allReviewsData || []).map(review => {
        // Extract sub-ratings - Prisma returns an array but we expect a single object
        let subRatings = null;
        if (review.subRatings && review.subRatings.length > 0) {
          const subRating = review.subRatings[0];
          subRatings = {
            service: subRating.service,
            food: subRating.food,
            value: subRating.value,
            atmosphere: subRating.atmosphere,
            cleanliness: subRating.cleanliness,
            location: subRating.location,
            rooms: subRating.rooms,
            sleepQuality: subRating.sleepQuality
          };
        }

        // Count photos from Prisma relation
        const photoCount = review.photos?.length || 0;
        
        return {
          rating: review.rating,
          publishedDate: review.publishedDate,
          visitDate: review.visitDate,
          helpfulVotes: review.helpfulVotes,
          subRatings: subRatings,
          tripType: review.tripType,
          roomTip: review.roomTip,
          hasOwnerResponse: review.hasOwnerResponse,
          responseFromOwnerDate: review.responseFromOwnerDate,
          photoCount: photoCount,
          reviewMetadata: review.reviewMetadata || null
        };
      });

      const currentDate = new Date();
      
      // Calculate all-time metrics
      const allTimeMetrics = this.calculateMetricsForPeriod(allReviews);

      // Upsert the TripAdvisorOverview record
      let { data: overviewRecord, error: overviewFetchError } = await this.supabase
        .from('TripAdvisorOverview')
        .select('id')
        .eq('businessProfileId', businessProfileId)
        .single();

      if (overviewFetchError && overviewFetchError.code !== 'PGRST116') {
        console.error(`[TripAdvisor Analytics] Error fetching existing overview:`, overviewFetchError);
        throw new Error(`Could not fetch existing TripAdvisorOverview record.`);
      }

      const overviewData = {
        businessProfileId,
        averageRating: allTimeMetrics.averageRating,
        totalReviews: allTimeMetrics.totalReviews,
        oneStarCount: allTimeMetrics.oneStarCount,
        twoStarCount: allTimeMetrics.twoStarCount,
        threeStarCount: allTimeMetrics.threeStarCount,
        fourStarCount: allTimeMetrics.fourStarCount,
        fiveStarCount: allTimeMetrics.fiveStarCount,
        averageServiceRating: allTimeMetrics.averageServiceRating,
        averageFoodRating: allTimeMetrics.averageFoodRating,
        averageValueRating: allTimeMetrics.averageValueRating,
        averageAtmosphereRating: allTimeMetrics.averageAtmosphereRating,
        averageCleanlinessRating: allTimeMetrics.averageCleanlinessRating,
        averageLocationRating: allTimeMetrics.averageLocationRating,
        averageRoomsRating: allTimeMetrics.averageRoomsRating,
        averageSleepQualityRating: allTimeMetrics.averageSleepQualityRating,
        familyReviews: allTimeMetrics.familyReviews,
        couplesReviews: allTimeMetrics.couplesReviews,
        soloReviews: allTimeMetrics.soloReviews,
        businessReviews: allTimeMetrics.businessReviews,
        friendsReviews: allTimeMetrics.friendsReviews,
        responseRate: allTimeMetrics.responseRatePercent,
        averageResponseTime: allTimeMetrics.avgResponseTimeHours,
        helpfulVotesTotal: allTimeMetrics.totalHelpfulVotes,
        averageHelpfulVotes: allTimeMetrics.averageHelpfulVotes,
        lastUpdated: currentDate
      };

      if (overviewRecord) {
        const { error: overviewUpdateError } = await this.supabase
          .from('TripAdvisorOverview')
          .update(overviewData)
          .eq('id', overviewRecord.id);

        if (overviewUpdateError) {
          console.error(`[TripAdvisor Analytics] Error updating overview:`, overviewUpdateError);
          throw new Error(`Could not update TripAdvisorOverview record.`);
        }
        console.log(`[TripAdvisor Analytics] Updated TripAdvisorOverview record`);
      } else {
        const { data: newOverview, error: overviewInsertError } = await this.supabase
          .from('TripAdvisorOverview')
          .insert({ id: randomUUID(), ...overviewData })
          .select('id')
          .single();

        if (overviewInsertError) {
          console.error(`[TripAdvisor Analytics] Error creating overview:`, overviewInsertError);
          throw new Error(`Could not create TripAdvisorOverview record.`);
        }
        overviewRecord = newOverview;
        console.log(`[TripAdvisor Analytics] Created new TripAdvisorOverview record`);
      }

      // Update rating distribution
      await this.updateRatingDistribution(businessProfileId, overviewRecord.id, allReviews);

      // Update periodical metrics
      await this.updatePeriodicalMetrics(overviewRecord.id, allReviews);

      console.log(`[TripAdvisor Analytics] Successfully completed review processing`);

    } catch (error) {
      console.error(`[TripAdvisor Analytics] Error processing reviews:`, error);
      throw error;
    }
  }

  private calculateMetricsForPeriod(reviewsInPeriod: TripAdvisorReviewWithMetadata[]): PeriodMetricsData {
    if (reviewsInPeriod.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        oneStarCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        fourStarCount: 0,
        fiveStarCount: 0,
        averageServiceRating: null,
        averageFoodRating: null,
        averageValueRating: null,
        averageAtmosphereRating: null,
        averageCleanlinessRating: null,
        averageLocationRating: null,
        averageRoomsRating: null,
        averageSleepQualityRating: null,
        familyReviews: 0,
        couplesReviews: 0,
        soloReviews: 0,
        businessReviews: 0,
        friendsReviews: 0,
        totalHelpfulVotes: 0,
        averageHelpfulVotes: 0,
        reviewsWithPhotos: 0,
        reviewsWithRoomTips: 0,
        sentimentCounts: { positive: 0, neutral: 0, negative: 0, total: 0 },
        topKeywords: [],
        topTags: [],
        responseRatePercent: 0,
        avgResponseTimeHours: null
      };
    }

    // Calculate rating distribution
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    reviewsInPeriod.forEach(review => {
      const rating = Math.round(review.rating);
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating as keyof typeof ratingCounts]++;
        totalRating += review.rating;
      }
    });

    // Calculate sub-rating averages
    const subRatingTotals = {
      service: { sum: 0, count: 0 },
      food: { sum: 0, count: 0 },
      value: { sum: 0, count: 0 },
      atmosphere: { sum: 0, count: 0 },
      cleanliness: { sum: 0, count: 0 },
      location: { sum: 0, count: 0 },
      rooms: { sum: 0, count: 0 },
      sleepQuality: { sum: 0, count: 0 }
    };

    reviewsInPeriod.forEach(review => {
      if (review.subRatings) {
        Object.keys(subRatingTotals).forEach(key => {
          const value = review.subRatings![key as keyof typeof review.subRatings];
          if (value !== null && value !== undefined) {
            subRatingTotals[key as keyof typeof subRatingTotals].sum += value;
            subRatingTotals[key as keyof typeof subRatingTotals].count++;
          }
        });
      }
    });

    // Calculate trip type distribution
    const tripTypeCounts = {
      FAMILY: 0,
      COUPLES: 0,
      SOLO: 0,
      BUSINESS: 0,
      FRIENDS: 0
    };

    reviewsInPeriod.forEach(review => {
      if (review.tripType) {
        const tripType = review.tripType.toUpperCase();
        if (tripType in tripTypeCounts) {
          tripTypeCounts[tripType as keyof typeof tripTypeCounts]++;
        }
      }
    });

    // Calculate engagement metrics
    const totalHelpfulVotes = reviewsInPeriod.reduce((sum, review) => sum + (review.helpfulVotes || 0), 0);
    const reviewsWithPhotos = reviewsInPeriod.filter(review => (review.photoCount || 0) > 0).length;
    const reviewsWithRoomTips = reviewsInPeriod.filter(review => review.roomTip && review.roomTip.trim().length > 0).length;

    // Calculate sentiment analysis
    const sentimentCounts = this.calculateSentimentCounts(reviewsInPeriod);

    // Extract keywords and tags
    const topKeywords = this.extractTopKeywords(reviewsInPeriod, 10);
    const topTags = this.extractTopTags(reviewsInPeriod, 10);

    // Calculate response metrics
    const responseMetrics = this.calculateResponseMetrics(reviewsInPeriod);

    return {
      totalReviews: reviewsInPeriod.length,
      averageRating: totalRating / reviewsInPeriod.length,
      oneStarCount: ratingCounts[1],
      twoStarCount: ratingCounts[2],
      threeStarCount: ratingCounts[3],
      fourStarCount: ratingCounts[4],
      fiveStarCount: ratingCounts[5],
      averageServiceRating: subRatingTotals.service.count > 0 ? subRatingTotals.service.sum / subRatingTotals.service.count : null,
      averageFoodRating: subRatingTotals.food.count > 0 ? subRatingTotals.food.sum / subRatingTotals.food.count : null,
      averageValueRating: subRatingTotals.value.count > 0 ? subRatingTotals.value.sum / subRatingTotals.value.count : null,
      averageAtmosphereRating: subRatingTotals.atmosphere.count > 0 ? subRatingTotals.atmosphere.sum / subRatingTotals.atmosphere.count : null,
      averageCleanlinessRating: subRatingTotals.cleanliness.count > 0 ? subRatingTotals.cleanliness.sum / subRatingTotals.cleanliness.count : null,
      averageLocationRating: subRatingTotals.location.count > 0 ? subRatingTotals.location.sum / subRatingTotals.location.count : null,
      averageRoomsRating: subRatingTotals.rooms.count > 0 ? subRatingTotals.rooms.sum / subRatingTotals.rooms.count : null,
      averageSleepQualityRating: subRatingTotals.sleepQuality.count > 0 ? subRatingTotals.sleepQuality.sum / subRatingTotals.sleepQuality.count : null,
      familyReviews: tripTypeCounts.FAMILY,
      couplesReviews: tripTypeCounts.COUPLES,
      soloReviews: tripTypeCounts.SOLO,
      businessReviews: tripTypeCounts.BUSINESS,
      friendsReviews: tripTypeCounts.FRIENDS,
      totalHelpfulVotes,
      averageHelpfulVotes: totalHelpfulVotes / reviewsInPeriod.length,
      reviewsWithPhotos,
      reviewsWithRoomTips,
      sentimentCounts,
      topKeywords,
      topTags,
      responseRatePercent: responseMetrics.responseRatePercent,
      avgResponseTimeHours: responseMetrics.avgResponseTimeHours
    };
  }

  private calculateSentimentCounts(reviews: TripAdvisorReviewWithMetadata[]): { positive: number; neutral: number; negative: number; total: number } {
    let positive = 0, neutral = 0, negative = 0;

    reviews.forEach(review => {
      const emotional = review.reviewMetadata?.emotional?.toLowerCase();
      if (emotional === 'positive') positive++;
      else if (emotional === 'negative') negative++;
      else neutral++;
    });

    return { positive, neutral, negative, total: reviews.length };
  }

  private extractTopKeywords(reviews: TripAdvisorReviewWithMetadata[], count: number): KeywordFrequency[] {
    const keywordCounts: { [keyword: string]: number } = {};

    reviews.forEach(review => {
      const keywords = review.reviewMetadata?.keywords || [];
      keywords.forEach(keyword => {
        const cleanKeyword = keyword.toLowerCase().trim();
        if (cleanKeyword.length > 2) {
          keywordCounts[cleanKeyword] = (keywordCounts[cleanKeyword] || 0) + 1;
        }
      });
    });

    return Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }

  private extractTopTags(reviews: TripAdvisorReviewWithMetadata[], count: number): TagFrequency[] {
    const tagCounts: { [tag: string]: { count: number; totalRating: number; totalSentiment: number } } = {};

    reviews.forEach(review => {
      if (review.tripType) {
        const tag = review.tripType.toLowerCase().trim();
        if (!tagCounts[tag]) {
          tagCounts[tag] = { count: 0, totalRating: 0, totalSentiment: 0 };
        }
        tagCounts[tag].count++;
        tagCounts[tag].totalRating += review.rating;
        tagCounts[tag].totalSentiment += review.reviewMetadata?.sentiment || 0;
      }
    });

    return Object.entries(tagCounts)
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        averageRating: data.totalRating / data.count,
        averageSentiment: data.totalSentiment / data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }

  private calculateResponseMetrics(reviews: TripAdvisorReviewWithMetadata[]): { responseRatePercent: number; avgResponseTimeHours: number | null } {
    const reviewsWithReplies = reviews.filter(r => r.hasOwnerResponse);
    const responseRatePercent = reviews.length > 0 ? (reviewsWithReplies.length / reviews.length) * 100 : 0;

    if (reviewsWithReplies.length === 0) {
      return { responseRatePercent, avgResponseTimeHours: null };
    }

    const responseTimes: number[] = [];
    reviewsWithReplies.forEach(review => {
      const reviewDate = new Date(review.publishedDate);
      const replyDate = review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null;
      
      if (replyDate && replyDate > reviewDate) {
        const responseTimeHours = (replyDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);
        responseTimes.push(responseTimeHours);
      }
    });

    const avgResponseTimeHours = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : null;

    return { responseRatePercent, avgResponseTimeHours };
  }

  private async updateRatingDistribution(
    businessProfileId: string,
    tripAdvisorOverviewId: string,
    allReviews: TripAdvisorReviewWithMetadata[]
  ): Promise<void> {
    console.log(`[TripAdvisor Analytics] Calculating rating distribution`);
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Rating distribution
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allReviews.forEach(review => {
      const rating = Math.max(1, Math.min(5, review.rating));
      ratingCounts[rating as keyof typeof ratingCounts]++;
    });

    // Trip type distribution
    const tripTypeCounts = { family: 0, couples: 0, solo: 0, business: 0, friends: 0 };
    allReviews.forEach(review => {
      const tripType = review.tripType?.toLowerCase();
      if (tripType) {
        if (tripType.includes('family')) tripTypeCounts.family++;
        else if (tripType.includes('couple')) tripTypeCounts.couples++;
        else if (tripType.includes('solo')) tripTypeCounts.solo++;
        else if (tripType.includes('business')) tripTypeCounts.business++;
        else if (tripType.includes('friend')) tripTypeCounts.friends++;
      }
    });

    // Content distribution
    const withPhotos = allReviews.filter(r => r.photoCount > 0).length;
    const withoutPhotos = allReviews.length - withPhotos;
    const withRoomTips = allReviews.filter(r => r.roomTip).length;
    const withSubRatings = allReviews.filter(r => r.subRatings && Object.keys(r.subRatings).length > 0).length;

    // Temporal distribution
    const lastWeek = allReviews.filter(r => new Date(r.publishedDate) >= oneWeekAgo).length;
    const lastMonth = allReviews.filter(r => new Date(r.publishedDate) >= oneMonthAgo).length;
    const lastSixMonths = allReviews.filter(r => new Date(r.publishedDate) >= sixMonthsAgo).length;
    const olderThanSixMonths = allReviews.length - lastSixMonths;

    const distributionData = {
      id: randomUUID(),
      businessProfileId,
      tripAdvisorOverviewId,
      oneStar: ratingCounts[1],
      twoStar: ratingCounts[2],
      threeStar: ratingCounts[3],
      fourStar: ratingCounts[4],
      fiveStar: ratingCounts[5],
      familyTrips: tripTypeCounts.family,
      couplesTrips: tripTypeCounts.couples,
      soloTrips: tripTypeCounts.solo,
      businessTrips: tripTypeCounts.business,
      friendsTrips: tripTypeCounts.friends,
      withPhotos,
      withoutPhotos,
      withRoomTips,
      withSubRatings,
      lastWeek,
      lastMonth,
      lastSixMonths,
      olderThanSixMonths,
      lastUpdated: now
    };

    const { error: distributionError } = await this.supabase
      .from('TripAdvisorRatingDistribution')
      .upsert(distributionData, { onConflict: 'businessProfileId' });

    if (distributionError) {
      console.error(`[TripAdvisor Analytics] Error upserting rating distribution:`, distributionError);
      throw new Error(`Could not save rating distribution.`);
    }

    console.log(`[TripAdvisor Analytics] Successfully updated rating distribution`);
  }

  private async updatePeriodicalMetrics(
    tripAdvisorOverviewId: string,
    allReviews: TripAdvisorReviewWithMetadata[]
  ): Promise<void> {
    console.log(`[TripAdvisor Analytics] Calculating periodical metrics`);
    
    const periodicalMetricsToUpsert = [];
    const keywordsAndTagsData: { [key: number]: { keywords: KeywordFrequency[], tags: TagFrequency[] } } = {};

    for (const periodKeyStr of Object.keys(PERIOD_DEFINITIONS)) {
      const periodKey = parseInt(periodKeyStr) as PeriodKeys;
      const periodInfo = PERIOD_DEFINITIONS[periodKey];
      let reviewsInPeriod: TripAdvisorReviewWithMetadata[];

      if (periodKey === 0) {
        reviewsInPeriod = allReviews;
      } else {
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const startDate = new Date(endDate.getTime() - (periodInfo.days! * 24 * 60 * 60 * 1000));
        startDate.setHours(0, 0, 0, 0);
        
        reviewsInPeriod = allReviews.filter(r => {
          const reviewDate = new Date(r.publishedDate);
          return reviewDate >= startDate && reviewDate <= endDate;
        });
      }
      
      console.log(`[TripAdvisor Analytics] Found ${reviewsInPeriod.length} reviews for period: ${periodInfo.label}`);
      const metrics = this.calculateMetricsForPeriod(reviewsInPeriod);

      // Store keywords and tags separately
      keywordsAndTagsData[periodKey] = {
        keywords: metrics.topKeywords,
        tags: metrics.topTags
      };

      const sentimentScore = metrics.sentimentCounts.total > 0
        ? (metrics.sentimentCounts.positive - metrics.sentimentCounts.negative) / metrics.sentimentCounts.total
        : 0;

      const periodicalMetricData = {
        id: randomUUID(),
        tripAdvisorOverviewId: tripAdvisorOverviewId,
        periodKey: periodKey,
        periodLabel: periodInfo.label,
        averageRating: metrics.averageRating,
        oneStarCount: metrics.oneStarCount,
        twoStarCount: metrics.twoStarCount,
        threeStarCount: metrics.threeStarCount,
        fourStarCount: metrics.fourStarCount,
        fiveStarCount: metrics.fiveStarCount,
        reviewCount: metrics.totalReviews,
        averageServiceRating: metrics.averageServiceRating,
        averageFoodRating: metrics.averageFoodRating,
        averageValueRating: metrics.averageValueRating,
        averageAtmosphereRating: metrics.averageAtmosphereRating,
        averageCleanlinessRating: metrics.averageCleanlinessRating,
        averageLocationRating: metrics.averageLocationRating,
        familyReviews: metrics.familyReviews,
        couplesReviews: metrics.couplesReviews,
        soloReviews: metrics.soloReviews,
        businessReviews: metrics.businessReviews,
        friendsReviews: metrics.friendsReviews,
        totalHelpfulVotes: metrics.totalHelpfulVotes,
        averageHelpfulVotes: metrics.averageHelpfulVotes,
        reviewsWithPhotos: metrics.reviewsWithPhotos,
        responseRatePercent: metrics.responseRatePercent,
        avgResponseTimeHours: metrics.avgResponseTimeHours,
        sentimentPositive: metrics.sentimentCounts.positive,
        sentimentNeutral: metrics.sentimentCounts.neutral,
        sentimentNegative: metrics.sentimentCounts.negative,
        sentimentTotal: metrics.sentimentCounts.total,
        sentimentScore: sentimentScore,

        rankingPosition: null,
        rankingTrend: null,
        competitorMentions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      periodicalMetricsToUpsert.push(periodicalMetricData);
    }
    
    if (periodicalMetricsToUpsert.length > 0) {
      const { data: upsertedMetrics, error: upsertMetricsError } = await this.supabase
        .from('TripAdvisorPeriodicalMetric')
        .upsert(periodicalMetricsToUpsert, { 
          onConflict: 'tripAdvisorOverviewId,periodKey',
          ignoreDuplicates: false
        })
        .select('id, periodKey');

      if (upsertMetricsError) {
        console.error(`[TripAdvisor Analytics] Error upserting periodical metrics:`, upsertMetricsError);
        throw new Error(`Failed to upsert TripAdvisor periodical metrics: ${upsertMetricsError.message}`);
      } else {
        console.log(`[TripAdvisor Analytics] Successfully upserted ${periodicalMetricsToUpsert.length} periodical metrics`);
        
        // Now handle keywords and tags for each period
        if (upsertedMetrics) {
          for (const metric of upsertedMetrics) {
            const periodData = keywordsAndTagsData[metric.periodKey];
            if (periodData) {
              // Handle keywords
              if (periodData.keywords && periodData.keywords.length > 0) {
                const keywordData = periodData.keywords.map((kw) => ({
                  id: randomUUID(),
                  periodicalMetricId: metric.id,
                  keyword: kw.keyword,
                  count: kw.count
                }));
                
                await this.supabase
                  .from('TripAdvisorPeriodicalKeyword')
                  .upsert(keywordData, { onConflict: 'periodicalMetricId,keyword' });
              }
              
              // Handle tags
              if (periodData.tags && periodData.tags.length > 0) {
                const tagData = periodData.tags.map((tag) => ({
                  id: randomUUID(),
                  periodicalMetricId: metric.id,
                  tag: tag.tag,
                  count: tag.count
                }));
                
                await this.supabase
                  .from('TripAdvisorPeriodicalTag')
                  .upsert(tagData, { onConflict: 'periodicalMetricId,tag' });
              }
            }
          }
        }
      }
    }
  }

  async close(): Promise<void> {
    // No explicit cleanup needed for Supabase client
  }
} 