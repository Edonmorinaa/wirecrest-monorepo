import type {
  GoogleBusinessProfile,
  GoogleReview,
  ReviewMetadata,
  GoogleBusinessMetadata,
  FacebookBusinessProfile,
  FacebookReview,
  TripAdvisorBusinessProfile,
  TripAdvisorReview,
  BookingBusinessProfile,
  BookingReview,
  InstagramBusinessProfile,
  TikTokBusinessProfile,
} from "@prisma/client";
import { MarketPlatform } from "@wirecrest/db";
import { prisma } from "@wirecrest/db";
import { TeamService } from "./teamService";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger";
import type {
  GoogleReviewWithMetadata,
  FacebookReviewWithMetadata,
  TripAdvisorReviewWithMetadata,
  BookingReviewWithMetadata,
} from "../types/extended-types";
import { reviewAnalysisService } from "../services/analysis/ReviewAnalysisService";

// Type definitions for review metadata insertion
type ReviewMetadataInsertData = {
  id: string;
  externalId: string;
  source: MarketPlatform;
  author: string;
  authorImage?: string | null;
  rating: number;
  text?: string | null;
  date: Date;
  photoCount?: number;
  photoUrls?: string[];
  reply?: string | null;
  replyDate?: Date | null;
  hasReply?: boolean;
  language?: string | null;
  scrapedAt: Date;
  sourceUrl?: string | null;
  sentiment?: number | null;
  keywords?: string[];
  topics?: string[];
  emotional?: string | null;
  actionable?: boolean;
  responseUrgency?: number | null;
  competitorMentions?: string[];
  comparativePositive?: boolean | null;
  isRead?: boolean;
  isImportant?: boolean;
  labels?: string[];
  createdAt: Date;
  updatedAt: Date;
};

interface GoogleReviewInsertData {
  id: string;
  businessProfileId: string;
  reviewMetadataId: string;
  reviewerId?: string | null;
  reviewerUrl?: string | null;
  name: string;
  reviewerNumberOfReviews?: number;
  isLocalGuide?: boolean;
  reviewerPhotoUrl?: string | null;
  text?: string | null;
  textTranslated?: string | null;
  publishAt?: string | null;
  publishedAtDate: Date;
  likesCount?: number;
  reviewUrl?: string | null;
  reviewOrigin?: string | null;
  stars: number;
  rating?: number | null;
  responseFromOwnerDate?: Date | null;
  responseFromOwnerText?: string | null;
  reviewImageUrls?: string[];
  reviewContext?: any;
  reviewDetailedRating?: any;
  visitedIn?: string | null;
  originalLanguage?: string | null;
  translatedLanguage?: string | null;
  isAdvertisement?: boolean;
  placeId: string;
  location?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
  state?: string | null;
  countryCode?: string | null;
  categoryName?: string | null;
  categories?: string[];
  title?: string | null;
  totalScore?: number | null;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  reviewsCount?: number | null;
  url?: string | null;
  price?: string | null;
  cid?: string | null;
  fid?: string | null;
  imageUrl?: string | null;
  scrapedAt: Date;
  language?: string | null;
}

export class DatabaseService {
  private teamService: TeamService;

  constructor() {
    this.teamService = new TeamService();
  }

  // Input validation methods
  private validateBusinessProfileId(businessProfileId: string): void {
    if (!businessProfileId || typeof businessProfileId !== "string") {
      throw new Error("businessProfileId is required and must be a string");
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessProfileId)) {
      throw new Error("businessProfileId must be a valid UUID");
    }
  }

  private validatePlaceId(placeId: string): void {
    if (!placeId || typeof placeId !== "string") {
      throw new Error("placeId is required and must be a string");
    }

    if (placeId.length < 10 || placeId.length > 255) {
      throw new Error("placeId must be between 10 and 255 characters");
    }
  }

  private validateReviewData(
    review: unknown,
  ): asserts review is Record<string, unknown> {
    if (!review || typeof review !== "object") {
      throw new Error("Review data must be an object");
    }

    const r = review as Record<string, unknown>;

    // Validate required fields
    if (!r.id && !r.reviewId) {
      throw new Error("Review must have either id or reviewId");
    }

    if (!r.name && !r.userName && !r.author) {
      throw new Error("Review must have a name, userName, or author field");
    }

    if (!r.publishedAtDate && !r.date) {
      throw new Error("Review must have either publishedAtDate or date field");
    }

    // Validate text length
    if (r.text && typeof r.text === "string" && r.text.length > 10000) {
      throw new Error("Review text cannot exceed 10,000 characters");
    }
  }

  private sanitizeText(
    text: string | undefined | null,
    maxLength: number = 5000,
  ): string | null {
    if (!text) return null;

    const sanitized = text.trim().replace(/[\x00-\x1F\x7F]/g, "");
    return sanitized.length > maxLength
      ? sanitized.substring(0, maxLength) + "..."
      : sanitized;
  }

  private createRequestContext(businessProfileId?: string, placeId?: string) {
    return {
      businessId: businessProfileId,
      placeId: placeId,
    };
  }

  /**
   * Get businesses needing review update in batches with team limits
   */
  async getBusinessesNeedingReviewUpdateBatch(
    batchSize: number = 30,
    offset: number = 0,
  ): Promise<GoogleBusinessProfile[]> {
    try {
      const businesses = await prisma.googleBusinessProfile.findMany({
        where: {
          userRatingCount: {
            not: null,
          },
          metadata: {
            isActive: true,
            OR: [{ nextUpdateAt: null }, { nextUpdateAt: { lte: new Date() } }],
          },
        },
        include: {
          metadata: true,
          team: true,
        },
        orderBy: {
          metadata: {
            nextUpdateAt: "asc",
          },
        },
        take: batchSize,
        skip: offset,
      });

      return businesses;
    } catch (error) {
      console.error("Error getting businesses needing update:", error);
      return [];
    }
  }

  /**
   * Get total count of businesses needing update
   */
  async getBusinessesNeedingUpdateCount(): Promise<number> {
    try {
      const count = await prisma.googleBusinessProfile.count({
        where: {
          userRatingCount: {
            not: null,
          },
          metadata: {
            isActive: true,
            OR: [{ nextUpdateAt: null }, { nextUpdateAt: { lte: new Date() } }],
          },
        },
      });

      return count;
    } catch (error) {
      console.error("Error getting businesses count:", error);
      return 0;
    }
  }

  /**
   * Initialize a business for first-time review scraping
   */
  async initializeBusiness(
    placeId: string,
    teamId: string,
  ): Promise<{ success: boolean; message: string; businessId?: string }> {
    try {
      // Check if team can add more businesses
      const canAdd = await this.teamService.canTeamAddBusiness(teamId);
      if (!canAdd) {
        return {
          success: false,
          message:
            "Team has reached maximum business limit or subscription is inactive",
        };
      }

      // Check if business already exists
      const existingBusiness = await prisma.googleBusinessProfile.findFirst({
        where: { placeId },
        select: { id: true },
      });

      if (existingBusiness) {
        return {
          success: false,
          message: "Business already exists",
          businessId: existingBusiness.id,
        };
      }

      // Get team limits
      const teamLimits = await this.teamService.getTeamLimits(teamId);
      if (!teamLimits) {
        return { success: false, message: "Invalid team" };
      }

      // Create business profile placeholder (will be filled by scraping)
      const businessData = await prisma.googleBusinessProfile.create({
        data: {
          teamId,
          placeId,
          displayName: "Pending Initialization",
        },
        select: { id: true },
      });

      // Create metadata with tenant-specific frequency
      await prisma.googleBusinessMetadata.create({
        data: {
          businessProfileId: businessData.id,
          updateFrequencyMinutes: teamLimits.updateFrequencyMinutes,
          nextUpdateAt: new Date(),
          lastUpdateAt: new Date(),
          isActive: true,
        },
      });

      return {
        success: true,
        message: "Business initialized successfully",
        businessId: businessData.id,
      };
    } catch (error) {
      console.error("Error initializing business:", error);
      return { success: false, message: "Internal error occurred" };
    }
  }

  /**
   * Update business metadata with tenant-specific frequency after scraping
   */
  async updateBusinessScrapedAt(placeId: string): Promise<void> {
    try {
      const business = await prisma.googleBusinessProfile.findFirst({
        where: { placeId },
        select: { id: true, metadata: true },
      });

      if (!business || !business.metadata) {
        throw new Error(
          `Business or metadata not found for placeId: ${placeId}`,
        );
      }

      const now = new Date();
      const nextUpdate = new Date(
        now.getTime() + business.metadata.updateFrequencyMinutes * 60 * 1000,
      );

      await prisma.googleBusinessMetadata.update({
        where: { businessProfileId: business.id },
        data: {
          lastUpdateAt: now,
          nextUpdateAt: nextUpdate,
        },
      });
    } catch (error) {
      console.error("Error updating business scrapedAt:", error);
      throw error;
    }
  }

  /**
   * Get the most recent review date for a business (for filtering new reviews)
   */
  async getMostRecentReviewDate(placeId: string): Promise<Date | null> {
    try {
      const business = await prisma.googleBusinessProfile.findFirst({
        where: { placeId },
        select: { id: true },
      });

      if (!business) {
        return null;
      }

      const mostRecentReview = await prisma.googleReview.findFirst({
        where: { businessProfileId: business.id },
        orderBy: { publishedAtDate: "desc" },
        select: { publishedAtDate: true },
      });

      return mostRecentReview?.publishedAtDate || null;
    } catch (error) {
      console.error("Error getting most recent review date:", error);
      return null;
    }
  }

  /**
   * Save reviews with filtering for recent reviews (5 days) and tenant limits
   */
  async saveReviews(
    placeId: string,
    reviews: GoogleReviewWithMetadata[],
    isInitialization: boolean = false,
  ): Promise<void> {
    try {
      // Get business and team info
      const businessData = await prisma.googleBusinessProfile.findFirst({
        where: { placeId },
        select: { id: true, teamId: true },
      });

      if (!businessData) {
        throw new Error(`Business with placeId ${placeId} does not exist`);
      }

      const { id: businessId, teamId } = businessData;

      // Get team limits
      const teamLimits = await this.teamService.getTeamLimits(teamId);
      const maxReviewsPerBusiness = teamLimits?.maxReviewsPerBusiness || 1000;

      // Filter reviews based on whether this is initialization or polling
      let filteredReviews = reviews;

      if (!isInitialization) {
        // For polling, only get reviews from last 5 days
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        filteredReviews = reviews.filter(
          (review) => review.publishedAtDate >= fiveDaysAgo,
        );
      }

      // Apply tenant limits
      if (
        maxReviewsPerBusiness &&
        filteredReviews.length > maxReviewsPerBusiness
      ) {
        // Sort by date descending and take the most recent reviews
        filteredReviews = filteredReviews
          .sort(
            (a, b) => b.publishedAtDate.getTime() - a.publishedAtDate.getTime(),
          )
          .slice(0, maxReviewsPerBusiness);
      }

      console.log(
        `Processing ${filteredReviews.length} reviews for business ${placeId} (${isInitialization ? "initialization" : "polling"})`,
      );

      // Process each review
      for (const review of filteredReviews) {
        try {
          // Check if review already exists
          const existingReview = await prisma.googleReview.findFirst({
            where: {
              reviewerId: review.reviewerId,
              placeId: placeId,
            },
            select: { id: true, reviewMetadataId: true },
          });

          if (existingReview) {
            // Review exists, update the metadata
            await prisma.reviewMetadata.update({
              where: { id: existingReview.reviewMetadataId },
              data: {
                text: review.text || "",
                rating: review.stars || review.rating || 0,
                reply: review.responseFromOwnerText || "",
                replyDate: review.responseFromOwnerDate,
                hasReply: !!review.responseFromOwnerText,
                author: review.name,
                authorImage: review.reviewerPhotoUrl,
                date: review.publishedAtDate,
                photoCount: (review.reviewImageUrls || []).length,
                photoUrls: review.reviewImageUrls || [],
                sentiment: review.reviewMetadata?.sentiment || null,
                keywords: review.reviewMetadata?.keywords || [],
                topics: review.reviewMetadata?.topics || [],
                emotional: review.reviewMetadata?.emotional || null,
                actionable: review.reviewMetadata?.actionable || false,
                responseUrgency: review.reviewMetadata?.responseUrgency || null,
                competitorMentions:
                  review.reviewMetadata?.competitorMentions || [],
                comparativePositive:
                  review.reviewMetadata?.comparativePositive || null,
                isRead: review.reviewMetadata?.isRead || false,
                isImportant: review.reviewMetadata?.isImportant || false,
                labels: review.reviewMetadata?.labels || [],
                language: review.language || "en",
                scrapedAt: review.scrapedAt,
                sourceUrl: review.reviewUrl || "",
                updatedAt: new Date(),
              },
            });

            // Update the existing review
            await prisma.googleReview.update({
              where: { id: existingReview.id },
              data: {
                text: review.text || "",
                rating: review.rating || null,
                responseFromOwnerText: review.responseFromOwnerText || "",
                responseFromOwnerDate: review.responseFromOwnerDate,
                reviewImageUrls: review.reviewImageUrls || [],
                scrapedAt: review.scrapedAt,
                language: review.language || "en",
              },
            });
          } else {
            // Review doesn't exist, create new metadata and review
            const metadataData = await prisma.reviewMetadata.create({
              data: {
                id: randomUUID(),
                externalId: review.reviewerId,
                source: "GOOGLE_MAPS",
                author: review.name,
                authorImage: review.reviewerPhotoUrl,
                rating: review.stars || review.rating || 0,
                text: review.text || "",
                date: review.publishedAtDate,
                photoCount: (review.reviewImageUrls || []).length,
                photoUrls: review.reviewImageUrls || [],
                reply: review.responseFromOwnerText || "",
                replyDate: review.responseFromOwnerDate,
                hasReply: !!review.responseFromOwnerText,
                sentiment: review.reviewMetadata?.sentiment || null,
                keywords: review.reviewMetadata?.keywords || [],
                topics: review.reviewMetadata?.topics || [],
                emotional: review.reviewMetadata?.emotional || null,
                actionable: review.reviewMetadata?.actionable || false,
                responseUrgency: review.reviewMetadata?.responseUrgency || null,
                competitorMentions:
                  review.reviewMetadata?.competitorMentions || [],
                comparativePositive:
                  review.reviewMetadata?.comparativePositive || null,
                isRead: review.reviewMetadata?.isRead || false,
                isImportant: review.reviewMetadata?.isImportant || false,
                labels: review.reviewMetadata?.labels || [],
                language: review.language || "en",
                scrapedAt: review.scrapedAt,
                sourceUrl: review.reviewUrl || "",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            // Create new review
            await prisma.googleReview.create({
              data: {
                businessProfileId: businessId,
                reviewMetadataId: metadataData.id,
                reviewerId: review.reviewerId || `reviewer-${randomUUID()}`,
                reviewerUrl: review.reviewerUrl || "",
                name: review.name,
                reviewerNumberOfReviews: review.reviewerNumberOfReviews || 0,
                isLocalGuide: review.isLocalGuide || false,
                reviewerPhotoUrl: review.reviewerPhotoUrl || "",
                text: review.text || "",
                textTranslated: review.textTranslated || "",
                publishAt: review.publishAt || "",
                publishedAtDate: review.publishedAtDate,
                likesCount: review.likesCount || 0,
                reviewUrl: review.reviewUrl || "",
                reviewOrigin: review.reviewOrigin || "GOOGLE_MAPS",
                stars: review.stars || 0,
                rating: review.rating || null,
                responseFromOwnerDate: review.responseFromOwnerDate,
                responseFromOwnerText: review.responseFromOwnerText || "",
                reviewImageUrls: review.reviewImageUrls || [],
                reviewContext: review.reviewContext || {},
                reviewDetailedRating: review.reviewDetailedRating || {},
                visitedIn: review.visitedIn || null,
                originalLanguage: review.originalLanguage || null,
                translatedLanguage: review.translatedLanguage || null,
                isAdvertisement: review.isAdvertisement || false,
                placeId: review.placeId,
                location: review.location
                  ? JSON.stringify(review.location).substring(0, 500)
                  : null,
                address: this.sanitizeText(review.address as string, 255),
                neighborhood: this.sanitizeText(
                  review.neighborhood as string,
                  100,
                ),
                street: this.sanitizeText(review.street as string, 255),
                city: this.sanitizeText(review.city as string, 100),
                postalCode: this.sanitizeText(review.postalCode as string, 20),
                state: this.sanitizeText(review.state as string, 100),
                countryCode: this.sanitizeText(
                  review.countryCode as string,
                  10,
                ),
                categoryName: this.sanitizeText(
                  review.categoryName as string,
                  100,
                ),
                categories: review.categories || [],
                title: this.sanitizeText(review.title as string, 255),
                totalScore: review.totalScore || null,
                permanentlyClosed: review.permanentlyClosed || false,
                temporarilyClosed: review.temporarilyClosed || false,
                reviewsCount: review.reviewsCount || null,
                url: review.url || null,
                price: this.sanitizeText(review.price as string, 50),
                cid: this.sanitizeText(review.cid as string, 100),
                fid: this.sanitizeText(review.fid as string, 100),
                imageUrl: this.sanitizeText(review.imageUrl as string, 500),
                scrapedAt: review.scrapedAt,
                language: review.language || "en",
              },
            });
          }
        } catch (reviewError) {
          console.error("Error processing individual review:", reviewError);
          // Continue with next review
        }
      }

      // Update business metadata after successful review processing
      await this.updateBusinessScrapedAt(placeId);
    } catch (error) {
      console.error("Error saving reviews:", error);
      throw error;
    }
  }

  async getBusinessById(
    businessId: string,
  ): Promise<GoogleBusinessProfile | null> {
    try {
      const data = await prisma.googleBusinessProfile.findUnique({
        where: { id: businessId },
      });

      return data;
    } catch (error) {
      console.error("Error getting business by id:", error);
      return null;
    }
  }

  async getBusinessByPlaceId(
    placeId: string,
  ): Promise<GoogleBusinessProfile | null> {
    try {
      const data = await prisma.googleBusinessProfile.findFirst({
        where: { placeId },
      });

      return data;
    } catch (error) {
      console.error("Error getting business by placeId:", error);
      return null;
    }
  }

  /**
   * Saves Google reviews along with their metadata, ensuring correct linking.
   * Handles creation of ReviewMetadata and GoogleReview records.
   */
  async saveGoogleReviewsWithMetadata(
    businessProfileId: string,
    placeId: string,
    reviewsFromPayload: unknown[],
    isInitialization: boolean = false,
  ): Promise<{
    savedCount: number;
    updatedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const context = this.createRequestContext(businessProfileId, placeId);
    const childLogger = logger.child(context);

    // Input validation
    try {
      this.validateBusinessProfileId(businessProfileId);
      this.validatePlaceId(placeId);

      if (!Array.isArray(reviewsFromPayload)) {
        throw new Error("reviewsFromPayload must be an array");
      }

      if (reviewsFromPayload.length === 0) {
        childLogger.warn("No reviews provided to save");
        return { savedCount: 0, updatedCount: 0, failedCount: 0, errors: [] };
      }

      if (reviewsFromPayload.length > 1000) {
        throw new Error("Cannot process more than 1000 reviews at once");
      }
    } catch (error) {
      childLogger.error("Input validation failed", error as Error);
      return {
        savedCount: 0,
        updatedCount: 0,
        failedCount: 1,
        errors: [(error as Error).message],
      };
    }

    childLogger.info(
      `Starting to save ${reviewsFromPayload.length} Google reviews`,
      {
        reviewCount: reviewsFromPayload.length,
        isInitialization,
      },
    );

    let savedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Process each review
    for (const [index, reviewPayload] of reviewsFromPayload.entries()) {
      try {
        this.validateReviewData(reviewPayload);

        const review = reviewPayload as any;
        const reviewId =
          review.reviewId || review.id || `review-${randomUUID()}`;

        // Check if review already exists
        const existingReview = await prisma.googleReview.findFirst({
          where: {
            reviewerId: review.reviewerId || review.userId,
            placeId: placeId,
          },
          select: { id: true, reviewMetadataId: true },
        });

        if (existingReview) {
          // Review exists, update metadata
          await prisma.reviewMetadata.update({
            where: { id: existingReview.reviewMetadataId },
            data: {
              text: this.sanitizeText(review.text),
              rating: review.rating || review.stars || 0,
              reply: this.sanitizeText(review.responseFromOwnerText),
              replyDate: review.responseFromOwnerDate
                ? new Date(review.responseFromOwnerDate)
                : null,
              hasReply: !!review.responseFromOwnerText,
              author: this.sanitizeText(review.name || review.author, 255),
              authorImage: this.sanitizeText(review.reviewerPhotoUrl, 500),
              date: new Date(review.publishedAtDate || review.date),
              photoCount: (review.reviewImageUrls || []).length,
              photoUrls: review.reviewImageUrls || [],
              sentiment: review.sentiment || null,
              keywords: review.keywords || [],
              topics: review.topics || [],
              emotional: review.emotional || null,
              actionable: review.actionable || false,
              responseUrgency: review.responseUrgency || null,
              competitorMentions: review.competitorMentions || [],
              comparativePositive: review.comparativePositive || null,
              isRead: review.isRead || false,
              isImportant: review.isImportant || false,
              labels: review.labels || [],
              language: review.language || "en",
              scrapedAt: new Date(),
              sourceUrl: this.sanitizeText(review.reviewUrl, 500),
              updatedAt: new Date(),
            },
          });

          // Update the review itself
          await prisma.googleReview.update({
            where: { id: existingReview.id },
            data: {
              text: this.sanitizeText(review.text),
              rating: review.rating || null,
              responseFromOwnerText: this.sanitizeText(
                review.responseFromOwnerText,
              ),
              responseFromOwnerDate: review.responseFromOwnerDate
                ? new Date(review.responseFromOwnerDate)
                : null,
              reviewImageUrls: review.reviewImageUrls || [],
              scrapedAt: new Date(),
              language: review.language || "en",
            },
          });

          updatedCount++;
        } else {
          // Review doesn't exist, create new metadata first
          const newMeta = await prisma.reviewMetadata.create({
            data: {
              id: randomUUID(),
              externalId:
                review.reviewerId || review.userId || `user-${randomUUID()}`,
              source: "GOOGLE_MAPS",
              author: this.sanitizeText(review.name || review.author, 255),
              authorImage: this.sanitizeText(review.reviewerPhotoUrl, 500),
              rating: review.rating || review.stars || 0,
              text: this.sanitizeText(review.text),
              date: new Date(review.publishedAtDate || review.date),
              photoCount: (review.reviewImageUrls || []).length,
              photoUrls: review.reviewImageUrls || [],
              reply: this.sanitizeText(review.responseFromOwnerText),
              replyDate: review.responseFromOwnerDate
                ? new Date(review.responseFromOwnerDate)
                : null,
              hasReply: !!review.responseFromOwnerText,
              sentiment: review.sentiment || null,
              keywords: review.keywords || [],
              topics: review.topics || [],
              emotional: review.emotional || null,
              actionable: review.actionable || false,
              responseUrgency: review.responseUrgency || null,
              competitorMentions: review.competitorMentions || [],
              comparativePositive: review.comparativePositive || null,
              isRead: review.isRead || false,
              isImportant: review.isImportant || false,
              labels: review.labels || [],
              language: review.language || "en",
              scrapedAt: new Date(),
              sourceUrl: this.sanitizeText(review.reviewUrl, 500),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Create the Google review
          await prisma.googleReview.create({
            data: {
              businessProfileId,
              reviewMetadataId: newMeta.id,
              reviewerId:
                review.reviewerId ||
                review.userId ||
                `reviewer-${randomUUID()}`,
              reviewerUrl: this.sanitizeText(review.reviewerUrl, 500),
              name: this.sanitizeText(review.name || review.author, 255),
              reviewerNumberOfReviews: review.reviewerNumberOfReviews || 0,
              isLocalGuide: review.isLocalGuide || false,
              reviewerPhotoUrl: this.sanitizeText(review.reviewerPhotoUrl, 500),
              text: this.sanitizeText(review.text),
              textTranslated: this.sanitizeText(review.textTranslated),
              publishAt: this.sanitizeText(review.publishAt, 100),
              publishedAtDate: new Date(review.publishedAtDate || review.date),
              likesCount: review.likesCount || 0,
              reviewUrl: this.sanitizeText(review.reviewUrl, 500),
              reviewOrigin: review.reviewOrigin || "GOOGLE_MAPS",
              stars: review.stars || review.rating || 0,
              rating: review.rating || null,
              responseFromOwnerDate: review.responseFromOwnerDate
                ? new Date(review.responseFromOwnerDate)
                : null,
              responseFromOwnerText: this.sanitizeText(
                review.responseFromOwnerText,
              ),
              reviewImageUrls: review.reviewImageUrls || [],
              reviewContext: review.reviewContext || {},
              reviewDetailedRating: review.reviewDetailedRating || {},
              visitedIn: this.sanitizeText(review.visitedIn, 100),
              originalLanguage: this.sanitizeText(review.originalLanguage, 10),
              translatedLanguage: this.sanitizeText(
                review.translatedLanguage,
                10,
              ),
              isAdvertisement: review.isAdvertisement || false,
              placeId,
              location: review.location
                ? JSON.stringify(review.location).substring(0, 500)
                : null,
              address: this.sanitizeText(review.address, 255),
              neighborhood: this.sanitizeText(review.neighborhood, 100),
              street: this.sanitizeText(review.street, 255),
              city: this.sanitizeText(review.city, 100),
              postalCode: this.sanitizeText(review.postalCode, 20),
              state: this.sanitizeText(review.state, 100),
              countryCode: this.sanitizeText(review.countryCode, 10),
              categoryName: this.sanitizeText(review.categoryName, 100),
              categories: review.categories || [],
              title: this.sanitizeText(review.title, 255),
              totalScore: review.totalScore || null,
              permanentlyClosed: review.permanentlyClosed || false,
              temporarilyClosed: review.temporarilyClosed || false,
              reviewsCount: review.reviewsCount || null,
              url: this.sanitizeText(review.url, 500),
              price: this.sanitizeText(review.price, 50),
              cid: this.sanitizeText(review.cid, 100),
              fid: this.sanitizeText(review.fid, 100),
              imageUrl: this.sanitizeText(review.imageUrl, 500),
              scrapedAt: new Date(),
              language: review.language || "en",
            },
          });

          savedCount++;
        }
      } catch (error) {
        childLogger.error("Error processing individual review", error as Error);
        errors.push(
          `Error processing review at index ${index}: ${(error as Error).message}`,
        );
        failedCount++;
      }
    }

    const duration = Date.now() - startTime;
    childLogger.info("Completed saving Google reviews", {
      savedCount,
      updatedCount,
      failedCount,
      totalProcessed: savedCount + updatedCount + failedCount,
      duration: `${duration}ms`,
    });

    return { savedCount, updatedCount, failedCount, errors };
  }

  async close(): Promise<void> {
    await this.teamService.close();
    // Prisma client doesn't need explicit closing in this context
  }
}
