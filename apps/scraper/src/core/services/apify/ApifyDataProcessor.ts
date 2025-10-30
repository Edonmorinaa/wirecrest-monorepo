import { MarketPlatform } from '@prisma/client';
import type { IApifyDataProcessor } from '../../interfaces/IApifyService';
import { logger } from '../../../utils/logger';

/**
 * Apify Data Processor
 * Follows Single Responsibility Principle (SRP) - only handles data transformation
 * Follows Open/Closed Principle (OCP) - can be extended for new platforms without modification
 */
export class ApifyDataProcessor implements IApifyDataProcessor {
  
  async processReviewData(rawData: any, platform: MarketPlatform): Promise<any> {
    try {
      logger.info(`[ApifyDataProcessor] Processing ${rawData.length} reviews for platform: ${platform}`);
      
      const processedData = rawData.map((item: any) => {
        switch (platform) {
          case MarketPlatform.GOOGLE_MAPS:
            return this.processGoogleReview(item);
          case MarketPlatform.FACEBOOK:
            return this.processFacebookReview(item);
          case MarketPlatform.TRIPADVISOR:
            return this.processTripAdvisorReview(item);
          case MarketPlatform.BOOKING:
            return this.processBookingReview(item);
          default:
            logger.warn(`[ApifyDataProcessor] Unknown platform: ${platform}`);
            return item;
        }
      });

      logger.info(`[ApifyDataProcessor] Successfully processed ${processedData.length} reviews`);
      return processedData;
      
    } catch (error) {
      logger.error(`[ApifyDataProcessor] Error processing review data:`, error);
      throw error;
    }
  }

  validateReviewData(data: any): boolean {
    if (!data || !Array.isArray(data)) {
      return false;
    }

    // Check if all items have required fields
    return data.every((item: any) => {
      return item && 
             typeof item === 'object' && 
             (item.text || item.reviewText) && 
             (item.rating || item.stars) &&
             (item.author || item.reviewerName);
    });
  }

  async transformReviewData(data: any, platform: MarketPlatform): Promise<any> {
    if (!this.validateReviewData(data)) {
      throw new Error('Invalid review data format');
    }

    return this.processReviewData(data, platform);
  }

  private processGoogleReview(item: any): any {
    return {
      // Map Apify data to our database schema
      reviewerId: item.reviewerId || item.userId || '',
      reviewerUrl: item.reviewerUrl || item.profileUrl || '',
      name: item.name || item.reviewerName || item.author || 'Anonymous',
      reviewerNumberOfReviews: item.reviewerNumberOfReviews || item.totalReviews || 0,
      isLocalGuide: item.isLocalGuide || false,
      reviewerPhotoUrl: item.reviewerPhotoUrl || item.profileImage || '',
      text: item.text || item.reviewText || '',
      textTranslated: item.textTranslated || null,
      publishAt: item.publishAt || item.publishedAt || new Date().toISOString(),
      publishedAtDate: new Date(item.publishAt || item.publishedAt || new Date()),
      likesCount: item.likesCount || item.helpfulVotes || 0,
      reviewUrl: item.reviewUrl || item.url || '',
      reviewOrigin: item.reviewOrigin || 'google_maps',
      stars: item.stars || item.rating || 0,
      rating: parseFloat(item.rating) || parseFloat(item.stars) || 0,
      responseFromOwnerDate: item.responseFromOwnerDate ? new Date(item.responseFromOwnerDate) : null,
      responseFromOwnerText: item.responseFromOwnerText || null,
      reviewImageUrls: item.reviewImageUrls || item.photos || [],
      reviewContext: item.reviewContext || null,
      reviewDetailedRating: item.reviewDetailedRating || null,
      visitedIn: item.visitedIn || null,
      originalLanguage: item.originalLanguage || 'en',
      translatedLanguage: item.translatedLanguage || null,
      isAdvertisement: item.isAdvertisement || false,
      placeId: item.placeId || '',
      location: item.location || {},
      address: item.address || '',
      neighborhood: item.neighborhood || null,
      street: item.street || null,
      city: item.city || null,
      postalCode: item.postalCode || null,
      state: item.state || null,
      countryCode: item.countryCode || null,
      categoryName: item.categoryName || null,
      categories: item.categories || [],
      title: item.title || '',
      totalScore: item.totalScore || null,
      permanentlyClosed: item.permanentlyClosed || false,
      temporarilyClosed: item.temporarilyClosed || false,
      reviewsCount: item.reviewsCount || null,
      url: item.url || '',
      price: item.price || null,
      cid: item.cid || null,
      fid: item.fid || null,
      imageUrl: item.imageUrl || null,
      scrapedAt: new Date(),
      language: item.language || 'en'
    };
  }

  private processFacebookReview(item: any): any {
    return {
      facebookReviewId: item.facebookReviewId || item.reviewId || '',
      legacyId: item.legacyId || item.id || '',
      date: new Date(item.date || item.publishedAt || new Date()),
      url: item.url || item.reviewUrl || '',
      text: item.text || item.reviewText || '',
      isRecommended: item.isRecommended || item.recommended || false,
      userId: item.userId || item.reviewerId || '',
      userName: item.userName || item.reviewerName || item.author || 'Anonymous',
      userProfileUrl: item.userProfileUrl || item.profileUrl || null,
      userProfilePic: item.userProfilePic || item.profileImage || null,
      likesCount: item.likesCount || item.helpfulVotes || 0,
      commentsCount: item.commentsCount || 0,
      tags: item.tags || [],
      facebookPageId: item.facebookPageId || item.pageId || '',
      pageName: item.pageName || '',
      inputUrl: item.inputUrl || '',
      pageAdLibrary: item.pageAdLibrary || null,
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private processTripAdvisorReview(item: any): any {
    return {
      tripAdvisorReviewId: item.tripAdvisorReviewId || item.reviewId || '',
      reviewUrl: item.reviewUrl || item.url || null,
      title: item.title || null,
      text: item.text || item.reviewText || null,
      rating: item.rating || item.stars || 0,
      publishedDate: new Date(item.publishedDate || item.publishedAt || new Date()),
      visitDate: item.visitDate ? new Date(item.visitDate) : null,
      reviewerId: item.reviewerId || item.userId || '',
      reviewerName: item.reviewerName || item.author || 'Anonymous',
      reviewerLocation: item.reviewerLocation || null,
      reviewerLevel: item.reviewerLevel || null,
      reviewerPhotoUrl: item.reviewerPhotoUrl || item.profileImage || null,
      helpfulVotes: item.helpfulVotes || item.likesCount || 0,
      tripType: item.tripType || null,
      roomTip: item.roomTip || null,
      responseFromOwnerText: item.responseFromOwnerText || null,
      responseFromOwnerDate: item.responseFromOwnerDate ? new Date(item.responseFromOwnerDate) : null,
      hasOwnerResponse: item.hasOwnerResponse || false,
      locationId: item.locationId || '',
      businessName: item.businessName || null,
      businessType: item.businessType || null,
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private processBookingReview(item: any): any {
    return {
      bookingReviewId: item.bookingReviewId || item.reviewId || null,
      title: item.title || null,
      text: item.text || item.reviewText || null,
      rating: parseFloat(item.rating) || parseFloat(item.stars) || 0,
      publishedDate: new Date(item.publishedDate || item.publishedAt || new Date()),
      stayDate: item.stayDate ? new Date(item.stayDate) : null,
      reviewerId: item.reviewerId || item.userId || null,
      reviewerName: item.reviewerName || item.author || 'Anonymous',
      reviewerNationality: item.reviewerNationality || null,
      lengthOfStay: item.lengthOfStay || null,
      roomType: item.roomType || null,
      guestType: item.guestType || 'OTHER',
      likedMost: item.likedMost || null,
      dislikedMost: item.dislikedMost || null,
      cleanlinessRating: item.cleanlinessRating ? parseFloat(item.cleanlinessRating) : null,
      comfortRating: item.comfortRating ? parseFloat(item.comfortRating) : null,
      locationRating: item.locationRating ? parseFloat(item.locationRating) : null,
      facilitiesRating: item.facilitiesRating ? parseFloat(item.facilitiesRating) : null,
      staffRating: item.staffRating ? parseFloat(item.staffRating) : null,
      valueForMoneyRating: item.valueForMoneyRating ? parseFloat(item.valueForMoneyRating) : null,
      wifiRating: item.wifiRating ? parseFloat(item.wifiRating) : null,
      responseFromOwnerText: item.responseFromOwnerText || null,
      responseFromOwnerDate: item.responseFromOwnerDate ? new Date(item.responseFromOwnerDate) : null,
      hasOwnerResponse: item.hasOwnerResponse || false,
      isVerifiedStay: item.isVerifiedStay || false,
      scrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
