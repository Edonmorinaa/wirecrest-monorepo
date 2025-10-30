import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TripAdvisorReview } from '@prisma/client';
import { TripAdvisorOverview, TripAdvisorPeriodicalMetric } from './models';
import { randomUUID } from 'crypto';

interface TripAdvisorRatingDistributionData {
  [key: string]: {
    value: number;
    percentageValue: number;
  };
}

interface TripAdvisorSentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
  averageSentiment?: number;
}

interface TripAdvisorKeywordCount {
  key: string;
  value: number;
  sentiment?: number;
}

interface TripAdvisorSubRatingAnalysis {
  service: { average: number; count: number };
  food: { average: number; count: number };
  value: { average: number; count: number };
  atmosphere: { average: number; count: number };
  cleanliness: { average: number; count: number };
  location: { average: number; count: number };
  rooms: { average: number; count: number };
  sleep_quality: { average: number; count: number };
}

interface TripAdvisorTripTypeAnalysis {
  FAMILY: number;
  COUPLES: number;
  SOLO: number;
  BUSINESS: number;
  FRIENDS: number;
  OTHER: number;
}

// Extended review interface for internal processing
interface EnrichedTripAdvisorReview extends Omit<TripAdvisorReview, 'reviewMetadata' | 'subRatings'> {
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
  photoCount: number;
  reviewMetadata?: {
    sentiment?: number | null;
    keywords?: string[] | null;
    emotional?: string | null;
  } | null;
}

export class TripAdvisorOverviewService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // async processAndUpdateOverview(locationId: string, reviews: TripAdvisorReview[]): Promise<void> {
  //   try {
  //     console.log(`🔄 Processing TripAdvisor overview for locationId: ${locationId} with ${reviews.length} reviews`);

  //     // Get business profile
  //     const { data: businessProfile, error: businessError } = await this.supabase
  //       .from('TripAdvisorBusinessProfile')
  //       .select('id, teamId, name')
  //       .eq('locationId', locationId)
  //       .single();

  //     if (businessError || !businessProfile) {
  //       console.error(`❌ Business profile not found for locationId: ${locationId}`, businessError);
  //       return;
  //     }

  //     // Fetch reviews with related data using joins
  //     const { data: reviewsWithData, error: reviewsError } = await this.supabase
  //       .from('TripAdvisorReview')
  //       .select(`
  //         *,
  //         TripAdvisorReviewSubRating(
  //           service,
  //           food,
  //           value,
  //           atmosphere,
  //           cleanliness,
  //           location,
  //           rooms,
  //           sleepQuality
  //         ),
  //         TripAdvisorReviewPhoto(
  //           id,
  //           url
  //         ),
  //         ReviewMetadata(
  //           sentiment,
  //           keywords,
  //           emotional
  //         )
  //       `)
  //       .eq('businessProfileId', businessProfile.id);

  //     if (reviewsError) {
  //       console.error(`❌ Error fetching reviews with data:`, reviewsError);
  //       return;
  //     }

  //     // Transform the data to include sub-ratings and photo counts
  //     const enrichedReviews: EnrichedTripAdvisorReview[] = (reviewsWithData || []).map(review => {
  //       // Extract sub-ratings from the joined table
  //       let subRatings = null;
  //       if (review.TripAdvisorReviewSubRating && review.TripAdvisorReviewSubRating.length > 0) {
  //         const subRating = review.TripAdvisorReviewSubRating[0];
  //         subRatings = {
  //           service: subRating.service,
  //           food: subRating.food,
  //           value: subRating.value,
  //           atmosphere: subRating.atmosphere,
  //           cleanliness: subRating.cleanliness,
  //           location: subRating.location,
  //           rooms: subRating.rooms,
  //           sleepQuality: subRating.sleepQuality
  //         };
  //       }

  //       // Extract review metadata
  //       let reviewMetadata = null;
  //       if (review.ReviewMetadata) {
  //         if (Array.isArray(review.ReviewMetadata)) {
  //           reviewMetadata = review.ReviewMetadata.length > 0 ? review.ReviewMetadata[0] : null;
  //         } else {
  //           reviewMetadata = review.ReviewMetadata;
  //         }
  //       }

  //       // Count photos from the joined table
  //       const photoCount = Array.isArray(review.TripAdvisorReviewPhoto) ? review.TripAdvisorReviewPhoto.length : 0;

  //       return {
  //         ...review,
  //         subRatings,
  //         photoCount,
  //         reviewMetadata
  //       };
  //     });

  //     // Calculate overview metrics using the enriched data
  //     const averageRating = this.calculateAverageRating(enrichedReviews);
  //     const totalReviews = enrichedReviews.length;
  //     const responseMetrics = this.calculateResponseMetrics(enrichedReviews);
  //     const ratingDistribution = this.generateRatingDistribution(enrichedReviews);
  //     const sentimentAnalysis = this.aggregateSentimentAnalysis(enrichedReviews);
  //     const topKeywords = this.aggregateKeywords(enrichedReviews);
  //     const subRatingAnalysis = this.calculateSubRatingAnalysis(enrichedReviews);
  //     const tripTypeAnalysis = this.calculateTripTypeAnalysis(enrichedReviews);
  //     const helpfulVotesMetrics = this.calculateHelpfulVotesMetrics(enrichedReviews);
  //     const recentReviews = this.getRecentReviews(enrichedReviews);

  //     // Create or update overview
  //     const overviewData = {
  //       id: randomUUID(),
  //       businessProfileId: businessProfile.id,
  //       averageRating: averageRating,
  //       totalReviews: totalReviews,
  //       oneStarCount: ratingDistribution['1']?.value || 0,
  //       twoStarCount: ratingDistribution['2']?.value || 0,
  //       threeStarCount: ratingDistribution['3']?.value || 0,
  //       fourStarCount: ratingDistribution['4']?.value || 0,
  //       fiveStarCount: ratingDistribution['5']?.value || 0,
        
  //       // Sub-rating averages
  //       averageServiceRating: subRatingAnalysis.service.average || null,
  //       averageFoodRating: subRatingAnalysis.food.average || null,
  //       averageValueRating: subRatingAnalysis.value.average || null,
  //       averageAtmosphereRating: subRatingAnalysis.atmosphere.average || null,
  //       averageCleanlinessRating: subRatingAnalysis.cleanliness.average || null,
  //       averageLocationRating: subRatingAnalysis.location.average || null,
  //       averageRoomsRating: subRatingAnalysis.rooms.average || null,
  //       averageSleepQualityRating: subRatingAnalysis.sleep_quality.average || null,
        
  //       // Trip type analysis
  //       familyReviews: tripTypeAnalysis.FAMILY,
  //       couplesReviews: tripTypeAnalysis.COUPLES,
  //       soloReviews: tripTypeAnalysis.SOLO,
  //       businessReviews: tripTypeAnalysis.BUSINESS,
  //       friendsReviews: tripTypeAnalysis.FRIENDS,
        
  //       // Response metrics
  //       responseRate: responseMetrics.responseRate,
  //       averageResponseTime: responseMetrics.averageResponseTime,
        
  //       // TripAdvisor specific metrics
  //       helpfulVotesTotal: helpfulVotesMetrics.total,
  //       averageHelpfulVotes: helpfulVotesMetrics.average,
        
  //       lastUpdated: new Date()
  //     };

  //     // Upsert overview
  //     const { data: overview, error: overviewError } = await this.supabase
  //       .from('TripAdvisorOverview')
  //       .upsert(overviewData, { 
  //         onConflict: 'businessProfileId',
  //         ignoreDuplicates: false 
  //       })
  //       .select('id')
  //       .single();

  //     if (overviewError) {
  //       console.error(`❌ Failed to upsert TripAdvisor overview:`, overviewError);
  //       return;
  //     }

  //     console.log(`✅ TripAdvisor overview updated for business: ${businessProfile.name}`);

  //     // Update related tables with separate records instead of JSON
  //     await Promise.all([
  //       this.updateSentimentAnalysis(overview.id, sentimentAnalysis),
  //       this.updateTopKeywords(overview.id, topKeywords),
  //       this.updateRecentReviews(overview.id, recentReviews),
  //       this.updateRatingDistribution(businessProfile.id, overview.id, enrichedReviews, tripTypeAnalysis, subRatingAnalysis),
  //       this.updatePeriodicalMetrics(overview.id, enrichedReviews)
  //     ]);

  //     console.log(`🎯 TripAdvisor overview processing completed for locationId: ${locationId}`);

  //   } catch (error) {
  //     console.error(`❌ Error processing TripAdvisor overview for locationId ${locationId}:`, error);
  //     throw error;
  //   }
  // }

  private calculateAverageRating(reviews: EnrichedTripAdvisorReview[]): number {
    if (reviews.length === 0) return 0;
    
    const totalRating = reviews.reduce((sum, review) => {
      // Use the review's rating from ReviewMetadata if available, otherwise use the TripAdvisor rating
      const rating = review.reviewMetadata?.sentiment || review.rating || 0;
      return sum + rating;
    }, 0);
    
    return Math.round((totalRating / reviews.length) * 10) / 10; // Round to 1 decimal place
  }

  private calculateResponseMetrics(reviews: EnrichedTripAdvisorReview[]): { responseRate: number; averageResponseTime: number } {
    const reviewsWithResponses = reviews.filter(review => review.hasOwnerResponse && review.responseFromOwnerText);
    const responseRate = reviews.length > 0 ? (reviewsWithResponses.length / reviews.length) * 100 : 0;
    
    let totalResponseTime = 0;
    let validResponseTimes = 0;
    
    reviewsWithResponses.forEach(review => {
      if (review.responseFromOwnerDate && review.publishedDate) {
        const responseTime = new Date(review.responseFromOwnerDate).getTime() - new Date(review.publishedDate).getTime();
        const responseTimeHours = responseTime / (1000 * 60 * 60);
        
        if (responseTimeHours >= 0 && responseTimeHours <= 8760) { // Max 1 year
          totalResponseTime += responseTimeHours;
          validResponseTimes++;
        }
      }
    });
    
    const averageResponseTime = validResponseTimes > 0 ? totalResponseTime / validResponseTimes : 0;
    
    return {
      responseRate: Math.round(responseRate * 10) / 10,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10
    };
  }

  private generateRatingDistribution(reviews: EnrichedTripAdvisorReview[]): TripAdvisorRatingDistributionData {
    const distribution: { [key: string]: number } = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
    };
    
    reviews.forEach(review => {
      const rating = review.rating || 0;
      const roundedRating = Math.round(rating);
      if (roundedRating >= 1 && roundedRating <= 5) {
        distribution[roundedRating.toString()]++;
      }
    });
    
    const total = reviews.length;
    const result: TripAdvisorRatingDistributionData = {};
    
    Object.keys(distribution).forEach(rating => {
      result[rating] = {
        value: distribution[rating],
        percentageValue: total > 0 ? Math.round((distribution[rating] / total) * 100) : 0
      };
    });
    
    return result;
  }

  private aggregateSentimentAnalysis(reviews: EnrichedTripAdvisorReview[]): TripAdvisorSentimentAnalysis {
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    let totalSentiment = 0;
    let sentimentCount = 0;
    
    reviews.forEach(review => {
      if (review.reviewMetadata?.sentiment !== null && review.reviewMetadata?.sentiment !== undefined) {
        const sentiment = review.reviewMetadata.sentiment;
        totalSentiment += sentiment;
        sentimentCount++;
        
        if (sentiment > 0.1) {
          positive++;
        } else if (sentiment < -0.1) {
          negative++;
        } else {
          neutral++;
        }
      }
    });
    
    return {
      positive,
      neutral,
      negative,
      averageSentiment: sentimentCount > 0 ? totalSentiment / sentimentCount : 0
    };
  }

  private aggregateKeywords(reviews: EnrichedTripAdvisorReview[], count: number = 10): TripAdvisorKeywordCount[] {
    const keywordCounts: { [key: string]: { count: number; totalSentiment: number } } = {};
    
    reviews.forEach(review => {
      if (review.reviewMetadata?.keywords && Array.isArray(review.reviewMetadata.keywords)) {
        const sentiment = review.reviewMetadata.sentiment || 0;
        
        review.reviewMetadata.keywords.forEach(keyword => {
          if (typeof keyword === 'string' && keyword.length > 2) {
            const normalizedKeyword = keyword.toLowerCase().trim();
            if (!keywordCounts[normalizedKeyword]) {
              keywordCounts[normalizedKeyword] = { count: 0, totalSentiment: 0 };
            }
            keywordCounts[normalizedKeyword].count++;
            keywordCounts[normalizedKeyword].totalSentiment += sentiment;
          }
        });
      }
    });
    
    return Object.entries(keywordCounts)
      .map(([keyword, data]) => ({
        key: keyword,
        value: data.count,
        sentiment: data.count > 0 ? Math.round((data.totalSentiment / data.count) * 100) / 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, count);
  }

  private calculateSubRatingAnalysis(reviews: EnrichedTripAdvisorReview[]): TripAdvisorSubRatingAnalysis {
    const subRatingTotals = {
      service: { sum: 0, count: 0 },
      food: { sum: 0, count: 0 },
      value: { sum: 0, count: 0 },
      atmosphere: { sum: 0, count: 0 },
      cleanliness: { sum: 0, count: 0 },
      location: { sum: 0, count: 0 },
      rooms: { sum: 0, count: 0 },
      sleep_quality: { sum: 0, count: 0 }
    };

    reviews.forEach(review => {
      if (review.subRatings) {
        Object.keys(subRatingTotals).forEach(key => {
          const value = review.subRatings![key === 'sleep_quality' ? 'sleepQuality' : key as keyof typeof review.subRatings];
          if (value !== null && value !== undefined && typeof value === 'number') {
            subRatingTotals[key as keyof typeof subRatingTotals].sum += value;
            subRatingTotals[key as keyof typeof subRatingTotals].count++;
          }
        });
      }
    });

    return {
      service: {
        average: subRatingTotals.service.count > 0 ? Math.round((subRatingTotals.service.sum / subRatingTotals.service.count) * 10) / 10 : 0,
        count: subRatingTotals.service.count
      },
      food: {
        average: subRatingTotals.food.count > 0 ? Math.round((subRatingTotals.food.sum / subRatingTotals.food.count) * 10) / 10 : 0,
        count: subRatingTotals.food.count
      },
      value: {
        average: subRatingTotals.value.count > 0 ? Math.round((subRatingTotals.value.sum / subRatingTotals.value.count) * 10) / 10 : 0,
        count: subRatingTotals.value.count
      },
      atmosphere: {
        average: subRatingTotals.atmosphere.count > 0 ? Math.round((subRatingTotals.atmosphere.sum / subRatingTotals.atmosphere.count) * 10) / 10 : 0,
        count: subRatingTotals.atmosphere.count
      },
      cleanliness: {
        average: subRatingTotals.cleanliness.count > 0 ? Math.round((subRatingTotals.cleanliness.sum / subRatingTotals.cleanliness.count) * 10) / 10 : 0,
        count: subRatingTotals.cleanliness.count
      },
      location: {
        average: subRatingTotals.location.count > 0 ? Math.round((subRatingTotals.location.sum / subRatingTotals.location.count) * 10) / 10 : 0,
        count: subRatingTotals.location.count
      },
      rooms: {
        average: subRatingTotals.rooms.count > 0 ? Math.round((subRatingTotals.rooms.sum / subRatingTotals.rooms.count) * 10) / 10 : 0,
        count: subRatingTotals.rooms.count
      },
      sleep_quality: {
        average: subRatingTotals.sleep_quality.count > 0 ? Math.round((subRatingTotals.sleep_quality.sum / subRatingTotals.sleep_quality.count) * 10) / 10 : 0,
        count: subRatingTotals.sleep_quality.count
      }
    };
  }

  private calculateTripTypeAnalysis(reviews: EnrichedTripAdvisorReview[]): TripAdvisorTripTypeAnalysis {
    const tripTypes = {
      FAMILY: 0,
      COUPLES: 0,
      SOLO: 0,
      BUSINESS: 0,
      FRIENDS: 0,
      OTHER: 0
    };

    reviews.forEach(review => {
      const tripType = review.tripType?.toUpperCase();
      if (tripType && tripTypes.hasOwnProperty(tripType)) {
        tripTypes[tripType as keyof TripAdvisorTripTypeAnalysis]++;
      } else if (tripType) {
        tripTypes.OTHER++;
      }
    });

    return tripTypes;
  }

  private calculateHelpfulVotesMetrics(reviews: EnrichedTripAdvisorReview[]): { total: number; average: number } {
    const totalHelpfulVotes = reviews.reduce((sum, review) => sum + (review.helpfulVotes || 0), 0);
    const averageHelpfulVotes = reviews.length > 0 ? totalHelpfulVotes / reviews.length : 0;

    return {
      total: totalHelpfulVotes,
      average: Math.round(averageHelpfulVotes * 10) / 10
    };
  }

  private getRecentReviews(reviews: EnrichedTripAdvisorReview[]): any[] {
    return reviews
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, 5)
      .map(review => ({
        id: review.id,
        rating: review.rating,
        text: review.text?.substring(0, 200) + (review.text && review.text.length > 200 ? '...' : ''),
        reviewerName: review.reviewerName,
        publishedDate: review.publishedDate,
        tripType: review.tripType,
        helpfulVotes: review.helpfulVotes,
        hasPhotos: review.photoCount > 0
      }));
  }

  private async updateSentimentAnalysis(overviewId: string, sentimentAnalysis: TripAdvisorSentimentAnalysis): Promise<void> {
    try {
      const sentimentData = {
        id: randomUUID(),
        tripAdvisorOverviewId: overviewId,
        positiveCount: sentimentAnalysis.positive || 0,
        neutralCount: sentimentAnalysis.neutral || 0,
        negativeCount: sentimentAnalysis.negative || 0,
        totalAnalyzed: (sentimentAnalysis.positive || 0) + (sentimentAnalysis.neutral || 0) + (sentimentAnalysis.negative || 0),
        averageSentiment: sentimentAnalysis.averageSentiment || 0
      };

      await this.supabase
        .from('TripAdvisorSentimentAnalysis')
        .upsert(sentimentData, { onConflict: 'tripAdvisorOverviewId' });
    } catch (error) {
      console.warn('Failed to update sentiment analysis:', error);
    }
  }

  private async updateTopKeywords(overviewId: string, keywords: TripAdvisorKeywordCount[]): Promise<void> {
    try {
      // Delete existing keywords
      await this.supabase
        .from('TripAdvisorTopKeyword')
        .delete()
        .eq('tripAdvisorOverviewId', overviewId);

      // Insert new keywords
      if (keywords.length > 0) {
        const keywordData = keywords.map(keyword => ({
          id: randomUUID(),
          tripAdvisorOverviewId: overviewId,
          keyword: keyword.key,
          count: keyword.value
        }));

        await this.supabase
          .from('TripAdvisorTopKeyword')
          .insert(keywordData);
      }
    } catch (error) {
      console.warn('Failed to update top keywords:', error);
    }
  }

  private async updateRecentReviews(overviewId: string, recentReviews: any[]): Promise<void> {
    try {
      // Delete existing recent reviews
      await this.supabase
        .from('TripAdvisorRecentReview')
        .delete()
        .eq('tripAdvisorOverviewId', overviewId);

      // Insert new recent reviews
      if (recentReviews.length > 0) {
        const recentReviewData = recentReviews.map(review => ({
          id: randomUUID(),
          tripAdvisorOverviewId: overviewId,
          reviewId: review.id || randomUUID(),
          rating: review.rating || 0,
          publishedDate: new Date(review.publishedDate || review.date),
          text: review.text?.substring(0, 500) || null,
          reviewerName: review.reviewerName || review.author || 'Anonymous'
        }));

        await this.supabase
          .from('TripAdvisorRecentReview')
          .insert(recentReviewData);
      }
    } catch (error) {
      console.warn('Failed to update recent reviews:', error);
    }
  }

  private async updateRatingDistribution(
    businessProfileId: string,
    tripAdvisorOverviewId: string,
    allReviews: EnrichedTripAdvisorReview[],
    tripTypeAnalysis: TripAdvisorTripTypeAnalysis,
    subRatingAnalysis: TripAdvisorSubRatingAnalysis
  ): Promise<void> {
    try {
      // Calculate temporal distribution
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const lastSixMonths = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      const temporalCounts = {
        lastWeek: allReviews.filter(r => new Date(r.publishedDate) >= lastWeek).length,
        lastMonth: allReviews.filter(r => new Date(r.publishedDate) >= lastMonth).length,
        lastSixMonths: allReviews.filter(r => new Date(r.publishedDate) >= lastSixMonths).length,
        olderThanSixMonths: allReviews.filter(r => new Date(r.publishedDate) < lastSixMonths).length
      };

      // Calculate rating distribution
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      allReviews.forEach(review => {
        const rating = Math.round(review.rating);
        if (rating >= 1 && rating <= 5) {
          ratingCounts[rating as keyof typeof ratingCounts]++;
        }
      });

      // Calculate quality distribution
      const qualityCounts = {
        withPhotos: allReviews.filter(r => r.photoCount > 0).length,
        withoutPhotos: allReviews.filter(r => r.photoCount === 0).length,
        withRoomTips: allReviews.filter(r => r.roomTip && r.roomTip.trim().length > 0).length,
        withSubRatings: allReviews.filter(r => r.subRatings !== null).length
      };

      const ratingDistributionData = {
        businessProfileId,
        tripAdvisorOverviewId,
        oneStar: ratingCounts[1],
        twoStar: ratingCounts[2],
        threeStar: ratingCounts[3],
        fourStar: ratingCounts[4],
        fiveStar: ratingCounts[5],
        familyTrips: tripTypeAnalysis.FAMILY,
        couplesTrips: tripTypeAnalysis.COUPLES,
        soloTrips: tripTypeAnalysis.SOLO,
        businessTrips: tripTypeAnalysis.BUSINESS,
        friendsTrips: tripTypeAnalysis.FRIENDS,
        lastWeek: temporalCounts.lastWeek,
        lastMonth: temporalCounts.lastMonth,
        lastSixMonths: temporalCounts.lastSixMonths,
        olderThanSixMonths: temporalCounts.olderThanSixMonths,
        withPhotos: qualityCounts.withPhotos,
        withoutPhotos: qualityCounts.withoutPhotos,
        withRoomTips: qualityCounts.withRoomTips,
        withSubRatings: qualityCounts.withSubRatings,
        lastUpdated: new Date()
      };

      await this.supabase
        .from('TripAdvisorRatingDistribution')
        .upsert(ratingDistributionData, { onConflict: 'businessProfileId' });

      console.log('✅ TripAdvisor rating distribution updated');
    } catch (error) {
      console.error('❌ Error updating TripAdvisor rating distribution:', error);
    }
  }

  private calculateSubRatingDistribution(reviews: EnrichedTripAdvisorReview[], ratingType: string): any {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    reviews.forEach(review => {
      if (review.subRatings && review.subRatings[ratingType as keyof typeof review.subRatings]) {
        const rating = Math.round(review.subRatings[ratingType as keyof typeof review.subRatings] as number);
        if (rating >= 1 && rating <= 5) {
          distribution[rating as keyof typeof distribution]++;
        }
      }
    });
    
    return {
      one: distribution[1],
      two: distribution[2],
      three: distribution[3],
      four: distribution[4],
      five: distribution[5]
    };
  }

  private async updatePeriodicalMetrics(
    tripAdvisorOverviewId: string,
    allReviews: EnrichedTripAdvisorReview[]
  ): Promise<void> {
    try {
      const periods = [
        { key: 1, label: 'Last 1 Day', days: 1 },
        { key: 3, label: 'Last 3 Days', days: 3 },
        { key: 7, label: 'Last 7 Days', days: 7 },
        { key: 30, label: 'Last 30 Days', days: 30 },
        { key: 180, label: 'Last 6 Months', days: 180 },
        { key: 365, label: 'Last 12 Months', days: 365 },
        { key: 0, label: 'All Time', days: null }
      ];

      const metricsToInsert = periods.map(period => {
        const periodReviews = period.days 
          ? allReviews.filter(review => {
              const reviewDate = new Date(review.publishedDate);
              const cutoffDate = new Date(Date.now() - period.days! * 24 * 60 * 60 * 1000);
              return reviewDate >= cutoffDate;
            })
          : allReviews;

        return {
          id: randomUUID(),
          tripAdvisorOverviewId,
          periodKey: period.key,
          periodLabel: period.label,
          ...this.calculateMetricsForPeriod(periodReviews)
        };
      });

      // Delete existing metrics
      await this.supabase
        .from('TripAdvisorPeriodicalMetric')
        .delete()
        .eq('tripAdvisorOverviewId', tripAdvisorOverviewId);

      // Insert new metrics
      await this.supabase
        .from('TripAdvisorPeriodicalMetric')
        .insert(metricsToInsert);

      console.log(`✅ TripAdvisor periodical metrics updated (${metricsToInsert.length} periods)`);
    } catch (error) {
      console.error('❌ Error updating TripAdvisor periodical metrics:', error);
    }
  }

  private calculateMetricsForPeriod(reviewsInPeriod: EnrichedTripAdvisorReview[]): any {
    if (reviewsInPeriod.length === 0) {
      return {
        averageRating: 0,
        oneStarCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        fourStarCount: 0,
        fiveStarCount: 0,
        reviewCount: 0,
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
        responseRatePercent: null,
        avgResponseTimeHours: null,
        sentimentPositive: null,
        sentimentNeutral: null,
        sentimentNegative: null,
        sentimentTotal: null,
        sentimentScore: null,
        rankingPosition: null,
        rankingTrend: null,
        competitorMentions: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Calculate basic metrics
    const totalRating = reviewsInPeriod.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviewsInPeriod.length;

    // Rating distribution
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewsInPeriod.forEach(review => {
      const rating = Math.round(review.rating);
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating as keyof typeof ratingCounts]++;
      }
    });

    // Sub-rating averages
    const subRatingAnalysis = this.calculateSubRatingAnalysis(reviewsInPeriod);

    // Trip type analysis
    const tripTypeAnalysis = this.calculateTripTypeAnalysis(reviewsInPeriod);

    // Engagement metrics
    const totalHelpfulVotes = reviewsInPeriod.reduce((sum, review) => sum + (review.helpfulVotes || 0), 0);
    const reviewsWithPhotos = reviewsInPeriod.filter(review => review.photoCount > 0).length;

    // Response metrics
    const responseMetrics = this.calculateResponseMetrics(reviewsInPeriod);

    // Sentiment analysis
    const sentimentAnalysis = this.aggregateSentimentAnalysis(reviewsInPeriod);

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      oneStarCount: ratingCounts[1],
      twoStarCount: ratingCounts[2],
      threeStarCount: ratingCounts[3],
      fourStarCount: ratingCounts[4],
      fiveStarCount: ratingCounts[5],
      reviewCount: reviewsInPeriod.length,
      averageServiceRating: subRatingAnalysis.service.average || null,
      averageFoodRating: subRatingAnalysis.food.average || null,
      averageValueRating: subRatingAnalysis.value.average || null,
      averageAtmosphereRating: subRatingAnalysis.atmosphere.average || null,
      averageCleanlinessRating: subRatingAnalysis.cleanliness.average || null,
      averageLocationRating: subRatingAnalysis.location.average || null,
      averageRoomsRating: subRatingAnalysis.rooms.average || null,
      averageSleepQualityRating: subRatingAnalysis.sleep_quality.average || null,
      familyReviews: tripTypeAnalysis.FAMILY,
      couplesReviews: tripTypeAnalysis.COUPLES,
      soloReviews: tripTypeAnalysis.SOLO,
      businessReviews: tripTypeAnalysis.BUSINESS,
      friendsReviews: tripTypeAnalysis.FRIENDS,
      totalHelpfulVotes,
      averageHelpfulVotes: Math.round((totalHelpfulVotes / reviewsInPeriod.length) * 10) / 10,
      reviewsWithPhotos,
      responseRatePercent: responseMetrics.responseRate,
      avgResponseTimeHours: responseMetrics.averageResponseTime,
      sentimentPositive: sentimentAnalysis.positive,
      sentimentNeutral: sentimentAnalysis.neutral,
      sentimentNegative: sentimentAnalysis.negative,
      sentimentTotal: sentimentAnalysis.positive + sentimentAnalysis.neutral + sentimentAnalysis.negative,
      sentimentScore: sentimentAnalysis.averageSentiment,
      rankingPosition: null, // Would need additional data
      rankingTrend: null, // Would need historical data
      competitorMentions: this.calculateCompetitorMentions(reviewsInPeriod),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private calculateCompetitorMentions(reviews: EnrichedTripAdvisorReview[]): number | null {
    // Simple implementation - count reviews mentioning common competitor keywords
    const competitorKeywords = ['competitor', 'other hotel', 'alternative', 'compared to', 'better than', 'worse than'];
    
    let mentionCount = 0;
    reviews.forEach(review => {
      if (review.text) {
        const lowerText = review.text.toLowerCase();
        if (competitorKeywords.some(keyword => lowerText.includes(keyword))) {
          mentionCount++;
        }
      }
    });
    
    return mentionCount;
  }

  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
  }
} 