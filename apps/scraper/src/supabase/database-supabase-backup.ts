import { 
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
  MarketPlatform
} from '@prisma/client';
import { prisma } from '@wirecrest/db';
import { TeamService } from './teamService';
import { randomUUID } from 'crypto';
import { SentimentAnalyzer } from '../sentimentAnalyzer/sentimentAnalyzer';
import { logger } from '../utils/logger';
import { 
  GoogleReviewWithMetadata,
  FacebookReviewWithMetadata,
  TripAdvisorReviewWithMetadata,
  BookingReviewWithMetadata
} from '../types/extended-types';

// Common words to exclude from keyword analysis
const COMMON_WORDS = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'is', 'it', 'that', 'for', 'on', 'with', 'as', 'at', 'this', 'by', 'from', 'an', 'be', 'or']);

// Business-specific terms and their categories
const BUSINESS_TERMS = {
  service: ['service', 'staff', 'employee', 'server', 'waiter', 'host', 'friendly', 'helpful', 'attentive', 'professional', 'rude', 'slow', 'unhelpful'],
  food: ['food', 'dish', 'meal', 'taste', 'flavor', 'menu', 'delicious', 'fresh', 'quality', 'portion', 'cooked', 'spicy', 'bland'],
  ambiance: ['ambiance', 'atmosphere', 'decor', 'environment', 'setting', 'clean', 'dirty', 'noisy', 'quiet', 'cozy', 'modern', 'traditional'],
  value: ['price', 'value', 'worth', 'expensive', 'cheap', 'affordable', 'overpriced', 'reasonable', 'budget', 'cost'],
  location: ['location', 'place', 'area', 'neighborhood', 'district', 'parking', 'accessible', 'convenient', 'remote'],
  timing: ['wait', 'time', 'quick', 'fast', 'slow', 'busy', 'crowded', 'empty', 'reservation', 'booking'],
  quality: ['quality', 'excellent', 'good', 'bad', 'poor', 'amazing', 'terrible', 'outstanding', 'disappointing'],
  experience: ['experience', 'visit', 'return', 'recommend', 'enjoy', 'disappoint', 'satisfy', 'impress']
};

// Use Prisma types for insert/update data payloads
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
  createdAt: string;
  updatedAt: string;
  // Foreign keys like googleReviewId are handled separately after child record creation
}

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
  reviewContext?: string | null; 
  reviewDetailedRating?: string | null; 
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

interface FacebookReviewInsertData {
  id: string;
  businessProfileId: string;
  reviewMetadataId: string;
  facebookReviewId: string;
  legacyId: string;
  date: Date;
  url: string;
  text?: string | null;
  isRecommended: boolean;
  userId: string;
  userName: string;
  userProfileUrl?: string | null;
  userProfilePic?: string | null;
  likesCount: number;
  commentsCount: number;
  tags: string[];
  facebookPageId: string;
  pageName: string;
  inputUrl: string;
  pageAdLibrary?: any;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface TripAdvisorReviewInsertData {
  id: string;
  businessProfileId: string;
  reviewMetadataId: string;
  tripAdvisorReviewId: string;
  reviewUrl?: string | null;
  title?: string | null;
  text?: string | null;
  rating: number;
  publishedDate: Date;
  visitDate?: Date | null;
  reviewerId: string;
  reviewerName: string;
  reviewerLocation?: string | null;
  reviewerLevel?: string | null;
  reviewerPhotoUrl?: string | null;
  helpfulVotes: number;
  tripType?: string | null;
  roomTip?: string | null;
  responseFromOwnerText?: string | null;
  responseFromOwnerDate?: Date | null;
  hasOwnerResponse: boolean;
  locationId: string;
  businessName?: string | null;
  businessType?: string | null;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DatabaseService {
  private teamService: TeamService;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor() {
    this.teamService = new TeamService();
    this.sentimentAnalyzer = new SentimentAnalyzer(['en']);
  }

  // Input validation methods
  private validateBusinessProfileId(businessProfileId: string): void {
    if (!businessProfileId || typeof businessProfileId !== 'string') {
      throw new Error('businessProfileId is required and must be a string');
    }
    
    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessProfileId)) {
      throw new Error('businessProfileId must be a valid UUID');
    }
  }

  private validatePlaceId(placeId: string): void {
    if (!placeId || typeof placeId !== 'string') {
      throw new Error('placeId is required and must be a string');
    }
    
    if (placeId.length < 10 || placeId.length > 255) {
      throw new Error('placeId must be between 10 and 255 characters');
    }
  }

  private validateReviewData(review: unknown): asserts review is Record<string, unknown> {
    if (!review || typeof review !== 'object') {
      throw new Error('Review data must be an object');
    }
    
    const r = review as Record<string, unknown>;
    
    // Check for review ID - Apify uses 'id' or 'reviewId'
    if (!r.id && !r.reviewId) {
      throw new Error('Review must have a valid id or reviewId');
    }
    
    // Check for reviewer name - can be 'name', 'userName', or 'author'
    if (!r.name && !r.userName && !r.author) {
      throw new Error('Review must have a valid name, userName, or author field');
    }
    
    // Check stars/rating - can be 'stars', 'rating', or 'score'
    const rating = r.stars || r.rating || r.score;
    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      throw new Error('Review rating must be a number between 1 and 5');
    }
    
    if (r.text && typeof r.text !== 'string') {
      throw new Error('Review text must be a string');
    }
    
    if (r.text && typeof r.text === 'string' && r.text.length > 10000) {
      throw new Error('Review text cannot exceed 10,000 characters');
    }
  }

  private sanitizeText(text: string | undefined | null, maxLength: number = 5000): string | null {
    if (!text) return null;
    
    // Remove potentially dangerous content
    const sanitized = String(text)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim();
      
    return sanitized.length > maxLength 
      ? sanitized.substring(0, maxLength) + '...'
      : sanitized;
  }

  private createRequestContext(businessProfileId?: string, placeId?: string) {
    return {
      requestId: randomUUID(),
      businessId: businessProfileId,
      placeId: placeId,
    };
  }

  private async analyzeReview(text?: string, rating?: number): Promise<{ 
    sentiment: number; 
    emotional?: string;
    keywords: string[];
    topics: string[];
    responseUrgency: number;
  }> {
    if (!text) {
      return {
        sentiment: 0,
        emotional: 'neutral',
        keywords: [],
        topics: [],
        responseUrgency: 3
      };
    }

    // Get sentiment score from analyzer
    const sentimentScore = await this.sentimentAnalyzer.analyzeSentiment(text);
    
    // Determine emotional state based on sentiment score and rating
    let emotional: string;
    if (sentimentScore > 0.3) emotional = 'positive';
    else if (sentimentScore < -0.3) emotional = 'negative';
    else emotional = 'neutral';

    // If we have a rating, adjust sentiment based on it
    const finalSentiment = rating ? (sentimentScore + (rating - 3) / 2) / 2 : sentimentScore;

    // Extract keywords using TF-IDF like approach
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !COMMON_WORDS.has(word));

    // Count word frequencies
    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Calculate word importance based on frequency and position
    const wordImportance: { [key: string]: number } = {};
    Object.entries(wordFreq).forEach(([word, freq]) => {
      // Words that appear in business terms get a boost
      const isBusinessTerm = Object.values(BUSINESS_TERMS).some(terms => 
        terms.some(term => word.includes(term) || term.includes(word))
      );
      
      // Words that appear in the first or last sentence get a boost
      const sentences = text.split(/[.!?]+/);
      const isInImportantPosition = sentences[0].includes(word) || sentences[sentences.length - 1].includes(word);
      
      wordImportance[word] = freq * (isBusinessTerm ? 1.5 : 1) * (isInImportantPosition ? 1.3 : 1);
    });

    // Get top keywords
    const keywords = Object.entries(wordImportance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    // Extract topics based on business terms
    const topics = new Set<string>();
    Object.entries(BUSINESS_TERMS).forEach(([topic, terms]) => {
      if (terms.some(term => text.toLowerCase().includes(term))) {
        topics.add(topic);
      }
    });

    // Calculate response urgency on scale 1-10 (integers only)
    let responseUrgency = 3; // Default urgency
    if (rating && rating <= 2) responseUrgency = 10;
    else if (rating && rating === 3) responseUrgency = 7;
    if (sentimentScore < -0.5) responseUrgency = Math.max(responseUrgency, 8);
    if (text.toLowerCase().includes('complaint') || text.toLowerCase().includes('issue')) {
      responseUrgency = Math.max(responseUrgency, 9);
    }

    return {
      sentiment: Number(finalSentiment.toFixed(2)),
      emotional,
      keywords,
      topics: Array.from(topics),
      responseUrgency: responseUrgency
    };
  }

  /**
   * Get businesses needing review update in batches with team limits
   * @param batchSize Maximum number of businesses per batch (default: 30)
   * @param offset Offset for pagination
   */
  async getBusinessesNeedingReviewUpdateBatch(batchSize: number = 30, offset: number = 0): Promise<GoogleBusinessProfile[]> {
    try {
      const businesses = await prisma.googleBusinessProfile.findMany({
        where: {
          userRatingCount: {
            not: null
          },
          metadata: {
            isActive: true,
            OR: [
              { nextUpdateAt: null },
              { nextUpdateAt: { lte: new Date() } }
            ]
          }
        },
        include: {
          metadata: true,
          team: true
        },
        orderBy: {
          metadata: {
            nextUpdateAt: 'asc'
          }
        },
        take: batchSize,
        skip: offset
      });

      return businesses;
    } catch (error) {
      console.error('Error getting businesses needing update:', error);
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
            not: null
          },
          metadata: {
            isActive: true,
            OR: [
              { nextUpdateAt: null },
              { nextUpdateAt: { lte: new Date() } }
            ]
          }
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting businesses count:', error);
      return 0;
    }
  }

  /**
   * Initialize a business for first-time review scraping
   */
  async initializeBusiness(placeId: string, teamId: string): Promise<{ success: boolean; message: string; businessId?: string }> {
    try {
      // Check if team can add more businesses
      const canAdd = await this.teamService.canTeamAddBusiness(teamId);
      if (!canAdd) {
        return { success: false, message: 'Team has reached maximum business limit or subscription is inactive' };
      }

      // Check if business already exists
      const existingBusiness = await prisma.googleBusinessProfile.findFirst({
        where: { placeId },
        select: { id: true }
      });

      if (existingBusiness) {
        return { success: false, message: 'Business already exists', businessId: existingBusiness.id };
      }

      // Get team limits
      const teamLimits = await this.teamService.getTeamLimits(teamId);
      if (!teamLimits) {
        return { success: false, message: 'Invalid team' };
      }

      // Create business profile placeholder (will be filled by scraping)
      const businessData = await prisma.googleBusinessProfile.create({
        data: {
          teamId,
          placeId,
          displayName: 'Pending Initialization'
        },
        select: { id: true }
      });

      // Create metadata with tenant-specific frequency
      await prisma.googleBusinessMetadata.create({
        data: {
          businessProfileId: businessData.id,
          updateFrequencyMinutes: teamLimits.updateFrequencyMinutes,
          nextUpdateAt: new Date(),
          lastUpdateAt: new Date(),
          isActive: true
        });

      return { success: true, message: 'Business initialized successfully', businessId: businessData.id };

    } catch (error) {
      console.error('Error initializing business:', error);
      return { success: false, message: 'Internal error occurred' };
    }
  }

  /**
   * Update business metadata with tenant-specific frequency after scraping
   */
  async updateBusinessScrapedAt(placeId: string): Promise<void> {
    try {
      // Get business and team info
      const businessData = await prisma.googleBusinessProfile.findFirst({
        where: { placeId },
        select: { id: true, teamId: true }
      });

      if (!businessData) {
        throw new Error(`Business with placeId ${placeId} not found`);
      }

      const { id: businessId, teamId } = businessData;

      // Get team limits to determine update frequency
      const teamLimits = await this.teamService.getTeamLimits(teamId);
      const updateFrequencyMinutes = teamLimits?.updateFrequencyMinutes || 1440; // Default to 24 hours

      // Update metadata with tenant-specific frequency
      const nextUpdateAt = new Date(Date.now() + updateFrequencyMinutes * 60 * 1000);
      await prisma.googleBusinessMetadata.updateMany({
        where: { businessProfileId: businessId },
        data: {
          updateFrequencyMinutes,
          nextUpdateAt: nextUpdateAt,
          lastUpdateAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error updating business scrapedAt:', error);
      throw error;
    }
  }

  /**
   * Get the most recent review date for a business (for filtering new reviews)
   */
  async getMostRecentReviewDate(placeId: string): Promise<Date | null> {
    try {
      const review = await prisma.googleReview.findFirst({
        where: { placeId },
        select: { publishedAtDate: true },
        orderBy: { publishedAtDate: 'desc' }
      });

      return review ? review.publishedAtDate : null;
    } catch (error) {
      console.error('Error getting most recent review date:', error);
      return null;
    }
  }

  /**
   * Save reviews with filtering for recent reviews (5 days) and tenant limits
   */
  async saveReviews(placeId: string, reviews: GoogleReview[], isInitialization: boolean = false): Promise<void> {
    try {
      // Get business and team info
      const businessData = await prisma.googleBusinessProfile.findFirst({
        where: { placeId },
        select: { id: true, teamId: true }
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
        
        filteredReviews = reviews.filter(review => 
          review.publishedAtDate >= fiveDaysAgo
        );
      }

      // Apply tenant limits
      if (maxReviewsPerBusiness && filteredReviews.length > maxReviewsPerBusiness) {
        // Sort by date descending and take the most recent reviews
        filteredReviews = filteredReviews
          .sort((a, b) => b.publishedAtDate.getTime() - a.publishedAtDate.getTime())
          .slice(0, maxReviewsPerBusiness);
      }

      console.log(`Processing ${filteredReviews.length} reviews for business ${placeId} (${isInitialization ? 'initialization' : 'polling'})`);

      // Process each review
      for (const review of filteredReviews) {
        try {
          // Check if review already exists
          const existingReview = await prisma.googleReview.findFirst({
            where: {
              reviewerId: review.reviewerId,
              placeId: placeId
            },
            select: { id: true, reviewMetadataId: true }
          });

          if (existingReview) {
            // Review exists, update the metadata
            await prisma.reviewMetadata.update({
              where: { id: existingReview.reviewMetadataId },
              data: {
                text: review.text || '',
                rating: review.stars || review.rating || 0,
                reply: review.responseFromOwnerText || '',
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
                competitorMentions: review.reviewMetadata?.competitorMentions || [],
                comparativePositive: review.reviewMetadata?.comparativePositive || null,
                isRead: review.reviewMetadata?.isRead || false,
                isImportant: review.reviewMetadata?.isImportant || false,
                labels: review.reviewMetadata?.labels || [],
                language: review.language || 'en',
                scrapedAt: review.scrapedAt,
                sourceUrl: review.reviewUrl || '',
                updatedAt: new Date()
              }
            });

            // Update the existing review
            await prisma.googleReview.update({
              where: { id: existingReview.id },
              data: {
                text: review.text || '',
                rating: review.rating || null,
                responseFromOwnerText: review.responseFromOwnerText || '',
                responseFromOwnerDate: review.responseFromOwnerDate,
                reviewImageUrls: review.reviewImageUrls || [],
                scrapedAt: review.scrapedAt,
                language: review.language || 'en'
              }
            });
        } else {
          // Review doesn't exist, create new metadata
          const metadataData = await prisma.reviewMetadata.create({
            data: {
              id: randomUUID(),
              externalId: review.reviewerId,
              source: 'GOOGLE_MAPS',
              author: review.name,
              authorImage: review.reviewerPhotoUrl,
              rating: review.stars || review.rating || 0,
              text: review.text || '',
              date: review.publishedAtDate,
              photoCount: (review.reviewImageUrls || []).length,
              photoUrls: review.reviewImageUrls || [],
              reply: review.responseFromOwnerText || '',
              replyDate: review.responseFromOwnerDate,
              hasReply: !!review.responseFromOwnerText,
              sentiment: review.reviewMetadata?.sentiment || null,
              keywords: review.reviewMetadata?.keywords || [],
              topics: review.reviewMetadata?.topics || [],
              emotional: review.reviewMetadata?.emotional || null,
              actionable: review.reviewMetadata?.actionable || false,
              responseUrgency: review.reviewMetadata?.responseUrgency || null,
              competitorMentions: review.reviewMetadata?.competitorMentions || [],
              comparativePositive: review.reviewMetadata?.comparativePositive || null,
              isRead: review.reviewMetadata?.isRead || false,
              isImportant: review.reviewMetadata?.isImportant || false,
              labels: review.reviewMetadata?.labels || [],
              language: review.language || 'en',
              scrapedAt: review.scrapedAt,
              sourceUrl: review.reviewUrl || '',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });

          // Create new review
          await prisma.googleReview.create({
            data: {
              businessProfileId: businessId,
              reviewMetadataId: metadataData.id,
              reviewerId: review.reviewerId || `reviewer-${randomUUID()}`,
              reviewerUrl: review.reviewerUrl || '',
              name: review.name,
              reviewerNumberOfReviews: review.reviewerNumberOfReviews || 0,
              isLocalGuide: review.isLocalGuide || false,
              reviewerPhotoUrl: review.reviewerPhotoUrl || '',
              text: review.text || '',
              textTranslated: review.textTranslated || '',
              publishAt: review.publishAt || '',
              publishedAtDate: review.publishedAtDate,
              likesCount: review.likesCount || 0,
              reviewUrl: review.reviewUrl || '',
              reviewOrigin: review.reviewOrigin || 'GOOGLE_MAPS',
              stars: review.stars || 0,
              rating: review.rating || null,
              responseFromOwnerDate: review.responseFromOwnerDate,
              responseFromOwnerText: review.responseFromOwnerText || '',
              reviewImageUrls: review.reviewImageUrls || [],
              reviewContext: review.reviewContext || {},
              reviewDetailedRating: review.reviewDetailedRating || {},
              visitedIn: review.visitedIn || null,
              originalLanguage: review.originalLanguage || null,
              translatedLanguage: review.translatedLanguage || null,
              isAdvertisement: review.isAdvertisement || false,
              placeId: review.placeId,
              location: review.location ? JSON.stringify(review.location).substring(0, 500) : null,
              address: this.sanitizeText(review.address as string, 255),
              neighborhood: this.sanitizeText(review.neighborhood as string, 100),
              street: this.sanitizeText(review.street as string, 255),
              city: this.sanitizeText(review.city as string, 100),
              postalCode: this.sanitizeText(review.postalCode as string, 20),
              state: this.sanitizeText(review.state as string, 100),
              countryCode: this.sanitizeText(review.countryCode as string, 10),
              categoryName: this.sanitizeText(review.categoryName as string, 100),
              categories: review.categories || [],
              title: review.title || '',
              totalScore: review.totalScore || 0,
              permanentlyClosed: review.permanentlyClosed || false,
              temporarilyClosed: review.temporarilyClosed || false,
              reviewsCount: review.reviewsCount || 0,
              url: review.url || '',
              price: review.price || null,
              cid: review.cid || '',
              fid: review.fid || '',
              imageUrl: review.imageUrl || '',
              scrapedAt: review.scrapedAt,
              language: review.language || 'en'
            }
          });
        }
      }

      // Update business metadata after successful review processing
      await this.updateBusinessScrapedAt(placeId);

    } catch (error) {
      console.error('Error saving reviews:', error);
      throw error;
    }
  }

  async getBusinessById(businessId: string): Promise<GoogleBusinessProfile | null> {
    try {
      const data = await prisma.googleBusinessProfile.findUnique({
        where: { id: businessId }
      });

      return data;
    } catch (error) {
      console.error('Error getting business by id:', error);
      return null;
    }
  }

  async getBusinessByPlaceId(placeId: string): Promise<GoogleBusinessProfile | null> {
    try {
      const data = await prisma.googleBusinessProfile.findFirst({
        where: { placeId }
      });

      return data;
    } catch (error) {
      console.error('Error getting business by placeId:', error);
      return null;
    }
  }

  /**
   * Saves Google reviews along with their metadata, ensuring correct linking.
   * Handles creation of ReviewMetadata and GoogleReview records.
   */
  async saveGoogleReviewsWithMetadata(
    businessProfileId: string, // The UUID of the GoogleBusinessProfile record in your DB
    placeId: string, // Google's Place ID, for context and logging
    reviewsFromPayload: unknown[], // Raw review objects from Apify/Google API
    isInitialization: boolean = false // Currently unused in this specific save logic, but good for context
  ): Promise<{ savedCount: number; updatedCount: number; failedCount: number; errors: string[] }> {
    const startTime = Date.now();
    const context = this.createRequestContext(businessProfileId, placeId);
    const childLogger = logger.child(context);
    
    // Input validation
    try {
      this.validateBusinessProfileId(businessProfileId);
      this.validatePlaceId(placeId);
      
      if (!Array.isArray(reviewsFromPayload)) {
        throw new Error('reviewsFromPayload must be an array');
      }
      
      if (reviewsFromPayload.length === 0) {
        childLogger.warn('No reviews provided to save');
        return { savedCount: 0, updatedCount: 0, failedCount: 0, errors: [] };
      }
      
      if (reviewsFromPayload.length > 1000) {
        throw new Error('Cannot process more than 1000 reviews at once');
      }
    } catch (error) {
      childLogger.error('Input validation failed', error as Error);
      return { savedCount: 0, updatedCount: 0, failedCount: 1, errors: [(error as Error).message] };
    }

    childLogger.info(`Starting to save ${reviewsFromPayload.length} Google reviews`, {
      reviewCount: reviewsFromPayload.length,
      isInitialization
    });

    let savedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const [index, rawReview] of reviewsFromPayload.entries()) {
      try {
        // Validate each review
        this.validateReviewData(rawReview);
        
        const reviewData = rawReview as Record<string, unknown>;
        const externalReviewId = (reviewData.id || reviewData.reviewId) as string;
        
        childLogger.reviewProcessing('validating', externalReviewId);

        // Check if ReviewMetadata already exists
        const existingMetadata = await prisma.reviewMetadata.findFirst({
          where: {
            externalId: externalReviewId,
            source: MarketPlatform.GOOGLE_MAPS
          },
          select: { id: true }
        });
        
        const reviewDate = reviewData.publishedAtDate ? new Date(reviewData.publishedAtDate as string) : new Date();
        const ownerResponseDate = reviewData.responseFromOwnerDate ? new Date(reviewData.responseFromOwnerDate as string) : null;
        const reviewScrapedAt = reviewData.scrapedAt ? new Date(reviewData.scrapedAt as string) : new Date();

        // Validate dates
        if (isNaN(reviewDate.getTime()) || (ownerResponseDate && isNaN(ownerResponseDate.getTime())) || isNaN(reviewScrapedAt.getTime())) {
          const error = `Invalid date format in review ${externalReviewId}`;
          childLogger.error(error);
          errors.push(error);
          failedCount++;
          continue;
        }

        // Analyze review sentiment and extract keywords
        childLogger.debug(`Analyzing sentiment for review: ${externalReviewId}`);
        const analysisStartTime = Date.now();
        
        const analysis = await this.analyzeReview(
          this.sanitizeText(reviewData.text as string) || undefined, 
          reviewData.stars as number ?? reviewData.rating as number ?? reviewData.score as number
        );
        
        childLogger.performance('sentiment_analysis', Date.now() - analysisStartTime);

        // Extract author name from flexible field names
        const authorName = reviewData.name || reviewData.userName || reviewData.author || 'Unknown Author';

        const reviewMetadataSupabaseData: ReviewMetadataInsertData = {
          id: randomUUID(),
          externalId: externalReviewId,
          source: MarketPlatform.GOOGLE_MAPS,
          author: this.sanitizeText(authorName as string, 255) || 'Unknown Author',
          authorImage: this.sanitizeText(reviewData.reviewerPhotoUrl as string, 500),
          rating: Math.max(1, Math.min(5, Number(reviewData.stars ?? reviewData.rating ?? reviewData.score ?? 0))),
          text: this.sanitizeText(reviewData.text as string),
          date: reviewDate,
          photoCount: Array.isArray(reviewData.reviewImageUrls) ? reviewData.reviewImageUrls.length : 0,
          photoUrls: Array.isArray(reviewData.reviewImageUrls) ? reviewData.reviewImageUrls.slice(0, 10) as string[] : [],
          reply: this.sanitizeText(reviewData.responseFromOwnerText as string),
          replyDate: ownerResponseDate,
          hasReply: !!reviewData.responseFromOwnerText,
          language: this.sanitizeText(reviewData.language as string || reviewData.originalLanguage as string, 10) || 'en',
          scrapedAt: reviewScrapedAt,
          sourceUrl: this.sanitizeText(reviewData.reviewUrl as string, 500),
          sentiment: analysis.sentiment,
          keywords: analysis.keywords,
          topics: analysis.topics,
          emotional: analysis.emotional,
          actionable: false,
          responseUrgency: analysis.responseUrgency,
          competitorMentions: [],
          comparativePositive: null,
          isRead: false,
          isImportant: false,
          labels: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        let reviewMetadataId: string;
        let isUpdate = false;

        if (existingMetadata) {
          reviewMetadataId = existingMetadata.id;
          // Update existing metadata
          const { id, ...updateData } = reviewMetadataSupabaseData;
          const { error: updateMetaError } = await this.supabase
            .from('ReviewMetadata')
            .update({ ...updateData, updatedAt: new Date().toISOString() })
            .eq('id', reviewMetadataId);
          
          if (updateMetaError) {
            const error = `Failed to update ReviewMetadata for ${externalReviewId}: ${updateMetaError.message}`;
            childLogger.error(error, updateMetaError as unknown as Error);
            errors.push(error);
            failedCount++;
            continue;
          }
          
          isUpdate = true;
          updatedCount++;
          childLogger.reviewProcessing('updated_metadata', externalReviewId);
        } else {
          // Create new metadata
          const { data: newMeta, error: createMetaError } = await this.supabase
            .from('ReviewMetadata')
            .insert(reviewMetadataSupabaseData)
            .select('id')
            .single();
          
          if (createMetaError || !newMeta) {
            const error = `Failed to create ReviewMetadata for ${externalReviewId}: ${createMetaError?.message}`;
            childLogger.error(error, createMetaError as unknown as Error);
            errors.push(error);
            failedCount++;
            continue;
          }
          
          reviewMetadataId = newMeta.id;
          savedCount++;
          childLogger.reviewProcessing('created_metadata', externalReviewId);
        }

        // Now check if GoogleReview exists for this metadata
        let {
          data: existingGoogleReview,
          error: fetchGoogleReviewError,
        } = await this.supabase
          .from('GoogleReview')
          .select('id')
          .eq('reviewMetadataId', reviewMetadataId)
          .single();

        if (fetchGoogleReviewError && fetchGoogleReviewError.code !== 'PGRST116') {
          const error = `Failed to fetch existing GoogleReview for metadata ${reviewMetadataId}: ${fetchGoogleReviewError.message}`;
          childLogger.error(error, fetchGoogleReviewError as unknown as Error);
          errors.push(error);
          failedCount++;
          continue;
        }

        const googleReviewSupabaseData: GoogleReviewInsertData = {
          id: randomUUID(),
          businessProfileId: businessProfileId,
          reviewMetadataId: reviewMetadataId,
          reviewerId: this.sanitizeText(reviewData.reviewerId as string, 255) || `reviewer-${randomUUID()}`, // FIXED: Generate fallback ID
          reviewerUrl: this.sanitizeText(reviewData.reviewerUrl as string, 500),
          name: this.sanitizeText(authorName as string, 255) || 'Unknown Author',
          reviewerNumberOfReviews: Math.max(0, Number(reviewData.reviewerNumberOfReviews) || 0),
          isLocalGuide: Boolean(reviewData.isLocalGuide),
          reviewerPhotoUrl: this.sanitizeText(reviewData.reviewerPhotoUrl as string, 500),
          text: this.sanitizeText(reviewData.text as string),
          textTranslated: this.sanitizeText(reviewData.textTranslated as string),
          publishAt: reviewData.publishAt as string,
          publishedAtDate: reviewDate,
          likesCount: Math.max(0, Number(reviewData.likesCount) || 0),
          reviewUrl: this.sanitizeText(reviewData.reviewUrl as string, 500),
          reviewOrigin: this.sanitizeText(reviewData.reviewOrigin as string, 50) || 'Google',
          stars: Math.max(1, Math.min(5, Number(reviewData.stars ?? reviewData.rating ?? reviewData.score ?? 1))),
          rating: reviewData.rating ? Math.max(1, Math.min(5, Number(reviewData.rating))) : null,
          responseFromOwnerDate: ownerResponseDate,
          responseFromOwnerText: this.sanitizeText(reviewData.responseFromOwnerText as string),
          reviewImageUrls: Array.isArray(reviewData.reviewImageUrls) ? reviewData.reviewImageUrls.slice(0, 10) as string[] : [],
          reviewContext: reviewData.reviewContext ? JSON.stringify(reviewData.reviewContext).substring(0, 2000) : null,
          reviewDetailedRating: reviewData.reviewDetailedRating ? JSON.stringify(reviewData.reviewDetailedRating).substring(0, 1000) : null,
          visitedIn: this.sanitizeText(reviewData.visitedIn as string, 50),
          originalLanguage: this.sanitizeText(reviewData.originalLanguage as string, 10),
          translatedLanguage: this.sanitizeText(reviewData.translatedLanguage as string, 10),
          isAdvertisement: Boolean(reviewData.isAdvertisement),
          placeId: reviewData.placeId as string || placeId,
          location: reviewData.location ? JSON.stringify(reviewData.location).substring(0, 500) : null,
          address: this.sanitizeText(reviewData.address as string, 255),
          neighborhood: this.sanitizeText(reviewData.neighborhood as string, 100),
          street: this.sanitizeText(reviewData.street as string, 255),
          city: this.sanitizeText(reviewData.city as string, 100),
          postalCode: this.sanitizeText(reviewData.postalCode as string, 20),
          state: this.sanitizeText(reviewData.state as string, 100),
          countryCode: this.sanitizeText(reviewData.countryCode as string, 10),
          categoryName: this.sanitizeText(reviewData.categoryName as string, 100),
          categories: Array.isArray(reviewData.categories) ? reviewData.categories.slice(0, 20) as string[] : [],
          title: this.sanitizeText(reviewData.title as string, 255),
          totalScore: reviewData.totalScore ? Number(reviewData.totalScore) : null,
          permanentlyClosed: Boolean(reviewData.permanentlyClosed),
          temporarilyClosed: Boolean(reviewData.temporarilyClosed),
          reviewsCount: reviewData.reviewsCount ? Math.max(0, Number(reviewData.reviewsCount)) : null,
          url: this.sanitizeText(reviewData.url as string, 500),
          price: this.sanitizeText(reviewData.price as string, 50),
          cid: this.sanitizeText(reviewData.cid as string, 50),
          fid: this.sanitizeText(reviewData.fid as string, 50),
          imageUrl: this.sanitizeText(reviewData.imageUrl as string, 500),
          scrapedAt: reviewScrapedAt,
          language: this.sanitizeText(reviewData.language as string, 10) || 'en',
        };

        if (existingGoogleReview) {
          // Update existing GoogleReview
          const { id, ...updateData } = googleReviewSupabaseData;
          const { error: updateGoogleReviewError } = await this.supabase
            .from('GoogleReview')
            .update(updateData)
            .eq('id', existingGoogleReview.id);
          
          if (updateGoogleReviewError) {
            const error = `Failed to update GoogleReview for metadata ${reviewMetadataId}: ${updateGoogleReviewError.message}`;
            childLogger.error(error, updateGoogleReviewError as unknown as Error);
            errors.push(error);
            failedCount++;
            if (!isUpdate) savedCount--; // Adjust count only if we created new metadata
          } else {
            childLogger.reviewProcessing('updated_review', externalReviewId);
          }
        } else {
          // Create new GoogleReview
          const { data: newGoogleReview, error: createGoogleReviewError } = await this.supabase
            .from('GoogleReview')
            .insert(googleReviewSupabaseData)
            .select('id')
            .single();
          
          if (createGoogleReviewError || !newGoogleReview) {
            const error = `Failed to create GoogleReview for metadata ${reviewMetadataId}: ${createGoogleReviewError?.message}`;
            childLogger.error(error, createGoogleReviewError as unknown as Error);
            errors.push(error);
            failedCount++;
            
            if (!isUpdate) {
              savedCount--; // Only decrement savedCount if we created new metadata
              // Rollback the ReviewMetadata if it was newly created
              await this.supabase.from('ReviewMetadata').delete().eq('id', reviewMetadataId);
              childLogger.warn(`Rolled back ReviewMetadata ${reviewMetadataId} due to GoogleReview creation failure`);
            }
          } else {
            childLogger.reviewProcessing('created_review', externalReviewId);
          }
        }

      } catch (error) {
        const errorMessage = `Critical error processing review at index ${index}: ${(error as Error).message}`;
        childLogger.error(errorMessage, error as Error, { reviewIndex: index });
        errors.push(errorMessage);
        failedCount++;
      }
    }

    const duration = Date.now() - startTime;
    const result = { savedCount, updatedCount, failedCount, errors };
    
    childLogger.performance('save_reviews_batch', duration);
    childLogger.info('Review saving completed', {
      ...result,
      totalProcessed: reviewsFromPayload.length,
      successRate: ((savedCount + updatedCount) / reviewsFromPayload.length * 100).toFixed(2) + '%',
      avgTimePerReview: (duration / reviewsFromPayload.length).toFixed(2) + 'ms'
    });

    return result;
  }

  /**
   * Save Facebook reviews with metadata to the database
   */
  async saveFacebookReviewsWithMetadata(
    businessProfileId: string, // The UUID of the FacebookBusinessProfile record in your DB
    facebookPageId: string, // Facebook Page ID, for context and logging
    reviewsFromPayload: unknown[], // Raw review objects from Apify/Facebook API
    isInitialization: boolean = false
  ): Promise<{ savedCount: number; updatedCount: number; failedCount: number; errors: string[] }> {
    const startTime = Date.now();
    const context = this.createRequestContext(businessProfileId, facebookPageId);
    const childLogger = logger.child(context);
    
    childLogger.info('Starting Facebook review processing', {
      businessProfileId,
      facebookPageId,
      reviewCount: reviewsFromPayload.length
    });

    this.validateBusinessProfileId(businessProfileId);
    if (!facebookPageId?.trim()) {
      throw new Error('Facebook Page ID is required');
    }

    let savedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let index = 0; index < reviewsFromPayload.length; index++) {
      try {
        const reviewData = reviewsFromPayload[index];
        this.validateReviewData(reviewData);

        const externalReviewId = String((reviewData as any).id || `fb-${Date.now()}-${index}`);
        
        // Parse and validate dates
        const reviewDate = new Date((reviewData as any).date || (reviewData as any).publishedAtDate || Date.now());
        if (isNaN(reviewDate.getTime())) {
          throw new Error(`Invalid review date: ${(reviewData as any).date}`);
        }

        const reviewScrapedAt = new Date((reviewData as any).scrapedAt || Date.now());

        // Check if ReviewMetadata already exists
        const { data: existingMetadata, error: fetchMetaError } = await this.supabase
          .from('ReviewMetadata')
          .select('id')
          .eq('source', MarketPlatform.FACEBOOK)
          .eq('externalId', externalReviewId)
          .single();

        if (fetchMetaError && fetchMetaError.code !== 'PGRST116') {
          const error = `Failed to fetch existing ReviewMetadata for ${externalReviewId}: ${fetchMetaError.message}`;
          childLogger.error(error, fetchMetaError as unknown as Error);
          errors.push(error);
          failedCount++;
          continue;
        }

        // Analyze review sentiment and keywords
        const analysis = await this.analyzeReview(
          (reviewData as any).text,
          (reviewData as any).rating
        );

        // Prepare ReviewMetadata for Supabase
        const reviewMetadataSupabaseData: ReviewMetadataInsertData = {
          id: existingMetadata?.id || randomUUID(),
          externalId: externalReviewId,
          source: MarketPlatform.FACEBOOK,
          author: this.sanitizeText((reviewData as any).author || (reviewData as any).reviewerName as string, 255) || 'Anonymous',
          authorImage: this.sanitizeText((reviewData as any).authorImage || (reviewData as any).reviewerProfileUrl as string, 500),
          rating: Math.max(0, Math.min(5, Number((reviewData as any).rating) || 0)),
          text: this.sanitizeText((reviewData as any).text as string),
          date: reviewDate,
          photoCount: Array.isArray((reviewData as any).photos) ? (reviewData as any).photos.length : 0,
          photoUrls: Array.isArray((reviewData as any).photos) ? (reviewData as any).photos.slice(0, 10) : [],
          reply: this.sanitizeText((reviewData as any).reply as string),
          replyDate: (reviewData as any).replyDate ? new Date((reviewData as any).replyDate) : undefined,
          hasReply: !!((reviewData as any).reply),
          language: this.sanitizeText((reviewData as any).language as string, 10) || 'en',
          scrapedAt: reviewScrapedAt,
          sourceUrl: this.sanitizeText((reviewData as any).sourceUrl as string, 500),
          sentiment: analysis.sentiment,
          keywords: analysis.keywords,
          topics: analysis.topics,
          emotional: analysis.emotional,
          actionable: false,
          responseUrgency: analysis.responseUrgency,
          competitorMentions: [],
          comparativePositive: null,
          isRead: false,
          isImportant: false,
          labels: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        let reviewMetadataId: string;
        let isUpdate = false;

        if (existingMetadata) {
          reviewMetadataId = existingMetadata.id;
          // Update existing metadata
          const { id, ...updateData } = reviewMetadataSupabaseData;
          const { error: updateMetaError } = await this.supabase
            .from('ReviewMetadata')
            .update({ ...updateData, updatedAt: new Date().toISOString() })
            .eq('id', reviewMetadataId);
          
          if (updateMetaError) {
            const error = `Failed to update ReviewMetadata for ${externalReviewId}: ${updateMetaError.message}`;
            childLogger.error(error, updateMetaError as unknown as Error);
            errors.push(error);
            failedCount++;
            continue;
          }
          
          isUpdate = true;
          updatedCount++;
          childLogger.reviewProcessing('updated_metadata', externalReviewId);
        } else {
          // Create new metadata
          const { data: newMeta, error: createMetaError } = await this.supabase
            .from('ReviewMetadata')
            .insert(reviewMetadataSupabaseData)
            .select('id')
            .single();
          
          if (createMetaError || !newMeta) {
            const error = `Failed to create ReviewMetadata for ${externalReviewId}: ${createMetaError?.message}`;
            childLogger.error(error, createMetaError as unknown as Error);
            errors.push(error);
            failedCount++;
            continue;
          }
          
          reviewMetadataId = newMeta.id;
          savedCount++;
          childLogger.reviewProcessing('created_metadata', externalReviewId);
        }

        // Now check if FacebookReview exists for this metadata
        let {
          data: existingFacebookReview,
          error: fetchFacebookReviewError,
        } = await this.supabase
          .from('FacebookReview')
          .select('id')
          .eq('reviewMetadataId', reviewMetadataId)
          .single();

        if (fetchFacebookReviewError && fetchFacebookReviewError.code !== 'PGRST116') {
          const error = `Failed to fetch existing FacebookReview for metadata ${reviewMetadataId}: ${fetchFacebookReviewError.message}`;
          childLogger.error(error, fetchFacebookReviewError as unknown as Error);
          errors.push(error);
          failedCount++;
          continue;
        }

        const facebookReviewSupabaseData: FacebookReviewInsertData = {
          id: randomUUID(),
          businessProfileId: businessProfileId,
          reviewMetadataId: reviewMetadataId,
          facebookReviewId: this.sanitizeText((reviewData as any).id as string, 255) || `fb-${Date.now()}-${index}`,
          legacyId: this.sanitizeText((reviewData as any).legacyId as string, 255) || '',
          date: reviewDate,
          url: this.sanitizeText((reviewData as any).url as string, 500) || '',
          text: this.sanitizeText((reviewData as any).text as string),
          isRecommended: Boolean((reviewData as any).isRecommended),
          userId: this.sanitizeText((reviewData as any).user?.id || (reviewData as any).userId as string, 255) || 'unknown',
          userName: this.sanitizeText((reviewData as any).user?.name || (reviewData as any).userName as string, 255) || 'Anonymous',
          userProfileUrl: this.sanitizeText((reviewData as any).user?.profileUrl || (reviewData as any).userProfileUrl as string, 500),
          userProfilePic: this.sanitizeText((reviewData as any).user?.profilePic || (reviewData as any).userProfilePic as string, 500),
          likesCount: Math.max(0, Number((reviewData as any).likesCount) || 0),
          commentsCount: Math.max(0, Number((reviewData as any).commentsCount) || 0),
          tags: Array.isArray((reviewData as any).tags) ? (reviewData as any).tags : [],
          facebookPageId: this.sanitizeText((reviewData as any).facebookId || facebookPageId as string, 255) || facebookPageId,
          pageName: this.sanitizeText((reviewData as any).pageName as string, 255) || '',
          inputUrl: this.sanitizeText((reviewData as any).inputUrl as string, 500) || '',
          pageAdLibrary: (reviewData as any).pageAdLibrary || null,
          scrapedAt: reviewScrapedAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (existingFacebookReview) {
          // Update existing FacebookReview
          const { id, ...updateData } = facebookReviewSupabaseData;
          const { error: updateFacebookReviewError } = await this.supabase
            .from('FacebookReview')
            .update(updateData)
            .eq('id', existingFacebookReview.id);
          
          if (updateFacebookReviewError) {
            const error = `Failed to update FacebookReview for metadata ${reviewMetadataId}: ${updateFacebookReviewError.message}`;
            childLogger.error(error, updateFacebookReviewError as unknown as Error);
            errors.push(error);
            failedCount++;
            if (!isUpdate) savedCount--; // Adjust count only if we created new metadata
          } else {
            childLogger.reviewProcessing('updated_review', externalReviewId);
          }
        } else {
          // Create new FacebookReview
          const { data: newFacebookReview, error: createFacebookReviewError } = await this.supabase
            .from('FacebookReview')
            .insert(facebookReviewSupabaseData)
            .select('id')
            .single();
          
          if (createFacebookReviewError || !newFacebookReview) {
            const error = `Failed to create FacebookReview for metadata ${reviewMetadataId}: ${createFacebookReviewError?.message}`;
            childLogger.error(error, createFacebookReviewError as unknown as Error);
            errors.push(error);
            failedCount++;
            
            if (!isUpdate) {
              savedCount--; // Only decrement savedCount if we created new metadata
              // Rollback the ReviewMetadata if it was newly created
              await this.supabase.from('ReviewMetadata').delete().eq('id', reviewMetadataId);
              childLogger.warn(`Rolled back ReviewMetadata ${reviewMetadataId} due to FacebookReview creation failure`);
            }
          } else {
            childLogger.reviewProcessing('created_review', externalReviewId);
          }
        }

      } catch (error) {
        const errorMessage = `Critical error processing Facebook review at index ${index}: ${(error as Error).message}`;
        childLogger.error(errorMessage, error as Error, { reviewIndex: index });
        errors.push(errorMessage);
        failedCount++;
      }
    }

    const duration = Date.now() - startTime;
    const result = { savedCount, updatedCount, failedCount, errors };
    
    childLogger.performance('save_facebook_reviews_batch', duration);
    childLogger.info('Facebook review saving completed', {
      ...result,
      totalProcessed: reviewsFromPayload.length,
      successRate: ((savedCount + updatedCount) / reviewsFromPayload.length * 100).toFixed(2) + '%',
      avgTimePerReview: (duration / reviewsFromPayload.length).toFixed(2) + 'ms'
    });

    return result;
  }

  async saveTripAdvisorReviewsWithMetadata(
    businessProfileId: string,
    locationId: string,
    reviewsFromPayload: unknown[],
    isInitialization: boolean = false
  ): Promise<{ savedCount: number; updatedCount: number; failedCount: number; errors: string[] }> {
    const startTime = Date.now();
    const contextData = this.createRequestContext(businessProfileId, locationId);
    const childLogger = logger;
    
    childLogger.info('Starting TripAdvisor review saving process', {
      totalReviews: reviewsFromPayload.length,
      businessProfileId,
      locationId,
      isInitialization
    });

    this.validateBusinessProfileId(businessProfileId);

    if (!locationId) {
      throw new Error('TripAdvisor locationId is required for TripAdvisor review processing');
    }

    let savedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let index = 0; index < reviewsFromPayload.length; index++) {
      try {
        const reviewData = reviewsFromPayload[index];
        this.validateReviewData(reviewData);

        // Extract external review ID
        const externalReviewId = (reviewData as any).id || (reviewData as any).tripAdvisorReviewId || `ta-review-${Date.now()}-${index}`;
        childLogger.info(`Processing TripAdvisor review ${externalReviewId}`, { reviewIndex: index });

        // Parse dates
        const reviewDate = (reviewData as any).publishedDate ? 
          new Date((reviewData as any).publishedDate) : new Date();
        const visitDate = (reviewData as any).visitDate ? 
          new Date((reviewData as any).visitDate) : null;
        const reviewScrapedAt = (reviewData as any).scrapedAt ? 
          new Date((reviewData as any).scrapedAt) : new Date();
        const ownerResponseDate = (reviewData as any).ownerResponse?.date || (reviewData as any).responseFromOwnerDate ? 
          new Date((reviewData as any).ownerResponse?.date || (reviewData as any).responseFromOwnerDate) : null;

        // Check if ReviewMetadata already exists for this external review ID
        let {
          data: existingMetadata,
          error: fetchMetadataError,
        } = await this.supabase
          .from('ReviewMetadata')
          .select('id')
          .eq('externalId', externalReviewId)
          .eq('source', MarketPlatform.TRIPADVISOR)
          .single();

        if (fetchMetadataError && fetchMetadataError.code !== 'PGRST116') {
          const error = `Failed to fetch existing ReviewMetadata for TripAdvisor review ${externalReviewId}: ${fetchMetadataError.message}`;
          childLogger.error(error, fetchMetadataError as unknown as Error);
          errors.push(error);
          failedCount++;
          continue;
        }

        // Analyze review sentiment and keywords
        const analysis = await this.analyzeReview(
          (reviewData as any).text,
          (reviewData as any).rating
        );

        // Prepare ReviewMetadata for Supabase
        const reviewMetadataSupabaseData: ReviewMetadataInsertData = {
          id: existingMetadata?.id || randomUUID(),
          externalId: externalReviewId,
          source: MarketPlatform.TRIPADVISOR,
          author: this.sanitizeText((reviewData as any).author || (reviewData as any).reviewerName as string, 255) || 'Anonymous',
          authorImage: this.sanitizeText((reviewData as any).authorImage || (reviewData as any).reviewerPhotoUrl as string, 500),
          rating: Math.max(1, Math.min(5, Number((reviewData as any).rating) || 1)),
          text: this.sanitizeText((reviewData as any).text as string),
          date: reviewDate,
          photoCount: Array.isArray((reviewData as any).photos) ? (reviewData as any).photos.length : 0,
          photoUrls: Array.isArray((reviewData as any).photos) ? (reviewData as any).photos.map((p: any) => p.url).filter(Boolean).slice(0, 10) : [],
          reply: this.sanitizeText((reviewData as any).ownerResponse?.text || (reviewData as any).responseFromOwnerText as string),
          replyDate: ownerResponseDate,
          hasReply: !!((reviewData as any).ownerResponse?.text || (reviewData as any).responseFromOwnerText),
          language: this.sanitizeText((reviewData as any).language as string, 10) || 'en',
          scrapedAt: reviewScrapedAt,
          sourceUrl: this.sanitizeText((reviewData as any).reviewUrl as string, 500),
          sentiment: analysis.sentiment,
          keywords: analysis.keywords,
          topics: analysis.topics,
          emotional: analysis.emotional,
          actionable: Number((reviewData as any).rating) <= 3 || analysis.sentiment < 0,
          responseUrgency: analysis.responseUrgency,
          competitorMentions: [],
          comparativePositive: Number((reviewData as any).rating) >= 4 && analysis.sentiment > 0,
          isRead: false,
          isImportant: analysis.responseUrgency >= 7 || Number((reviewData as any).rating) <= 2,
          labels: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        let reviewMetadataId: string;
        let isUpdate = false;

        if (existingMetadata) {
          reviewMetadataId = existingMetadata.id;
          // Update existing metadata
          const { id, ...updateData } = reviewMetadataSupabaseData;
          const { error: updateMetaError } = await this.supabase
            .from('ReviewMetadata')
            .update({ ...updateData, updatedAt: new Date().toISOString() })
            .eq('id', reviewMetadataId);
          
          if (updateMetaError) {
            const error = `Failed to update ReviewMetadata for ${externalReviewId}: ${updateMetaError.message}`;
            childLogger.error(error, updateMetaError as unknown as Error);
            errors.push(error);
            failedCount++;
            continue;
          }
          
          isUpdate = true;
          updatedCount++;
          childLogger.info(`Updated metadata for TripAdvisor review ${externalReviewId}`);
        } else {
          // Create new metadata
          const { data: newMeta, error: createMetaError } = await this.supabase
            .from('ReviewMetadata')
            .insert(reviewMetadataSupabaseData)
            .select('id')
            .single();
          
          if (createMetaError || !newMeta) {
            const error = `Failed to create ReviewMetadata for ${externalReviewId}: ${createMetaError?.message}`;
            childLogger.error(error, createMetaError as unknown as Error);
            errors.push(error);
            failedCount++;
            continue;
          }
          
          reviewMetadataId = newMeta.id;
          savedCount++;
          childLogger.info(`Created metadata for TripAdvisor review ${externalReviewId}`);
        }

        // Now check if TripAdvisorReview exists for this metadata
        let {
          data: existingTripAdvisorReview,
          error: fetchTripAdvisorReviewError,
        } = await this.supabase
          .from('TripAdvisorReview')
          .select('id')
          .eq('reviewMetadataId', reviewMetadataId)
          .single();

        if (fetchTripAdvisorReviewError && fetchTripAdvisorReviewError.code !== 'PGRST116') {
          const error = `Failed to fetch existing TripAdvisorReview for metadata ${reviewMetadataId}: ${fetchTripAdvisorReviewError.message}`;
          childLogger.error(error, fetchTripAdvisorReviewError as unknown as Error);
          errors.push(error);
          failedCount++;
          continue;
        }

        const tripAdvisorReviewSupabaseData: TripAdvisorReviewInsertData = {
          id: randomUUID(),
          businessProfileId: businessProfileId,
          reviewMetadataId: reviewMetadataId,
          tripAdvisorReviewId: this.sanitizeText((reviewData as any).id as string, 255) || `ta-${Date.now()}-${index}`,
          reviewUrl: this.sanitizeText((reviewData as any).reviewUrl as string, 500),
          title: this.sanitizeText((reviewData as any).title as string, 500),
          text: this.sanitizeText((reviewData as any).text as string),
          rating: Math.max(1, Math.min(5, Number((reviewData as any).rating) || 1)),
          publishedDate: reviewDate,
          visitDate: visitDate || undefined,
          reviewerId: this.sanitizeText((reviewData as any).reviewer?.id || (reviewData as any).reviewerId as string, 255) || 'unknown',
          reviewerName: this.sanitizeText((reviewData as any).reviewer?.name || (reviewData as any).reviewerName as string, 255) || 'Anonymous',
          reviewerLocation: this.sanitizeText((reviewData as any).reviewer?.location || (reviewData as any).reviewerLocation as string, 255),
          reviewerLevel: this.sanitizeText((reviewData as any).reviewer?.level || (reviewData as any).reviewerLevel as string, 100),
          reviewerPhotoUrl: this.sanitizeText((reviewData as any).reviewer?.photoUrl || (reviewData as any).reviewerPhotoUrl as string, 500),
          helpfulVotes: Math.max(0, Number((reviewData as any).helpfulVotes) || 0),
          tripType: this.sanitizeText((reviewData as any).tripType as string, 100),
          roomTip: this.sanitizeText((reviewData as any).roomTip as string, 1000),
          responseFromOwnerText: this.sanitizeText((reviewData as any).ownerResponse?.text || (reviewData as any).responseFromOwnerText as string),
          responseFromOwnerDate: ownerResponseDate,
          hasOwnerResponse: !!((reviewData as any).ownerResponse?.text || (reviewData as any).responseFromOwnerText),
          locationId: this.sanitizeText((reviewData as any).locationId || locationId as string, 255) || locationId,
          businessName: this.sanitizeText((reviewData as any).businessName as string, 255),
          businessType: this.sanitizeText((reviewData as any).businessType as string, 100),
          scrapedAt: reviewScrapedAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        let tripAdvisorReviewId: string;

        if (existingTripAdvisorReview) {
          // Update existing TripAdvisorReview
          tripAdvisorReviewId = existingTripAdvisorReview.id;
          const { id, ...updateData } = tripAdvisorReviewSupabaseData;
          const { error: updateTripAdvisorReviewError } = await this.supabase
            .from('TripAdvisorReview')
            .update(updateData)
            .eq('id', existingTripAdvisorReview.id);
          
          if (updateTripAdvisorReviewError) {
            const error = `Failed to update TripAdvisorReview for metadata ${reviewMetadataId}: ${updateTripAdvisorReviewError.message}`;
            childLogger.error(error, updateTripAdvisorReviewError as unknown as Error);
            errors.push(error);
            failedCount++;
            if (!isUpdate) savedCount--; // Adjust count only if we created new metadata
            continue;
          }
          
          // Delete existing related records before recreating them
          await Promise.all([
            this.supabase.from('TripAdvisorReviewSubRating').delete().eq('tripAdvisorReviewId', tripAdvisorReviewId),
            this.supabase.from('TripAdvisorReviewerBadge').delete().eq('tripAdvisorReviewId', tripAdvisorReviewId),
            this.supabase.from('TripAdvisorReviewPhoto').delete().eq('tripAdvisorReviewId', tripAdvisorReviewId)
          ]);
          
          childLogger.info(`Updated TripAdvisor review ${externalReviewId}`);
        } else {
          // Create new TripAdvisorReview
          const { data: newTripAdvisorReview, error: createTripAdvisorReviewError } = await this.supabase
            .from('TripAdvisorReview')
            .insert(tripAdvisorReviewSupabaseData)
            .select('id')
            .single();
          
          if (createTripAdvisorReviewError || !newTripAdvisorReview) {
            const error = `Failed to create TripAdvisorReview for metadata ${reviewMetadataId}: ${createTripAdvisorReviewError?.message}`;
            childLogger.error(error, createTripAdvisorReviewError as unknown as Error);
            errors.push(error);
            failedCount++;
            
            if (!isUpdate) {
              savedCount--; // Only decrement savedCount if we created new metadata
              // Rollback the ReviewMetadata if it was newly created
              await this.supabase.from('ReviewMetadata').delete().eq('id', reviewMetadataId);
              childLogger.warn(`Rolled back ReviewMetadata ${reviewMetadataId} due to TripAdvisorReview creation failure`);
            }
            continue;
          }
          
          tripAdvisorReviewId = newTripAdvisorReview.id;
          childLogger.info(`Created TripAdvisor review ${externalReviewId}`);
        }

        // Handle sub-ratings creation
        if ((reviewData as any).subRatings && typeof (reviewData as any).subRatings === 'object') {
          try {
            const subRatingsData = {
              id: randomUUID(),
              tripAdvisorReviewId: tripAdvisorReviewId,
              service: (reviewData as any).subRatings.service || null,
              food: (reviewData as any).subRatings.food || null,
              value: (reviewData as any).subRatings.value || null,
              atmosphere: (reviewData as any).subRatings.atmosphere || null,
              cleanliness: (reviewData as any).subRatings.cleanliness || null,
              location: (reviewData as any).subRatings.location || null,
              rooms: (reviewData as any).subRatings.rooms || null,
              sleepQuality: (reviewData as any).subRatings.sleep_quality || (reviewData as any).subRatings.sleepQuality || null
            };

            const { error: subRatingsError } = await this.supabase
              .from('TripAdvisorReviewSubRating')
              .insert(subRatingsData);

            if (subRatingsError) {
              childLogger.warn(`Failed to create TripAdvisorReviewSubRating for review ${externalReviewId}: ${subRatingsError.message}`);
            }
          } catch (subRatingsError) {
            childLogger.warn(`Error processing sub-ratings for review ${externalReviewId}:`, subRatingsError);
          }
        }

        // Handle reviewer badges creation
        const reviewerBadges = (reviewData as any).reviewer?.badges || (reviewData as any).reviewerBadges;
        if (Array.isArray(reviewerBadges) && reviewerBadges.length > 0) {
          try {
            const badgeData = reviewerBadges.map((badge: string) => ({
              id: randomUUID(),
              tripAdvisorReviewId: tripAdvisorReviewId,
              badge: badge
            }));

            const { error: badgeError } = await this.supabase
              .from('TripAdvisorReviewerBadge')
              .insert(badgeData);

            if (badgeError) {
              childLogger.warn(`Failed to create TripAdvisorReviewerBadge records for review ${externalReviewId}: ${badgeError.message}`);
            }
          } catch (badgeError) {
            childLogger.warn(`Error processing reviewer badges for review ${externalReviewId}:`, badgeError);
          }
        }

        // Handle photo creation if photos exist
        if (Array.isArray((reviewData as any).photos) && (reviewData as any).photos.length > 0) {
          try {
            const photoData = (reviewData as any).photos.map((photo: any, photoIndex: number) => ({
              id: randomUUID(),
              tripAdvisorReviewId: tripAdvisorReviewId,
              url: photo.url || '',
              caption: photo.caption,
              photoId: photo.photoId || photo.id || `photo-${photoIndex}`,
              width: photo.width,
              height: photo.height,
              photographerId: photo.photographerId
            }));

            const { error: photoError } = await this.supabase
              .from('TripAdvisorReviewPhoto')
              .insert(photoData);

            if (photoError) {
              childLogger.warn(`Failed to create TripAdvisorReviewPhoto records for review ${externalReviewId}: ${photoError.message}`);
              // Don't fail the entire review for photo errors
            }
          } catch (photoError) {
            childLogger.warn(`Error processing photos for review ${externalReviewId}:`, photoError);
          }
        }

      } catch (error) {
        const errorMessage = `Critical error processing TripAdvisor review at index ${index}: ${(error as Error).message}`;
        childLogger.error(errorMessage, error as Error, { reviewIndex: index });
        errors.push(errorMessage);
        failedCount++;
      }
    }

    const duration = Date.now() - startTime;
    const result = { savedCount, updatedCount, failedCount, errors };
    
    childLogger.info(`TripAdvisor review batch processing completed in ${duration}ms`);
    childLogger.info('TripAdvisor review saving completed', {
      ...result,
      totalProcessed: reviewsFromPayload.length,
      successRate: ((savedCount + updatedCount) / reviewsFromPayload.length * 100).toFixed(2) + '%',
      avgTimePerReview: (duration / reviewsFromPayload.length).toFixed(2) + 'ms'
    });

    return result;
  }

  async close(): Promise<void> {
    await this.teamService.close();
    // Prisma client doesn't need explicit closing in this context
  }
}