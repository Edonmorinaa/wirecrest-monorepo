import { GoogleReview, ReviewMetadata, GoogleBusinessProfile } from '@prisma/client';
import { prisma } from '@wirecrest/db';
import { sendNotification } from '../utils/notificationHelper';
import { randomUUID } from 'crypto';

// Define specific types for reviews with metadata for clarity in functions
interface ReviewWithMetadata {
  rating: number | null;
  stars: number | null;
  publishedAtDate: string; // ISO Date string
  reviewMetadata: {
    emotional?: string | null;
    keywords?: string[] | null;
    reply?: string | null;
    replyDate?: string | null; // ISO Date string
    date?: string | null; // ISO Date string (should be same as publishedAtDate from GoogleReview)
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
    console.log(`[Analytics] Starting PERIODICAL review processing for businessProfileId: ${businessProfileId} (Normalized Approach)`);
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

      // First, let's check if any reviews exist at all
      const reviewCount = await prisma.googleReview.count({
        where: { businessProfileId }
      });

      console.log(`[Analytics] Found ${reviewCount} total GoogleReview records for businessProfileId: ${businessProfileId}`);

      // Now fetch reviews with metadata using Prisma
      const allReviewsData = await prisma.googleReview.findMany({
        where: { businessProfileId },
        select: {
          rating: true,
          stars: true,
          publishedAtDate: true,
          reviewMetadataId: true,
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

      console.log(`[Analytics] Fetched ${allReviewsData?.length || 0} reviews with metadata for businessProfileId: ${businessProfileId}`);

      // Map the Prisma response to our expected interface structure
      const allReviews: ReviewWithMetadata[] = (allReviewsData || []).map(review => {
        return {
          rating: review.rating,
          stars: review.stars,
          publishedAtDate: review.publishedAtDate.toISOString(),
          reviewMetadata: review.reviewMetadata ? {
            emotional: review.reviewMetadata.emotional,
            keywords: review.reviewMetadata.keywords,
            reply: review.reviewMetadata.reply,
            replyDate: review.reviewMetadata.replyDate?.toISOString() || null,
            date: review.reviewMetadata.date?.toISOString() || null
          } : null
        };
      });
      
      // Debug: Show some sample review dates
      if (allReviews.length > 0) {
        console.log(`[Analytics] Sample review dates (first 3):`);
        allReviews.slice(0, 3).forEach((review, index) => {
          console.log(`  Review ${index + 1}: ${review.publishedAtDate} (${new Date(review.publishedAtDate).toLocaleDateString()})`);
          console.log(`    Has metadata: ${!!review.reviewMetadata}`);
          if (review.reviewMetadata) {
            console.log(`    Reply: ${review.reviewMetadata.reply ? 'YES' : 'NO'}`);
            console.log(`    Reply date: ${review.reviewMetadata.replyDate || 'None'}`);
            console.log(`    Emotional: ${review.reviewMetadata.emotional || 'None'}`);
            console.log(`    Keywords: ${review.reviewMetadata.keywords?.length || 0}`);
          }
        });

      // Fetch existing overview to compare for rating changes
      const existingOverview = await prisma.googleOverview.findUnique({
        where: { businessProfileId },
        select: { averageRating: true, totalReviews: true }
      });
        
        // Show oldest and newest review dates
        const reviewDates = allReviews.map(r => new Date(r.publishedAtDate)).sort((a, b) => a.getTime() - b.getTime());
        const oldestDate = reviewDates[0];
        const newestDate = reviewDates[reviewDates.length - 1];
        console.log(`[Analytics] Review date range: ${oldestDate.toLocaleDateString()} to ${newestDate.toLocaleDateString()}`);
        console.log(`[Analytics] Current date: ${new Date().toLocaleDateString()}`);
        console.log(`[Analytics] Days since newest review: ${Math.floor((Date.now() - newestDate.getTime()) / (1000 * 60 * 60 * 24))}`);
      }
      
      const currentDate = new Date();
      
      // 1. Upsert the GoogleOverview record (snapshot part)
      // Fetch existing overview to get its ID for linking PeriodicalMetric records
      let overviewRecord = await prisma.googleOverview.findFirst({
        where: { businessProfileId },
        select: { id: true }
      });

      const allTimeMetricsForSnapshot = this.calculateMetricsForPeriod(allReviews);

      const overviewSnapshotData = {
        businessProfileId: businessProfileId,
        teamId: businessProfile.teamId,
        lastRefreshedAt: currentDate.toISOString(),
        profileDisplayName: businessProfile.displayName,
        profileFormattedAddress: businessProfile.formattedAddress,
        profileWebsiteUri: businessProfile.websiteUri,
        profileBusinessStatus: businessProfile.businessStatus,
        currentOverallRating: allTimeMetricsForSnapshot.avgRating,
        currentTotalReviews: allTimeMetricsForSnapshot.reviewCount,
        isOpenNow: null,
      };

      let GoogleOverviewId: string;

      if (overviewFetchError && overviewFetchError.code === 'PGRST116') { // Not found, insert
        const { data: insertedOverview, error: insertErr } = await this.supabase
            .from('GoogleOverview')
            .insert({
              id: randomUUID(),
              ...overviewSnapshotData
            })
            .select('id')
            .single();
        if (insertErr || !insertedOverview) {
            console.error('[Analytics] Error inserting new GoogleOverview:', insertErr);
            throw insertErr || new Error('Failed to insert GoogleOverview');
        }
        GoogleOverviewId = insertedOverview.id;
        console.log(`[Analytics] Created GoogleOverview with id: ${GoogleOverviewId}`);
      } else if (overviewRecord) { // Found, update
        const { error: updateErr } = await this.supabase
            .from('GoogleOverview')
            .update(overviewSnapshotData)
            .eq('id', overviewRecord.id);
        if (updateErr) {
            console.error('[Analytics] Error updating GoogleOverview:', updateErr);
            throw updateErr;
        }
        GoogleOverviewId = overviewRecord.id;
        console.log(`[Analytics] Updated GoogleOverview with id: ${GoogleOverviewId}`);
      } else { // Some other error fetching
         console.error('[Analytics] Error fetching GoogleOverview:', overviewFetchError);
         throw overviewFetchError;
      }

      // 2. Calculate and Upsert PeriodicalMetric records
      const periodicalMetricsToUpsert = [];

      for (const periodKeyStr of Object.keys(PERIOD_DEFINITIONS)) {
        const periodKey = parseInt(periodKeyStr) as PeriodKeys;
        const periodInfo = PERIOD_DEFINITIONS[periodKey];
        let reviewsInPeriod: ReviewWithMetadata[];

        if (periodKey === 0) {
          reviewsInPeriod = allReviews;
        } else {
          // Create proper date boundaries using millisecond calculations
          const now = new Date();
          const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // End of today
          const startDate = new Date(endDate.getTime() - (periodInfo.days! * 24 * 60 * 60 * 1000)); // Go back exact number of days
          startDate.setHours(0, 0, 0, 0); // Start of that day
          
          console.log(`[Analytics] Period ${periodInfo.label}: ${startDate.toISOString()} to ${endDate.toISOString()}`);
          
          reviewsInPeriod = allReviews.filter(r => {
            const reviewDate = new Date(r.publishedAtDate || r.reviewMetadata?.date!);
            const inPeriod = reviewDate >= startDate && reviewDate <= endDate;
            return inPeriod;
          });
          
          // Debug: show a few reviews that were included/excluded for short periods
          if (periodInfo.days! <= 30) {
            console.log(`[Analytics] Period ${periodInfo.label} - checking ${allReviews.length} total reviews:`);
            const sampleReviews = allReviews.slice(0, 3);
            sampleReviews.forEach((review, idx) => {
              const reviewDate = new Date(review.publishedAtDate);
              const inPeriod = reviewDate >= startDate && reviewDate <= endDate;
              console.log(`  Review ${idx + 1}: ${review.publishedAtDate} -> ${inPeriod ? 'INCLUDED' : 'EXCLUDED'}`);
            });
          }
        }
        
        console.log(`[Analytics] Found ${reviewsInPeriod.length} reviews for period: ${periodInfo.label}`);
        const metrics = this.calculateMetricsForPeriod(reviewsInPeriod);

        periodicalMetricsToUpsert.push({
          id: randomUUID(),
          googleOverviewId: GoogleOverviewId,
          periodKey: periodKey.toString(),
          periodLabel: periodInfo.label,
          avgRating: metrics.avgRating,
          reviewCount: metrics.reviewCount,
          ratingDistribution: JSON.stringify(metrics.ratingDistribution),
          sentimentPositive: metrics.sentimentCounts.positive,
          sentimentNeutral: metrics.sentimentCounts.neutral,
          sentimentNegative: metrics.sentimentCounts.negative,
          sentimentTotal: metrics.sentimentCounts.total,
          topKeywords: JSON.stringify(metrics.topKeywords),
          responseRatePercent: metrics.responseRatePercent,
          avgResponseTimeHours: metrics.avgResponseTimeHours,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      console.log(`[Analytics] Prepared ${periodicalMetricsToUpsert.length} periodical metrics for upsert`);
      if (periodicalMetricsToUpsert.length > 0) {
        console.log(`[Analytics] Sample metric data:`, JSON.stringify(periodicalMetricsToUpsert[0], null, 2));
        
        const { error: upsertMetricsError } = await this.supabase
          .from('PeriodicalMetric')
          .upsert(periodicalMetricsToUpsert, { 
            onConflict: 'googleOverviewId,periodKey',
            ignoreDuplicates: false
          });

        if (upsertMetricsError) {
          console.error(`[Analytics] Error upserting PeriodicalMetric records for overview ${GoogleOverviewId}:`, upsertMetricsError);
          console.error(`[Analytics] Error details:`, {
            code: upsertMetricsError.code,
            message: upsertMetricsError.message,
            details: upsertMetricsError.details,
            hint: upsertMetricsError.hint
          });
          // This should probably throw to prevent silent failures
          throw new Error(`Failed to upsert periodical metrics: ${upsertMetricsError.message}`);
        } else {
          console.log(`[Analytics] Successfully upserted ${periodicalMetricsToUpsert.length} periodical metrics`);
        }
      } else {
        console.warn(`[Analytics] No periodical metrics to upsert - this shouldn't happen unless there are no reviews`);
      }

      // Check for rating changes and send notifications
      if (existingOverview) {
        const currentRating = allTimeMetricsForSnapshot.avgRating || 0;
        const previousRating = existingOverview.averageRating || 0;
        const ratingDrop = previousRating - currentRating;
        
        if (ratingDrop >= 0.5) {
          await sendNotification({
            type: 'project',
            scope: 'team',
            teamId: businessProfile.teamId,
            title: `<p>Rating dropped by <strong>${ratingDrop.toFixed(1)}</strong> stars</p>`,
            category: 'Analytics',
            metadata: {
              businessProfileId,
              oldRating: previousRating,
              newRating: currentRating,
              platform: 'GOOGLE_MAPS'
            },
            expiresInDays: 14
          });
        }
        
        // Review milestone notifications
        const milestones = [50, 100, 250, 500, 1000];
        const currentTotal = allTimeMetricsForSnapshot.reviewCount;
        const previousTotal = existingOverview.totalReviews || 0;
        
        if (milestones.includes(currentTotal) && currentTotal !== previousTotal) {
          await sendNotification({
            type: 'tags',
            scope: 'team',
            teamId: businessProfile.teamId,
            title: `<p>🎉 Milestone reached: <strong>${currentTotal}</strong> reviews!</p>`,
            category: 'Milestone',
            metadata: { businessProfileId, milestone: currentTotal },
            expiresInDays: 30
          });
        }
      }

      console.log(`[Analytics] Successfully processed reviews and updated (normalized) PERIODICAL dashboard for ${businessProfileId}`);

    } catch (error) {
      console.error(`[Analytics] Failed to process reviews for (normalized) PERIODICAL dashboard ${businessProfileId}:`, error);
    }
  }
  
  private calculateMetricsForPeriod(reviewsInPeriod: ReviewWithMetadata[]): PeriodMetricsData {
    const reviewCount = reviewsInPeriod.length;
    if (reviewCount === 0) {
      return {
        avgRating: null,
        reviewCount: 0,
        ratingDistribution: {},
        sentimentCounts: { positive: 0, neutral: 0, negative: 0, total: 0 },
        topKeywords: [],
        responseRatePercent: 0,
        avgResponseTimeHours: null,
      };
    }

    const avgRating = parseFloat((reviewsInPeriod.reduce((sum, r) => sum + (r.stars || r.rating || 0), 0) / reviewCount).toFixed(2));
    const sentimentCounts = this.calculateSentimentCounts(reviewsInPeriod);
    const topKeywords = this.extractTopKeywords(reviewsInPeriod, 5); 
    const responseMetrics = this.calculateResponseMetrics(reviewsInPeriod);

    return {
      avgRating,
      reviewCount,
      ratingDistribution: this.calculateRatingDistribution(reviewsInPeriod),
      sentimentCounts,
      topKeywords,
      responseRatePercent: responseMetrics.responseRatePercent,
      avgResponseTimeHours: responseMetrics.avgResponseTimeHours,
    };
  }

  private calculateSentimentCounts(reviews: ReviewWithMetadata[]): { positive: number; neutral: number; negative: number; total: number } {
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    reviews.forEach(review => {
      const emotional = review.reviewMetadata?.emotional?.toLowerCase();
      if (emotional === 'positive') sentiments.positive++;
      else if (emotional === 'neutral') sentiments.neutral++;
      else if (emotional === 'negative') sentiments.negative++;
      else { 
        const rating = review.stars || review.rating || 0;
        if (rating >= 4) sentiments.positive++;
        else if (rating === 3) sentiments.neutral++;
        else if (rating > 0) sentiments.negative++;
      }
    });
    return { ...sentiments, total: reviews.length };
  }

  private extractTopKeywords(reviews: ReviewWithMetadata[], count: number): KeywordFrequency[] {
    const keywordMap: Record<string, number> = {};
    reviews.forEach(review => {
      (review.reviewMetadata?.keywords || []).forEach((kw: string) => {
        const keyword = kw.toLowerCase().trim();
        if (keyword) {
          keywordMap[keyword] = (keywordMap[keyword] || 0) + 1;
        }
      });
    });
    return Object.entries(keywordMap)
      .sort(([, aVal], [, bVal]) => bVal - aVal)
      .slice(0, count)
      .map(([keyword, val]) => ({ keyword, count: val as number })); 
  }
  
  private calculateResponseMetrics(reviews: ReviewWithMetadata[]): { responseRatePercent: number; avgResponseTimeHours: number | null } {
      console.log(`[Analytics] Calculating response metrics for ${reviews.length} reviews`);
      
      const repliedReviews = reviews.filter(r => r.reviewMetadata?.reply && r.reviewMetadata?.replyDate);
      console.log(`[Analytics] Found ${repliedReviews.length} reviews with replies`);
      
      if (repliedReviews.length > 0) {
        console.log(`[Analytics] Sample replied review:`, {
          hasReply: !!repliedReviews[0].reviewMetadata?.reply,
          replyDate: repliedReviews[0].reviewMetadata?.replyDate,
          publishedAtDate: repliedReviews[0].publishedAtDate,
          metadataDate: repliedReviews[0].reviewMetadata?.date
        });
      }
      
      const responseRatePercent = reviews.length > 0 ? (repliedReviews.length / reviews.length) * 100 : 0;
      
      let totalResponseTimeMillis = 0;
      let validResponseTimes = 0;
      
      repliedReviews.forEach(r => {
          // Use publishedAtDate from the review instead of metadata date
          const reviewDateMs = new Date(r.publishedAtDate).getTime();
          const replyDateMs = r.reviewMetadata!.replyDate ? new Date(r.reviewMetadata!.replyDate).getTime() : 0;
          
          if (reviewDateMs && replyDateMs && replyDateMs > reviewDateMs) {
            const responseTimeMs = replyDateMs - reviewDateMs;
            totalResponseTimeMillis += responseTimeMs;
            validResponseTimes++;
            console.log(`[Analytics] Valid response time: ${(responseTimeMs / (1000 * 60 * 60)).toFixed(2)} hours`);
          }
      });
      
      const avgResponseTimeHours = validResponseTimes > 0 && totalResponseTimeMillis > 0
          ? (totalResponseTimeMillis / validResponseTimes) / (1000 * 60 * 60) 
          : null;
      
      console.log(`[Analytics] Response metrics: ${responseRatePercent.toFixed(2)}% response rate, ${avgResponseTimeHours?.toFixed(2) || 'null'} avg hours`);
      
      return {
          responseRatePercent: parseFloat(responseRatePercent.toFixed(2)),
          avgResponseTimeHours: avgResponseTimeHours ? parseFloat(avgResponseTimeHours.toFixed(2)) : null
      };
  }

  private calculateRatingDistribution(reviews: ReviewWithMetadata[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    reviews.forEach(review => {
      const rating = review.stars || review.rating || 0;
      distribution[rating.toString()] = (distribution[rating.toString()] || 0) + 1;
    });
    
    console.log(`[Analytics] Rating distribution for ${reviews.length} reviews:`, distribution);
    return distribution;
  }

  /**
   * Simplified approach that fetches reviews and metadata separately when joins fail
   */
  private async processReviewsWithSimplifiedApproach(businessProfileId: string, businessProfile: any): Promise<void> {
    console.log(`[Analytics] Using simplified approach for businessProfileId: ${businessProfileId}`);
    
    try {
      // Fetch reviews without joins
      const { data: reviews, error: reviewsError } = await this.supabase
        .from('GoogleReview')
        .select('rating, stars, publishedAtDate, reviewMetadataId')
        .eq('businessProfileId', businessProfileId)
        .order('publishedAtDate', { ascending: false });

      if (reviewsError || !reviews) {
        console.error(`[Analytics] Error fetching reviews:`, reviewsError);
        throw new Error(`Could not fetch reviews: ${reviewsError?.message}`);
      }

      console.log(`[Analytics] Fetched ${reviews.length} reviews without metadata`);

      // Fetch metadata for each review separately (batch if needed)
      const reviewsWithMetadata: ReviewWithMetadata[] = [];
      
      for (const review of reviews) {
        let reviewMetadata = null;
        
        if (review.reviewMetadataId) {
          const { data: metadata, error: metadataError } = await this.supabase
            .from('ReviewMetadata')
            .select('emotional, keywords, reply, replyDate, date')
            .eq('id', review.reviewMetadataId)
            .single();
            
          if (!metadataError && metadata) {
            reviewMetadata = metadata;
          }
        }
        
        reviewsWithMetadata.push({
          rating: review.rating,
          stars: review.stars,
          publishedAtDate: review.publishedAtDate,
          reviewMetadata
        });
      }

      console.log(`[Analytics] Successfully mapped ${reviewsWithMetadata.length} reviews with metadata`);

      // Continue with the rest of the processing logic
      const currentDate = new Date();
      
      // 1. Upsert the GoogleOverview record (snapshot part)
      let { data: overviewRecord, error: overviewFetchError } = await this.supabase
        .from('GoogleOverview')
        .select('id')
        .eq('businessProfileId', businessProfileId)
        .single();

      const allTimeMetricsForSnapshot = this.calculateMetricsForPeriod(reviewsWithMetadata);

      const overviewSnapshotData = {
        businessProfileId: businessProfileId,
        teamId: businessProfile.teamId,
        lastRefreshedAt: currentDate.toISOString(),
        profileDisplayName: businessProfile.displayName,
        profileFormattedAddress: businessProfile.formattedAddress,
        profileWebsiteUri: businessProfile.websiteUri,
        profileBusinessStatus: businessProfile.businessStatus,
        currentOverallRating: allTimeMetricsForSnapshot.avgRating,
        currentTotalReviews: allTimeMetricsForSnapshot.reviewCount,
        isOpenNow: null,
      };

      let GoogleOverviewId: string;

      if (overviewFetchError && overviewFetchError.code === 'PGRST116') { // Not found, insert
        const { data: insertedOverview, error: insertErr } = await this.supabase
            .from('GoogleOverview')
            .insert({
              id: randomUUID(),
              ...overviewSnapshotData
            })
            .select('id')
            .single();
        if (insertErr || !insertedOverview) {
            console.error('[Analytics] Error inserting new GoogleOverview:', insertErr);
            throw insertErr || new Error('Failed to insert GoogleOverview');
        }
        GoogleOverviewId = insertedOverview.id;
        console.log(`[Analytics] Created GoogleOverview with id: ${GoogleOverviewId}`);
      } else if (overviewRecord) { // Found, update
        const { error: updateErr } = await this.supabase
            .from('GoogleOverview')
            .update(overviewSnapshotData)
            .eq('id', overviewRecord.id);
        if (updateErr) {
            console.error('[Analytics] Error updating GoogleOverview:', updateErr);
            throw updateErr;
        }
        GoogleOverviewId = overviewRecord.id;
        console.log(`[Analytics] Updated GoogleOverview with id: ${GoogleOverviewId}`);
      } else { // Some other error fetching
         console.error('[Analytics] Error fetching GoogleOverview:', overviewFetchError);
         throw overviewFetchError;
      }

      // 2. Calculate and Upsert PeriodicalMetric records using the same logic
      const periodicalMetricsToUpsert = [];

      for (const periodKeyStr of Object.keys(PERIOD_DEFINITIONS)) {
        const periodKey = parseInt(periodKeyStr) as PeriodKeys;
        const periodInfo = PERIOD_DEFINITIONS[periodKey];
        let reviewsInPeriod: ReviewWithMetadata[];

        if (periodKey === 0) {
          reviewsInPeriod = reviewsWithMetadata;
        } else {
          const now = new Date();
          const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          const startDate = new Date(endDate.getTime() - (periodInfo.days! * 24 * 60 * 60 * 1000));
          startDate.setHours(0, 0, 0, 0);
          
          reviewsInPeriod = reviewsWithMetadata.filter(r => {
            const reviewDate = new Date(r.publishedAtDate || r.reviewMetadata?.date!);
            return reviewDate >= startDate && reviewDate <= endDate;
          });
        }
        
        const metrics = this.calculateMetricsForPeriod(reviewsInPeriod);

        periodicalMetricsToUpsert.push({
          id: randomUUID(),
          googleOverviewId: GoogleOverviewId,
          periodKey: periodKey.toString(),
          periodLabel: periodInfo.label,
          avgRating: metrics.avgRating,
          reviewCount: metrics.reviewCount,
          ratingDistribution: JSON.stringify(metrics.ratingDistribution),
          sentimentPositive: metrics.sentimentCounts.positive,
          sentimentNeutral: metrics.sentimentCounts.neutral,
          sentimentNegative: metrics.sentimentCounts.negative,
          sentimentTotal: metrics.sentimentCounts.total,
          topKeywords: JSON.stringify(metrics.topKeywords),
          responseRatePercent: metrics.responseRatePercent,
          avgResponseTimeHours: metrics.avgResponseTimeHours,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      // Upsert periodical metrics
      if (periodicalMetricsToUpsert.length > 0) {
        const { error: upsertMetricsError } = await this.supabase
          .from('PeriodicalMetric')
          .upsert(periodicalMetricsToUpsert, { 
            onConflict: 'googleOverviewId,periodKey',
            ignoreDuplicates: false
          });

        if (upsertMetricsError) {
          console.error(`[Analytics] Error upserting PeriodicalMetric records:`, upsertMetricsError);
          throw new Error(`Failed to upsert periodical metrics: ${upsertMetricsError.message}`);
        } else {
          console.log(`[Analytics] Successfully upserted ${periodicalMetricsToUpsert.length} periodical metrics (simplified approach)`);
        }
      }

      console.log(`[Analytics] Successfully processed reviews using simplified approach for ${businessProfileId}`);

    } catch (error) {
      console.error(`[Analytics] Simplified approach failed for ${businessProfileId}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
  }
} 