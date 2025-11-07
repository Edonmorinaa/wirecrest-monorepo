/**
 * Review Data Processor
 * Processes review data from Apify and saves to database
 */

import { prisma } from '@wirecrest/db';
import type { Prisma } from '@prisma/client';
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
   * Send notification to team about review sync results
   * Notifies on initial sync OR when new reviews are found (>= 1)
   */
  private async sendReviewNotificationToTeam(
    teamId: string,
    platform: Platform,
    result: Omit<SyncResult, 'processingTimeMs'>,
    isInitial: boolean
  ): Promise<void> {
    // Notify on initial sync OR when new reviews found
    const shouldNotify = isInitial || result.reviewsNew >= 1;
    
    if (!shouldNotify) {
      console.log(`  ℹ️  No notification needed for team ${teamId} - no new reviews`);
      return;
    }
    
    const platformName = platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const notificationTitle = isInitial
      ? `<p>Initial <strong>${platformName}</strong> sync complete</p>`
      : `<p><strong>${result.reviewsNew}</strong> new review${result.reviewsNew > 1 ? 's' : ''} from <strong>${platformName}</strong></p>`;
    
    try {
      await sendNotification({
        type: 'delivery',
        scope: 'team',
        teamId,
        title: notificationTitle,
        category: 'Reviews',
        metadata: {
          platform,
          reviewsNew: result.reviewsNew,
          reviewsProcessed: result.reviewsProcessed,
          businessesUpdated: result.businessesUpdated,
          isInitial,
        },
        expiresInDays: 7,
      });
      console.log(`  ✉️  Notification sent to team ${teamId}: ${result.reviewsNew} new reviews`);
    } catch (error) {
      console.error('Failed to send review notification:', error);
      // Don't throw - notifications shouldn't break processing
    }
  }

  /**
   * Process reviews from Apify dataset
   * teamId can be null for scheduled runs - we'll determine it from the data
   */
  async processReviews(
    teamId: string | null,
    platform: Platform,
    rawData: any[], // External untyped data from Apify
    isInitial: boolean
  ): Promise<SyncResult> {
    const startTime = Date.now();

    const teamInfo = teamId ? `team ${teamId}` : 'all teams (scheduled run)';
    console.log(
      `🔄 Processing ${rawData.length} items for ${teamInfo}, platform ${platform}`
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

    const result = {
      ...baseResult,
      processingTimeMs,
    };

    // Send notification if teamId is known (manual/subscription triggers)
    if (teamId) {
      await this.sendReviewNotificationToTeam(teamId, platform, baseResult, isInitial);
    }

    return result;
  }

  /**
   * Process Google reviews (Google Maps Reviews Scraper output)
   * Handles batched placeIds - multiple locations in single dataset
   * teamId can be null for scheduled runs - looks up by placeId only
   */
  private async processGoogleReviews(
    teamId: string | null,
    rawData: any[], // External untyped data from Apify
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    const teamInfo = teamId ? `team ${teamId}` : 'all teams';
    console.log(`📍 Processing Google reviews for ${teamInfo}...`);
    
    // Get unique place IDs from dataset
    const uniquePlaceIds = [...new Set(rawData.map((r) => r.placeId).filter(Boolean))];
    console.log(`Found ${uniquePlaceIds.length} unique place(s)`);

    // Fetch all business profiles - filter by team if provided
    const whereClause: Prisma.GoogleBusinessProfileWhereInput = {
      placeId: { in: uniquePlaceIds },
      ...(teamId && { teamId }),
    };

    const businessProfiles = await prisma.googleBusinessProfile.findMany({
      where: whereClause,
      select: { id: true, placeId: true, lastReviewDate: true, teamId: true },
    });
    const profileMap = new Map<string, { id: string; placeId: string | null; lastReviewDate: Date | null; teamId: string }>(
      businessProfiles.map((p) => [p.placeId || '', p])
    );
    
    let reviewsNew = 0;
    let reviewsDuplicate = 0;
    const businessesUpdated = new Set<string>();

    // Process reviews for each place
    for (const placeId of uniquePlaceIds) {
      const profile = profileMap.get(placeId) as { id: string; placeId: string | null; lastReviewDate: Date | null; teamId: string } | undefined;
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
            businessProfileId: profile.id,
            reviewerId: review.reviewerId || review.userId || `reviewer-${Math.random().toString(36).substr(2, 9)}`,
          },
        });

        if (existingReview) {
          reviewsDuplicate++;
          continue;
        }

        // Create review metadata first
        const reviewMetadataData: Prisma.ReviewMetadataCreateInput = {
          externalId: review.reviewId || review.id || `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: 'GOOGLE_MAPS',
          author: review.reviewerName || 'Anonymous',
          authorImage: review.reviewerPhotoUrl || null,
          rating: review.stars || review.rating || 0,
          text: review.text || null,
          date: reviewDate || new Date(),
          photoCount: review.reviewImageUrls?.length || 0,
          photoUrls: review.reviewImageUrls || [],
          reply: review.responseFromOwnerText || null,
          replyDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
          hasReply: !!review.responseFromOwnerText,
          sentiment: null,
          keywords: [],
          topics: [],
          emotional: null,
          actionable: false,
          responseUrgency: null,
          competitorMentions: [],
          comparativePositive: null,
          isRead: false,
          isImportant: false,
          labels: [],
          language: review.language || 'en',
          scrapedAt: new Date(),
          sourceUrl: review.reviewUrl || review.url || null,
        };
        
        const reviewMetadata = await prisma.reviewMetadata.create({
          data: reviewMetadataData,
        });

        // Upsert review (update if exists, create if not)
        if (existingReview) {
          // Update existing review with latest data
          const updateData: Prisma.GoogleReviewUpdateInput = {
            text: review.text || existingReview.text || '',
            textTranslated: review.textTranslated || existingReview.textTranslated,
            likesCount: review.likesCount || existingReview.likesCount,
            responseFromOwnerDate: review.responseFromOwnerDate
              ? new Date(review.responseFromOwnerDate)
              : existingReview.responseFromOwnerDate,
            responseFromOwnerText: review.responseFromOwnerText || existingReview.responseFromOwnerText,
            reviewImageUrls: review.reviewImageUrls || existingReview.reviewImageUrls,
            scrapedAt: new Date(),
          };
          
          await prisma.googleReview.update({
            where: { id: existingReview.id },
            data: updateData,
          });
          
          // Update review metadata
          const metadataUpdateData: Prisma.ReviewMetadataUpdateInput = {
            reply: review.responseFromOwnerText || null,
            replyDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
            hasReply: !!review.responseFromOwnerText,
            photoCount: review.reviewImageUrls?.length || 0,
            photoUrls: review.reviewImageUrls || [],
            scrapedAt: new Date(),
          };
          
          await prisma.reviewMetadata.update({
            where: { id: reviewMetadata.id },
            data: metadataUpdateData,
          });
          
          reviewsDuplicate++;
        } else {
          // Create new review
          const createData: Prisma.GoogleReviewCreateInput = {
            businessProfile: {
              connect: { id: profile.id },
            },
            reviewMetadata: {
              connect: { id: reviewMetadata.id },
            },
            reviewerId: review.reviewerId || review.userId || `reviewer-${Math.random().toString(36).substr(2, 9)}`,
            reviewerUrl: review.reviewerUrl || '',
            name: review.reviewerName || 'Anonymous',
            reviewerNumberOfReviews: review.reviewerNumberOfReviews || 0,
            isLocalGuide: review.isLocalGuide || false,
            reviewerPhotoUrl: review.reviewerPhotoUrl || '',
            text: review.text || '',
            textTranslated: review.textTranslated || null,
            publishAt: review.publishAt || reviewDate?.toISOString() || new Date().toISOString(),
            publishedAtDate: reviewDate || new Date(),
            likesCount: review.likesCount || 0,
            reviewUrl: review.reviewUrl || review.url || '',
            reviewOrigin: 'GOOGLE_MAPS',
            stars: review.stars || review.rating || 0,
            rating: review.rating || null,
            responseFromOwnerDate: review.responseFromOwnerDate
              ? new Date(review.responseFromOwnerDate)
              : null,
            responseFromOwnerText: review.responseFromOwnerText || null,
            reviewImageUrls: review.reviewImageUrls || [],
            reviewContext: review.reviewContext || {},
            reviewDetailedRating: review.reviewDetailedRating || {},
            visitedIn: review.visitedIn || null,
            originalLanguage: review.originalLanguage || null,
            translatedLanguage: review.translatedLanguage || null,
            isAdvertisement: review.isAdvertisement || false,
            placeId: review.placeId || profile.placeId,
            location: review.location || {},
            address: review.address || '',
            neighborhood: review.neighborhood || null,
            street: review.street || null,
            city: review.city || null,
            postalCode: review.postalCode || null,
            state: review.state || null,
            countryCode: review.countryCode || null,
            categoryName: review.categoryName || null,
            categories: review.categories || [],
            title: review.title || '',
            totalScore: review.totalScore || null,
            permanentlyClosed: review.permanentlyClosed || null,
            temporarilyClosed: review.temporarilyClosed || null,
            reviewsCount: review.reviewsCount || null,
            url: review.url || null,
            price: review.price || null,
            cid: review.cid || null,
            fid: review.fid || null,
            imageUrl: review.imageUrl || null,
            scrapedAt: new Date(),
            language: review.language || 'en',
          };
          
          await prisma.googleReview.create({
            data: createData,
          });
          
          reviewsNew++;
        }

        businessesUpdated.add(profile.id);
      }
    }

    // Update lastScrapedAt and lastReviewDate for all affected profiles
    for (const businessId of businessesUpdated) {
      const latestReview = await prisma.googleReview.findFirst({
        where: { businessProfileId: businessId },
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
          businessProfileId: { in: Array.from(businessesUpdated) },
          scrapedAt: { gte: new Date(Date.now() - 60000) }, // Last minute
        },
        select: {
          stars: true,
          rating: true,
          reviewMetadataId: true,
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
        (r.stars || r.rating || 0) <= 2
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
    teamId: string | null,
    rawData: any[], // External untyped data from Apify
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    const teamInfo = teamId ? `team ${teamId}` : 'all teams';
    console.log(`📘 Processing Facebook reviews for ${teamInfo}...`);
    
    // Get unique Facebook URLs from dataset
    const uniqueUrls = [...new Set(rawData.map((r) => r.facebookUrl).filter(Boolean))];
    console.log(`Found ${uniqueUrls.length} unique page(s)`);

    // Fetch all business profiles - filter by team if provided
    const whereClause: Prisma.FacebookBusinessProfileWhereInput = {
      facebookUrl: { in: uniqueUrls },
      ...(teamId && { teamId }),
    };

    const businessProfiles = await prisma.facebookBusinessProfile.findMany({
      where: whereClause,
      select: { id: true, facebookUrl: true, lastReviewDate: true, teamId: true },
    });
    const profileMap = new Map<string, { id: string; facebookUrl: string | null; lastReviewDate: Date | null; teamId: string }>(
      businessProfiles.map((p) => [p.facebookUrl || '', p])
    );
    
    let reviewsNew = 0;
    let reviewsDuplicate = 0;
    const businessesUpdated = new Set<string>();

    // Process reviews for each page
    for (const facebookUrl of uniqueUrls) {
      const profile = profileMap.get(facebookUrl) as { id: string; facebookUrl: string | null; lastReviewDate: Date | null; teamId: string } | undefined;
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
            businessProfileId: profile.id,
            facebookReviewId: review.id,
          },
          include: {
            reviewMetadata: true,
          },
        });

        // Create or find review metadata
        const reviewMetadata = existingReview?.reviewMetadata || await prisma.reviewMetadata.create({
          data: {
            externalId: review.id,
            source: 'FACEBOOK',
            author: review.user?.name || review.userName || 'Anonymous',
            authorImage: review.user?.profilePic || review.userProfilePic || null,
            rating: review.isRecommended ? 5 : 1,
            text: review.text || null,
            date: reviewDate || new Date(),
            photoCount: 0,
            photoUrls: [],
            reply: null,
            replyDate: null,
            hasReply: false,
            sentiment: null,
            keywords: [],
            topics: [],
            emotional: null,
            actionable: false,
            responseUrgency: null,
            competitorMentions: [],
            comparativePositive: null,
            isRead: false,
            isImportant: false,
            labels: [],
            language: 'en',
            scrapedAt: new Date(),
            sourceUrl: review.url || null,
          },
        });

        // Upsert review (update if exists, create if not)
        if (existingReview) {
          // Update existing review with latest data
          const updateData: Prisma.FacebookReviewUpdateInput = {
            text: review.text || existingReview.text,
            likesCount: review.likesCount || existingReview.likesCount,
            commentsCount: review.commentsCount || existingReview.commentsCount,
            tags: review.tags || existingReview.tags,
            scrapedAt: new Date(),
            updatedAt: new Date(),
          };
          
          await prisma.facebookReview.update({
            where: { id: existingReview.id },
            data: updateData,
          });
          
          // Update review metadata
          const metadataUpdateData: Prisma.ReviewMetadataUpdateInput = {
            scrapedAt: new Date(),
          };
          
          await prisma.reviewMetadata.update({
            where: { id: reviewMetadata.id },
            data: metadataUpdateData,
          });
          
          reviewsDuplicate++;
        } else {
          // Create new review
          const createData: Prisma.FacebookReviewCreateInput = {
            businessProfile: {
              connect: { id: profile.id },
            },
            reviewMetadata: {
              connect: { id: reviewMetadata.id },
            },
            facebookReviewId: review.id,
            legacyId: review.legacyId || review.id,
            date: reviewDate || new Date(),
            url: review.url || '',
            text: review.text || null,
            isRecommended: review.isRecommended || false,
            userId: review.user?.id || review.userId || `user-${Math.random().toString(36).substr(2, 9)}`,
            userName: review.user?.name || review.userName || 'Anonymous',
            userProfileUrl: review.user?.profileUrl || review.userProfileUrl || null,
            userProfilePic: review.user?.profilePic || review.userProfilePic || null,
            likesCount: review.likesCount || 0,
            commentsCount: review.commentsCount || 0,
            tags: review.tags || [],
            facebookPageId: review.facebookPageId || '',
            pageName: review.pageName || '',
            inputUrl: review.inputUrl || facebookUrl,
            pageAdLibrary: review.pageAdLibrary || null,
            scrapedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await prisma.facebookReview.create({
            data: createData,
          });
          
          reviewsNew++;
        }

        businessesUpdated.add(profile.id);
      }
    }

    // Update lastScrapedAt and lastReviewDate for all affected profiles
    for (const businessId of businessesUpdated) {
      const latestReview = await prisma.facebookReview.findFirst({
        where: { businessProfileId: businessId },
        orderBy: { date: 'desc' },
        select: { date: true },
      });

      await prisma.facebookBusinessProfile.update({
        where: { id: businessId },
        data: {
          lastScrapedAt: new Date(),
          lastReviewDate: latestReview?.date || new Date(),
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
    teamId: string | null,
    rawData: any[], // External untyped data from Apify
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    const teamInfo = teamId ? `team ${teamId}` : 'all teams';
    console.log(`🌍 Processing TripAdvisor reviews for ${teamInfo}...`);
    
    // Get business profile - filter by team if provided, otherwise find by URL in data
    let businessProfile;
    if (teamId) {
      businessProfile = await prisma.tripAdvisorBusinessProfile.findUnique({
        where: { teamId },
        select: { id: true, tripAdvisorUrl: true, lastReviewDate: true, teamId: true },
      });
    } else {
      // For scheduled runs, try to find by URL from the first item
      const firstItem = rawData[0];
      const url = firstItem?.url || firstItem?.tripAdvisorUrl;
      if (url) {
        businessProfile = await prisma.tripAdvisorBusinessProfile.findFirst({
          where: { tripAdvisorUrl: url },
          select: { id: true, tripAdvisorUrl: true, lastReviewDate: true, teamId: true },
        });
      }
    }

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
          businessProfileId: businessProfile.id,
          tripAdvisorReviewId: review.id,
        },
        include: {
          reviewMetadata: true,
        },
      });

      // Create or find review metadata
      const reviewMetadata = existingReview?.reviewMetadata || await prisma.reviewMetadata.create({
        data: {
          externalId: review.id,
          source: 'TRIPADVISOR',
          author: review.user?.username || review.reviewerName || 'Anonymous',
          authorImage: review.user?.photoUrl || review.reviewerPhotoUrl || null,
          rating: review.rating || 0,
          text: review.text || null,
          date: reviewDate || new Date(),
          photoCount: 0,
          photoUrls: [],
          reply: review.responseFromOwnerText || null,
          replyDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
          hasReply: !!review.responseFromOwnerText,
          sentiment: null,
          keywords: [],
          topics: [],
          emotional: null,
          actionable: false,
          responseUrgency: null,
          competitorMentions: [],
          comparativePositive: null,
          isRead: false,
          isImportant: false,
          labels: [],
          language: 'en',
          scrapedAt: new Date(),
          sourceUrl: review.url || null,
        },
      });

      // Upsert review (update if exists, create if not)
      if (existingReview) {
        // Update existing review with latest data
        const updateData: Prisma.TripAdvisorReviewUpdateInput = {
          text: review.text || existingReview.text,
          helpfulVotes: review.helpfulVotes || existingReview.helpfulVotes,
          responseFromOwnerText: review.responseFromOwnerText || existingReview.responseFromOwnerText,
          responseFromOwnerDate: review.responseFromOwnerDate 
            ? new Date(review.responseFromOwnerDate) 
            : existingReview.responseFromOwnerDate,
          hasOwnerResponse: review.hasOwnerResponse || existingReview.hasOwnerResponse,
          scrapedAt: new Date(),
          updatedAt: new Date(),
        };
        
        await prisma.tripAdvisorReview.update({
          where: { id: existingReview.id },
          data: updateData,
        });
        
        // Update review metadata
        const metadataUpdateData: Prisma.ReviewMetadataUpdateInput = {
          reply: review.responseFromOwnerText || null,
          replyDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
          hasReply: !!review.responseFromOwnerText,
          scrapedAt: new Date(),
        };
        
        await prisma.reviewMetadata.update({
          where: { id: reviewMetadata.id },
          data: metadataUpdateData,
        });
        
        reviewsDuplicate++;
      } else {
        // Create new review
        const createData: Prisma.TripAdvisorReviewCreateInput = {
          businessProfile: {
            connect: { id: businessProfile.id },
          },
          reviewMetadata: {
            connect: { id: reviewMetadata.id },
          },
          tripAdvisorReviewId: review.id,
          reviewUrl: review.url || null,
          title: review.title || null,
          text: review.text || null,
          rating: review.rating || 0,
          publishedDate: reviewDate || new Date(),
          visitDate: review.visitDate ? new Date(review.visitDate) : null,
          reviewerId: review.user?.id || review.reviewerId || `reviewer-${Math.random().toString(36).substr(2, 9)}`,
          reviewerName: review.user?.username || review.reviewerName || 'Anonymous',
          reviewerLocation: review.user?.location || review.reviewerLocation || null,
          reviewerLevel: review.user?.level || review.reviewerLevel || null,
          reviewerPhotoUrl: review.user?.photoUrl || review.reviewerPhotoUrl || null,
          helpfulVotes: review.helpfulVotes || 0,
          tripType: review.tripType || null,
          roomTip: review.roomTip || null,
          responseFromOwnerText: review.responseFromOwnerText || null,
          responseFromOwnerDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
          hasOwnerResponse: !!review.responseFromOwnerText,
          locationId: review.locationId || businessProfile.locationId,
          businessName: review.businessName || businessProfile.name,
          businessType: review.businessType || businessProfile.type,
          scrapedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await prisma.tripAdvisorReview.create({
          data: createData,
        });
        
        reviewsNew++;
      }
    }

    // Update profile
    if (reviewsNew > 0) {
      const latestReview = await prisma.tripAdvisorReview.findFirst({
        where: { businessProfileId: businessProfile.id },
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
    teamId: string | null,
    rawData: any[], // External untyped data from Apify
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    const teamInfo = teamId ? `team ${teamId}` : 'all teams';
    console.log(`🏨 Processing Booking.com reviews for ${teamInfo}...`);
    
    // Get business profile - filter by team if provided, otherwise find by URL in data
    let businessProfile;
    if (teamId) {
      businessProfile = await prisma.bookingBusinessProfile.findUnique({
        where: { teamId },
        select: { id: true, bookingUrl: true, lastReviewDate: true, teamId: true },
      });
    } else {
      // For scheduled runs, try to find by URL from the first item
      const firstItem = rawData[0];
      const url = firstItem?.url || firstItem?.bookingUrl;
      if (url) {
        businessProfile = await prisma.bookingBusinessProfile.findFirst({
          where: { bookingUrl: url },
          select: { id: true, bookingUrl: true, lastReviewDate: true, teamId: true },
        });
      }
    }

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
          businessProfileId: businessProfile.id,
          bookingReviewId: review.id,
        },
        include: {
          reviewMetadata: true,
        },
      });

      // Create or find review metadata
      const reviewMetadata = existingReview?.reviewMetadata || await prisma.reviewMetadata.create({
        data: {
          externalId: review.id,
          source: 'BOOKING',
          author: review.userName || 'Anonymous',
          authorImage: null,
          rating: parseFloat(review.rating) || 0,
          text: review.reviewText || null,
          date: reviewDate || new Date(),
          photoCount: 0,
          photoUrls: [],
          reply: review.responseFromOwnerText || null,
          replyDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
          hasReply: !!review.responseFromOwnerText,
          sentiment: null,
          keywords: [],
          topics: [],
          emotional: null,
          actionable: false,
          responseUrgency: null,
          competitorMentions: [],
          comparativePositive: null,
          isRead: false,
          isImportant: false,
          labels: [],
          language: 'en',
          scrapedAt: new Date(),
          sourceUrl: review.url || null,
        },
      });

      // Upsert review (update if exists, create if not)
      if (existingReview) {
        // Update existing review with latest data
        const updateData: Prisma.BookingReviewUpdateInput = {
          text: review.reviewText || existingReview.text,
          responseFromOwnerText: review.responseFromOwnerText || existingReview.responseFromOwnerText,
          responseFromOwnerDate: review.responseFromOwnerDate 
            ? new Date(review.responseFromOwnerDate) 
            : existingReview.responseFromOwnerDate,
          hasOwnerResponse: review.hasOwnerResponse || existingReview.hasOwnerResponse,
          scrapedAt: new Date(),
          updatedAt: new Date(),
        };
        
        await prisma.bookingReview.update({
          where: { id: existingReview.id },
          data: updateData,
        });
        
        // Update review metadata
        const metadataUpdateData: Prisma.ReviewMetadataUpdateInput = {
          reply: review.responseFromOwnerText || null,
          replyDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
          hasReply: !!review.responseFromOwnerText,
          scrapedAt: new Date(),
        };
        
        await prisma.reviewMetadata.update({
          where: { id: reviewMetadata.id },
          data: metadataUpdateData,
        });
        
        reviewsDuplicate++;
      } else {
        // Create new review
        const createData: Prisma.BookingReviewCreateInput = {
          businessProfile: {
            connect: { id: businessProfile.id },
          },
          reviewMetadata: {
            connect: { id: reviewMetadata.id },
          },
          bookingReviewId: review.id,
          title: review.reviewTitle || null,
          text: review.reviewText || null,
          rating: parseFloat(review.rating) || 0,
          publishedDate: reviewDate || new Date(),
          stayDate: review.stayDate ? new Date(review.stayDate) : null,
          reviewerId: review.userId || null,
          reviewerName: review.userName || 'Anonymous',
          reviewerNationality: review.userNationality || null,
          lengthOfStay: review.lengthOfStay || null,
          roomType: review.roomType || null,
          guestType: review.guestType || 'OTHER',
          likedMost: review.likedMost || null,
          dislikedMost: review.dislikedMost || null,
          cleanlinessRating: review.cleanlinessRating || null,
          comfortRating: review.comfortRating || null,
          locationRating: review.locationRating || null,
          facilitiesRating: review.facilitiesRating || null,
          staffRating: review.staffRating || null,
          valueForMoneyRating: review.valueForMoneyRating || null,
          wifiRating: review.wifiRating || null,
          responseFromOwnerText: review.responseFromOwnerText || null,
          responseFromOwnerDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
          hasOwnerResponse: !!review.responseFromOwnerText,
          isVerifiedStay: review.isVerifiedStay || false,
          scrapedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await prisma.bookingReview.create({
          data: createData,
        });
        
        reviewsNew++;
      }
    }

    // Update profile
    if (reviewsNew > 0) {
      const latestReview = await prisma.bookingReview.findFirst({
        where: { businessProfileId: businessProfile.id },
        orderBy: { publishedDate: 'desc' },
        select: { publishedDate: true },
      });

      await prisma.bookingBusinessProfile.update({
        where: { id: businessProfile.id },
        data: {
          lastScrapedAt: new Date(),
          lastReviewDate: latestReview?.publishedDate || new Date(),
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
  private getLatestReviewDate(rawData: any[]): Date | null { // External untyped data from Apify
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

