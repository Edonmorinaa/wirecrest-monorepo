/**
 * Booking Review Analytics Service - Prisma Implementation
 */

import { prisma } from '@wirecrest/db';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { MarketPlatform } from '@prisma/client';
import { DatabaseService } from '../supabase/database';
import { SentimentAnalyzer } from '../sentimentAnalyzer/sentimentAnalyzer';
import { marketIdentifierEvents } from '../events/marketIdentifierEvents';

export interface BookingReviewApifyData {
  // Core review data (Apify actor actual response structure)
  id?: string;
  reviewId?: string;
  review_id?: string;
  url?: string;
  reviewUrl?: string;
  hotelId?: string;
  hotel_id?: string;
  
  // Guest information (Apify actor actual field names)
  userName?: string;  // Actual field from Apify actor
  guestName?: string;
  guest_name?: string;
  authorName?: string;
  author?: string;
  reviewer?: string;
  reviewerName?: string;
  
  userLocation?: string;  // Actual field from Apify actor
  guestCountry?: string;
  guest_country?: string;
  nationality?: string;
  country?: string;
  
  guestType?: string;
  guest_type?: string;
  travelerType?: string;
  traveller_type?: string;
  
  // Stay information (Apify actor actual field names)
  roomInfo?: string;  // Actual field from Apify actor
  roomType?: string;
  room_type?: string;
  room?: string;
  
  stayDate?: string;
  stay_date?: string;
  visitDate?: string;
  
  reviewDate?: string;
  review_date?: string;
  date?: string;
  publishedDate?: string;
  
  stayLength?: string;  // Actual field from Apify actor (as string like "2 nights")
  lengthOfStay?: number;
  length_of_stay?: number;
  nights?: number;
  
  // Review content (Apify actor actual field names)
  rating?: number | string;  // Apify returns as string sometimes
  review_score?: number;
  score?: number;
  
  reviewTitle?: string;  // Actual field from Apify actor
  title?: string;
  review_title?: string;
  
  text?: string;
  review_text?: string;
  review?: string;
  content?: string;
  
  // Apify actor uses reviewTextParts object
  reviewTextParts?: {
    Liked?: string;
    Disliked?: string;
  };
  
  positive?: string;
  review_positive?: string;
  liked?: string;
  likedMost?: string;
  liked_most?: string;
  
  negative?: string;
  review_negative?: string;
  disliked?: string;
  dislikedMost?: string;
  disliked_most?: string;
  
  // Individual ratings (various naming patterns)
  cleanliness?: number;
  cleanlinessRating?: number;
  cleanliness_rating?: number;
  
  comfort?: number;
  comfortRating?: number;
  comfort_rating?: number;
  
  location?: number;
  locationRating?: number;
  location_rating?: number;
  
  facilities?: number;
  facilitiesRating?: number;
  facilities_rating?: number;
  
  staff?: number;
  staffRating?: number;
  staff_rating?: number;
  service?: number;
  
  valueForMoney?: number;
  value_for_money?: number;
  valueRating?: number;
  value?: number;
  
  wifi?: number;
  free_wifi?: number;
  wifiRating?: number;
  
  // Review metadata
  isVerified?: boolean;
  is_verified_stay?: boolean;
  verified?: boolean;
  
  helpful?: boolean;
  was_helpful?: boolean;
  helpfulVotes?: number;
  helpful_votes?: number;
  
  // Response data
  response?: string;
  response_from_property?: string;
  reply?: string;
  ownerResponse?: string;
  
  responseDate?: string;
  response_date?: string;
  replyDate?: string;
  
  // Tags and categories
  tags?: string[];
  categories?: string[];
  
  // Scraping metadata
  scrapedAt?: string;
  scraped_at?: string;
  dateScraped?: string;
  date_scraped?: string;
}

// Interfaces for analytics
interface BookingReviewWithMetadata {
  reviewId?: string;
  rating: number;
  publishedDate: string;
  stayDate?: string;
  lengthOfStay?: number;
  roomType?: string;
  guestType: string;
  text?: string;
  reviewerName?: string;
  cleanlinessRating?: number;
  comfortRating?: number;
  locationRating?: number;
  facilitiesRating?: number;
  staffRating?: number;
  valueForMoneyRating?: number;
  wifiRating?: number;
  hasOwnerResponse: boolean;
  responseFromOwnerDate?: string;
  isVerifiedStay: boolean;
  reviewMetadata?: {
    sentiment?: number;
    keywords?: string[];
    emotional?: string;
  } | null;
}

interface PeriodMetricsData {
  totalReviews: number;
  averageRating: number;
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
  averageCleanlinessRating?: number | null;
  averageComfortRating?: number | null;
  averageLocationRating?: number | null;
  averageFacilitiesRating?: number | null;
  averageStaffRating?: number | null;
  averageValueForMoneyRating?: number | null;
  averageWifiRating?: number | null;
  soloTravelers: number;
  couples: number;
  familiesWithYoungChildren: number;
  familiesWithOlderChildren: number;
  groupsOfFriends: number;
  businessTravelers: number;
  averageLengthOfStay?: number | null;
  shortStays: number;
  mediumStays: number;
  longStays: number;
  topNationalities: string[];
  responseRate?: number | null;
  averageResponseTime?: number | null;
  mostPopularRoomTypes: string[];
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  topKeywords: { keyword: string; count: number }[];
  topTags: any[];
}

interface KeywordFrequency {
  keyword: string;
  count: number;
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

export class BookingReviewAnalyticsService {
  private databaseService: DatabaseService;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor() {
    this.databaseService = new DatabaseService();
    this.sentimentAnalyzer = new SentimentAnalyzer(['en']);
  }

  // Removed: Supabase client no longer needed - using Prisma

  /**
   * Main method to process all reviews for a business and update dashboard analytics
   * This matches the pattern used by Google, Facebook, and TripAdvisor platforms
   */
  async processReviewsAndUpdateDashboard(businessProfileId: string): Promise<void> {
    try {
      logger.info(`📊 Starting Booking.com analytics processing for business: ${businessProfileId}`);

      // Fetch all reviews with metadata for this business using Prisma
      const allReviewsData = await prisma.bookingReview.findMany({
        where: { businessProfileId },
        include: {
          reviewMetadata: true
        },
        orderBy: { publishedDate: 'desc' }
      });

      if (!allReviewsData || allReviewsData.length === 0) {
        logger.info(`📭 No reviews found for business: ${businessProfileId}`);
        return;
      }

      logger.info(`📋 Processing ${allReviewsData.length} Booking.com reviews for analytics`);

      // Map Prisma response to expected interface
      const allReviews: BookingReviewWithMetadata[] = allReviewsData.map(review => {
        const reviewMetadata = review.reviewMetadata || null;
        
        // Debug: Log sample review data to see what fields are available
        if (allReviewsData.indexOf(review) === 0) {
          console.log(`[Booking Analytics Debug] Sample review data:`, {
            rating: review.rating,
            cleanlinessRating: review.cleanlinessRating,
            comfortRating: review.comfortRating,
            locationRating: review.locationRating,
            facilitiesRating: review.facilitiesRating,
            staffRating: review.staffRating,
            valueForMoneyRating: review.valueForMoneyRating,
            wifiRating: review.wifiRating,
            lengthOfStay: review.lengthOfStay,
            guestType: review.guestType,
            hasOwnerResponse: review.hasOwnerResponse,
            isVerifiedStay: review.isVerifiedStay,
            sentiment: reviewMetadata?.sentiment || null,
            keywords: reviewMetadata?.keywords || [],
            text: review.text ? review.text.substring(0, 100) + '...' : null
          });
        }
        
        return {
          reviewId: review.id,
          rating: review.rating || 0,
          publishedDate: review.publishedDate,
          stayDate: review.stayDate,
          lengthOfStay: review.lengthOfStay,
          roomType: review.roomType,
          guestType: review.guestType || 'OTHER',
          text: review.text,
          reviewerName: review.reviewerName,
          cleanlinessRating: review.cleanlinessRating,
          comfortRating: review.comfortRating,
          locationRating: review.locationRating,
          facilitiesRating: review.facilitiesRating,
          staffRating: review.staffRating,
          valueForMoneyRating: review.valueForMoneyRating,
          wifiRating: review.wifiRating,
          hasOwnerResponse: review.hasOwnerResponse || false,
          responseFromOwnerDate: review.responseFromOwnerDate,
          isVerifiedStay: review.isVerifiedStay || false,
          reviewMetadata
        };
      });

      const currentDate = new Date();
      
      // Calculate all-time metrics
      const allTimeMetrics = this.calculateMetricsForPeriod(allReviews);

      // Check if overview already exists using Prisma
      const existingOverview = await prisma.bookingOverview.findUnique({
        where: { businessProfileId },
        select: { id: true }
      });

      // Update or create BookingOverview record
      const overviewData = {
        id: existingOverview?.id || randomUUID(), // Use existing ID or generate new one
        businessProfileId,
        averageRating: allTimeMetrics.averageRating || null,
        totalReviews: allTimeMetrics.totalReviews || 0,
        oneStarCount: allTimeMetrics.oneStarCount || 0,
        twoStarCount: allTimeMetrics.twoStarCount || 0,
        threeStarCount: allTimeMetrics.threeStarCount || 0,
        fourStarCount: allTimeMetrics.fourStarCount || 0,
        fiveStarCount: allTimeMetrics.fiveStarCount || 0,
        averageCleanlinessRating: allTimeMetrics.averageCleanlinessRating || null,
        averageComfortRating: allTimeMetrics.averageComfortRating || null,
        averageLocationRating: allTimeMetrics.averageLocationRating || null,
        averageFacilitiesRating: allTimeMetrics.averageFacilitiesRating || null,
        averageStaffRating: allTimeMetrics.averageStaffRating || null,
        averageValueForMoneyRating: allTimeMetrics.averageValueForMoneyRating || null,
        averageWifiRating: allTimeMetrics.averageWifiRating || null,
        soloTravelers: allTimeMetrics.soloTravelers || 0,
        couples: allTimeMetrics.couples || 0,
        familiesWithYoungChildren: allTimeMetrics.familiesWithYoungChildren || 0,
        familiesWithOlderChildren: allTimeMetrics.familiesWithOlderChildren || 0,
        groupsOfFriends: allTimeMetrics.groupsOfFriends || 0,
        businessTravelers: allTimeMetrics.businessTravelers || 0,
        averageLengthOfStay: allTimeMetrics.averageLengthOfStay || null,
        shortStays: allTimeMetrics.shortStays || 0,
        mediumStays: allTimeMetrics.mediumStays || 0,
        longStays: allTimeMetrics.longStays || 0,
        topNationalities: allTimeMetrics.topNationalities || [],
        responseRate: allTimeMetrics.responseRate || null,
        averageResponseTime: allTimeMetrics.averageResponseTime || null,
        mostPopularRoomTypes: allTimeMetrics.mostPopularRoomTypes || [],
        lastUpdated: currentDate
      };

      // Upsert BookingOverview using Prisma
      const overviewRecord = await prisma.bookingOverview.upsert({
        where: { businessProfileId },
        update: overviewData,
        create: overviewData,
        select: { id: true }
      });

      if (!overviewRecord) {
        logger.error(`❌ Error upserting BookingOverview`);
        throw new Error(`Could not upsert BookingOverview record`);
      }

      // Create periodical metrics for different time periods
      await this.updatePeriodicalMetrics(overviewRecord.id, allReviews);

      // Create rating distribution
      await this.updateRatingDistribution(businessProfileId, overviewRecord.id, allReviews);

      // Create sentiment analysis
      await this.updateSentimentAnalysis(overviewRecord.id, allReviews);

      // Create top keywords
      await this.updateTopKeywords(overviewRecord.id, allReviews);

      // Create recent reviews
      await this.updateRecentReviews(overviewRecord.id, allReviews.slice(0, 10));

      logger.info(`✅ Successfully processed Booking.com analytics for business: ${businessProfileId}`);

    } catch (error) {
      logger.error(`❌ Error in processReviewsAndUpdateDashboard for business ${businessProfileId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Process scraped review data and save to database (without duplicate checking - upsert instead)
   * This method now just saves reviews, analytics are handled separately
   */
  async processBookingReviewsData(
    reviewsData: BookingReviewApifyData[],
    teamId: string,
    bookingUrl: string,
    isInitialization: boolean = false
  ): Promise<boolean> {
    try {
      logger.info(`📊 Processing ${reviewsData.length} Booking.com reviews for team ${teamId}`);

      if (!reviewsData || reviewsData.length === 0) {
        logger.info('📭 No review data to process');
        return true;
      }

      // Get business profile using Prisma
      const businessProfile = await prisma.bookingBusinessProfile.findFirst({
        where: {
          teamId,
          bookingUrl,
        },
        select: {
          id: true,
          teamId: true,
        }
      });

      if (!businessProfile) {
        logger.error(`❌ Business profile not found for team ${teamId} and URL ${bookingUrl}`);
        return false;
      }

      let processedCount = 0;
      let skippedCount = 0;

      // Process each review - now with upsert instead of skip
      for (const reviewData of reviewsData) {
        try {
          const processResult = await this.upsertReview(reviewData, businessProfile.id, teamId);
          if (processResult) {
            processedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          logger.error(`Error processing individual review: ${(error as Error).message}`);
          skippedCount++;
        }
      }

      logger.info(`✅ Processed ${processedCount} Booking.com reviews, updated ${skippedCount} existing reviews`);

      return true;

    } catch (error) {
      logger.error(`❌ Error processing Booking.com reviews data:`, error as Error);
      return false;
    }
  }

  /**
   * Upsert a single review (insert new or update existing)
   */
  private async upsertReview(
    reviewData: BookingReviewApifyData,
    businessProfileId: string,
    teamId: string
  ): Promise<boolean> {
    try {
      // Extract the external review ID using multiple possible field names
      const externalId = reviewData.reviewId || reviewData.review_id || reviewData.id || `booking-${Date.now()}-${Math.random()}`;
      
      // Parse dates using Apify actor field names
      const reviewDate = this.parseDate(reviewData.reviewDate || reviewData.review_date || reviewData.date || reviewData.publishedDate);
      const stayDate = this.parseDate(reviewData.stayDate || reviewData.stay_date || reviewData.visitDate);
      const responseDate = this.parseDate(reviewData.responseDate || reviewData.response_date || reviewData.replyDate);

      // Parse stay length from string to number
      const stayLengthString = reviewData.stayLength || reviewData.lengthOfStay?.toString() || reviewData.length_of_stay?.toString() || reviewData.nights?.toString();
      const stayLengthNumber = stayLengthString ? parseInt(stayLengthString.replace(/[^0-9]/g, '')) || null : null;

      // Combine positive and negative text using Apify actor field names
      const reviewText = [
        reviewData.text || reviewData.review_text || reviewData.review || reviewData.content,
        reviewData.reviewTextParts?.Liked || reviewData.positive || reviewData.review_positive || reviewData.liked || reviewData.likedMost || reviewData.liked_most,
        reviewData.reviewTextParts?.Disliked || reviewData.negative || reviewData.review_negative || reviewData.disliked || reviewData.dislikedMost || reviewData.disliked_most
      ].filter(Boolean).join(' ');

      // Analyze sentiment - ensure we have proper text for analysis
      let sentiment = null;
      if (reviewText && reviewText.trim().length > 10) {
        try {
          const sentimentScore = await this.sentimentAnalyzer.analyzeSentiment(reviewText);
          sentiment = { 
            score: sentimentScore || 0,
            emotion: null 
          };
          console.log(`[Booking Analytics] Sentiment analyzed for review: ${sentimentScore}`);
        } catch (sentimentError) {
          console.warn(`[Booking Analytics] Sentiment analysis failed:`, sentimentError);
          sentiment = { score: 0, emotion: null };
        }
      } else {
        console.log(`[Booking Analytics] Skipping sentiment analysis - insufficient text`);
        sentiment = { score: 0, emotion: null };
      }

      // Extract keywords
      const keywords = this.extractKeywords(reviewText);

      // Parse rating (can be string or number)
      const rating = typeof reviewData.rating === 'string' ? parseFloat(reviewData.rating) : (reviewData.rating || reviewData.review_score || reviewData.score || 0);

      // Check if review metadata already exists using Prisma
      const existingMetadata = await prisma.reviewMetadata.findUnique({
        where: {
          externalId_source: {
            externalId,
            source: MarketPlatform.BOOKING
          }
        },
        select: { id: true }
      });

      let reviewMetadataId = '';

      if (existingMetadata) {
        // Update existing metadata
        reviewMetadataId = existingMetadata.id;
        
        const updatedMetadata = {
          author: reviewData.userName || reviewData.guestName || reviewData.guest_name || reviewData.authorName || reviewData.author || reviewData.reviewer || reviewData.reviewerName || 'Anonymous',
          rating: rating,
          text: reviewText || null,
          date: reviewDate,
          reply: reviewData.response || reviewData.response_from_property || reviewData.reply || reviewData.ownerResponse || null,
          replyDate: responseDate,
          hasReply: !!(reviewData.response || reviewData.response_from_property || reviewData.reply || reviewData.ownerResponse),
          sentiment: sentiment?.score || null,
          keywords,
          actionable: this.isActionableReview(reviewText),
          responseUrgency: this.calculateResponseUrgency(rating, reviewText),
          sourceUrl: reviewData.url || reviewData.reviewUrl || null,
          updatedAt: new Date()
        };

        await prisma.reviewMetadata.update({
          where: { id: reviewMetadataId },
          data: updatedMetadata
        });
      } else {
        // Create new metadata
        reviewMetadataId = randomUUID();
        
        const reviewMetadata = {
          id: reviewMetadataId,
          externalId,
          source: MarketPlatform.BOOKING,
          author: reviewData.userName || reviewData.guestName || reviewData.guest_name || reviewData.authorName || reviewData.author || reviewData.reviewer || reviewData.reviewerName || 'Anonymous',
          authorImage: null,
          rating: rating,
          text: reviewText || null,
          date: reviewDate,
          photoCount: 0,
          photoUrls: [],
          reply: reviewData.response || reviewData.response_from_property || reviewData.reply || reviewData.ownerResponse || null,
          replyDate: responseDate,
          hasReply: !!(reviewData.response || reviewData.response_from_property || reviewData.reply || reviewData.ownerResponse),
          sentiment: sentiment?.score || null,
          keywords,
          topics: [],
          emotional: sentiment?.emotion || null,
          actionable: this.isActionableReview(reviewText),
          responseUrgency: this.calculateResponseUrgency(rating, reviewText),
          competitorMentions: [],
          comparativePositive: null,
          isRead: false,
          isImportant: false,
          labels: [],
          language: 'en',
          scrapedAt: new Date(),
          sourceUrl: reviewData.url || reviewData.reviewUrl || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await prisma.reviewMetadata.create({
          data: reviewMetadata
        });
      }

      // Check if booking review already exists using Prisma
      const existingBookingReview = await prisma.bookingReview.findUnique({
        where: { reviewMetadataId },
        select: { id: true, createdAt: true }
      });

      // Upsert booking-specific review - always override existing reviews
      const bookingReview = {
        id: existingBookingReview?.id || randomUUID(), // Use existing ID or generate new one
        businessProfileId,
        reviewMetadataId,
        bookingReviewId: externalId,
        reviewerId: externalId,
        reviewerName: reviewData.userName || reviewData.guestName || reviewData.guest_name || reviewData.authorName || reviewData.author || reviewData.reviewer || reviewData.reviewerName || 'Anonymous',
        reviewerNationality: reviewData.userLocation || reviewData.guestCountry || reviewData.guest_country || reviewData.nationality || reviewData.country || null,
        rating: rating,
        text: reviewText || null,
        title: reviewData.reviewTitle || reviewData.title || reviewData.review_title || null,
        publishedDate: reviewDate,
        stayDate: stayDate,
        lengthOfStay: stayLengthNumber,
        roomType: reviewData.roomInfo || reviewData.roomType || reviewData.room_type || reviewData.room || null,
        guestType: this.mapGuestType(reviewData.guestType || reviewData.guest_type || reviewData.travelerType || reviewData.traveller_type),
        likedMost: reviewData.reviewTextParts?.Liked || reviewData.likedMost || reviewData.liked_most || reviewData.liked || null,
        dislikedMost: reviewData.reviewTextParts?.Disliked || reviewData.dislikedMost || reviewData.disliked_most || reviewData.disliked || null,
        cleanlinessRating: reviewData.cleanliness || reviewData.cleanlinessRating || reviewData.cleanliness_rating || null,
        comfortRating: reviewData.comfort || reviewData.comfortRating || reviewData.comfort_rating || null,
        locationRating: reviewData.location || reviewData.locationRating || reviewData.location_rating || null,
        facilitiesRating: reviewData.facilities || reviewData.facilitiesRating || reviewData.facilities_rating || null,
        staffRating: reviewData.staff || reviewData.staffRating || reviewData.staff_rating || reviewData.service || null,
        valueForMoneyRating: reviewData.valueForMoney || reviewData.value_for_money || reviewData.valueRating || reviewData.value || null,
        wifiRating: reviewData.wifi || reviewData.free_wifi || reviewData.wifiRating || null,
        responseFromOwnerText: reviewData.response || reviewData.response_from_property || reviewData.reply || reviewData.ownerResponse || null,
        responseFromOwnerDate: responseDate,
        hasOwnerResponse: !!(reviewData.response || reviewData.response_from_property || reviewData.reply || reviewData.ownerResponse),
        isVerifiedStay: reviewData.isVerified || reviewData.is_verified_stay || reviewData.verified || false,
        scrapedAt: new Date(),
        createdAt: existingBookingReview ? new Date(existingBookingReview.createdAt) : new Date(), // Preserve original creation date
        updatedAt: new Date()
      };

      // Log review processing details
      console.log(`[Booking Analytics] ${existingBookingReview ? 'Updating' : 'Creating'} review: ${externalId}`);
      console.log(`[Booking Analytics] Sub-ratings:`, {
        cleanliness: bookingReview.cleanlinessRating,
        comfort: bookingReview.comfortRating,
        location: bookingReview.locationRating,
        facilities: bookingReview.facilitiesRating,
        staff: bookingReview.staffRating,
        valueForMoney: bookingReview.valueForMoneyRating,
        wifi: bookingReview.wifiRating,
        lengthOfStay: bookingReview.lengthOfStay,
        guestType: bookingReview.guestType
      });

      // Upsert booking review using Prisma
      await prisma.bookingReview.upsert({
        where: { reviewMetadataId },
        update: bookingReview,
        create: bookingReview
      });

      return true;

    } catch (error) {
      const reviewId = reviewData.reviewId || reviewData.review_id || reviewData.id || 'unknown';
      logger.error(`Error processing review ${reviewId}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Calculate metrics for a period of reviews
   */
  private calculateMetricsForPeriod(reviewsInPeriod: BookingReviewWithMetadata[]): PeriodMetricsData {
    if (reviewsInPeriod.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        oneStarCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        fourStarCount: 0,
        fiveStarCount: 0,
        averageCleanlinessRating: null,
        averageComfortRating: null,
        averageLocationRating: null,
        averageFacilitiesRating: null,
        averageStaffRating: null,
        averageValueForMoneyRating: null,
        averageWifiRating: null,
        soloTravelers: 0,
        couples: 0,
        familiesWithYoungChildren: 0,
        familiesWithOlderChildren: 0,
        groupsOfFriends: 0,
        businessTravelers: 0,
        averageLengthOfStay: null,
        shortStays: 0,
        mediumStays: 0,
        longStays: 0,
        topNationalities: [],
        responseRate: null,
        averageResponseTime: null,
        mostPopularRoomTypes: [],
        sentimentCounts: { positive: 0, neutral: 0, negative: 0, total: 0 },
        topKeywords: [],
        topTags: []
      };
    }

    // Calculate rating distribution
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    reviewsInPeriod.forEach(review => {
      const rating = Math.max(1, Math.min(5, Math.round(review.rating)));
      ratingCounts[rating as keyof typeof ratingCounts]++;
      totalRating += review.rating;
    });

    // Calculate sub-ratings averages
    const subRatingTotals = {
      cleanliness: { sum: 0, count: 0 },
      comfort: { sum: 0, count: 0 },
      location: { sum: 0, count: 0 },
      facilities: { sum: 0, count: 0 },
      staff: { sum: 0, count: 0 },
      valueForMoney: { sum: 0, count: 0 },
      wifi: { sum: 0, count: 0 }
    };

    reviewsInPeriod.forEach(review => {
      if (review.cleanlinessRating) {
        subRatingTotals.cleanliness.sum += review.cleanlinessRating;
        subRatingTotals.cleanliness.count++;
      }
      if (review.comfortRating) {
        subRatingTotals.comfort.sum += review.comfortRating;
        subRatingTotals.comfort.count++;
      }
      if (review.locationRating) {
        subRatingTotals.location.sum += review.locationRating;
        subRatingTotals.location.count++;
      }
      if (review.facilitiesRating) {
        subRatingTotals.facilities.sum += review.facilitiesRating;
        subRatingTotals.facilities.count++;
      }
      if (review.staffRating) {
        subRatingTotals.staff.sum += review.staffRating;
        subRatingTotals.staff.count++;
      }
      if (review.valueForMoneyRating) {
        subRatingTotals.valueForMoney.sum += review.valueForMoneyRating;
        subRatingTotals.valueForMoney.count++;
      }
      if (review.wifiRating) {
        subRatingTotals.wifi.sum += review.wifiRating;
        subRatingTotals.wifi.count++;
      }
    });

    // Calculate guest type distribution
    const guestTypeCounts = {
      SOLO: 0,
      COUPLE: 0,
      FAMILY_WITH_YOUNG_CHILDREN: 0,
      FAMILY_WITH_OLDER_CHILDREN: 0,
      GROUP_OF_FRIENDS: 0,
      BUSINESS: 0
    };

    reviewsInPeriod.forEach(review => {
      if (review.guestType && review.guestType in guestTypeCounts) {
        guestTypeCounts[review.guestType as keyof typeof guestTypeCounts]++;
      }
    });

    // Calculate stay length distribution
    const stayLengths = reviewsInPeriod.filter(r => r.lengthOfStay).map(r => r.lengthOfStay!);
    const avgStayLength = stayLengths.length > 0 ? stayLengths.reduce((a, b) => a + b, 0) / stayLengths.length : null;
    const shortStays = stayLengths.filter(l => l <= 2).length;
    const mediumStays = stayLengths.filter(l => l >= 3 && l <= 7).length;
    const longStays = stayLengths.filter(l => l >= 8).length;

    // Calculate sentiment distribution
    const sentimentCounts = this.calculateSentimentCounts(reviewsInPeriod);

    // Extract keywords and nationalities
    const topKeywords = this.extractTopKeywords(reviewsInPeriod, 10);
    const topNationalities = this.extractTopNationalities(reviewsInPeriod, 10);
    const mostPopularRoomTypes = this.extractTopRoomTypes(reviewsInPeriod, 5);

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
      averageCleanlinessRating: subRatingTotals.cleanliness.count > 0 ? subRatingTotals.cleanliness.sum / subRatingTotals.cleanliness.count : null,
      averageComfortRating: subRatingTotals.comfort.count > 0 ? subRatingTotals.comfort.sum / subRatingTotals.comfort.count : null,
      averageLocationRating: subRatingTotals.location.count > 0 ? subRatingTotals.location.sum / subRatingTotals.location.count : null,
      averageFacilitiesRating: subRatingTotals.facilities.count > 0 ? subRatingTotals.facilities.sum / subRatingTotals.facilities.count : null,
      averageStaffRating: subRatingTotals.staff.count > 0 ? subRatingTotals.staff.sum / subRatingTotals.staff.count : null,
      averageValueForMoneyRating: subRatingTotals.valueForMoney.count > 0 ? subRatingTotals.valueForMoney.sum / subRatingTotals.valueForMoney.count : null,
      averageWifiRating: subRatingTotals.wifi.count > 0 ? subRatingTotals.wifi.sum / subRatingTotals.wifi.count : null,
      soloTravelers: guestTypeCounts.SOLO,
      couples: guestTypeCounts.COUPLE,
      familiesWithYoungChildren: guestTypeCounts.FAMILY_WITH_YOUNG_CHILDREN,
      familiesWithOlderChildren: guestTypeCounts.FAMILY_WITH_OLDER_CHILDREN,
      groupsOfFriends: guestTypeCounts.GROUP_OF_FRIENDS,
      businessTravelers: guestTypeCounts.BUSINESS,
      averageLengthOfStay: avgStayLength,
      shortStays,
      mediumStays,
      longStays,
      topNationalities,
      responseRate: responseMetrics.responseRate,
      averageResponseTime: responseMetrics.averageResponseTime,
      mostPopularRoomTypes,
      sentimentCounts,
      topKeywords,
      topTags: []
    };
  }

  /**
   * Utility methods
   */
  private parseDate(dateString?: string): Date {
    if (!dateString) return new Date();
    
    // Handle various date formats
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  private mapGuestType(guestType?: string): string {
    if (!guestType) return 'OTHER';
    
    const type = guestType.toLowerCase().trim();
    
    switch (type) {
      case 'couple':
        return 'COUPLE';
      case 'solo traveler':
      case 'solo':
        return 'SOLO';
      case 'group':
      case 'group of friends':
        return 'GROUP_OF_FRIENDS';
      case 'family':
        return 'FAMILY_WITH_YOUNG_CHILDREN'; // Default for family
      case 'family with young children':
      case 'family with children':
        return 'FAMILY_WITH_YOUNG_CHILDREN';
      case 'family with older children':
      case 'family with teens':
        return 'FAMILY_WITH_OLDER_CHILDREN';
      case 'business':
      case 'business traveler':
        return 'BUSINESS';
      default:
        return 'OTHER';
    }
  }

  private extractKeywords(text: string): string[] {
    if (!text) return [];
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return [...new Set(words)].slice(0, 10);
  }

  private isActionableReview(text: string): boolean {
    if (!text) return false;
    
    const actionableKeywords = [
      'problem', 'issue', 'broken', 'dirty', 'rude', 'slow', 'loud',
      'complaint', 'disappointed', 'terrible', 'awful', 'worst'
    ];
    
    return actionableKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
  }

  private calculateResponseUrgency(rating: number, text: string): number {
    let urgency = 1;
    
    if (rating <= 2) urgency = 5;
    else if (rating <= 3) urgency = 4;
    else if (rating <= 4) urgency = 3;
    else urgency = 2;
    
    if (this.isActionableReview(text)) {
      urgency = Math.min(5, urgency + 1);
    }
    
    return urgency;
  }

  /**
   * Analytics helper methods
   */
  private calculateSentimentCounts(reviews: BookingReviewWithMetadata[]): { positive: number; neutral: number; negative: number; total: number } {
    let positive = 0, neutral = 0, negative = 0;
    
    reviews.forEach(review => {
      const sentiment = review.reviewMetadata?.sentiment || 0;
      if (sentiment > 0.1) positive++;
      else if (sentiment < -0.1) negative++;
      else neutral++;
    });
    
    return { positive, neutral, negative, total: reviews.length };
  }

  private extractTopKeywords(reviews: BookingReviewWithMetadata[], count: number): KeywordFrequency[] {
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

  private extractTopNationalities(reviews: BookingReviewWithMetadata[], count: number): string[] {
    // Note: This would need nationality data to be properly extracted from review scraping
    // For now, we return empty array as nationality data isn't consistently available
    // TODO: Enhance review scraping to capture guest nationality data
    return [];
  }

  private extractTopRoomTypes(reviews: BookingReviewWithMetadata[], count: number): string[] {
    const roomTypeCounts: { [roomType: string]: number } = {};

    reviews.forEach(review => {
      if (review.roomType) {
        const cleanRoomType = review.roomType.trim();
        roomTypeCounts[cleanRoomType] = (roomTypeCounts[cleanRoomType] || 0) + 1;
      }
    });

    return Object.entries(roomTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, count)
      .map(([roomType]) => roomType);
  }

  private calculateResponseMetrics(reviews: BookingReviewWithMetadata[]): { responseRate: number | null; averageResponseTime: number | null } {
    const reviewsWithResponses = reviews.filter(r => r.hasOwnerResponse);
    const responseRate = reviews.length > 0 ? (reviewsWithResponses.length / reviews.length) * 100 : null;
    
    // Calculate average response time would require more complex date handling
    const averageResponseTime = null;
    
    return { responseRate, averageResponseTime };
  }

  /**
   * Analytics table update methods
   */
  private async updatePeriodicalMetrics(overviewId: string, allReviews: BookingReviewWithMetadata[]): Promise<void> {
    console.log(`[Booking Analytics] Calculating periodical metrics for overview: ${overviewId}`);
    
    const periodicalMetricsToUpsert = [];

    for (const periodKeyStr of Object.keys(PERIOD_DEFINITIONS)) {
      const periodKey = parseInt(periodKeyStr) as PeriodKeys;
      const periodInfo = PERIOD_DEFINITIONS[periodKey];
      let reviewsInPeriod: BookingReviewWithMetadata[];

      if (periodKey === 0) {
        // All time
        reviewsInPeriod = allReviews;
      } else {
        // Create proper date boundaries using millisecond calculations
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const startDate = new Date(endDate.getTime() - (periodInfo.days! * 24 * 60 * 60 * 1000));
        startDate.setHours(0, 0, 0, 0);
        
        console.log(`[Booking Analytics] Period ${periodInfo.label}: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        reviewsInPeriod = allReviews.filter(r => {
          const reviewDate = new Date(r.publishedDate);
          const inPeriod = reviewDate >= startDate && reviewDate <= endDate;
          return inPeriod;
        });
        
        // Debug: show a few reviews that were included/excluded for short periods
        if (periodInfo.days! <= 30) {
          console.log(`[Booking Analytics] Period ${periodInfo.label} - checking ${allReviews.length} total reviews:`);
          const sampleReviews = allReviews.slice(0, 3);
          sampleReviews.forEach((review, idx) => {
            const reviewDate = new Date(review.publishedDate);
            const inPeriod = reviewDate >= startDate && reviewDate <= endDate;
            console.log(`  Review ${idx + 1}: ${review.publishedDate} -> ${inPeriod ? 'INCLUDED' : 'EXCLUDED'}`);
          });
        }
      }
      
      console.log(`[Booking Analytics] Found ${reviewsInPeriod.length} reviews for period: ${periodInfo.label}`);
      const metrics = this.calculateMetricsForPeriod(reviewsInPeriod);

      // Calculate enhanced metrics
      const sentimentScore = metrics.sentimentCounts.total > 0
        ? (metrics.sentimentCounts.positive - metrics.sentimentCounts.negative) / metrics.sentimentCounts.total
        : 0;

      const occupancyRate = null; // Could be enhanced with occupancy data
      const competitorMentions = 0; // Could be enhanced with competitor detection

      const periodicalMetricData = {
        id: randomUUID(),
        bookingOverviewId: overviewId,
        periodKey: periodKey,
        periodLabel: periodInfo.label,
        averageRating: metrics.averageRating,
        oneStarCount: metrics.oneStarCount,
        twoStarCount: metrics.twoStarCount,
        threeStarCount: metrics.threeStarCount,
        fourStarCount: metrics.fourStarCount,
        fiveStarCount: metrics.fiveStarCount,
        reviewCount: metrics.totalReviews,
        averageCleanlinessRating: metrics.averageCleanlinessRating,
        averageComfortRating: metrics.averageComfortRating,
        averageLocationRating: metrics.averageLocationRating,
        averageFacilitiesRating: metrics.averageFacilitiesRating,
        averageStaffRating: metrics.averageStaffRating,
        averageValueForMoneyRating: metrics.averageValueForMoneyRating,
        averageWifiRating: metrics.averageWifiRating,
        soloTravelers: metrics.soloTravelers,
        couples: metrics.couples,
        families: metrics.familiesWithYoungChildren + metrics.familiesWithOlderChildren,
        groups: metrics.groupsOfFriends,
        businessTravelers: metrics.businessTravelers,
        averageLengthOfStay: metrics.averageLengthOfStay,
        totalNights: Math.round((metrics.averageLengthOfStay || 0) * metrics.totalReviews),
        responseRatePercent: metrics.responseRate,
        avgResponseTimeHours: metrics.averageResponseTime,
        sentimentPositive: metrics.sentimentCounts.positive,
        sentimentNeutral: metrics.sentimentCounts.neutral,
        sentimentNegative: metrics.sentimentCounts.negative,
        sentimentTotal: metrics.sentimentCounts.total,
        sentimentScore: sentimentScore,
        occupancyRate: occupancyRate,
        competitorMentions: competitorMentions,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      periodicalMetricsToUpsert.push(periodicalMetricData);
    }
    
    console.log(`[Booking Analytics] Prepared ${periodicalMetricsToUpsert.length} periodical metrics for upsert`);
    
    if (periodicalMetricsToUpsert.length > 0) {
      console.log(`[Booking Analytics] Sample metric data:`, JSON.stringify(periodicalMetricsToUpsert[0], null, 2));
      
      // Upsert periodical metrics using Prisma transaction
      await prisma.$transaction(
        periodicalMetricsToUpsert.map(metric => 
          prisma.bookingPeriodicalMetric.upsert({
            where: {
              bookingOverviewId_periodKey: {
                bookingOverviewId: metric.bookingOverviewId,
                periodKey: metric.periodKey
              }
            },
            update: metric,
            create: metric
          })
        )
      );

      console.log(`[Booking Analytics] Successfully upserted ${periodicalMetricsToUpsert.length} periodical metrics`);
      
      // Create keywords for each periodical metric
      await this.updatePeriodicalMetricKeywords(overviewId, periodicalMetricsToUpsert, allReviews);
    } else {
      console.warn(`[Booking Analytics] No periodical metrics to upsert`);
    }
  }

  /**
   * Create keywords for periodical metrics
   */
  private async updatePeriodicalMetricKeywords(
    overviewId: string,
    periodicalMetrics: any[],
    allReviews: BookingReviewWithMetadata[]
  ): Promise<void> {
    console.log(`[Booking Analytics] Creating periodical metric keywords`);

    for (const metric of periodicalMetrics) {
      // Filter reviews for this specific period
      let reviewsForPeriod: BookingReviewWithMetadata[];
      
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
          const reviewDate = new Date(r.publishedDate);
          return reviewDate >= startDate && reviewDate <= endDate;
        });
      }

      // Calculate metrics for this period
      const periodMetrics = this.calculateMetricsForPeriod(reviewsForPeriod);

      // Create keywords for this periodical metric
      if (periodMetrics.topKeywords.length > 0) {
        const keywordData = periodMetrics.topKeywords.map(kw => ({
          id: randomUUID(),
          periodicalMetricId: metric.id,
          keyword: kw.keyword,
          count: kw.count
        }));

        try {
          await prisma.bookingPeriodicalKeyword.createMany({
            data: keywordData
          });
        } catch (error) {
          console.error(`[Booking Analytics] Error creating periodical keywords:`, error);
        }
      }
    }

    console.log(`[Booking Analytics] Completed periodical metric keywords`);
  }

  private async updateRatingDistribution(businessProfileId: string, overviewId: string, allReviews: BookingReviewWithMetadata[]): Promise<void> {
    console.log(`[Booking Analytics] Updating rating distribution for overview ${overviewId}`);
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Rating distribution
    const oneStar = allReviews.filter(r => r.rating >= 1 && r.rating < 2).length;
    const twoStar = allReviews.filter(r => r.rating >= 2 && r.rating < 3).length;
    const threeStar = allReviews.filter(r => r.rating >= 3 && r.rating < 4).length;
    const fourStar = allReviews.filter(r => r.rating >= 4 && r.rating < 5).length;
    const fiveStar = allReviews.filter(r => r.rating >= 5).length;

    // Guest type distribution
    const guestTypes = allReviews.reduce((acc, review) => {
      const type = review.guestType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Stay length distribution
    const shortStays = allReviews.filter(r => r.lengthOfStay && r.lengthOfStay <= 2).length;
    const mediumStays = allReviews.filter(r => r.lengthOfStay && r.lengthOfStay >= 3 && r.lengthOfStay <= 7).length;
    const longStays = allReviews.filter(r => r.lengthOfStay && r.lengthOfStay > 7).length;

    // Temporal distribution
    const lastWeek = allReviews.filter(r => new Date(r.publishedDate) >= oneWeekAgo).length;
    const lastMonth = allReviews.filter(r => new Date(r.publishedDate) >= oneMonthAgo).length;
    const lastSixMonths = allReviews.filter(r => new Date(r.publishedDate) >= sixMonthsAgo).length;
    const olderThanSixMonths = allReviews.length - lastSixMonths;

    // Verification distribution
    const verifiedStays = allReviews.filter(r => r.isVerifiedStay).length;
    const unverifiedStays = allReviews.length - verifiedStays;

    const ratingDistributionData = {
      id: randomUUID(),
      businessProfileId,
      bookingOverviewId: overviewId,
      oneStar,
      twoStar,
      threeStar,
      fourStar,
      fiveStar,
      soloTravelers: guestTypes['SOLO'] || 0,
      couples: guestTypes['COUPLE'] || 0,
      families: (guestTypes['FAMILY_WITH_YOUNG_CHILDREN'] || 0) + (guestTypes['FAMILY_WITH_OLDER_CHILDREN'] || 0),
      groups: guestTypes['GROUP_OF_FRIENDS'] || 0,
      businessTravelers: guestTypes['BUSINESS'] || 0,
      shortStays,
      mediumStays,
      longStays,
      lastWeek,
      lastMonth,
      lastSixMonths,
      olderThanSixMonths,
      verifiedStays,
      unverifiedStays,
      lastUpdated: now
    };

    try {
      await prisma.bookingRatingDistribution.upsert({
        where: { bookingOverviewId: overviewId },
        update: ratingDistributionData,
        create: ratingDistributionData
      });
    } catch (error) {
      console.error(`[Booking Analytics] Error updating rating distribution:`, error);
    }
  }

  private async updateSentimentAnalysis(overviewId: string, allReviews: BookingReviewWithMetadata[]): Promise<void> {
    console.log(`[Booking Analytics] Updating sentiment analysis for overview ${overviewId}`);
    
    const sentimentCounts = this.calculateSentimentCounts(allReviews);
    const avgSentiment = sentimentCounts.total > 0 
      ? (sentimentCounts.positive * 1 + sentimentCounts.neutral * 0 + sentimentCounts.negative * -1) / sentimentCounts.total 
      : 0;

    const sentimentData = {
      id: randomUUID(),
      bookingOverviewId: overviewId,
      positiveCount: sentimentCounts.positive,
      neutralCount: sentimentCounts.neutral,
      negativeCount: sentimentCounts.negative,
      totalAnalyzed: sentimentCounts.total,
      averageSentiment: avgSentiment,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await prisma.bookingSentimentAnalysis.upsert({
        where: { bookingOverviewId: overviewId },
        update: sentimentData,
        create: sentimentData
      });
    } catch (error) {
      console.error(`[Booking Analytics] Error updating sentiment analysis:`, error);
    }
  }

  private async updateTopKeywords(overviewId: string, allReviews: BookingReviewWithMetadata[]): Promise<void> {
    console.log(`[Booking Analytics] Updating top keywords for overview ${overviewId}`);
    
    const topKeywords = this.extractTopKeywords(allReviews, 20);

    // Delete existing keywords and insert new ones using Prisma
    await prisma.bookingTopKeyword.deleteMany({
      where: { bookingOverviewId: overviewId }
    });

    if (topKeywords.length > 0) {
      const keywordData = topKeywords.map((kw, index) => ({
        id: randomUUID(),
        bookingOverviewId: overviewId,
        keyword: kw.keyword,
        count: kw.count,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      try {
        await prisma.bookingTopKeyword.createMany({
          data: keywordData
        });
      } catch (error) {
        console.error(`[Booking Analytics] Error updating top keywords:`, error);
      }
    }
  }

  private async updateRecentReviews(overviewId: string, recentReviews: BookingReviewWithMetadata[]): Promise<void> {
    console.log(`[Booking Analytics] Updating recent reviews for overview ${overviewId}`);
    
    // Delete existing recent reviews and insert new ones using Prisma
    await prisma.bookingRecentReview.deleteMany({
      where: { bookingOverviewId: overviewId }
    });

    if (recentReviews.length > 0) {
      const recentReviewData = recentReviews.map((review, index) => ({
        id: randomUUID(),
        bookingOverviewId: overviewId,
        reviewId: review.reviewId || `review-${index}`,
        rating: review.rating,
        publishedDate: new Date(review.publishedDate),
        text: review.text || null,
        reviewerName: review.reviewerName || 'Anonymous',
        guestType: review.guestType,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      try {
        await prisma.bookingRecentReview.createMany({
          data: recentReviewData
        });
      } catch (error) {
        console.error(`[Booking Analytics] Error updating recent reviews:`, error);
      }
    }
  }
} 