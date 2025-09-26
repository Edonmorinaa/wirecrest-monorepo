import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  FacebookReviewWithMetadata,
  ReviewMetadata
} from '../types/facebook';
import { randomUUID } from 'crypto';

interface KeywordFrequency {
  keyword: string;
  count: number;
  sentiment?: number;
}

interface TagFrequency {
  tag: string;
  count: number;
  recommendationRate: number;
  averageSentiment: number;
}

// Structure for period-based aggregated metrics adapted for Facebook
interface PeriodMetricsData {
  totalReviews: number;
  recommendedCount: number;
  notRecommendedCount: number;
  recommendationRate: number; // Percentage of recommended vs total
  
  // Engagement metrics
  totalLikes: number;
  totalComments: number;
  totalPhotos: number;
  averageLikesPerReview: number;
  averageCommentsPerReview: number;
  
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
  180: { days: 180, label: 'Last 6 Months' }, // Approx 6 months
  365: { days: 365, label: 'Last 12 Months' }, // Approx 12 months
  0: { days: null, label: 'All Time' } // Special case for all reviews
};

type PeriodKeys = keyof typeof PERIOD_DEFINITIONS;

export class FacebookReviewAnalyticsService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Processes all reviews for a given Facebook business profile and updates its dashboard.
   * This should be called after new reviews are fetched or on a scheduled basis.
   */
  async processReviewsAndUpdateDashboard(businessProfileId: string): Promise<void> {
    console.log(`[Facebook Analytics] Starting PERIODICAL review processing for businessProfileId: ${businessProfileId} (Normalized Approach)`);
    try {
      const { data: businessProfile, error: profileError } = await this.supabase
        .from('FacebookBusinessProfile')
        .select(`
          id, 
          teamId, 
          title, 
          facebookUrl, 
          pageName
        `)
        .eq('id', businessProfileId)
        .single();

      if (profileError || !businessProfile) {
        console.error(`[Facebook Analytics] Error fetching business profile ${businessProfileId}:`, profileError);
        throw new Error(`Facebook business profile ${businessProfileId} not found.`);
      }
      console.log(`[Facebook Analytics] Processing for "${businessProfile.title || businessProfile.pageName}" (Team: ${businessProfile.teamId})`);

      // First, let's check if any reviews exist at all
      const { count: reviewCount, error: countError } = await this.supabase
        .from('FacebookReview')
        .select('*', { count: 'exact', head: true })
        .eq('businessProfileId', businessProfileId);

      if (countError) {
        console.error(`[Facebook Analytics] Error counting reviews:`, countError);
      } else {
        console.log(`[Facebook Analytics] Found ${reviewCount} total FacebookReview records for businessProfileId: ${businessProfileId}`);
      }

      // Now fetch reviews with metadata using the correct foreign key relationship
      const { data: allReviewsData, error: reviewsError } = await this.supabase
        .from('FacebookReview')
        .select(`
          isRecommended, 
          date,
          likesCount,
          commentsCount,
          tags,
          reviewMetadataId,
          ReviewMetadata:reviewMetadataId(
            emotional, 
            keywords, 
            reply, 
            replyDate, 
            date,
            sentiment,
            photoCount
          )
        `)
        .eq('businessProfileId', businessProfileId)
        .order('date', { ascending: false });

      if (reviewsError) {
        console.error(`[Facebook Analytics] Error fetching reviews for ${businessProfileId}:`, reviewsError);
        console.error(`[Facebook Analytics] Error code: ${reviewsError.code}`);
        console.error(`[Facebook Analytics] Error message: ${reviewsError.message}`);
        console.error(`[Facebook Analytics] Error details:`, reviewsError.details);
        
        // Try a simpler query without the join to see if reviews exist
        const { data: simpleReviews, error: simpleError } = await this.supabase
          .from('FacebookReview')
          .select('id, isRecommended, date, likesCount, commentsCount, tags, reviewMetadataId')
          .eq('businessProfileId', businessProfileId)
          .limit(5);
        
        if (simpleError) {
          console.error(`[Facebook Analytics] Even simple review query failed:`, simpleError);
        } else {
          console.log(`[Facebook Analytics] Simple query found ${simpleReviews?.length || 0} reviews:`, simpleReviews);
          
          // If simple query works but join fails, fall back to separate queries
          if (simpleReviews && simpleReviews.length > 0) {
            console.log(`[Facebook Analytics] Falling back to simplified metadata fetching approach`);
            return await this.processReviewsWithSimplifiedApproach(businessProfileId, businessProfile);
          }
        }
        
        throw new Error(`Could not fetch Facebook reviews.`);
      }

      console.log(`[Facebook Analytics] Fetched ${allReviewsData?.length || 0} reviews with metadata for businessProfileId: ${businessProfileId}`);

      // If we get no reviews from the join query but the count shows reviews exist, 
      // there's likely a ReviewMetadata linking issue
      if ((allReviewsData?.length || 0) === 0 && (reviewCount || 0) > 0) {
        console.warn(`[Facebook Analytics] Join query returned 0 reviews but count query found ${reviewCount}. This suggests ReviewMetadata linking issues.`);
        console.log(`[Facebook Analytics] Falling back to simplified approach due to metadata join failure...`);
        return await this.processReviewsWithSimplifiedApproach(businessProfileId, businessProfile);
      }

      // Map the Supabase response to our expected interface structure
      // Handle both array and single object cases for ReviewMetadata
      const allReviews: FacebookReviewWithMetadata[] = (allReviewsData || []).map(review => {
        let reviewMetadata = null;
        
        if (review.ReviewMetadata) {
          // Handle both array and single object cases
          if (Array.isArray(review.ReviewMetadata)) {
            reviewMetadata = review.ReviewMetadata.length > 0 ? review.ReviewMetadata[0] : null;
          } else {
            reviewMetadata = review.ReviewMetadata;
          }
        }
        
        return {
          isRecommended: review.isRecommended,
          date: review.date,
          likesCount: review.likesCount,
          commentsCount: review.commentsCount,
          tags: review.tags,
          photoCount: reviewMetadata?.photoCount || 0,
          reviewMetadata
        };
      });
      
      // Debug: Show some sample review dates
      if (allReviews.length > 0) {
        console.log(`[Facebook Analytics] Sample review dates (first 3):`);
        allReviews.slice(0, 3).forEach((review, index) => {
          console.log(`  Review ${index + 1}: ${review.date} (${new Date(review.date).toLocaleDateString()})`);
          console.log(`    Has metadata: ${!!review.reviewMetadata}`);
          if (review.reviewMetadata) {
            console.log(`    Reply: ${review.reviewMetadata.reply ? 'YES' : 'NO'}`);
            console.log(`    Reply date: ${review.reviewMetadata.replyDate || 'None'}`);
            console.log(`    Emotional: ${review.reviewMetadata.emotional || 'None'}`);
            console.log(`    Keywords: ${review.reviewMetadata.keywords?.length || 0}`);
          }
        });
        
        // Show oldest and newest review dates
        const reviewDates = allReviews.map(r => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime());
        const oldestDate = reviewDates[0];
        const newestDate = reviewDates[reviewDates.length - 1];
        console.log(`[Facebook Analytics] Review date range: ${oldestDate.toLocaleDateString()} to ${newestDate.toLocaleDateString()}`);
        console.log(`[Facebook Analytics] Current date: ${new Date().toLocaleDateString()}`);
        console.log(`[Facebook Analytics] Days since newest review: ${Math.floor((Date.now() - newestDate.getTime()) / (1000 * 60 * 60 * 24))}`);
      }
      
      const currentDate = new Date();
      
      // 1. Upsert the FacebookOverview record (snapshot part)
      // Fetch existing overview to get its ID for linking PeriodicalMetric records
      let { data: overviewRecord, error: overviewFetchError } = await this.supabase
        .from('FacebookOverview')
        .select('id')
        .eq('businessProfileId', businessProfileId)
        .single();

      const allTimeMetricsForSnapshot = this.calculateMetricsForPeriod(allReviews);

      if (overviewFetchError && overviewFetchError.code !== 'PGRST116') {
        console.error(`[Facebook Analytics] Error fetching existing FacebookOverview:`, overviewFetchError);
        throw new Error(`Could not fetch existing FacebookOverview record.`);
      }

      // Calculate engagement and virality scores
      const engagementScore = this.calculateEngagementScore(allTimeMetricsForSnapshot);
      const viralityScore = this.calculateViralityScore(allTimeMetricsForSnapshot);

      const overviewData = {
        businessProfileId,
        totalReviews: allTimeMetricsForSnapshot.totalReviews,
        recommendedCount: allTimeMetricsForSnapshot.recommendedCount,
        notRecommendedCount: allTimeMetricsForSnapshot.notRecommendedCount,
        recommendationRate: allTimeMetricsForSnapshot.recommendationRate,
        totalLikes: allTimeMetricsForSnapshot.totalLikes,
        totalComments: allTimeMetricsForSnapshot.totalComments,
        totalPhotos: allTimeMetricsForSnapshot.totalPhotos,
        averageLikesPerReview: allTimeMetricsForSnapshot.averageLikesPerReview,
        averageCommentsPerReview: allTimeMetricsForSnapshot.averageCommentsPerReview,
        responseRate: allTimeMetricsForSnapshot.responseRatePercent,
        averageResponseTime: allTimeMetricsForSnapshot.avgResponseTimeHours,
        engagementScore: engagementScore,
        viralityScore: viralityScore,
        lastUpdated: currentDate
      };

      if (overviewRecord) {
        // Update existing overview
        const { error: overviewUpdateError } = await this.supabase
          .from('FacebookOverview')
          .update(overviewData)
          .eq('id', overviewRecord.id);

        if (overviewUpdateError) {
          console.error(`[Facebook Analytics] Error updating FacebookOverview:`, overviewUpdateError);
          throw new Error(`Could not update FacebookOverview record.`);
        }
        console.log(`[Facebook Analytics] Updated FacebookOverview record for businessProfileId: ${businessProfileId}`);
      } else {
        // Create new overview
        const { data: newOverview, error: overviewInsertError } = await this.supabase
          .from('FacebookOverview')
          .insert({ id: randomUUID(), ...overviewData })
          .select('id')
          .single();

        if (overviewInsertError) {
          console.error(`[Facebook Analytics] Error creating FacebookOverview:`, overviewInsertError);
          throw new Error(`Could not create FacebookOverview record.`);
        }
        overviewRecord = newOverview;
        console.log(`[Facebook Analytics] Created new FacebookOverview record for businessProfileId: ${businessProfileId}`);
      }

      console.log(`[Facebook Analytics] Successfully completed PERIODICAL review processing for businessProfileId: ${businessProfileId}`);

      // 2. Calculate and save Facebook Recommendation Distribution
      await this.updateRecommendationDistribution(businessProfileId, overviewRecord.id, allReviews);

      // 3. Calculate and save normalized analytics tables
      await this.updateNormalizedAnalytics(overviewRecord.id, allTimeMetricsForSnapshot, allReviews);

      // 4. Calculate and save period-based metrics
      await this.updatePeriodicalMetrics(overviewRecord.id, allReviews);

    } catch (error) {
      console.error(`[Facebook Analytics] Error in processReviewsAndUpdateDashboard for businessProfileId ${businessProfileId}:`, error);
      throw error;
    }
  }

  private calculateMetricsForPeriod(reviewsInPeriod: FacebookReviewWithMetadata[]): PeriodMetricsData {
    const reviewCount = reviewsInPeriod.length;
    
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
        avgResponseTimeHours: null
      };
    }

    // Calculate recommended count
    const recommendedCount = reviewsInPeriod.filter(r => r.isRecommended).length;
    const notRecommendedCount = reviewCount - recommendedCount;
    const recommendationRate = recommendedCount > 0 ? (recommendedCount / reviewCount) * 100 : 0;

    // Calculate total likes and comments
    const totalLikes = reviewsInPeriod.reduce((total, review) => total + review.likesCount, 0);
    const totalComments = reviewsInPeriod.reduce((total, review) => total + review.commentsCount, 0);

    // Calculate total photos
    const totalPhotos = reviewsInPeriod.reduce((total, review) => total + review.photoCount, 0);

    // Calculate average likes and comments per review
    const averageLikesPerReview = totalLikes / reviewCount;
    const averageCommentsPerReview = totalComments / reviewCount;

    // Calculate sentiment counts
    const sentimentCounts = this.calculateSentimentCounts(reviewsInPeriod);

    // Extract top keywords
    const topKeywords = this.extractTopKeywords(reviewsInPeriod, 10);

    // Extract top tags
    const topTags = this.extractTopTags(reviewsInPeriod, 10);

    // Calculate response metrics
    const { responseRatePercent, avgResponseTimeHours } = this.calculateResponseMetrics(reviewsInPeriod);

    return {
      totalReviews: reviewCount,
      recommendedCount,
      notRecommendedCount,
      recommendationRate,
      totalLikes,
      totalComments,
      totalPhotos,
      averageLikesPerReview,
      averageCommentsPerReview,
      sentimentCounts,
      topKeywords,
      topTags,
      responseRatePercent,
      avgResponseTimeHours
    };
  }

  private calculateSentimentCounts(reviews: FacebookReviewWithMetadata[]): { positive: number; neutral: number; negative: number; total: number } {
    let positive = 0, neutral = 0, negative = 0;

    reviews.forEach(review => {
      const emotional = review.reviewMetadata?.emotional?.toLowerCase();
      if (emotional === 'positive') positive++;
      else if (emotional === 'negative') negative++;
      else neutral++;
    });

    return { positive, neutral, negative, total: reviews.length };
  }

  private extractTopKeywords(reviews: FacebookReviewWithMetadata[], count: number): KeywordFrequency[] {
    const keywordCounts: { [keyword: string]: number } = {};

    reviews.forEach(review => {
      const keywords = review.reviewMetadata?.keywords || [];
      keywords.forEach(keyword => {
        const cleanKeyword = keyword.toLowerCase().trim();
        if (cleanKeyword.length > 2) { // Only keywords with more than 2 characters
          keywordCounts[cleanKeyword] = (keywordCounts[cleanKeyword] || 0) + 1;
        }
      });
    });

    return Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }

  private extractTopTags(reviews: FacebookReviewWithMetadata[], count: number): TagFrequency[] {
    const tagCounts: { [tag: string]: number } = {};

    reviews.forEach(review => {
      const tags = review.tags || [];
      tags.forEach(tag => {
        const cleanTag = tag.toLowerCase().trim();
        if (cleanTag.length > 2) { // Only tags with more than 2 characters
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        }
      });
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({
        tag,
        count,
        recommendationRate: 0, // Recommendation rate will be calculated later
        averageSentiment: 0 // Average sentiment will be calculated later
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }

  private calculateResponseMetrics(reviews: FacebookReviewWithMetadata[]): { responseRatePercent: number; avgResponseTimeHours: number | null } {
    const reviewsWithReplies = reviews.filter(r => r.reviewMetadata?.reply);
    const responseRatePercent = reviews.length > 0 ? (reviewsWithReplies.length / reviews.length) * 100 : 0;

    if (reviewsWithReplies.length === 0) {
      return { responseRatePercent, avgResponseTimeHours: null };
    }

    // Calculate average response time
    const responseTimes: number[] = [];
    reviewsWithReplies.forEach(review => {
      const reviewDate = new Date(review.date);
      const replyDate = review.reviewMetadata?.replyDate ? new Date(review.reviewMetadata.replyDate) : null;
      
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

  private async processReviewsWithSimplifiedApproach(businessProfileId: string, businessProfile: any): Promise<void> {
    console.log(`[Facebook Analytics] Using simplified approach for businessProfileId: ${businessProfileId}`);
    
    // Fetch reviews without joins
    const { data: simpleReviews, error: simpleError } = await this.supabase
      .from('FacebookReview')
      .select('id, isRecommended, date, likesCount, commentsCount, tags, photos, reviewMetadataId')
      .eq('businessProfileId', businessProfileId)
      .order('date', { ascending: false });

    if (simpleError || !simpleReviews) {
      throw new Error(`Could not fetch Facebook reviews with simplified approach: ${simpleError?.message}`);
    }

    // Create minimal review data for analytics
    const reviewsForAnalytics: FacebookReviewWithMetadata[] = simpleReviews.map(review => ({
      isRecommended: review.isRecommended,
      date: review.date,
      likesCount: review.likesCount,
      commentsCount: review.commentsCount,
      tags: review.tags,
      photoCount: 0, // No photo data in simplified approach
      reviewMetadata: null // No metadata in simplified approach
    }));

    // Calculate basic metrics
    const allTimeMetrics = this.calculateMetricsForPeriod(reviewsForAnalytics);

    // Update or create overview record
    const overviewData = {
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
      sentimentAnalysis: allTimeMetrics.sentimentCounts,
      topKeywords: allTimeMetrics.topKeywords,
      topTags: allTimeMetrics.topTags,
      recentReviews: reviewsForAnalytics.slice(0, 10),
      lastUpdated: new Date()
    };

    const { error: upsertError } = await this.supabase
      .from('FacebookOverview')
      .upsert(overviewData, { onConflict: 'businessProfileId' });

    if (upsertError) {
      console.error(`[Facebook Analytics] Error upserting FacebookOverview with simplified approach:`, upsertError);
      throw new Error(`Could not update FacebookOverview record with simplified approach.`);
    }

    // Also create normalized analytics and periodical metrics for simplified approach
    try {
      // We need the overview ID for periodical metrics
      const { data: overviewForMetrics, error: overviewError } = await this.supabase
        .from('FacebookOverview')
        .select('id')
        .eq('businessProfileId', businessProfileId)
        .single();
      
      if (overviewForMetrics && !overviewError) {
        // Create normalized analytics tables
        await this.updateNormalizedAnalytics(overviewForMetrics.id, allTimeMetrics, reviewsForAnalytics);
        console.log(`[Facebook Analytics] Successfully created normalized analytics for simplified approach`);
        
        // Create periodical metrics
        await this.updatePeriodicalMetrics(overviewForMetrics.id, reviewsForAnalytics);
        console.log(`[Facebook Analytics] Successfully created periodical metrics for simplified approach`);
      }
    } catch (metricsError) {
      console.warn(`[Facebook Analytics] Failed to create analytics/metrics in simplified approach:`, metricsError);
    }

    console.log(`[Facebook Analytics] Successfully completed simplified review processing for businessProfileId: ${businessProfileId}`);
  }

  /**
   * Updates the Facebook recommendation distribution for a business profile
   */
  private async updateRecommendationDistribution(
    businessProfileId: string,
    facebookOverviewId: string,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    console.log(`[Facebook Analytics] Calculating recommendation distribution for businessProfileId: ${businessProfileId}`);
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Recommendation distribution
    const recommended = allReviews.filter(r => r.isRecommended).length;
    const notRecommended = allReviews.length - recommended;

    // Engagement distribution (high: >5 likes OR >2 comments, medium: 1-5 likes OR 1-2 comments, low: 0 likes AND 0 comments)
    const highEngagement = allReviews.filter(r => r.likesCount > 5 || r.commentsCount > 2).length;
    const lowEngagement = allReviews.filter(r => r.likesCount === 0 && r.commentsCount === 0).length;
    const mediumEngagement = allReviews.length - highEngagement - lowEngagement;

    // Content distribution
    const withPhotos = allReviews.filter(r => r.photoCount > 0).length;
    const withoutPhotos = allReviews.length - withPhotos;
    const withTags = allReviews.filter(r => r.tags && r.tags.length > 0).length;
    const withoutTags = allReviews.length - withTags;

    // Temporal distribution
    const lastWeek = allReviews.filter(r => new Date(r.date) >= oneWeekAgo).length;
    const lastMonth = allReviews.filter(r => new Date(r.date) >= oneMonthAgo).length;
    const lastSixMonths = allReviews.filter(r => new Date(r.date) >= sixMonthsAgo).length;
    const olderThanSixMonths = allReviews.length - lastSixMonths;

    const distributionData = {
      id: randomUUID(),
      businessProfileId,
      facebookOverviewId,
      recommended,
      notRecommended,
      highEngagement,
      mediumEngagement,
      lowEngagement,
      withPhotos,
      withoutPhotos,
      withTags,
      withoutTags,
      lastWeek,
      lastMonth,
      lastSixMonths,
      olderThanSixMonths,
      lastUpdated: now
    };

    const { error: distributionError } = await this.supabase
      .from('FacebookRecommendationDistribution')
      .upsert(distributionData, {
        onConflict: 'businessProfileId'
      });

    if (distributionError) {
      console.error(`[Facebook Analytics] Error upserting FacebookRecommendationDistribution:`, distributionError);
      throw new Error(`Could not save recommendation distribution.`);
    }

    console.log(`[Facebook Analytics] Successfully updated recommendation distribution for businessProfileId: ${businessProfileId}`);
    console.log(`[Facebook Analytics] Distribution stats:`, {
      recommended,
      notRecommended,
      highEngagement,
      mediumEngagement,
      lowEngagement,
      withPhotos,
      withTags
    });
  }

  /**
   * Updates Facebook periodical metrics for all time periods
   */
  private async updatePeriodicalMetrics(
    facebookOverviewId: string,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    console.log(`[Facebook Analytics] Calculating periodical metrics for Facebook overview: ${facebookOverviewId}`);
    
    const periodicalMetricsToUpsert = [];

    for (const periodKeyStr of Object.keys(PERIOD_DEFINITIONS)) {
      const periodKey = parseInt(periodKeyStr) as PeriodKeys;
      const periodInfo = PERIOD_DEFINITIONS[periodKey];
      let reviewsInPeriod: FacebookReviewWithMetadata[];

      if (periodKey === 0) {
        // All time
        reviewsInPeriod = allReviews;
      } else {
        // Create proper date boundaries using millisecond calculations
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // End of today
        const startDate = new Date(endDate.getTime() - (periodInfo.days! * 24 * 60 * 60 * 1000)); // Go back exact number of days
        startDate.setHours(0, 0, 0, 0); // Start of that day
        
        console.log(`[Facebook Analytics] Period ${periodInfo.label}: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        reviewsInPeriod = allReviews.filter(r => {
          const reviewDate = new Date(r.date);
          const inPeriod = reviewDate >= startDate && reviewDate <= endDate;
          return inPeriod;
        });
        
        // Debug: show a few reviews that were included/excluded for short periods
        if (periodInfo.days! <= 30) {
          console.log(`[Facebook Analytics] Period ${periodInfo.label} - checking ${allReviews.length} total reviews:`);
          const sampleReviews = allReviews.slice(0, 3);
          sampleReviews.forEach((review, idx) => {
            const reviewDate = new Date(review.date);
            const inPeriod = reviewDate >= startDate && reviewDate <= endDate;
            console.log(`  Review ${idx + 1}: ${review.date} -> ${inPeriod ? 'INCLUDED' : 'EXCLUDED'}`);
          });
        }
      }
      
      console.log(`[Facebook Analytics] Found ${reviewsInPeriod.length} reviews for period: ${periodInfo.label}`);
      const metrics = this.calculateMetricsForPeriod(reviewsInPeriod);

      // Calculate enhanced metrics
      const averageEngagement = metrics.totalReviews > 0 
        ? (metrics.totalLikes + metrics.totalComments) / metrics.totalReviews 
        : 0;

      const sentimentScore = metrics.sentimentCounts.total > 0
        ? (metrics.sentimentCounts.positive - metrics.sentimentCounts.negative) / metrics.sentimentCounts.total
        : 0;

      const engagementRate = metrics.totalReviews > 0
        ? averageEngagement
        : 0;

      const viralityIndex = this.calculateViralityScore(metrics);
      const reviewQualityScore = this.calculateReviewQualityScore(reviewsInPeriod);

      const periodicalMetricData = {
        id: randomUUID(),
        facebookOverviewId: facebookOverviewId,
        periodKey: periodKey,
        periodLabel: periodInfo.label,
        recommendedCount: metrics.recommendedCount,
        notRecommendedCount: metrics.notRecommendedCount,
        recommendationRate: metrics.recommendationRate,
        totalLikes: metrics.totalLikes,
        totalComments: metrics.totalComments,
        totalPhotos: metrics.totalPhotos,
        averageEngagement: averageEngagement,
        reviewCount: metrics.totalReviews,
        sentimentPositive: metrics.sentimentCounts.positive,
        sentimentNeutral: metrics.sentimentCounts.neutral,
        sentimentNegative: metrics.sentimentCounts.negative,
        sentimentTotal: metrics.sentimentCounts.total,
        sentimentScore: sentimentScore,
        responseRatePercent: metrics.responseRatePercent,
        avgResponseTimeHours: metrics.avgResponseTimeHours,
        engagementRate: engagementRate,
        viralityIndex: viralityIndex,
        reviewQualityScore: reviewQualityScore,
        trendDirection: 'stable', // Default value - could be enhanced with trend analysis
        growthRate: null, // Could be calculated with historical data
        competitorMentions: 0, // Could be enhanced with competitor detection
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      periodicalMetricsToUpsert.push(periodicalMetricData);
    }
    
    console.log(`[Facebook Analytics] Prepared ${periodicalMetricsToUpsert.length} Facebook periodical metrics for upsert`);
    
    if (periodicalMetricsToUpsert.length > 0) {
      console.log(`[Facebook Analytics] Sample metric data:`, JSON.stringify(periodicalMetricsToUpsert[0], null, 2));
      
      const { error: upsertMetricsError } = await this.supabase
        .from('FacebookPeriodicalMetric')
        .upsert(periodicalMetricsToUpsert, { 
          onConflict: 'facebookOverviewId,periodKey',
          ignoreDuplicates: false
        });

      if (upsertMetricsError) {
        console.error(`[Facebook Analytics] Error upserting FacebookPeriodicalMetric records for overview ${facebookOverviewId}:`, upsertMetricsError);
        console.error(`[Facebook Analytics] Error details:`, {
          code: upsertMetricsError.code,
          message: upsertMetricsError.message,
          details: upsertMetricsError.details,
          hint: upsertMetricsError.hint
        });
        throw new Error(`Failed to upsert Facebook periodical metrics: ${upsertMetricsError.message}`);
      } else {
        console.log(`[Facebook Analytics] Successfully upserted ${periodicalMetricsToUpsert.length} Facebook periodical metrics`);
        
        // Create keywords and tags for each periodical metric
        await this.updatePeriodicalMetricRelations(facebookOverviewId, periodicalMetricsToUpsert, allReviews);
      }
    } else {
      console.warn(`[Facebook Analytics] No Facebook periodical metrics to upsert - this shouldn't happen unless there are no reviews`);
    }
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(metrics: PeriodMetricsData): number {
    if (metrics.totalReviews === 0) return 0;
    
    const engagementRate = (metrics.totalLikes + metrics.totalComments) / metrics.totalReviews;
    const photoRate = metrics.totalPhotos / metrics.totalReviews;
    const responseRate = metrics.responseRatePercent / 100;
    
    // Weighted engagement score
    const score = (engagementRate * 50) + (photoRate * 25) + (responseRate * 25);
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate virality score (0-100)
   */
  private calculateViralityScore(metrics: PeriodMetricsData): number {
    if (metrics.totalReviews === 0) return 0;
    
    const likesPerReview = metrics.averageLikesPerReview;
    const commentsPerReview = metrics.averageCommentsPerReview;
    const recommendationRate = metrics.recommendationRate / 100;
    
    // Virality based on engagement and recommendation rate
    const score = (likesPerReview * 30) + (commentsPerReview * 40) + (recommendationRate * 30);
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Updates all normalized analytics tables
   */
  private async updateNormalizedAnalytics(
    facebookOverviewId: string,
    metrics: PeriodMetricsData,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    console.log(`[Facebook Analytics] Creating normalized analytics for overview: ${facebookOverviewId}`);

    // 1. Sentiment Analysis
    await this.updateSentimentAnalysis(facebookOverviewId, metrics.sentimentCounts);

    // 2. Emotional Analysis
    await this.updateEmotionalAnalysis(facebookOverviewId, allReviews);

    // 3. Review Quality
    await this.updateReviewQuality(facebookOverviewId, allReviews);

    // 4. Content Length
    await this.updateContentLength(facebookOverviewId, allReviews);

    // 5. Keywords (normalized)
    await this.updateKeywords(facebookOverviewId, metrics.topKeywords);

    // 6. Tags (normalized)
    await this.updateTags(facebookOverviewId, metrics.topTags);

    // 7. Recent Reviews
    await this.updateRecentReviews(facebookOverviewId, allReviews.slice(0, 10));

    // 8. Topics (normalized)
    await this.updateTopics(facebookOverviewId, allReviews);

    // 9. Competitor Mentions
    await this.updateCompetitorMentions(facebookOverviewId, allReviews);

    // 10. Review Trends
    await this.updateReviewTrends(facebookOverviewId, allReviews);

    // 11. Seasonal Patterns
    await this.updateSeasonalPatterns(facebookOverviewId, allReviews);

    console.log(`[Facebook Analytics] Completed normalized analytics update`);
  }

  /**
   * Update sentiment analysis table
   */
  private async updateSentimentAnalysis(
    facebookOverviewId: string,
    sentimentCounts: { positive: number; neutral: number; negative: number; total: number }
  ): Promise<void> {
    const overall = sentimentCounts.total > 0 
      ? (sentimentCounts.positive - sentimentCounts.negative) / sentimentCounts.total
      : 0;

    const sentimentData = {
      id: randomUUID(),
      facebookOverviewId,
      positive: sentimentCounts.positive,
      negative: sentimentCounts.negative,
      neutral: sentimentCounts.neutral,
      overall: overall,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const { error } = await this.supabase
      .from('FacebookSentimentAnalysis')
      .upsert(sentimentData, { onConflict: 'facebookOverviewId', ignoreDuplicates: false });

    if (error) {
      console.error(`[Facebook Analytics] Error updating sentiment analysis:`, error);
      throw new Error(`Failed to update sentiment analysis: ${error.message}`);
    }
  }

  /**
   * Update emotional analysis table
   */
  private async updateEmotionalAnalysis(
    facebookOverviewId: string,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    // Calculate emotional scores from review metadata
    const emotions = { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 };
    let emotionCount = 0;

    allReviews.forEach(review => {
      const emotional = review.reviewMetadata?.emotional?.toLowerCase();
      if (emotional) {
        emotionCount++;
        switch (emotional) {
          case 'positive':
          case 'joy':
            emotions.joy++;
            break;
          case 'negative':
          case 'anger':
            emotions.anger++;
            break;
          case 'sadness':
            emotions.sadness++;
            break;
          case 'fear':
            emotions.fear++;
            break;
          case 'surprise':
            emotions.surprise++;
            break;
        }
      }
    });

    // Normalize to scores (0-1)
    const emotionalData = {
      id: randomUUID(),
      facebookOverviewId,
      joy: emotionCount > 0 ? emotions.joy / emotionCount : 0,
      anger: emotionCount > 0 ? emotions.anger / emotionCount : 0,
      sadness: emotionCount > 0 ? emotions.sadness / emotionCount : 0,
      fear: emotionCount > 0 ? emotions.fear / emotionCount : 0,
      surprise: emotionCount > 0 ? emotions.surprise / emotionCount : 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const { error } = await this.supabase
      .from('FacebookEmotionalAnalysis')
      .upsert(emotionalData, { onConflict: 'facebookOverviewId', ignoreDuplicates: false });

    if (error) {
      console.error(`[Facebook Analytics] Error updating emotional analysis:`, error);
      throw new Error(`Failed to update emotional analysis: ${error.message}`);
    }
  }

  /**
   * Update review quality table
   */
  private async updateReviewQuality(
    facebookOverviewId: string,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    let detailed = 0, brief = 0, spam = 0;

    allReviews.forEach(review => {
      const textLength = review.reviewMetadata?.keywords?.length || 0;
      if (textLength >= 5) detailed++;
      else if (textLength >= 1) brief++;
      else spam++;
    });

    const qualityData = {
      id: randomUUID(),
      facebookOverviewId,
      detailed,
      brief,
      spam,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const { error } = await this.supabase
      .from('FacebookReviewQuality')
      .upsert(qualityData, { onConflict: 'facebookOverviewId', ignoreDuplicates: false });

    if (error) {
      console.error(`[Facebook Analytics] Error updating review quality:`, error);
      throw new Error(`Failed to update review quality: ${error.message}`);
    }
  }

  /**
   * Update content length table
   */
  private async updateContentLength(
    facebookOverviewId: string,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    const lengths = allReviews.map(review => review.reviewMetadata?.keywords?.length || 0);
    const avgLength = lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
    const shortReviews = lengths.filter(l => l < 3).length;
    const longReviews = lengths.filter(l => l >= 10).length;

    const contentData = {
      id: randomUUID(),
      facebookOverviewId,
      avgLength,
      shortReviews,
      longReviews,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const { error } = await this.supabase
      .from('FacebookContentLength')
      .upsert(contentData, { onConflict: 'facebookOverviewId', ignoreDuplicates: false });

    if (error) {
      console.error(`[Facebook Analytics] Error updating content length:`, error);
      throw new Error(`Failed to update content length: ${error.message}`);
    }
  }

  /**
   * Update keywords table (normalized)
   */
  private async updateKeywords(
    facebookOverviewId: string,
    topKeywords: KeywordFrequency[]
  ): Promise<void> {
    // Delete existing keywords for this overview
    await this.supabase
      .from('FacebookKeyword')
      .delete()
      .eq('facebookOverviewId', facebookOverviewId);

    if (topKeywords.length === 0) return;

    // Insert new keywords
    const keywordData = topKeywords.map(kw => ({
      id: randomUUID(),
      facebookOverviewId,
      keyword: kw.keyword,
      count: kw.count,
      sentiment: kw.sentiment || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const { error } = await this.supabase
      .from('FacebookKeyword')
      .insert(keywordData);

    if (error) {
      console.error(`[Facebook Analytics] Error updating keywords:`, error);
      throw new Error(`Failed to update keywords: ${error.message}`);
    }
  }

  /**
   * Update tags table (normalized)
   */
  private async updateTags(
    facebookOverviewId: string,
    topTags: TagFrequency[]
  ): Promise<void> {
    // Delete existing tags for this overview
    await this.supabase
      .from('FacebookTag')
      .delete()
      .eq('facebookOverviewId', facebookOverviewId);

    if (topTags.length === 0) return;

    // Insert new tags
    const tagData = topTags.map(tag => ({
      id: randomUUID(),
      facebookOverviewId,
      tag: tag.tag,
      count: tag.count,
      sentiment: tag.averageSentiment || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const { error } = await this.supabase
      .from('FacebookTag')
      .insert(tagData);

    if (error) {
      console.error(`[Facebook Analytics] Error updating tags:`, error);
      throw new Error(`Failed to update tags: ${error.message}`);
    }
  }

  /**
   * Update recent reviews table
   */
  private async updateRecentReviews(
    facebookOverviewId: string,
    recentReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    // Delete existing recent reviews for this overview
    await this.supabase
      .from('FacebookRecentReview')
      .delete()
      .eq('facebookOverviewId', facebookOverviewId);

    if (recentReviews.length === 0) return;

    // Insert new recent reviews
    const recentData = recentReviews.map(review => {
      const engagementLevel = this.calculateEngagementLevel(review);
      
      return {
        id: randomUUID(),
        facebookOverviewId,
        reviewId: `fb_${Date.now()}_${Math.random()}`, // Generate a unique ID
        reviewDate: new Date(review.date),
        isRecommended: review.isRecommended,
        sentiment: review.reviewMetadata?.sentiment || null,
        engagementLevel,
        trendDirection: 'stable', // Default value
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    const { error } = await this.supabase
      .from('FacebookRecentReview')
      .insert(recentData);

    if (error) {
      console.error(`[Facebook Analytics] Error updating recent reviews:`, error);
      throw new Error(`Failed to update recent reviews: ${error.message}`);
    }
  }

  /**
   * Update topics table (normalized)
   */
  private async updateTopics(
    facebookOverviewId: string,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    // Delete existing topics for this overview
    await this.supabase
      .from('FacebookTopic')
      .delete()
      .eq('facebookOverviewId', facebookOverviewId);

    // Extract topics from keywords (group related keywords into topics)
    const topicGroups = this.extractTopics(allReviews);

    if (topicGroups.length === 0) return;

    // Insert new topics
    const topicData = topicGroups.map(topic => ({
      id: randomUUID(),
      facebookOverviewId,
      topic: topic.topic,
      count: topic.count,
      keywords: topic.keywords,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const { error } = await this.supabase
      .from('FacebookTopic')
      .insert(topicData);

    if (error) {
      console.error(`[Facebook Analytics] Error updating topics:`, error);
      throw new Error(`Failed to update topics: ${error.message}`);
    }
  }

  /**
   * Update competitor mentions table
   */
  private async updateCompetitorMentions(
    facebookOverviewId: string,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    // Delete existing competitor mentions for this overview
    await this.supabase
      .from('FacebookCompetitorMention')
      .delete()
      .eq('facebookOverviewId', facebookOverviewId);

    // Extract competitor mentions (simplified - could be enhanced with competitor detection)
    const competitorMentions = this.extractCompetitorMentions(allReviews);

    if (competitorMentions.length === 0) return;

    // Insert new competitor mentions
    const mentionData = competitorMentions.map(mention => ({
      id: randomUUID(),
      facebookOverviewId,
      competitor: mention.competitor,
      count: mention.count,
      context: mention.context,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const { error } = await this.supabase
      .from('FacebookCompetitorMention')
      .insert(mentionData);

    if (error) {
      console.error(`[Facebook Analytics] Error updating competitor mentions:`, error);
      throw new Error(`Failed to update competitor mentions: ${error.message}`);
    }
  }

  /**
   * Update review trends table
   */
  private async updateReviewTrends(
    facebookOverviewId: string,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    // Group reviews by month for trend analysis
    const monthlyData = new Map<string, FacebookReviewWithMetadata[]>();
    
    allReviews.forEach(review => {
      const date = new Date(review.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey)!.push(review);
    });

    // Delete existing trends for this overview
    await this.supabase
      .from('FacebookReviewTrend')
      .delete()
      .eq('facebookOverviewId', facebookOverviewId);

    if (monthlyData.size === 0) return;

    // Create trend data for recent months (last 12 months)
    const trendData = Array.from(monthlyData.entries())
      .slice(-12) // Last 12 months
      .map(([monthKey, monthReviews]) => {
        const [year, month] = monthKey.split('-').map(Number);
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0);
        
        const recommendedCount = monthReviews.filter(r => r.isRecommended).length;
        const recommendationRate = monthReviews.length > 0 ? (recommendedCount / monthReviews.length) * 100 : 0;
        const averageEngagement = monthReviews.length > 0 
          ? monthReviews.reduce((sum, r) => sum + r.likesCount + r.commentsCount, 0) / monthReviews.length
          : 0;

        return {
          id: randomUUID(),
          facebookOverviewId,
          period: monthKey,
          periodStart,
          periodEnd,
          reviewCount: monthReviews.length,
          recommendationRate,
          averageEngagement,
          trendDirection: 'stable', // Default value
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

    if (trendData.length > 0) {
      const { error } = await this.supabase
        .from('FacebookReviewTrend')
        .insert(trendData);

      if (error) {
        console.error(`[Facebook Analytics] Error updating review trends:`, error);
        throw new Error(`Failed to update review trends: ${error.message}`);
      }
    }
  }

  /**
   * Update seasonal patterns table
   */
  private async updateSeasonalPatterns(
    facebookOverviewId: string,
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    // Delete existing seasonal patterns for this overview
    await this.supabase
      .from('FacebookSeasonalPattern')
      .delete()
      .eq('facebookOverviewId', facebookOverviewId);

    // Calculate seasonal patterns by month
    const monthlyPatterns = this.calculateSeasonalPatterns(allReviews);

    if (monthlyPatterns.length === 0) return;

    // Insert new seasonal patterns
    const patternData = monthlyPatterns.map(pattern => ({
      id: randomUUID(),
      facebookOverviewId,
      season: pattern.season,
      monthNumber: pattern.monthNumber,
      averageReviews: pattern.averageReviews,
      averageRecommendation: pattern.averageRecommendation,
      averageEngagement: pattern.averageEngagement,
      pattern: pattern.pattern,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const { error } = await this.supabase
      .from('FacebookSeasonalPattern')
      .insert(patternData);

    if (error) {
      console.error(`[Facebook Analytics] Error updating seasonal patterns:`, error);
      throw new Error(`Failed to update seasonal patterns: ${error.message}`);
    }
  }

  /**
   * Extract topics from reviews
   */
  private extractTopics(allReviews: FacebookReviewWithMetadata[]): Array<{topic: string, count: number, keywords: string[]}> {
    // Group keywords into topics (simplified approach)
    const topicGroups: { [topic: string]: { count: number, keywords: Set<string> } } = {};
    
    // Define topic categories based on common keywords
    const topicMappings: { [keyword: string]: string } = {
      'service': 'Service Quality',
      'staff': 'Service Quality',
      'customer': 'Service Quality',
      'food': 'Food & Dining',
      'restaurant': 'Food & Dining',
      'meal': 'Food & Dining',
      'hotel': 'Accommodation',
      'room': 'Accommodation',
      'stay': 'Accommodation',
      'clean': 'Cleanliness',
      'location': 'Location',
      'price': 'Value for Money',
      'value': 'Value for Money',
      'experience': 'Overall Experience'
    };

    allReviews.forEach(review => {
      const keywords = review.reviewMetadata?.keywords || [];
      keywords.forEach(keyword => {
        const cleanKeyword = keyword.toLowerCase().trim();
        const topic = topicMappings[cleanKeyword] || 'Other';
        
        if (!topicGroups[topic]) {
          topicGroups[topic] = { count: 0, keywords: new Set() };
        }
        topicGroups[topic].count++;
        topicGroups[topic].keywords.add(cleanKeyword);
      });
    });

    return Object.entries(topicGroups)
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        keywords: Array.from(data.keywords)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 topics
  }

  /**
   * Extract competitor mentions from reviews
   */
  private extractCompetitorMentions(allReviews: FacebookReviewWithMetadata[]): Array<{competitor: string, count: number, context: string[]}> {
    // Simple competitor detection (could be enhanced with a proper competitor list)
    const competitorKeywords = ['competitor', 'compare', 'better than', 'versus', 'vs'];
    const competitorMentions: { [competitor: string]: { count: number, context: Set<string> } } = {};

    allReviews.forEach(review => {
      const keywords = review.reviewMetadata?.keywords || [];
      const hasCompetitorMention = keywords.some(kw => 
        competitorKeywords.some(ck => kw.toLowerCase().includes(ck))
      );
      
      if (hasCompetitorMention) {
        const competitor = 'General Competitor'; // Simplified - could extract actual names
        if (!competitorMentions[competitor]) {
          competitorMentions[competitor] = { count: 0, context: new Set() };
        }
        competitorMentions[competitor].count++;
        competitorMentions[competitor].context.add('comparison mentioned');
      }
    });

    return Object.entries(competitorMentions)
      .map(([competitor, data]) => ({
        competitor,
        count: data.count,
        context: Array.from(data.context)
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate seasonal patterns
   */
  private calculateSeasonalPatterns(allReviews: FacebookReviewWithMetadata[]): Array<{
    season: string,
    monthNumber: number,
    averageReviews: number,
    averageRecommendation: number,
    averageEngagement: number,
    pattern: string
  }> {
    // Group reviews by month
    const monthlyData: { [month: number]: FacebookReviewWithMetadata[] } = {};
    
    allReviews.forEach(review => {
      const month = new Date(review.date).getMonth() + 1; // 1-12
      if (!monthlyData[month]) {
        monthlyData[month] = [];
      }
      monthlyData[month].push(review);
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return Object.entries(monthlyData).map(([monthStr, monthReviews]) => {
      const month = parseInt(monthStr);
      const recommendedCount = monthReviews.filter(r => r.isRecommended).length;
      const averageRecommendation = monthReviews.length > 0 ? (recommendedCount / monthReviews.length) * 100 : 0;
      const averageEngagement = monthReviews.length > 0 
        ? monthReviews.reduce((sum, r) => sum + r.likesCount + r.commentsCount, 0) / monthReviews.length
        : 0;
      
      return {
        season: monthNames[month - 1],
        monthNumber: month,
        averageReviews: monthReviews.length,
        averageRecommendation,
        averageEngagement,
        pattern: averageRecommendation > 80 ? 'High Performance' : averageRecommendation > 60 ? 'Good Performance' : 'Below Average'
      };
    }).sort((a, b) => a.monthNumber - b.monthNumber);
  }

  /**
   * Calculate engagement level for a review
   */
  private calculateEngagementLevel(review: FacebookReviewWithMetadata): string {
    const totalEngagement = review.likesCount + review.commentsCount;
    if (totalEngagement > 5) return 'High';
    if (totalEngagement > 1) return 'Medium';
    return 'Low';
  }

  /**
   * Calculate review quality score (0-100)
   */
  private calculateReviewQualityScore(reviews: FacebookReviewWithMetadata[]): number {
    if (reviews.length === 0) return 0;

    let totalScore = 0;
    reviews.forEach(review => {
      let score = 50; // Base score
      
      // Bonus for having metadata
      if (review.reviewMetadata) score += 20;
      
      // Bonus for keywords
      const keywordCount = review.reviewMetadata?.keywords?.length || 0;
      if (keywordCount >= 5) score += 20;
      else if (keywordCount >= 2) score += 10;
      
      // Bonus for engagement
      const engagement = review.likesCount + review.commentsCount;
      if (engagement > 5) score += 10;
      else if (engagement > 0) score += 5;
      
      totalScore += Math.min(100, score);
    });

    return totalScore / reviews.length;
  }

  /**
   * Create keywords and tags for periodical metrics
   */
  private async updatePeriodicalMetricRelations(
    facebookOverviewId: string,
    periodicalMetrics: any[],
    allReviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    console.log(`[Facebook Analytics] Creating periodical metric relations`);

    for (const metric of periodicalMetrics) {
      // Filter reviews for this specific period
      let reviewsForPeriod: FacebookReviewWithMetadata[];
      
      if (metric.periodKey === 0) {
        // All time
        reviewsForPeriod = allReviews;
      } else {
        // Filter by period
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const startDate = new Date(endDate.getTime() - (metric.periodKey * 24 * 60 * 60 * 1000));
        startDate.setHours(0, 0, 0, 0);
        
        reviewsForPeriod = allReviews.filter(r => {
          const reviewDate = new Date(r.date);
          return reviewDate >= startDate && reviewDate <= endDate;
        });
      }

      // Calculate metrics for this period
      const periodMetrics = this.calculateMetricsForPeriod(reviewsForPeriod);

      // Create keywords for this periodical metric
      if (periodMetrics.topKeywords.length > 0) {
        const keywordData = periodMetrics.topKeywords.map(kw => ({
          id: randomUUID(),
          facebookPeriodicalMetricId: metric.id,
          keyword: kw.keyword,
          count: kw.count,
          sentiment: kw.sentiment || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        const { error: keywordError } = await this.supabase
          .from('FacebookKeyword')
          .insert(keywordData);

        if (keywordError) {
          console.error(`[Facebook Analytics] Error creating periodical keywords:`, keywordError);
        }
      }

      // Create tags for this periodical metric
      if (periodMetrics.topTags.length > 0) {
        const tagData = periodMetrics.topTags.map(tag => ({
          id: randomUUID(),
          facebookPeriodicalMetricId: metric.id,
          tag: tag.tag,
          count: tag.count,
          sentiment: tag.averageSentiment || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        const { error: tagError } = await this.supabase
          .from('FacebookTag')
          .insert(tagData);

        if (tagError) {
          console.error(`[Facebook Analytics] Error creating periodical tags:`, tagError);
        }
      }

      // Create topics for this periodical metric
      const topicGroups = this.extractTopics(reviewsForPeriod);
      if (topicGroups.length > 0) {
        const topicData = topicGroups.map(topic => ({
          id: randomUUID(),
          facebookPeriodicalMetricId: metric.id,
          topic: topic.topic,
          count: topic.count,
          keywords: topic.keywords,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        const { error: topicError } = await this.supabase
          .from('FacebookTopic')
          .insert(topicData);

        if (topicError) {
          console.error(`[Facebook Analytics] Error creating periodical topics:`, topicError);
        }
      }

      // Create emotional breakdown for this periodical metric
      await this.updatePeriodicalEmotionalBreakdown(metric.id, reviewsForPeriod);
    }

    console.log(`[Facebook Analytics] Completed periodical metric relations`);
  }

  /**
   * Create emotional breakdown for a periodical metric
   */
  private async updatePeriodicalEmotionalBreakdown(
    facebookPeriodicalMetricId: string,
    reviews: FacebookReviewWithMetadata[]
  ): Promise<void> {
    const emotions = { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 };
    let emotionCount = 0;

    reviews.forEach(review => {
      const emotional = review.reviewMetadata?.emotional?.toLowerCase();
      if (emotional) {
        emotionCount++;
        switch (emotional) {
          case 'positive':
          case 'joy':
            emotions.joy++;
            break;
          case 'negative':
          case 'anger':
            emotions.anger++;
            break;
          case 'sadness':
            emotions.sadness++;
            break;
          case 'fear':
            emotions.fear++;
            break;
          case 'surprise':
            emotions.surprise++;
            break;
        }
      }
    });

    // Normalize to scores (0-1)
    const emotionalData = {
      id: randomUUID(),
      facebookPeriodicalMetricId,
      joy: emotionCount > 0 ? emotions.joy / emotionCount : 0,
      anger: emotionCount > 0 ? emotions.anger / emotionCount : 0,
      sadness: emotionCount > 0 ? emotions.sadness / emotionCount : 0,
      fear: emotionCount > 0 ? emotions.fear / emotionCount : 0,
      surprise: emotionCount > 0 ? emotions.surprise / emotionCount : 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const { error } = await this.supabase
      .from('FacebookPeriodicalEmotionalBreakdown')
      .upsert(emotionalData, { onConflict: 'facebookPeriodicalMetricId' });

    if (error) {
      console.error(`[Facebook Analytics] Error updating periodical emotional breakdown:`, error);
    }
  }

  async close(): Promise<void> {
    // No explicit cleanup needed for Supabase client
  }
} 