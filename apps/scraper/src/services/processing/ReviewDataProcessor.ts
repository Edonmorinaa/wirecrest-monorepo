/**
 * Review Data Processor
 * Processes review data from Apify and saves to database
 */

import { ApifyClient } from 'apify-client';
import { prisma } from '@wirecrest/db';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '../../supabase/database';
// Analytics services removed - analytics now computed on-demand via tRPC
// import { GoogleReviewAnalyticsService } from '../googleReviewAnalyticsService';
// import { FacebookReviewAnalyticsService } from '../facebookReviewAnalyticsService';
// import { TripAdvisorReviewAnalyticsService } from '../tripAdvisorReviewAnalyticsService';
// import { BookingReviewAnalyticsService } from '../bookingReviewAnalyticsService';
import type { Platform, SyncResult } from '../../types/apify.types';
import { sendNotification } from '../../utils/notificationHelper';

export class ReviewDataProcessor {
  private databaseService: DatabaseService;
  private apifyClient: ApifyClient;
  // Analytics services removed - analytics now computed on-demand via tRPC
  // private googleAnalytics: GoogleReviewAnalyticsService;
  // private facebookAnalytics: FacebookReviewAnalyticsService;
  // private tripAdvisorAnalytics: TripAdvisorReviewAnalyticsService;
  // private bookingAnalytics: BookingReviewAnalyticsService;

  constructor(apifyToken?: string) {
    this.databaseService = new DatabaseService();

    // Initialize Apify client with token from env or parameter
    const token = apifyToken || process.env.APIFY_TOKEN;
    if (!token) {
      throw new Error('APIFY_TOKEN is required for ReviewDataProcessor');
    }
    this.apifyClient = new ApifyClient({ token });

    // Analytics services removed - analytics now computed on-demand via tRPC
    // this.googleAnalytics = new GoogleReviewAnalyticsService();
    // this.facebookAnalytics = new FacebookReviewAnalyticsService();
    // this.tripAdvisorAnalytics = new TripAdvisorReviewAnalyticsService();
    // this.bookingAnalytics = new BookingReviewAnalyticsService();
  }

  /**
   * Fetch data from Apify dataset
   */
  private async fetchDatasetItems<T = any>(datasetId: string): Promise<T[]> {
    console.log(`📥 Fetching data from Apify dataset: ${datasetId}`);

    try {
      const dataset = this.apifyClient.dataset(datasetId);
      const { items } = await dataset.listItems();

      console.log(`✅ Successfully fetched ${items.length} items from dataset`);
      return items as T[];
    } catch (error) {
      console.error(`❌ Error fetching dataset ${datasetId}:`, error);
      throw new Error(`Failed to fetch Apify dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   * Process reviews from Apify dataset by fetching data using dataset ID
   * This is the new primary method that handles data fetching and processing
   * 
   * @param datasetId - Apify dataset ID from eventData
   * @param teamId - Team ID (null for scheduled runs)
   * @param platform - Platform type (google_reviews, facebook, tripadvisor, booking)
   * @param isInitial - Whether this is an initial sync
   */
  async processReviewsFromDataset(
    datasetId: string,
    teamId: string | null,
    platform: Platform,
    isInitial: boolean
  ): Promise<SyncResult> {
    const startTime = Date.now();

    console.log(`🚀 Starting review processing from dataset: ${datasetId}`);
    console.log(`   Team: ${teamId || 'scheduled run (all teams)'}`);
    console.log(`   Platform: ${platform}`);
    console.log(`   Type: ${isInitial ? 'Initial sync' : 'Update'}`);

    // Fetch data from Apify dataset
    const rawData = await this.fetchDatasetItems(datasetId);

    if (!rawData || rawData.length === 0) {
      console.log('⚠️  No data in dataset - nothing to process');
      return {
        reviewsProcessed: 0,
        reviewsNew: 0,
        reviewsDuplicate: 0,
        businessesUpdated: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Process the fetched data
    return this.processReviews(teamId, platform, rawData, isInitial);
  }

  /**
   * Process reviews from raw data array
   * teamId can be null for scheduled runs - we'll determine it from the data
   * 
   * @deprecated Use processReviewsFromDataset instead for better separation of concerns
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

    // Fetch all business profiles - filter by team if provided (through businessLocation relation)
    const whereClause: Prisma.GoogleBusinessProfileWhereInput = {
      placeId: { in: uniquePlaceIds },
      ...(teamId && {
        businessLocation: {
          teamId
        }
      }),
    };

    const businessProfiles = await prisma.googleBusinessProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        placeId: true,
        lastReviewDate: true,
        businessLocation: {
          select: {
            teamId: true
          }
        }
      },
    });
    const profileMap = new Map<string, { id: string; placeId: string | null; lastReviewDate: Date | null; businessLocation: { teamId: string } }>(
      businessProfiles.map((p) => [p.placeId || '', p])
    );

    let reviewsNew = 0;
    let reviewsDuplicate = 0;
    const businessesUpdated = new Set<string>();

    // Process reviews for each place
    for (const placeId of uniquePlaceIds) {
      const profile = profileMap.get(placeId) as { id: string; placeId: string | null; lastReviewDate: Date | null; businessLocation: { teamId: string } } | undefined;
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

        // Use consistent reviewerId for deduplication
        const reviewerId = review.reviewerId || review.userId || `reviewer-${Math.random().toString(36).substr(2, 9)}`;

        // Check if review already exists (atomic check for proper deduplication)
        const existingReview = await prisma.googleReview.findFirst({
          where: {
            businessProfileId: profile.id,
            reviewerId: reviewerId,
          },
          include: {
            reviewMetadata: true,
          },
        });

        // Skip duplicate check - we'll use upsert which handles duplicates automatically
        // This eliminates race conditions

        // Use upsert to avoid duplicates - using reviewMetadata compound key
        const fid = review.fid || `${profile.placeId}-${reviewerId}-${reviewDate?.getTime() || Date.now()}`;
        const externalId = review.reviewId || review.id || fid;

        // Prepare review metadata - check if it exists first
        const existingMetadata = await prisma.reviewMetadata.findFirst({
          where: {
            externalId,
            source: 'GOOGLE_MAPS',
          },
        });

        const reviewMetadata = await prisma.reviewMetadata.upsert({
          where: {
            externalId_source: {
              externalId,
              source: 'GOOGLE_MAPS',
            },
          },
          create: {
            externalId,
            source: 'GOOGLE_MAPS',
            author: review.name || review.reviewerName || 'Anonymous',
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
          },
          update: {
            text: review.text || undefined,
            photoCount: review.reviewImageUrls?.length || 0,
            photoUrls: review.reviewImageUrls || [],
            reply: review.responseFromOwnerText || null,
            replyDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
            hasReply: !!review.responseFromOwnerText,
            scrapedAt: new Date(),
          },
        });

        // Upsert the review using reviewMetadataId as unique identifier
        const upsertedReview = await prisma.googleReview.upsert({
          where: { reviewMetadataId: reviewMetadata.id },
          create: {
            fid,
            businessProfile: {
              connect: { id: profile.id },
            },
            reviewMetadata: {
              connect: { id: reviewMetadata.id },
            },
            reviewerId,
            reviewerUrl: review.reviewerUrl || '',
            name: review.name || review.reviewerName || 'Anonymous',
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
            imageUrl: review.imageUrl || null,
            scrapedAt: new Date(),
            language: review.language || 'en',
          },
          update: {
            text: review.text || '',
            textTranslated: review.textTranslated || null,
            likesCount: review.likesCount || 0,
            responseFromOwnerDate: review.responseFromOwnerDate
              ? new Date(review.responseFromOwnerDate)
              : null,
            responseFromOwnerText: review.responseFromOwnerText || null,
            reviewImageUrls: review.reviewImageUrls || [],
            scrapedAt: new Date(),
          },
        });

        // Track if this was a new review or an update
        if (existingMetadata) {
          reviewsDuplicate++;
        } else {
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

      // Analytics update removed - analytics now computed on-demand via tRPC
      // await this.googleAnalytics.processReviewsAndUpdateDashboard(businessId);
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

    // Fetch all business profiles - filter by team if provided (through businessLocation relation)
    const whereClause: Prisma.FacebookBusinessProfileWhereInput = {
      facebookUrl: { in: uniqueUrls },
      ...(teamId && {
        businessLocation: {
          teamId
        }
      }),
    };

    const businessProfiles = await prisma.facebookBusinessProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        facebookUrl: true,
        lastReviewDate: true,
        businessLocation: {
          select: {
            teamId: true
          }
        }
      },
    });
    const profileMap = new Map<string, { id: string; facebookUrl: string | null; lastReviewDate: Date | null; businessLocation: { teamId: string } }>(
      businessProfiles.map((p) => [p.facebookUrl || '', p])
    );

    let reviewsNew = 0;
    let reviewsDuplicate = 0;
    const businessesUpdated = new Set<string>();

    // Process reviews for each page
    for (const facebookUrl of uniqueUrls) {
      const profile = profileMap.get(facebookUrl) as { id: string; facebookUrl: string | null; lastReviewDate: Date | null; businessLocation: { teamId: string } } | undefined;
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

        // Process photos from raw data
        const photos = Array.isArray(review.photos) ? review.photos : [];
        const photoUrls = photos
          .map((photo: {
            imageUri?: string;
            image?: { uri?: string };
            url?: string;
            viewerImageUri?: string;
            viewer_image?: { uri?: string };
            [key: string]: any;
          }) => {
            return photo.imageUri || photo.image?.uri || photo.url || photo.viewerImageUri || photo.viewer_image?.uri || null;
          })
          .filter((url: string | null): url is string => Boolean(url));
        const photoCount = photoUrls.length;

        // Check if metadata exists
        const existingMetadata = await prisma.reviewMetadata.findFirst({
          where: {
            externalId: review.id,
            source: 'FACEBOOK',
          },
        });

        // Upsert review metadata
        const reviewMetadata = await prisma.reviewMetadata.upsert({
          where: {
            externalId_source: {
              externalId: review.id,
              source: 'FACEBOOK',
            },
          },
          create: {
            externalId: review.id,
            source: 'FACEBOOK',
            author: review.user?.name || review.userName || 'Anonymous',
            authorImage: review.user?.profilePic || review.userProfilePic || null,
            rating: review.isRecommended ? 5 : 1,
            text: review.text || null,
            date: reviewDate || new Date(),
            photoCount,
            photoUrls,
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
          update: {
            text: review.text || undefined,
            photoCount,
            photoUrls,
            scrapedAt: new Date(),
          },
        });

        // Upsert Facebook review using reviewMetadataId as unique identifier
        const upsertedReview = await prisma.facebookReview.upsert({
          where: { reviewMetadataId: reviewMetadata.id },
          create: {
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
          },
          update: {
            text: review.text || undefined,
            likesCount: review.likesCount || 0,
            commentsCount: review.commentsCount || 0,
            tags: review.tags || [],
            scrapedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Handle photos - delete old ones and create new ones
        if (photos.length > 0) {
          // Delete existing photos for this review
          await prisma.facebookReviewPhoto.deleteMany({
            where: { facebookReviewId: upsertedReview.id },
          });

          // Create new photos
          const photoData = photos.map((photo: {
            url?: string;
            imageUri?: string;
            image?: { uri?: string; height?: number; width?: number };
            viewerImageUri?: string;
            viewer_image?: { uri?: string; height?: number; width?: number };
            height?: number;
            width?: number;
            viewerHeight?: number;
            viewerWidth?: number;
            id?: string;
            photoId?: string;
            accessibilityCaption?: string;
            accessibility_caption?: string;
            isPlayable?: boolean;
            is_playable?: boolean;
            ownerUserId?: string;
            owner?: { id?: string };
            [key: string]: any;
          }, index: number) => ({
            facebookReviewId: upsertedReview.id,
            url: photo.url || '',
            imageUri: photo.imageUri || photo.image?.uri || '',
            height: photo.height || photo.image?.height || null,
            width: photo.width || photo.image?.width || null,
            viewerImageUri: photo.viewerImageUri || photo.viewer_image?.uri || null,
            viewerHeight: photo.viewerHeight || photo.viewer_image?.height || null,
            viewerWidth: photo.viewerWidth || photo.viewer_image?.width || null,
            photoId: photo.id || photo.photoId || `photo-${index}`,
            accessibilityCaption: photo.accessibilityCaption || photo.accessibility_caption || null,
            isPlayable: photo.isPlayable || photo.is_playable || false,
            ownerUserId: photo.ownerUserId || photo.owner?.id || null,
          }));

          await prisma.facebookReviewPhoto.createMany({
            data: photoData,
            skipDuplicates: true,
          });
        }

        // Track if this was a new review or an update
        if (existingMetadata) {
          reviewsDuplicate++;
        } else {
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

      // Analytics update removed - analytics now computed on-demand via tRPC
      // await this.facebookAnalytics.processReviewsAndUpdateDashboard(businessId);
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
   * Handles multiple locations in single dataset
   */
  private async processTripAdvisorReviews(
    teamId: string | null,
    rawData: any[], // External untyped data from Apify
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    const teamInfo = teamId ? `team ${teamId}` : 'all teams';
    console.log(`🌍 Processing TripAdvisor reviews for ${teamInfo}...`);

    // Get unique location IDs from dataset (TripAdvisor uses locationId as unique identifier)
    const uniqueLocationIds = [...new Set(rawData.map((r) => r.locationId || r.tripAdvisorLocationId).filter(Boolean))];
    console.log(`Found ${uniqueLocationIds.length} unique location(s)`);

    // Fetch all business profiles - filter by team if provided (through businessLocation relation)
    const whereClause: Prisma.TripAdvisorBusinessProfileWhereInput = {
      locationId: { in: uniqueLocationIds },
      ...(teamId && {
        businessLocation: {
          teamId
        }
      }),
    };

    const businessProfiles = await prisma.tripAdvisorBusinessProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        locationId: true,
        tripAdvisorUrl: true,
        lastReviewDate: true,
        name: true,
        type: true,
        businessLocation: {
          select: {
            teamId: true
          }
        }
      },
    });
    const profileMap = new Map<string, { id: string; locationId: string; tripAdvisorUrl: string; lastReviewDate: Date | null; name: string; type: any; businessLocation: { teamId: string } }>(
      businessProfiles.map((p) => [p.locationId || '', p])
    );

    let reviewsNew = 0;
    let reviewsDuplicate = 0;
    const businessesUpdated = new Set<string>();

    // Process reviews for each location
    for (const locationId of uniqueLocationIds) {
      const profile = profileMap.get(locationId);
      if (!profile) {
        console.log(`⚠️  No profile found for locationId ${locationId}, skipping...`);
        continue;
      }

      const locationReviews = rawData.filter((r) => (r.locationId || r.tripAdvisorLocationId) === locationId);
      console.log(`Processing ${locationReviews.length} reviews for location ${locationId}`);

      for (const review of locationReviews) {
        const reviewDate = review.publishedDate ? new Date(review.publishedDate) : null;

        // Skip if older than last known review (deduplication)
        if (!isInitial && profile.lastReviewDate && reviewDate && reviewDate <= profile.lastReviewDate) {
          reviewsDuplicate++;
          continue;
        }

        // Check if metadata exists
        const existingMetadata = await prisma.reviewMetadata.findFirst({
          where: {
            externalId: review.id,
            source: 'TRIPADVISOR',
          },
        });

        // Upsert review metadata
        const reviewMetadata = await prisma.reviewMetadata.upsert({
          where: {
            externalId_source: {
              externalId: review.id,
              source: 'TRIPADVISOR',
            },
          },
          create: {
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
          update: {
            text: review.text || undefined,
            reply: review.responseFromOwnerText || null,
            replyDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
            hasReply: !!review.responseFromOwnerText,
            scrapedAt: new Date(),
          },
        });

        // Upsert TripAdvisor review using reviewMetadataId as unique identifier
        await prisma.tripAdvisorReview.upsert({
          where: { reviewMetadataId: reviewMetadata.id },
          create: {
            businessProfile: {
              connect: { id: profile.id },
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
            locationId: review.locationId || profile.locationId,
            businessName: review.businessName || profile.name,
            businessType: review.businessType || profile.type,
            scrapedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          update: {
            text: review.text || undefined,
            helpfulVotes: review.helpfulVotes || 0,
            responseFromOwnerText: review.responseFromOwnerText || null,
            responseFromOwnerDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
            hasOwnerResponse: !!review.responseFromOwnerText,
            scrapedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Track if this was a new review or an update
        if (existingMetadata) {
          reviewsDuplicate++;
        } else {
          reviewsNew++;
        }

        businessesUpdated.add(profile.id);
      }
    }

    // Update lastScrapedAt and lastReviewDate for all affected profiles
    for (const businessId of businessesUpdated) {
      const latestReview = await prisma.tripAdvisorReview.findFirst({
        where: { businessProfileId: businessId },
        orderBy: { publishedDate: 'desc' },
        select: { publishedDate: true },
      });

      await prisma.tripAdvisorBusinessProfile.update({
        where: { id: businessId },
        data: {
          lastScrapedAt: new Date(),
          lastReviewDate: latestReview?.publishedDate || new Date(),
        },
      });

      // Analytics update removed - analytics now computed on-demand via tRPC
      // await this.tripAdvisorAnalytics.processReviewsAndUpdateDashboard(businessId);
    }

    console.log(
      `✅ TripAdvisor: ${reviewsNew} new, ${reviewsDuplicate} duplicates, ${businessesUpdated.size} businesses updated`
    );

    // Send notifications for negative and urgent reviews
    if (reviewsNew > 0) {
      const newReviewsData = await prisma.tripAdvisorReview.findMany({
        where: {
          businessProfileId: { in: Array.from(businessesUpdated) },
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
            businessProfileId: uniqueLocationIds[0],
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
            businessProfileId: uniqueLocationIds[0],
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
   * Transform Booking review from Apify format to expected format
   */
  private transformBookingReviewFromApify(apifyReview: any): any {
    // Extract sub-ratings from hotelRatingScores array
    const getRating = (codeName: string): number | null => {
      const score = apifyReview.hotelRatingScores?.find((s: any) => s.codeName === codeName);
      return score ? parseFloat(score.score) : null;
    };

    // Map travelerType to guestType enum
    const mapGuestType = (travelerType: string): string => {
      const typeMap: Record<string, string> = {
        'Couple': 'COUPLE',
        'Family': 'FAMILY_WITH_YOUNG_CHILDREN', // Default to young children as generic family
        'Group': 'GROUP_OF_FRIENDS',
        'Solo traveler': 'SOLO',
        'Business': 'BUSINESS',
      };
      return typeMap[travelerType] || 'OTHER';
    };

    // Combine liked and disliked text for full review text
    const reviewText = [
      apifyReview.likedText ? `What I liked: ${apifyReview.likedText}` : null,
      apifyReview.dislikedText ? `What I disliked: ${apifyReview.dislikedText}` : null,
    ].filter(Boolean).join('\n\n') || null;

    return {
      // Map Apify fields to expected fields
      fid: apifyReview.id,
      reviewTitle: apifyReview.reviewTitle,
      reviewText,
      rating: apifyReview.rating,
      reviewDate: apifyReview.reviewDate,
      stayDate: apifyReview.checkInDate,
      userId: null, // Not provided by Apify
      userName: apifyReview.userName,
      userNationality: apifyReview.userLocation,
      lengthOfStay: apifyReview.numberOfNights,
      roomType: apifyReview.roomInfo,
      guestType: mapGuestType(apifyReview.travelerType),
      likedMost: apifyReview.likedText,
      dislikedMost: apifyReview.dislikedText,
      // Extract sub-ratings
      cleanlinessRating: getRating('hotel_clean'),
      comfortRating: getRating('hotel_comfort'),
      locationRating: getRating('hotel_location'),
      facilitiesRating: getRating('hotel_services'),
      staffRating: getRating('hotel_staff'),
      valueForMoneyRating: getRating('hotel_value'),
      wifiRating: null, // Not commonly in Apify data
      responseFromOwnerText: apifyReview.propertyResponse,
      responseFromOwnerDate: null, // Not provided separately in Apify data
      isVerifiedStay: true, // Booking.com reviews are typically verified
      url: apifyReview.startUrl,
      bookingUrl: apifyReview.startUrl,
      // Keep original for reference
      _original: apifyReview,
    };
  }

  /**
   * Process Booking reviews (Booking.com Reviews Scraper output)
   * Handles multiple hotel URLs in single dataset
   */
  private async processBookingReviews(
    teamId: string | null,
    rawData: any[], // External untyped data from Apify
    isInitial: boolean
  ): Promise<Omit<SyncResult, 'processingTimeMs'>> {
    const teamInfo = teamId ? `team ${teamId}` : 'all teams';
    console.log(`🏨 Processing Booking.com reviews for ${teamInfo}...`);

    // Get unique hotel IDs from dataset (more reliable than URLs)
    const uniqueHotelIds = [...new Set(rawData.map((r) => r.hotelId).filter(Boolean))];
    console.log(`Found ${uniqueHotelIds.length} unique hotel(s)`);

    // Fetch all business profiles - filter by team if provided (through businessLocation relation)
    const whereClause: Prisma.BookingBusinessProfileWhereInput = {
      hotelId: { in: uniqueHotelIds.map(String) }, // Match by hotelId instead of URL
      ...(teamId && {
        businessLocation: {
          teamId
        }
      }),
    };

    const businessProfiles = await prisma.bookingBusinessProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        hotelId: true,
        bookingUrl: true,
        lastReviewDate: true,
        businessLocation: {
          select: {
            teamId: true
          }
        }
      },
    });
    const profileMap = new Map<string, { id: string; hotelId: string | null; bookingUrl: string; lastReviewDate: Date | null; businessLocation: { teamId: string } }>(
      businessProfiles.map((p) => [p.hotelId || '', p])
    );

    let reviewsNew = 0;
    let reviewsDuplicate = 0;
    const businessesUpdated = new Set<string>();

    // Process reviews for each hotel
    for (const hotelId of uniqueHotelIds) {
      const profile = profileMap.get(String(hotelId));
      if (!profile) {
        console.log(`⚠️  No profile found for hotelId ${hotelId}, skipping...`);
        continue;
      }

      const hotelReviews = rawData.filter((r) => r.hotelId === hotelId);
      console.log(`Processing ${hotelReviews.length} reviews for hotel ${hotelId}`);

      for (const apifyReview of hotelReviews) {
        // Transform Apify format to expected format
        const review = this.transformBookingReviewFromApify(apifyReview);

        const reviewDate = review.reviewDate ? new Date(review.reviewDate) : null;

        // Skip if older than last known review (deduplication)
        if (!isInitial && profile.lastReviewDate && reviewDate && reviewDate <= profile.lastReviewDate) {
          reviewsDuplicate++;
          continue;
        }

        // Check if metadata exists
        const existingMetadata = await prisma.reviewMetadata.findFirst({
          where: {
            externalId: review.fid,
            source: 'BOOKING',
          },
        });

        // Upsert review metadata
        const reviewMetadata = await prisma.reviewMetadata.upsert({
          where: {
            externalId_source: {
              externalId: review.fid,
              source: 'BOOKING',
            },
          },
          create: {
            externalId: review.fid,
            source: 'BOOKING',
            author: review.userName || 'Anonymous',
            authorImage: apifyReview.userAvatar || null,
            rating: parseFloat(review.rating) || 0,
            text: review.reviewText || null,
            date: reviewDate || new Date(),
            photoCount: apifyReview.images?.length || 0,
            photoUrls: apifyReview.images || [],
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
            language: apifyReview.reviewLanguage || 'en',
            scrapedAt: new Date(),
            sourceUrl: review.url || null,
          },
          update: {
            text: review.reviewText || undefined,
            reply: review.responseFromOwnerText || null,
            replyDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
            hasReply: !!review.responseFromOwnerText,
            scrapedAt: new Date(),
          },
        });

        // Upsert Booking review using reviewMetadataId as unique identifier
        await prisma.bookingReview.upsert({
          where: { reviewMetadataId: reviewMetadata.id },
          create: {
            businessProfile: {
              connect: { id: profile.id },
            },
            reviewMetadata: {
              connect: { id: reviewMetadata.id },
            },
            bookingReviewId: review.fid || null,
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
          },
          update: {
            text: review.reviewText || undefined,
            responseFromOwnerText: review.responseFromOwnerText || null,
            responseFromOwnerDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : null,
            hasOwnerResponse: !!review.responseFromOwnerText,
            scrapedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Track if this was a new review or an update
        if (existingMetadata) {
          reviewsDuplicate++;
        } else {
          reviewsNew++;
        }

        businessesUpdated.add(profile.id);
      }
    }

    // Update lastScrapedAt and lastReviewDate for all affected profiles
    for (const businessId of businessesUpdated) {
      const latestReview = await prisma.bookingReview.findFirst({
        where: { businessProfileId: businessId },
        orderBy: { publishedDate: 'desc' },
        select: { publishedDate: true },
      });

      await prisma.bookingBusinessProfile.update({
        where: { id: businessId },
        data: {
          lastScrapedAt: new Date(),
          lastReviewDate: latestReview?.publishedDate || new Date(),
        },
      });

      // Analytics update removed - analytics now computed on-demand via tRPC
      // await this.bookingAnalytics.processReviewsAndUpdateDashboard(businessId);
    }

    console.log(
      `✅ Booking: ${reviewsNew} new, ${reviewsDuplicate} duplicates, ${businessesUpdated.size} businesses updated`
    );

    // Send notifications for negative and urgent reviews
    if (reviewsNew > 0) {
      const newReviewsData = await prisma.bookingReview.findMany({
        where: {
          businessProfileId: { in: Array.from(businessesUpdated) },
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
          title: `<p><strong>${negativeReviews.length}</strong> new negative Booking review${negativeReviews.length > 1 ? 's' : ''} received</p>`,
          category: 'Reviews',
          metadata: {
            platform: 'booking',
            businessProfileId: String(uniqueHotelIds[0]),
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
          title: `<p><strong>URGENT:</strong> ${urgentReviews.length} Booking review${urgentReviews.length > 1 ? 's' : ''} require immediate response</p>`,
          category: 'Reviews',
          metadata: {
            platform: 'booking',
            businessProfileId: String(uniqueHotelIds[0]),
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

