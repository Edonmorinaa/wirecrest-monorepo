/**
 * Review Data Processor
 * Processes review data from Apify and saves to database
 */

import { prisma } from '@wirecrest/db';
import { DatabaseService } from '../../supabase/database';
import { GoogleReviewAnalyticsService } from '../googleReviewAnalyticsService';
import { FacebookReviewAnalyticsService } from '../facebookReviewAnalyticsService';
import { TripAdvisorReviewAnalyticsService } from '../tripAdvisorReviewAnalyticsService';
import { BookingReviewAnalyticsService } from '../bookingReviewAnalyticsService';
import type { Platform, SyncResult } from '../../types/apify.types';
import { sendNotification } from '../../utils/notificationHelper';

export class ReviewDataProcessor {
  private databaseService: DatabaseService;
  private googleAnalytics: GoogleReviewAnalyticsService;
  private facebookAnalytics: FacebookReviewAnalyticsService;
  private tripAdvisorAnalytics: TripAdvisorReviewAnalyticsService;
  private bookingAnalytics: BookingReviewAnalyticsService;

  constructor() {
    this.databaseService = new DatabaseService();
    this.googleAnalytics = new GoogleReviewAnalyticsService();
    this.facebookAnalytics = new FacebookReviewAnalyticsService();
    this.tripAdvisorAnalytics = new TripAdvisorReviewAnalyticsService();
    this.bookingAnalytics = new BookingReviewAnalyticsService();
  }

  /**
   * Process reviews from Apify dataset
   */
  async processReviews(
    teamId: string,
    platform: Platform,
    rawData: any[],
    isInitial: boolean
  ): Promise<SyncResult> {
    const startTime = Date.now();

    console.log(
      `🔄 Processing ${rawData.length} items for team ${teamId}, platform ${platform}`
    );

    let baseResult: Omit<SyncResult, 'processingTimeMs'>;

    switch (platform) {
      case 'google_reviews':
        baseResult = await this.processGoogleReviews(teamId, rawData, isInitial);
        break;
      case 'facebook':
        baseResult = await this.processFacebookReviews(teamId, rawData, isInitial);
        break;
      case 'tripadvisor':
        baseResult = await this.processTripAdvisorReviews(teamId, rawData, isInitial);
        break;
      case 'booking':
        baseResult = await this.processBookingReviews(teamId, rawData, isInitial);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      ...baseResult,
      processingTimeMs,
    };
  }

  /**
   * Process Google reviews (Google Maps Reviews Scraper output)
   * Handles batched placeIds - multiple locations in single dataset
   */
  private async processGoogleReviews(
    teamId: string,
    rawData: any[],
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    console.log(`📍 Processing Google reviews for team ${teamId}...`);
    
    // Get unique place IDs from dataset
    const uniquePlaceIds = [...new Set(rawData.map((r) => r.placeId).filter(Boolean))];
    console.log(`Found ${uniquePlaceIds.length} unique place(s)`);

    // Fetch all business profiles for this team
    const businessProfiles = await prisma.googleBusinessProfile.findMany({
      where: {
        teamId,
        placeId: { in: uniquePlaceIds },
      },
      select: { id: true, placeId: true, lastReviewDate: true },
    });

    const profileMap = new Map(businessProfiles.map((p) => [p.placeId, p]));
    
    let reviewsNew = 0;
    let reviewsDuplicate = 0;
    const businessesUpdated = new Set<string>();

    // Process reviews for each place
    for (const placeId of uniquePlaceIds) {
      const profile = profileMap.get(placeId);
      if (!profile) {
        console.log(`⚠️  No profile found for placeId ${placeId}, skipping...`);
        continue;
      }

      const placeReviews = rawData.filter((r) => r.placeId === placeId);
      console.log(`Processing ${placeReviews.length} reviews for place ${placeId}`);

      for (const review of placeReviews) {
        const reviewDate = review.publishedAtDate ? new Date(review.publishedAtDate) : null;
        
        // Skip if older than last known review (deduplication)
        if (!isInitial && profile.lastReviewDate && reviewDate && reviewDate <= profile.lastReviewDate) {
          reviewsDuplicate++;
          continue;
        }

        // Check if review already exists
        const existingReview = await prisma.googleReview.findFirst({
          where: {
            businessId: profile.id,
            reviewId: review.reviewId || review.id,
          },
        });

        if (existingReview) {
          reviewsDuplicate++;
          continue;
        }

        // Save new review
        await prisma.googleReview.create({
          data: {
            businessId: profile.id,
            reviewId: review.reviewId || review.id,
            text: review.text || '',
            stars: review.stars || review.rating || 0,
            publishedAtDate: reviewDate || new Date(),
            reviewerName: review.reviewerName || 'Anonymous',
            reviewUrl: review.reviewUrl || review.url,
            responseFromOwner: review.responseFromOwner,
            responseFromOwnerDate: review.responseFromOwnerDate
              ? new Date(review.responseFromOwnerDate)
              : null,
          },
        });

        reviewsNew++;
        businessesUpdated.add(profile.id);
      }
    }

    // Update lastScrapedAt and lastReviewDate for all affected profiles
    for (const businessId of businessesUpdated) {
      const latestReview = await prisma.googleReview.findFirst({
        where: { businessId },
        orderBy: { publishedAtDate: 'desc' },
        select: { publishedAtDate: true },
      });

      await prisma.googleBusinessProfile.update({
        where: { id: businessId },
        data: {
          lastScrapedAt: new Date(),
          lastReviewDate: latestReview?.publishedAtDate || new Date(),
        },
      });

      // Trigger analytics update
      await this.googleAnalytics.processReviewsAndUpdateDashboard(businessId);
    }

    console.log(
      `✅ Google: ${reviewsNew} new, ${reviewsDuplicate} duplicates, ${businessesUpdated.size} businesses updated`
    );

    // Send notifications for negative and urgent reviews
    if (reviewsNew > 0) {
      const newReviewsData = await prisma.googleReview.findMany({
        where: {
          businessId: { in: Array.from(businessesUpdated) },
          createdAt: { gte: new Date(Date.now() - 60000) }, // Last minute
        },
        select: {
          stars: true,
          rating: true,
          reviewMetadata: {
            select: {
              responseUrgency: true,
            },
          },
          businessProfileId: true,
        },
      });

      // Detect negative reviews (rating <= 2)
      const negativeReviews = newReviewsData.filter(r => (r.stars || r.rating || 0) <= 2);
      if (negativeReviews.length > 0) {
        await sendNotification({
          type: 'mail',
          scope: 'team',
          teamId,
          title: `<p><strong>${negativeReviews.length}</strong> new negative review${negativeReviews.length > 1 ? 's' : ''} received</p>`,
          category: 'Reviews',
          metadata: { 
            platform: 'google_reviews', 
            businessProfileId: uniquePlaceIds[0],
            count: negativeReviews.length,
          },
          expiresInDays: 7,
        });
      }

      // Detect urgent reviews (negative + high response urgency)
      const urgentReviews = newReviewsData.filter(r => 
        (r.stars || r.rating || 0) <= 2 && (r.reviewMetadata?.responseUrgency || 0) >= 8
      );
      if (urgentReviews.length > 0) {
        await sendNotification({
          type: 'payment', // High priority icon
          scope: 'team',
          teamId,
          title: `<p><strong>URGENT:</strong> ${urgentReviews.length} review${urgentReviews.length > 1 ? 's' : ''} require immediate response</p>`,
          category: 'Reviews',
          metadata: { 
            platform: 'google_reviews', 
            businessProfileId: uniquePlaceIds[0],
            count: urgentReviews.length,
          },
          expiresInDays: 3,
        });
      }
    }

    return {
      reviewsProcessed: rawData.length,
      reviewsNew,
      reviewsDuplicate,
      businessesUpdated: businessesUpdated.size,
    };
  }

  /**
   * Process Facebook reviews (Facebook Reviews Scraper output)
   * Handles multiple page URLs in single dataset
   */
  private async processFacebookReviews(
    teamId: string,
    rawData: any[],
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    console.log(`📘 Processing Facebook reviews for team ${teamId}...`);
    
    // Get unique Facebook URLs from dataset
    const uniqueUrls = [...new Set(rawData.map((r) => r.facebookUrl).filter(Boolean))];
    console.log(`Found ${uniqueUrls.length} unique page(s)`);

    // Fetch all business profiles for this team
    const businessProfiles = await prisma.facebookBusinessProfile.findMany({
      where: {
        teamId,
        facebookUrl: { in: uniqueUrls },
      },
      select: { id: true, facebookUrl: true, lastReviewDate: true },
    });

    const profileMap = new Map(businessProfiles.map((p) => [p.facebookUrl, p]));
    
    let reviewsNew = 0;
    let reviewsDuplicate = 0;
    const businessesUpdated = new Set<string>();

    // Process reviews for each page
    for (const facebookUrl of uniqueUrls) {
      const profile = profileMap.get(facebookUrl);
      if (!profile) {
        console.log(`⚠️  No profile found for URL ${facebookUrl}, skipping...`);
        continue;
      }

      const pageReviews = rawData.filter((r) => r.facebookUrl === facebookUrl);
      console.log(`Processing ${pageReviews.length} reviews for page ${facebookUrl}`);

      for (const review of pageReviews) {
        const reviewDate = review.date ? new Date(review.date) : null;
        
        // Skip if older than last known review (deduplication)
        if (!isInitial && profile.lastReviewDate && reviewDate && reviewDate <= profile.lastReviewDate) {
          reviewsDuplicate++;
          continue;
        }

        // Check if review already exists
        const existingReview = await prisma.facebookReview.findFirst({
          where: {
            businessId: profile.id,
            reviewId: review.id,
          },
        });

        if (existingReview) {
          reviewsDuplicate++;
          continue;
        }

        // Save new review
        await prisma.facebookReview.create({
          data: {
            businessId: profile.id,
            reviewId: review.id,
            text: review.text || '',
            rating: review.isRecommended ? 5 : 1, // Facebook has recommend/not recommend
            publishAt: reviewDate || new Date(),
            reviewer: review.user?.name || 'Anonymous',
            reviewUrl: review.url,
            likesCount: review.likesCount || 0,
            commentsCount: review.commentsCount || 0,
          },
        });

        reviewsNew++;
        businessesUpdated.add(profile.id);
      }
    }

    // Update lastScrapedAt and lastReviewDate for all affected profiles
    for (const businessId of businessesUpdated) {
      const latestReview = await prisma.facebookReview.findFirst({
        where: { businessId },
        orderBy: { publishAt: 'desc' },
        select: { publishAt: true },
      });

      await prisma.facebookBusinessProfile.update({
        where: { id: businessId },
        data: {
          lastScrapedAt: new Date(),
          lastReviewDate: latestReview?.publishAt || new Date(),
        },
      });

      // Trigger analytics update
      await this.facebookAnalytics.processReviewsAndUpdateDashboard(businessId);
    }

    console.log(
      `✅ Facebook: ${reviewsNew} new, ${reviewsDuplicate} duplicates, ${businessesUpdated.size} businesses updated`
    );

    // Send notifications for negative and urgent reviews
    if (reviewsNew > 0) {
      const newReviewsData = await prisma.facebookReview.findMany({
        where: {
          businessProfileId: { in: Array.from(businessesUpdated) },
          createdAt: { gte: new Date(Date.now() - 60000) }, // Last minute
        },
        select: {
          isRecommended: true,
          reviewMetadata: {
            select: {
              responseUrgency: true,
            },
          },
        },
      });

      // Detect not recommended reviews
      const negativeReviews = newReviewsData.filter(r => !r.isRecommended);
      if (negativeReviews.length > 0) {
        await sendNotification({
          type: 'mail',
          scope: 'team',
          teamId,
          title: `<p><strong>${negativeReviews.length}</strong> new negative Facebook review${negativeReviews.length > 1 ? 's' : ''} received</p>`,
          category: 'Reviews',
          metadata: { 
            platform: 'facebook', 
            businessProfileId: uniqueUrls[0],
            count: negativeReviews.length,
          },
          expiresInDays: 7,
        });
      }

      // Detect urgent reviews
      const urgentReviews = newReviewsData.filter(r => 
        !r.isRecommended && (r.reviewMetadata?.responseUrgency || 0) >= 8
      );
      if (urgentReviews.length > 0) {
        await sendNotification({
          type: 'payment',
          scope: 'team',
          teamId,
          title: `<p><strong>URGENT:</strong> ${urgentReviews.length} Facebook review${urgentReviews.length > 1 ? 's' : ''} require immediate response</p>`,
          category: 'Reviews',
          metadata: { 
            platform: 'facebook', 
            businessProfileId: uniqueUrls[0],
            count: urgentReviews.length,
          },
          expiresInDays: 3,
        });
      }
    }

    return {
      reviewsProcessed: rawData.length,
      reviewsNew,
      reviewsDuplicate,
      businessesUpdated: businessesUpdated.size,
    };
  }

  /**
   * Process TripAdvisor reviews (TripAdvisor Reviews Scraper output)
   */
  private async processTripAdvisorReviews(
    teamId: string,
    rawData: any[],
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    console.log(`🌍 Processing TripAdvisor reviews for team ${teamId}...`);
    
    // Get business profile
    const businessProfile = await prisma.tripAdvisorBusinessProfile.findUnique({
      where: { teamId },
      select: { id: true, tripAdvisorUrl: true, lastReviewDate: true },
    });

    if (!businessProfile) {
      throw new Error('TripAdvisor business profile not found');
    }

    let reviewsNew = 0;
    let reviewsDuplicate = 0;

    for (const review of rawData) {
      const reviewDate = review.publishedDate ? new Date(review.publishedDate) : null;
      
      // Skip if older than last known review (deduplication)
      if (!isInitial && businessProfile.lastReviewDate && reviewDate && reviewDate <= businessProfile.lastReviewDate) {
        reviewsDuplicate++;
        continue;
      }

      // Check if review already exists
      const existingReview = await prisma.tripAdvisorReview.findFirst({
        where: {
          businessId: businessProfile.id,
          reviewId: review.id,
        },
      });

      if (existingReview) {
        reviewsDuplicate++;
        continue;
      }

      // Save new review
      await prisma.tripAdvisorReview.create({
        data: {
          businessId: businessProfile.id,
          reviewId: review.id,
          title: review.title || '',
          text: review.text || '',
          rating: review.rating || 0,
          publishedDate: reviewDate || new Date(),
          travelDate: review.travelDate || '',
          reviewer: review.user?.username || 'Anonymous',
          reviewUrl: review.url,
        },
      });

      reviewsNew++;
    }

    // Update profile
    if (reviewsNew > 0) {
      const latestReview = await prisma.tripAdvisorReview.findFirst({
        where: { businessId: businessProfile.id },
        orderBy: { publishedDate: 'desc' },
        select: { publishedDate: true },
      });

      await prisma.tripAdvisorBusinessProfile.update({
        where: { id: businessProfile.id },
        data: {
          lastScrapedAt: new Date(),
          lastReviewDate: latestReview?.publishedDate || new Date(),
        },
      });

      await this.tripAdvisorAnalytics.processReviewsAndUpdateDashboard(businessProfile.id);
    }

    console.log(
      `✅ TripAdvisor: ${reviewsNew} new, ${reviewsDuplicate} duplicates`
    );

    // Send notifications for negative and urgent reviews
    if (reviewsNew > 0) {
      const newReviewsData = await prisma.tripAdvisorReview.findMany({
        where: {
          businessProfileId: businessProfile.id,
          createdAt: { gte: new Date(Date.now() - 60000) }, // Last minute
        },
        select: {
          rating: true,
          reviewMetadata: {
            select: {
              responseUrgency: true,
            },
          },
        },
      });

      // Detect negative reviews (rating <= 2)
      const negativeReviews = newReviewsData.filter(r => (r.rating || 0) <= 2);
      if (negativeReviews.length > 0) {
        await sendNotification({
          type: 'mail',
          scope: 'team',
          teamId,
          title: `<p><strong>${negativeReviews.length}</strong> new negative TripAdvisor review${negativeReviews.length > 1 ? 's' : ''} received</p>`,
          category: 'Reviews',
          metadata: { 
            platform: 'tripadvisor', 
            businessProfileId: businessProfile.id,
            count: negativeReviews.length,
          },
          expiresInDays: 7,
        });
      }

      // Detect urgent reviews
      const urgentReviews = newReviewsData.filter(r => 
        (r.rating || 0) <= 2 && (r.reviewMetadata?.responseUrgency || 0) >= 8
      );
      if (urgentReviews.length > 0) {
        await sendNotification({
          type: 'payment',
          scope: 'team',
          teamId,
          title: `<p><strong>URGENT:</strong> ${urgentReviews.length} TripAdvisor review${urgentReviews.length > 1 ? 's' : ''} require immediate response</p>`,
          category: 'Reviews',
          metadata: { 
            platform: 'tripadvisor', 
            businessProfileId: businessProfile.id,
            count: urgentReviews.length,
          },
          expiresInDays: 3,
        });
      }
    }

    return {
      reviewsProcessed: rawData.length,
      reviewsNew,
      reviewsDuplicate,
      businessesUpdated: reviewsNew > 0 ? 1 : 0,
    };
  }

  /**
   * Process Booking reviews (Booking.com Reviews Scraper output)
   */
  private async processBookingReviews(
    teamId: string,
    rawData: any[],
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    console.log(`🏨 Processing Booking.com reviews for team ${teamId}...`);
    
    // Get business profile
    const businessProfile = await prisma.bookingBusinessProfile.findUnique({
      where: { teamId },
      select: { id: true, bookingUrl: true, lastReviewDate: true },
    });

    if (!businessProfile) {
      throw new Error('Booking business profile not found');
    }

    let reviewsNew = 0;
    let reviewsDuplicate = 0;

    for (const review of rawData) {
      const reviewDate = review.reviewDate ? new Date(review.reviewDate) : null;
      
      // Skip if older than last known review (deduplication)
      if (!isInitial && businessProfile.lastReviewDate && reviewDate && reviewDate <= businessProfile.lastReviewDate) {
        reviewsDuplicate++;
        continue;
      }

      // Check if review already exists
      const existingReview = await prisma.bookingReview.findFirst({
        where: {
          businessId: businessProfile.id,
          reviewId: review.id,
        },
      });

      if (existingReview) {
        reviewsDuplicate++;
        continue;
      }

      // Save new review
      await prisma.bookingReview.create({
        data: {
          businessId: businessProfile.id,
          reviewId: review.id,
          title: review.reviewTitle || '',
          text: JSON.stringify(review.reviewTextParts), // Liked/Disliked parts
          rating: parseFloat(review.rating) || 0,
          publishedAt: reviewDate || new Date(),
          reviewer: review.userName || 'Anonymous',
          stayDate: review.stayDate || '',
        },
      });

      reviewsNew++;
    }

    // Update profile
    if (reviewsNew > 0) {
      const latestReview = await prisma.bookingReview.findFirst({
        where: { businessId: businessProfile.id },
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true },
      });

      await prisma.bookingBusinessProfile.update({
        where: { id: businessProfile.id },
        data: {
          lastScrapedAt: new Date(),
          lastReviewDate: latestReview?.publishedAt || new Date(),
        },
      });

      await this.bookingAnalytics.processReviewsAndUpdateDashboard(businessProfile.id);
    }

    console.log(
      `✅ Booking: ${reviewsNew} new, ${reviewsDuplicate} duplicates`
    );

    // Send notifications for negative and urgent reviews
    if (reviewsNew > 0) {
      const newReviewsData = await prisma.bookingReview.findMany({
        where: {
          businessProfileId: businessProfile.id,
          createdAt: { gte: new Date(Date.now() - 60000) }, // Last minute
        },
        select: {
          rating: true,
          reviewMetadata: {
            select: {
              responseUrgency: true,
            },
          },
        },
      });

      // Detect negative reviews (rating <= 2)
      const negativeReviews = newReviewsData.filter(r => (r.rating || 0) <= 2);
      if (negativeReviews.length > 0) {
        await sendNotification({
          type: 'mail',
          scope: 'team',
          teamId,
          title: `<p><strong>${negativeReviews.length}</strong> new negative Booking.com review${negativeReviews.length > 1 ? 's' : ''} received</p>`,
          category: 'Reviews',
          metadata: { 
            platform: 'booking', 
            businessProfileId: businessProfile.id,
            count: negativeReviews.length,
          },
          expiresInDays: 7,
        });
      }

      // Detect urgent reviews
      const urgentReviews = newReviewsData.filter(r => 
        (r.rating || 0) <= 2 && (r.reviewMetadata?.responseUrgency || 0) >= 8
      );
      if (urgentReviews.length > 0) {
        await sendNotification({
          type: 'payment',
          scope: 'team',
          teamId,
          title: `<p><strong>URGENT:</strong> ${urgentReviews.length} Booking.com review${urgentReviews.length > 1 ? 's' : ''} require immediate response</p>`,
          category: 'Reviews',
          metadata: { 
            platform: 'booking', 
            businessProfileId: businessProfile.id,
            count: urgentReviews.length,
          },
          expiresInDays: 3,
        });
      }
    }

    return {
      reviewsProcessed: rawData.length,
      reviewsNew,
      reviewsDuplicate,
      businessesUpdated: reviewsNew > 0 ? 1 : 0,
    };
  }

  /**
   * Extract latest review date from raw data
   */
  private getLatestReviewDate(rawData: any[]): Date | null {
    if (rawData.length === 0) return null;

    const dates = rawData
      .map((item) => {
        const dateStr =
          item.publishedAtDate ||
          item.date ||
          item.publishedDate ||
          item.reviewDate ||
          item.publishAt;
        return dateStr ? new Date(dateStr) : null;
      })
      .filter((date): date is Date => date !== null && !isNaN(date.getTime()));

    if (dates.length === 0) return null;

    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }
}

