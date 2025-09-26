import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  MarketPlatform,
  GoogleBusinessProfile,
  FacebookBusinessProfile,
  GoogleReview,
  FacebookReview
} from '../supabase/models';
import { BusinessProfileCreationService } from './businessProfileCreationService';
import { ActorManager } from '../apifyService/actorManager';
import { GoogleBusinessReviewsActorJob } from '../apifyService/actors/googleBusinessReviewsActor';
import { FacebookBusinessReviewsActorJob } from '../apifyService/actors/facebookBusinessReviewsActor';
import { TripAdvisorBusinessReviewsActorJob } from '../apifyService/actors/tripAdvisorBusinessReviewsActor';
import { BookingBusinessReviewsActor } from '../apifyService/actors/bookingBusinessReviewsActor';
import { TeamService } from '../supabase/teamService';
import { apify } from '../apifyService/apifyService';
import { GoogleBusinessReviewsActor } from '../apifyService/actors/googleBusinessReviewsActor';
import { FacebookBusinessReviewsActor } from '../apifyService/actors/facebookBusinessReviewsActor';
import { TripAdvisorBusinessReviewsActor } from '../apifyService/actors/tripAdvisorBusinessReviewsActor';
import { ActorJob, ReviewActorJobFactory } from '../apifyService/actors/actor';
import { BusinessTaskTracker, BusinessCreationStep } from './businessTaskTracker';

export interface BusinessProfileResult {
  success: boolean;
  businessId?: string;
  profileData?: any;
  error?: string;
}

export interface ReviewsResult {
  success: boolean;
  jobId?: string;
  reviewsCount?: number;
  message?: string;
  error?: string;
}

export interface GoogleBusinessData {
  businessId: string;
  teamId: string;
  title: string;
  placeId: string;
  address?: string;
  rating?: number;
  reviewsCount?: number;
  categories?: string[];
  phone?: string;
  website?: string;
  scrapedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacebookBusinessData {
  businessId: string;
  teamId: string;
  title: string;
  facebookUrl: string;
  address?: string;
  rating?: number;
  reviewsCount?: number;
  categories?: string[];
  phone?: string;
  website?: string;
  scrapedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleReviewData {
  id: string;
  businessProfileId: string;
  reviewerId: string;
  name: string;
  rating: number;
  text: string;
  publishedAtDate: Date;
  responseFromOwnerText?: string;
  responseFromOwnerDate?: Date;
  reviewImageUrls?: string[];
  scrapedAt: Date;
}

export interface FacebookReviewData {
  id: string;
  businessProfileId: string;
  reviewerId: string;
  name: string;
  rating: number;
  text: string;
  publishedAtDate: Date;
  responseFromOwnerText?: string;
  responseFromOwnerDate?: Date;
  scrapedAt: Date;
}

export interface TripAdvisorBusinessData {
  businessId: string;
  teamId: string;
  title: string;
  tripAdvisorUrl: string;
  locationId: string;
  address?: string;
  rating?: number;
  reviewsCount?: number;
  categories?: string[];
  phone?: string;
  website?: string;
  scrapedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripAdvisorReviewData {
  id: string;
  businessProfileId: string;
  reviewerId: string;
  name: string;
  rating: number;
  text: string;
  publishedAtDate: Date;
  visitDate?: Date;
  tripType?: string;
  helpfulVotes: number;
  responseFromOwnerText?: string;
  responseFromOwnerDate?: Date;
  scrapedAt: Date;
}

export interface BookingBusinessData {
  businessId: string;
  teamId: string;
  title: string;
  bookingUrl: string;
  hotelId?: string;
  address?: string;
  rating?: number;
  reviewsCount?: number;
  propertyType?: string;
  phone?: string;
  website?: string;
  scrapedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingReviewData {
  id: string;
  businessProfileId: string;
  reviewerId: string;
  name: string;
  rating: number;
  text: string;
  publishedAtDate: Date;
  stayDate?: Date;
  lengthOfStay?: number;
  roomType?: string;
  guestType: string;
  likedMost?: string;
  dislikedMost?: string;
  cleanlinessRating?: number;
  comfortRating?: number;
  locationRating?: number;
  facilitiesRating?: number;
  staffRating?: number;
  valueForMoneyRating?: number;
  wifiRating?: number;
  responseFromOwnerText?: string;
  responseFromOwnerDate?: Date;
  isVerifiedStay: boolean;
  scrapedAt: Date;
}

export class SimpleBusinessService {
  private supabase: SupabaseClient;
  private businessProfileCreationService: BusinessProfileCreationService;
  private actorManager: ActorManager;
  private teamService: TeamService;
  private taskTracker: BusinessTaskTracker;

  constructor(
    apifyToken: string,
    actorManager: ActorManager
  ) {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);

    this.businessProfileCreationService = new BusinessProfileCreationService(apifyToken);
    this.actorManager = actorManager;
    this.teamService = new TeamService();
    this.taskTracker = new BusinessTaskTracker();
  }

  // =================== GOOGLE BUSINESS METHODS ===================

  /**
   * Create or update a Google business profile
   */
  async createOrUpdateGoogleProfile(
    teamId: string,
    placeId: string
  ): Promise<BusinessProfileResult> {
    try {
      console.log(`🏢 Creating/updating Google business profile for team ${teamId} with placeId: ${placeId}`);

      // Initialize task tracking
      await this.taskTracker.findOrCreateTask(teamId, MarketPlatform.GOOGLE_MAPS, placeId);

      // Check if team can add a Google business (only if one doesn't exist)
      const existingBusiness = await this.getGoogleBusinessByPlaceId(placeId);
      if (!existingBusiness) {
        const canAdd = await this.teamService.canTeamAddBusinessForPlatform(teamId, MarketPlatform.GOOGLE_MAPS);
        if (!canAdd) {
          await this.taskTracker.failStep(
            teamId,
            MarketPlatform.GOOGLE_MAPS,
            BusinessCreationStep.CREATING_PROFILE,
            'Team already has a Google business profile. Only one business per platform is allowed.'
          );
          return {
            success: false,
            error: 'Team already has a Google business profile. Only one business per platform is allowed.'
          };
        }
      }

      // Start with business profile creation step
      await this.taskTracker.startStep(
        teamId,
        MarketPlatform.GOOGLE_MAPS,
        BusinessCreationStep.CREATING_PROFILE,
        'Creating/updating Google business profile...'
      );

      let businessProfileResult;
      
      if (existingBusiness) {
        console.log(`📝 Google business already exists, updating profile...`);
        
        await this.taskTracker.updateProgress(teamId, MarketPlatform.GOOGLE_MAPS, {
          step: BusinessCreationStep.CREATING_PROFILE,
          status: 'IN_PROGRESS' as any,
          message: 'Updating existing Google business profile...',
          progressPercent: 50
        });
        
        businessProfileResult = await this.businessProfileCreationService.createBusinessProfile(
          teamId,
          MarketPlatform.GOOGLE_MAPS,
          placeId
        );
      } else {
        console.log(`🆕 Creating new Google business profile...`);
        
        await this.taskTracker.updateProgress(teamId, MarketPlatform.GOOGLE_MAPS, {
          step: BusinessCreationStep.CREATING_PROFILE,
          status: 'IN_PROGRESS' as any,
          message: 'Creating new Google business profile...',
          progressPercent: 50
        });
        
        businessProfileResult = await this.businessProfileCreationService.createBusinessProfile(
          teamId,
          MarketPlatform.GOOGLE_MAPS,
          placeId
        );
      }

      if (!businessProfileResult.success) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.GOOGLE_MAPS,
          BusinessCreationStep.CREATING_PROFILE,
          businessProfileResult.error || 'Failed to create/update Google business profile'
        );
        return {
          success: false,
          error: businessProfileResult.error || 'Failed to create/update Google business profile'
        };
      }

      await this.taskTracker.completeStep(
        teamId,
        MarketPlatform.GOOGLE_MAPS,
        BusinessCreationStep.CREATING_PROFILE,
        'Google business profile created/updated successfully',
        { businessProfileId: businessProfileResult.businessProfileId }
      );

      // Step 2: Automatically trigger Google reviews collection
      console.log(`🔍 Triggering Google reviews collection...`);
      
      try {
        const reviewsResult = await this.getOrUpdateGoogleReviews(teamId, placeId, true); // Force refresh
        
        if (reviewsResult.success) {
          console.log(`✅ Google reviews collection started: ${reviewsResult.message || 'Job scheduled'}`);
        } else {
          console.warn(`⚠️ Google reviews collection failed but continuing: ${reviewsResult.error}`);
          // Don't fail the entire flow if reviews fail - the profile creation was successful
        }
      } catch (reviewError) {
        console.warn(`⚠️ Error triggering Google reviews (continuing anyway):`, reviewError);
        // Don't fail the entire flow if reviews fail
      }

      // Return the business profile data
      const finalBusiness = await this.getGoogleBusinessByPlaceId(placeId);
      
      return {
        success: true,
        businessId: businessProfileResult.businessProfileId || existingBusiness?.businessId,
        profileData: finalBusiness
      };

    } catch (error) {
      console.error(`❌ Error in Google business setup flow:`, error);
      
      // Try to mark current step as failed
      try {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.GOOGLE_MAPS,
          BusinessCreationStep.CREATING_PROFILE,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } catch (trackingError) {
        console.error('Failed to update task tracking:', trackingError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get or update reviews for a Google business
   */
  async getOrUpdateGoogleReviews(
    teamId: string,
    placeId: string,
    forceRefresh: boolean = false
  ): Promise<ReviewsResult> {
    
    console.log(`🔍 Getting/updating Google reviews for team ${teamId}, placeId ${placeId}, forceRefresh: ${forceRefresh}`);
    
    try {
      // Start reviews fetching step
      await this.taskTracker.startStep(
        teamId,
        MarketPlatform.GOOGLE_MAPS,
        BusinessCreationStep.FETCHING_REVIEWS,
        'Starting Google reviews collection...'
      );

      // Check if Google business exists
      const business = await this.getGoogleBusinessByPlaceId(placeId);
      if (!business) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.GOOGLE_MAPS,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Google business not found. Create Google business profile first.'
        );
        return {
          success: false,
          error: 'Google business not found. Create Google business profile first.'
        };
      }

      // Get team limits for this user 
      const teamLimits = await this.teamService.getTeamLimits(teamId);
      if (!teamLimits) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.GOOGLE_MAPS,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Team not found or inactive'
        );
        return {
          success: false,
          error: 'Team not found or inactive'
        };
      }

      await this.taskTracker.updateProgress(teamId, MarketPlatform.GOOGLE_MAPS, {
        step: BusinessCreationStep.FETCHING_REVIEWS,
        status: 'IN_PROGRESS' as any,
        message: 'Checking if reviews need to be refreshed...',
        progressPercent: 25
      });

      // Check if we need to refresh reviews
      const shouldRefresh = forceRefresh || await this.shouldRefreshGoogleReviews(business.businessId);
      
      if (!shouldRefresh) {
        const currentReviewsCount = await this.getGoogleReviewsCount(business.businessId);
        await this.taskTracker.completeStep(
          teamId,
          MarketPlatform.GOOGLE_MAPS,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Google reviews are up to date',
          { reviewsCount: currentReviewsCount, refreshed: false }
        );
        return {
          success: true,
          reviewsCount: currentReviewsCount,
          message: 'Google reviews are up to date'
        };
      }

      await this.taskTracker.updateProgress(teamId, MarketPlatform.GOOGLE_MAPS, {
        step: BusinessCreationStep.FETCHING_REVIEWS,
        status: 'IN_PROGRESS' as any,
        message: 'Scheduling Google review scraping job...',
        progressPercent: 50
      });

      // Create Google review scraping job
      const job = new GoogleBusinessReviewsActorJob({
        platform: MarketPlatform.GOOGLE_MAPS,
        teamId: teamId,
        placeId: placeId,
        isInitialization: false,
        maxReviews: teamLimits.maxReviewsPerBusiness
      }, process.env.APIFY_TOKEN!);

      // Create proper ActorJob for scheduling
      const actor = new GoogleBusinessReviewsActor();
      actor.updateMemoryEstimate(false);
      
      const jobData = {
        platform: MarketPlatform.GOOGLE_MAPS,
        teamId: teamId,
        placeID: placeId,
        isInitialization: false,
        maxReviews: teamLimits.maxReviewsPerBusiness
      };
      
      const actorJob = new ActorJob(
        `google-manual-${teamId}-${placeId}-${Date.now()}`,
        actor,
        jobData,
        async () => {
          await job.run();
          return true;
        }
      );

      await this.actorManager.schedule(actorJob, 'manual');

      console.log(`📝 Google review scraping job scheduled: ${actorJob.id}`);

      await this.taskTracker.completeStep(
        teamId,
        MarketPlatform.GOOGLE_MAPS,
        BusinessCreationStep.FETCHING_REVIEWS,
        'Google review scraping job scheduled successfully',
        { 
          jobId: actorJob.id, 
          maxReviews: teamLimits.maxReviewsPerBusiness,
          refreshed: true 
        }
      );

      return {
        success: true,
        jobId: actorJob.id,
        message: 'Google review scraping started'
      };

    } catch (error) {
      console.error(`❌ Error getting/updating Google reviews:`, error);
      
      // Try to mark step as failed
      try {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.GOOGLE_MAPS,
          BusinessCreationStep.FETCHING_REVIEWS,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } catch (trackingError) {
        console.error('Failed to update task tracking:', trackingError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get Google business data for a team
   */
  async getGoogleBusinessData(teamId: string): Promise<GoogleBusinessData | null> {
    try {
      const { data, error } = await this.supabase
        .from('GoogleBusinessProfile')
        .select(`
          id,
          teamId,
          displayName,
          placeId,
          formattedAddress,
          rating,
          userRatingCount,
          types,
          nationalPhoneNumber,
          websiteUri,
          metadata:GoogleBusinessMetadata(
            createdAt,
            updatedAt
          )
        `)
        .eq('teamId', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error getting Google business data:', error);
        return null;
      }

      return data ? {
        businessId: data.id,
        teamId: data.teamId,
        title: data.displayName || '', // Map displayName to title for backward compatibility
        placeId: data.placeId || '',
        address: data.formattedAddress,
        rating: data.rating,
        reviewsCount: data.userRatingCount, // Map userRatingCount to reviewsCount
        categories: data.types || [],
        phone: data.nationalPhoneNumber,
        website: data.websiteUri,
        scrapedAt: undefined, // No longer in main schema
        createdAt: data.metadata && data.metadata[0]?.createdAt ? new Date(data.metadata[0].createdAt) : new Date(),
        updatedAt: data.metadata && data.metadata[0]?.updatedAt ? new Date(data.metadata[0].updatedAt) : new Date()
      } : null;

    } catch (error) {
      console.error('Error getting Google business data:', error);
      return null;
    }
  }

  /**
   * Get Google reviews for a team's business
   */
  async getGoogleReviews(
    teamId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<GoogleReviewData[]> {
    try {
      const { data, error } = await this.supabase
        .from('GoogleReview')
        .select(`
          id,
          businessProfileId,
          reviewerId,
          name,
          rating,
          text,
          publishedAtDate,
          responseFromOwnerText,
          responseFromOwnerDate,
          reviewImageUrls,
          scrapedAt,
          GoogleBusinessProfile!inner(teamId)
        `)
        .eq('GoogleBusinessProfile.teamId', teamId)
        .order('publishedAtDate', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting Google reviews:', error);
        return [];
      }

      return data?.map(review => ({
        id: review.id,
        businessProfileId: review.businessProfileId,
        reviewerId: review.reviewerId,
        name: review.name,
        rating: review.rating,
        text: review.text,
        publishedAtDate: new Date(review.publishedAtDate),
        responseFromOwnerText: review.responseFromOwnerText,
        responseFromOwnerDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : undefined,
        reviewImageUrls: review.reviewImageUrls || [],
        scrapedAt: new Date(review.scrapedAt)
      })) || [];

    } catch (error) {
      console.error('Error getting Google reviews:', error);
      return [];
    }
  }

  // =================== FACEBOOK BUSINESS METHODS ===================

  /**
   * Create or update a Facebook business profile
   */
  async createOrUpdateFacebookProfile(
    teamId: string,
    facebookUrl: string
  ): Promise<BusinessProfileResult> {
    
    console.log(`🏢 Creating/updating Facebook business profile for team ${teamId}, facebookUrl ${facebookUrl}`);
    
    try {
      // Initialize task tracking
      await this.taskTracker.findOrCreateTask(teamId, MarketPlatform.FACEBOOK, facebookUrl);

      // Check if team can add a Facebook business (only if one doesn't exist)
      const existingBusiness = await this.getFacebookBusinessByUrl(facebookUrl);
      if (!existingBusiness) {
        const canAdd = await this.teamService.canTeamAddBusinessForPlatform(teamId, MarketPlatform.FACEBOOK);
        if (!canAdd) {
          await this.taskTracker.failStep(
            teamId,
            MarketPlatform.FACEBOOK,
            BusinessCreationStep.CREATING_PROFILE,
            'Team already has a Facebook business profile. Only one business per platform is allowed.'
          );
          return {
            success: false,
            error: 'Team already has a Facebook business profile. Only one business per platform is allowed.'
          };
        }
      }

      // Start with business profile creation step
      await this.taskTracker.startStep(
        teamId,
        MarketPlatform.FACEBOOK,
        BusinessCreationStep.CREATING_PROFILE,
        'Creating/updating Facebook business profile...'
      );

      let businessProfileResult;
      
      if (existingBusiness) {
        console.log(`📝 Facebook business already exists, updating profile...`);
        
        await this.taskTracker.updateProgress(teamId, MarketPlatform.FACEBOOK, {
          step: BusinessCreationStep.CREATING_PROFILE,
          status: 'IN_PROGRESS' as any,
          message: 'Updating existing Facebook business profile...',
          progressPercent: 50
        });
        
        businessProfileResult = await this.businessProfileCreationService.createBusinessProfile(
          teamId,
          MarketPlatform.FACEBOOK,
          facebookUrl
        );
      } else {
        console.log(`🆕 Creating new Facebook business profile...`);
        
        await this.taskTracker.updateProgress(teamId, MarketPlatform.FACEBOOK, {
          step: BusinessCreationStep.CREATING_PROFILE,
          status: 'IN_PROGRESS' as any,
          message: 'Creating new Facebook business profile...',
          progressPercent: 50
        });
        
        businessProfileResult = await this.businessProfileCreationService.createBusinessProfile(
          teamId,
          MarketPlatform.FACEBOOK,
          facebookUrl
        );
      }

      if (!businessProfileResult.success) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.FACEBOOK,
          BusinessCreationStep.CREATING_PROFILE,
          businessProfileResult.error || 'Failed to create/update Facebook business profile'
        );
        return {
          success: false,
          error: businessProfileResult.error || 'Failed to create/update Facebook business profile'
        };
      }

      await this.taskTracker.completeStep(
        teamId,
        MarketPlatform.FACEBOOK,
        BusinessCreationStep.CREATING_PROFILE,
        'Facebook business profile created/updated successfully',
        { businessProfileId: businessProfileResult.businessProfileId }
      );

      // Step 2: Automatically trigger Facebook reviews collection
      console.log(`🔍 Triggering Facebook reviews collection...`);
      
      try {
        const reviewsResult = await this.getOrUpdateFacebookReviews(teamId, facebookUrl, true); // Force refresh
        
        if (reviewsResult.success) {
          console.log(`✅ Facebook reviews collection started: ${reviewsResult.message || 'Job scheduled'}`);
        } else {
          console.warn(`⚠️ Facebook reviews collection failed but continuing: ${reviewsResult.error}`);
          // Don't fail the entire flow if reviews fail - the profile creation was successful
        }
      } catch (reviewError) {
        console.warn(`⚠️ Error triggering Facebook reviews (continuing anyway):`, reviewError);
        // Don't fail the entire flow if reviews fail
      }

      // Return the business profile data
      const finalBusiness = await this.getFacebookBusinessByUrl(facebookUrl);
      
      return {
        success: true,
        businessId: businessProfileResult.businessProfileId || existingBusiness?.businessId,
        profileData: finalBusiness
      };

    } catch (error) {
      console.error(`❌ Error in Facebook business setup flow:`, error);
      
      // Try to mark current step as failed
      try {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.FACEBOOK,
          BusinessCreationStep.CREATING_PROFILE,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } catch (trackingError) {
        console.error('Failed to update task tracking:', trackingError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get or update reviews for a Facebook business
   */
  async getOrUpdateFacebookReviews(
    teamId: string,
    facebookUrl: string,
    forceRefresh: boolean = false
  ): Promise<ReviewsResult> {
    
    console.log(`🔵 Getting/updating Facebook reviews for team ${teamId}, facebookUrl ${facebookUrl}, forceRefresh: ${forceRefresh}`);
    
    try {
      // Start reviews fetching step
      await this.taskTracker.startStep(
        teamId,
        MarketPlatform.FACEBOOK,
        BusinessCreationStep.FETCHING_REVIEWS,
        'Starting Facebook reviews collection...'
      );

      // Check if Facebook business exists
      const business = await this.getFacebookBusinessByUrl(facebookUrl);
      if (!business) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.FACEBOOK,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Facebook business not found. Create Facebook business profile first.'
        );
        return {
          success: false,
          error: 'Facebook business not found. Create Facebook business profile first.'
        };
      }

      // Get team limits
      const teamLimits = await this.teamService.getTeamLimits(teamId);
      if (!teamLimits) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.FACEBOOK,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Team not found or inactive'
        );
        return {
          success: false,
          error: 'Team not found or inactive'
        };
      }

      await this.taskTracker.updateProgress(teamId, MarketPlatform.FACEBOOK, {
        step: BusinessCreationStep.FETCHING_REVIEWS,
        status: 'IN_PROGRESS' as any,
        message: 'Checking if reviews need to be refreshed...',
        progressPercent: 25
      });

      // Check if we need to refresh reviews
      const shouldRefresh = forceRefresh || await this.shouldRefreshFacebookReviews(business.businessId);
      
      if (!shouldRefresh) {
        const currentReviewsCount = await this.getFacebookReviewsCount(business.businessId);
        
        // Trigger analytics even when reviews are up to date (to ensure normalized tables are populated)
        try {
          console.log(`📊 Triggering Facebook analytics for up-to-date reviews...`);
          const { FacebookReviewAnalyticsService } = await import('./facebookReviewAnalyticsService');
          const analyticsService = new FacebookReviewAnalyticsService();
          await analyticsService.processReviewsAndUpdateDashboard(business.businessId);
          console.log(`✅ Facebook analytics completed for businessProfileId: ${business.businessId}`);
        } catch (analyticsError) {
          console.error(`❌ Error processing Facebook analytics for up-to-date reviews:`, analyticsError);
          // Don't fail the whole request if analytics fails
        }
        
        await this.taskTracker.completeStep(
          teamId,
          MarketPlatform.FACEBOOK,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Facebook reviews are up to date',
          { reviewsCount: currentReviewsCount, refreshed: false }
        );
        
        return {
          success: true,
          reviewsCount: currentReviewsCount,
          message: 'Facebook reviews are up to date'
        };
      }

      await this.taskTracker.updateProgress(teamId, MarketPlatform.FACEBOOK, {
        step: BusinessCreationStep.FETCHING_REVIEWS,
        status: 'IN_PROGRESS' as any,
        message: 'Scheduling Facebook review scraping job...',
        progressPercent: 50
      });

      // Create Facebook review scraping job
      const job = new FacebookBusinessReviewsActorJob({
        platform: MarketPlatform.FACEBOOK,
        teamId: teamId,
        pageUrl: facebookUrl,
        isInitialization: false,
        maxReviews: teamLimits.maxReviewsPerBusiness
      }, process.env.APIFY_TOKEN!);

      // Create proper ActorJob for scheduling
      const actor = new FacebookBusinessReviewsActor();
      actor.updateMemoryEstimate(false);
      
      const jobData = {
        platform: MarketPlatform.FACEBOOK,
        teamId: teamId,
        pageUrl: facebookUrl,
        isInitialization: false,
        maxReviews: teamLimits.maxReviewsPerBusiness
      };
      
      const actorJob = new ActorJob(
        `facebook-manual-${teamId}-${Date.now()}`,
        actor,
        jobData,
        async () => {
          await job.run();
          return true;
        }
      );

      await this.actorManager.schedule(actorJob, 'manual');
      
      console.log(`📝 Facebook review scraping job scheduled: ${actorJob.id}`);

      await this.taskTracker.completeStep(
        teamId,
        MarketPlatform.FACEBOOK,
        BusinessCreationStep.FETCHING_REVIEWS,
        'Facebook review scraping job scheduled successfully',
        { 
          jobId: actorJob.id, 
          maxReviews: teamLimits.maxReviewsPerBusiness,
          refreshed: true 
        }
      );
      
      return {
        success: true,
        jobId: actorJob.id,
        message: 'Facebook review scraping started'
      };

    } catch (error) {
      console.error(`❌ Error getting/updating Facebook reviews:`, error);
      
      // Try to mark step as failed
      try {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.FACEBOOK,
          BusinessCreationStep.FETCHING_REVIEWS,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } catch (trackingError) {
        console.error('Failed to update task tracking:', trackingError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get Facebook business data for a team
   */
  async getFacebookBusinessData(teamId: string): Promise<FacebookBusinessData | null> {
    try {
      const { data, error } = await this.supabase
        .from('FacebookBusinessProfile')
        .select(`
          id,
          teamId,
          title,
          facebookUrl,
          categories,
          phone,
          websites,
          scrapedAt,
          updatedAt
        `)
        .eq('teamId', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error getting Facebook business data:', error);
        return null;
      }

      return data ? {
        businessId: data.id,
        teamId: data.teamId,
        title: data.title || '',
        facebookUrl: data.facebookUrl,
        address: undefined, // Not available in new schema
        rating: undefined, // Would need to be calculated from reviews
        reviewsCount: undefined, // Would need to be calculated from reviews
        categories: data.categories || [],
        phone: data.phone,
        website: data.websites && data.websites.length > 0 ? data.websites[0] : undefined,
        scrapedAt: data.scrapedAt ? new Date(data.scrapedAt) : undefined,
        createdAt: data.scrapedAt ? new Date(data.scrapedAt) : new Date(),
        updatedAt: new Date(data.updatedAt)
      } : null;

    } catch (error) {
      console.error('Error getting Facebook business data:', error);
      return null;
    }
  }

  /**
   * Get Facebook reviews for a team's business
   */
  async getFacebookReviews(
    teamId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<FacebookReviewData[]> {
    try {
      const { data, error } = await this.supabase
        .from('FacebookReview')
        .select(`
          id,
          businessProfileId,
          userId,
          userName,
          text,
          date,
          isRecommended,
          likesCount,
          commentsCount,
          tags,
          scrapedAt,
          FacebookBusinessProfile!inner(teamId)
        `)
        .eq('FacebookBusinessProfile.teamId', teamId)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting Facebook reviews:', error);
        return [];
      }

      return data?.map(review => ({
        id: review.id,
        businessProfileId: review.businessProfileId,
        reviewerId: review.userId,
        name: review.userName,
        rating: review.isRecommended ? 5 : 1, // Convert Facebook recommendation to rating equivalent
        text: review.text || '',
        publishedAtDate: new Date(review.date),
        responseFromOwnerText: undefined, // Facebook doesn't have direct owner responses like Google
        responseFromOwnerDate: undefined,
        scrapedAt: new Date(review.scrapedAt)
      })) || [];

    } catch (error) {
      console.error('Error getting Facebook reviews:', error);
      return [];
    }
  }

  // =================== PRIVATE HELPER METHODS ===================

  /**
   * Get Google business by team (one-to-one relationship)
   */
  private async getGoogleBusinessByPlaceId(placeId: string): Promise<GoogleBusinessData | null> {
    try {
      // Since we now have one-to-one team relationship, we need to find by placeId first
      // then check if it matches the expected structure
      const { data, error } = await this.supabase
        .from('GoogleBusinessProfile')
        .select(`
          id,
          teamId,
          displayName,
          placeId,
          formattedAddress,
          rating,
          userRatingCount,
          types,
          nationalPhoneNumber,
          websiteUri,
          metadata:GoogleBusinessMetadata(
            createdAt,
            updatedAt
          )
        `)
        .eq('placeId', placeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error getting Google business by placeId:', error);
        return null;
      }

      return data ? {
        businessId: data.id,
        teamId: data.teamId,
        title: data.displayName || '',
        placeId: data.placeId || '',
        address: data.formattedAddress,
        rating: data.rating,
        reviewsCount: data.userRatingCount,
        categories: data.types || [],
        phone: data.nationalPhoneNumber,
        website: data.websiteUri,
        scrapedAt: undefined, // No longer in main schema
        createdAt: data.metadata && data.metadata[0]?.createdAt ? new Date(data.metadata[0].createdAt) : new Date(),
        updatedAt: data.metadata && data.metadata[0]?.updatedAt ? new Date(data.metadata[0].updatedAt) : new Date()
      } : null;

    } catch (error) {
      console.error('Error getting Google business by placeId:', error);
      return null;
    }
  }

  /**
   * Get Facebook business by URL
   */
  private async getFacebookBusinessByUrl(facebookUrl: string): Promise<FacebookBusinessData | null> {
    try {
      const { data, error } = await this.supabase
        .from('FacebookBusinessProfile')
        .select(`
          id,
          teamId,
          title,
          facebookUrl,
          categories,
          phone,
          websites,
          scrapedAt,
          updatedAt
        `)
        .eq('facebookUrl', facebookUrl)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error getting Facebook business by URL:', error);
        return null;
      }

      return data ? {
        businessId: data.id,
        teamId: data.teamId,
        title: data.title || '',
        facebookUrl: data.facebookUrl,
        address: undefined,
        rating: undefined,
        reviewsCount: undefined,
        categories: data.categories || [],
        phone: data.phone,
        website: data.websites && data.websites.length > 0 ? data.websites[0] : undefined,
        scrapedAt: data.scrapedAt ? new Date(data.scrapedAt) : undefined,
        createdAt: data.scrapedAt ? new Date(data.scrapedAt) : new Date(),
        updatedAt: new Date(data.updatedAt)
      } : null;

    } catch (error) {
      console.error('Error getting Facebook business by URL:', error);
      return null;
    }
  }

  /**
   * Check if Google reviews need refreshing
   */
  private async shouldRefreshGoogleReviews(businessId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('GoogleBusinessMetadata')
        .select('lastUpdateAt')
        .eq('businessProfileId', businessId)
        .single();

      if (error || !data) {
        return true; // If can't get data, assume refresh needed
      }

      if (!data.lastUpdateAt) {
        return true; // Never scraped
      }

      const lastScraped = new Date(data.lastUpdateAt);
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      return lastScraped < sixHoursAgo;
    } catch (error) {
      console.error('Error checking if Google reviews need refresh:', error);
      return true;
    }
  }

  /**
   * Check if Facebook reviews need refreshing
   */
  private async shouldRefreshFacebookReviews(businessId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('FacebookBusinessProfile')
        .select('scrapedAt')
        .eq('id', businessId)
        .single();

      if (error || !data) {
        return true; // If can't get data, assume refresh needed
      }

      if (!data.scrapedAt) {
        return true; // Never scraped
      }

      const lastScraped = new Date(data.scrapedAt);
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      return lastScraped < sixHoursAgo;
    } catch (error) {
      console.error('Error checking if Facebook reviews need refresh:', error);
      return true;
    }
  }

  /**
   * Get Google reviews count
   */
  private async getGoogleReviewsCount(businessId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('GoogleReview')
        .select('*', { count: 'exact', head: true })
        .eq('businessProfileId', businessId);

      if (error) {
        console.error('Error getting Google reviews count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting Google reviews count:', error);
      return 0;
    }
  }

  /**
   * Get Facebook reviews count
   */
  private async getFacebookReviewsCount(businessId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('FacebookReview')
        .select('*', { count: 'exact', head: true })
        .eq('businessProfileId', businessId);

      if (error) {
        console.error('Error getting Facebook reviews count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting Facebook reviews count:', error);
      return 0;
    }
  }

  /**
   * Create or update a TripAdvisor business profile
   */
  async createOrUpdateTripAdvisorProfile(
    teamId: string,
    tripAdvisorUrl: string
  ): Promise<BusinessProfileResult> {
    
    console.log(`🟠 Creating/updating TripAdvisor business profile for team ${teamId}, tripAdvisorUrl ${tripAdvisorUrl}`);
    
    try {
      // Initialize task tracking
      await this.taskTracker.findOrCreateTask(teamId, MarketPlatform.TRIPADVISOR, tripAdvisorUrl);

      // Check if business already exists
      const existingBusiness = await this.getTripAdvisorBusinessByUrl(tripAdvisorUrl);
      
      // Check if team can add more businesses for TripAdvisor platform (only if business doesn't exist)
      if (!existingBusiness) {
        const canAdd = await this.teamService.canTeamAddBusinessForPlatform(teamId, MarketPlatform.TRIPADVISOR);
        if (!canAdd) {
          await this.taskTracker.failStep(
            teamId,
            MarketPlatform.TRIPADVISOR,
            BusinessCreationStep.CREATING_PROFILE,
            'Team already has a TripAdvisor business profile. Only one business per platform is allowed.'
          );
          return {
            success: false,
            error: 'Team already has a TripAdvisor business profile. Only one business per platform is allowed.'
          };
        }
      }

      // Start with business profile creation step
      await this.taskTracker.startStep(
        teamId,
        MarketPlatform.TRIPADVISOR,
        BusinessCreationStep.CREATING_PROFILE,
        'Creating/updating TripAdvisor business profile...'
      );

      let businessProfileResult;
      
      if (existingBusiness) {
        console.log(`📝 TripAdvisor business already exists, updating profile...`);
        
        await this.taskTracker.updateProgress(teamId, MarketPlatform.TRIPADVISOR, {
          step: BusinessCreationStep.CREATING_PROFILE,
          status: 'IN_PROGRESS' as any,
          message: 'Updating existing TripAdvisor business profile...',
          progressPercent: 50
        });
        
        businessProfileResult = await this.businessProfileCreationService.createBusinessProfile(
          teamId,
          MarketPlatform.TRIPADVISOR,
          tripAdvisorUrl
        );
      } else {
        console.log(`🆕 Creating new TripAdvisor business profile...`);
        
        await this.taskTracker.updateProgress(teamId, MarketPlatform.TRIPADVISOR, {
          step: BusinessCreationStep.CREATING_PROFILE,
          status: 'IN_PROGRESS' as any,
          message: 'Creating new TripAdvisor business profile...',
          progressPercent: 50
        });
        
        businessProfileResult = await this.businessProfileCreationService.createBusinessProfile(
          teamId,
          MarketPlatform.TRIPADVISOR,
          tripAdvisorUrl
        );
      }

      if (!businessProfileResult.success) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.TRIPADVISOR,
          BusinessCreationStep.CREATING_PROFILE,
          businessProfileResult.error || 'Failed to create/update TripAdvisor business profile'
        );
        return {
          success: false,
          error: businessProfileResult.error || 'Failed to create/update TripAdvisor business profile'
        };
      }

      await this.taskTracker.completeStep(
        teamId,
        MarketPlatform.TRIPADVISOR,
        BusinessCreationStep.CREATING_PROFILE,
        'TripAdvisor business profile created/updated successfully',
        { businessProfileId: businessProfileResult.businessProfileId }
      );

      // Step 2: Automatically trigger TripAdvisor reviews collection
      console.log(`🔍 Triggering TripAdvisor reviews collection...`);
      
      try {
        const reviewsResult = await this.getOrUpdateTripAdvisorReviews(teamId, tripAdvisorUrl, true); // Force refresh
        
        if (reviewsResult.success) {
          console.log(`✅ TripAdvisor reviews collection started: ${reviewsResult.message || 'Job scheduled'}`);
        } else {
          console.warn(`⚠️ TripAdvisor reviews collection failed but continuing: ${reviewsResult.error}`);
          // Don't fail the entire flow if reviews fail - the profile creation was successful
        }
      } catch (reviewError) {
        console.warn(`⚠️ Error triggering TripAdvisor reviews (continuing anyway):`, reviewError);
        // Don't fail the entire flow if reviews fail
      }

      // Return the business profile data
      const finalBusiness = await this.getTripAdvisorBusinessByUrl(tripAdvisorUrl);
      
      return {
        success: true,
        businessId: businessProfileResult.businessProfileId || existingBusiness?.businessId,
        profileData: finalBusiness
      };

    } catch (error) {
      console.error(`❌ Error in TripAdvisor business setup flow:`, error);
      
      // Try to mark current step as failed
      try {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.TRIPADVISOR,
          BusinessCreationStep.CREATING_PROFILE,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } catch (trackingError) {
        console.error('Failed to update task tracking:', trackingError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get or update TripAdvisor reviews for a business
   */
  async getOrUpdateTripAdvisorReviews(
    teamId: string,
    tripAdvisorUrl: string,
    forceRefresh: boolean = false
  ): Promise<ReviewsResult> {
    
    console.log(`🟠 Getting/updating TripAdvisor reviews for team ${teamId}, tripAdvisorUrl ${tripAdvisorUrl}, forceRefresh: ${forceRefresh}`);
    
    try {
      // Start reviews fetching step
      await this.taskTracker.startStep(
        teamId,
        MarketPlatform.TRIPADVISOR,
        BusinessCreationStep.FETCHING_REVIEWS,
        'Starting TripAdvisor reviews collection...'
      );

      // Find the business profile
      const business = await this.getTripAdvisorBusinessByUrl(tripAdvisorUrl);
      if (!business) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.TRIPADVISOR,
          BusinessCreationStep.FETCHING_REVIEWS,
          'TripAdvisor business profile not found. Please create the profile first.'
        );
        return {
          success: false,
          error: 'TripAdvisor business profile not found. Please create the profile first.'
        };
      }

      // Get team limits for this user 
      const teamLimits = await this.teamService.getTeamLimits(teamId);
      if (!teamLimits) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.TRIPADVISOR,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Team not found or inactive'
        );
        return {
          success: false,
          error: 'Team not found or inactive'
        };
      }

      await this.taskTracker.updateProgress(teamId, MarketPlatform.TRIPADVISOR, {
        step: BusinessCreationStep.FETCHING_REVIEWS,
        status: 'IN_PROGRESS' as any,
        message: 'Checking if reviews need to be refreshed...',
        progressPercent: 25
      });

      // Check if we should refresh reviews
      const shouldRefresh = forceRefresh || await this.shouldRefreshTripAdvisorReviews(business.businessId);
      
      if (!shouldRefresh) {
        const reviewCount = await this.getTripAdvisorReviewsCount(business.businessId);
        await this.taskTracker.completeStep(
          teamId,
          MarketPlatform.TRIPADVISOR,
          BusinessCreationStep.FETCHING_REVIEWS,
          'TripAdvisor reviews are up to date',
          { reviewsCount: reviewCount, refreshed: false }
        );
        return {
          success: true,
          reviewsCount: reviewCount,
          message: 'TripAdvisor reviews are up to date'
        };
      }

      await this.taskTracker.updateProgress(teamId, MarketPlatform.TRIPADVISOR, {
        step: BusinessCreationStep.FETCHING_REVIEWS,
        status: 'IN_PROGRESS' as any,
        message: 'Scheduling TripAdvisor review scraping job...',
        progressPercent: 50
      });

      // Extract location ID from URL or use stored one
      let locationId = business.locationId;
      if (!locationId) {
        const urlMatch = tripAdvisorUrl.match(/d(\d+)/);
        if (urlMatch) {
          locationId = urlMatch[1];
        }
      }

      if (!locationId) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.TRIPADVISOR,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Could not extract location ID from TripAdvisor URL'
        );
        return {
          success: false,
          error: 'Could not extract location ID from TripAdvisor URL'
        };
      }

      // Create TripAdvisorBusinessReviewsActorJob instance
      const job = new TripAdvisorBusinessReviewsActorJob({
        platform: MarketPlatform.TRIPADVISOR,
        teamId: teamId,
        locationId: locationId,
        tripAdvisorUrl: tripAdvisorUrl,
        isInitialization: false,
        maxReviews: teamLimits.maxReviewsPerBusiness
      }, process.env.APIFY_TOKEN!);

      // Create proper ActorJob for scheduling
      const actor = new TripAdvisorBusinessReviewsActor();
      actor.updateMemoryEstimate(false);
      
      const jobData = {
        platform: MarketPlatform.TRIPADVISOR,
        teamId: teamId,
        locationId: locationId,
        tripAdvisorUrl: tripAdvisorUrl,
        isInitialization: false,
        maxReviews: teamLimits.maxReviewsPerBusiness
      };
      
      const actorJob = new ActorJob(
        `tripadvisor-manual-${teamId}-${locationId}-${Date.now()}`,
        actor,
        jobData,
        async () => {
          await job.run();
          return true;
        }
      );

      await this.actorManager.schedule(actorJob, 'manual');
      
      console.log(`📝 TripAdvisor review scraping job scheduled: ${actorJob.id}`);

      await this.taskTracker.completeStep(
        teamId,
        MarketPlatform.TRIPADVISOR,
        BusinessCreationStep.FETCHING_REVIEWS,
        'TripAdvisor review scraping job scheduled successfully',
        { 
          jobId: actorJob.id, 
          maxReviews: teamLimits.maxReviewsPerBusiness,
          refreshed: true 
        }
      );
      
      return {
        success: true,
        jobId: actorJob.id,
        message: 'TripAdvisor review scraping job scheduled'
      };

    } catch (error) {
      console.error(`❌ Error getting/updating TripAdvisor reviews:`, error);
      
      // Try to mark step as failed
      try {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.TRIPADVISOR,
          BusinessCreationStep.FETCHING_REVIEWS,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } catch (trackingError) {
        console.error('Failed to update task tracking:', trackingError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get TripAdvisor business data for a team
   */
  async getTripAdvisorBusinessData(teamId: string): Promise<TripAdvisorBusinessData | null> {
    try {
      const { data, error } = await this.supabase
        .from('TripAdvisorBusinessProfile')
        .select(`
          id,
          teamId,
          name,
          tripAdvisorUrl,
          locationId,
          address,
          rating,
          numberOfReviews,
          phone,
          website,
          scrapedAt,
          createdAt,
          updatedAt,
          TripAdvisorBusinessSubcategory(
            subcategory
          )
        `)
        .eq('teamId', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Extract subcategories from the related table
      const subcategories = Array.isArray(data.TripAdvisorBusinessSubcategory) 
        ? data.TripAdvisorBusinessSubcategory.map((sub: any) => sub.subcategory)
        : [];

      return {
        businessId: data.id,
        teamId: data.teamId,
        title: data.name,
        tripAdvisorUrl: data.tripAdvisorUrl,
        locationId: data.locationId,
        address: data.address,
        rating: data.rating,
        reviewsCount: data.numberOfReviews,
        categories: subcategories, // Now uses relational data
        phone: data.phone,
        website: data.website,
        scrapedAt: data.scrapedAt ? new Date(data.scrapedAt) : undefined,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
    } catch (error) {
      console.error('Error fetching TripAdvisor business data:', error);
      return null;
    }
  }

  /**
   * Get TripAdvisor reviews for a team
   */
  async getTripAdvisorReviews(
    teamId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<TripAdvisorReviewData[]> {
    try {
      const { data, error } = await this.supabase
        .from('TripAdvisorReview')
        .select(`
          id,
          businessProfileId,
          reviewerId,
          reviewerName,
          rating,
          text,
          publishedDate,
          visitDate,
          tripType,
          helpfulVotes,
          responseFromOwnerText,
          responseFromOwnerDate,
          scrapedAt,
          TripAdvisorBusinessProfile!inner(teamId)
        `)
        .eq('TripAdvisorBusinessProfile.teamId', teamId)
        .order('publishedDate', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data.map(review => ({
        id: review.id,
        businessProfileId: review.businessProfileId,
        reviewerId: review.reviewerId,
        name: review.reviewerName,
        rating: review.rating,
        text: review.text || '',
        publishedAtDate: new Date(review.publishedDate),
        visitDate: review.visitDate ? new Date(review.visitDate) : undefined,
        tripType: review.tripType,
        helpfulVotes: review.helpfulVotes,
        responseFromOwnerText: review.responseFromOwnerText,
        responseFromOwnerDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : undefined,
        scrapedAt: new Date(review.scrapedAt)
      }));
    } catch (error) {
      console.error('Error fetching TripAdvisor reviews:', error);
      return [];
    }
  }

  private async getTripAdvisorBusinessByUrl(tripAdvisorUrl: string): Promise<TripAdvisorBusinessData | null> {
    try {
      const { data, error } = await this.supabase
        .from('TripAdvisorBusinessProfile')
        .select(`
          id,
          teamId,
          name,
          tripAdvisorUrl,
          locationId,
          address,
          rating,
          numberOfReviews,
          phone,
          website,
          scrapedAt,
          createdAt,
          updatedAt,
          TripAdvisorBusinessSubcategory(
            subcategory
          )
        `)
        .eq('tripAdvisorUrl', tripAdvisorUrl)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Extract subcategories from the related table
      const subcategories = Array.isArray(data.TripAdvisorBusinessSubcategory) 
        ? data.TripAdvisorBusinessSubcategory.map((sub: any) => sub.subcategory)
        : [];

      return {
        businessId: data.id,
        teamId: data.teamId,
        title: data.name,
        tripAdvisorUrl: data.tripAdvisorUrl,
        locationId: data.locationId,
        address: data.address,
        rating: data.rating,
        reviewsCount: data.numberOfReviews,
        categories: subcategories, // Now uses relational data
        phone: data.phone,
        website: data.website,
        scrapedAt: data.scrapedAt ? new Date(data.scrapedAt) : undefined,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
    } catch (error) {
      console.error('Error fetching TripAdvisor business by URL:', error);
      return null;
    }
  }

  private async shouldRefreshTripAdvisorReviews(businessId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('TripAdvisorBusinessProfile')
        .select('scrapedAt')
        .eq('id', businessId)
        .single();

      if (error || !data) {
        return true; // If we can't determine, refresh
      }

      if (!data.scrapedAt) {
        return true; // Never scraped
      }

      // Refresh if last scrape was more than 24 hours ago
      const lastScrape = new Date(data.scrapedAt);
      const now = new Date();
      const hoursSinceLastScrape = (now.getTime() - lastScrape.getTime()) / (1000 * 60 * 60);
      
      return hoursSinceLastScrape > 24;
    } catch (error) {
      console.error('Error checking TripAdvisor refresh status:', error);
      return true; // If error, refresh to be safe
    }
  }

  private async getTripAdvisorReviewsCount(businessId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('TripAdvisorReview')
        .select('*', { count: 'exact', head: true })
        .eq('businessProfileId', businessId);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting TripAdvisor reviews count:', error);
      return 0;
    }
  }

  // =================== BOOKING.COM BUSINESS METHODS ===================

  /**
   * Create or update a Booking.com business profile
   */
  async createOrUpdateBookingProfile(
    teamId: string,
    bookingUrl: string
  ): Promise<BusinessProfileResult> {
    
    console.log(`🏨 Creating/updating Booking.com business profile for team ${teamId}, bookingUrl ${bookingUrl}`);
    
    try {
      // Initialize task tracking
      await this.taskTracker.findOrCreateTask(teamId, MarketPlatform.BOOKING, bookingUrl);

      // Check if business already exists
      const existingBusiness = await this.getBookingBusinessByUrl(bookingUrl);
      
      // Check if team can add more businesses for Booking.com platform (only if business doesn't exist)
      if (!existingBusiness) {
        const canAdd = await this.teamService.canTeamAddBusinessForPlatform(teamId, MarketPlatform.BOOKING);
        if (!canAdd) {
          await this.taskTracker.failStep(
            teamId,
            MarketPlatform.BOOKING,
            BusinessCreationStep.CREATING_PROFILE,
            'Team already has a Booking.com business profile. Only one business per platform is allowed.'
          );
          return {
            success: false,
            error: 'Team already has a Booking.com business profile. Only one business per platform is allowed.'
          };
        }
      }

      // Start with business profile creation step
      await this.taskTracker.startStep(
        teamId,
        MarketPlatform.BOOKING,
        BusinessCreationStep.CREATING_PROFILE,
        'Creating/updating Booking.com business profile...'
      );

      let businessProfileResult;
      
      if (existingBusiness) {
        console.log(`📝 Booking.com business already exists, updating profile...`);
        
        await this.taskTracker.updateProgress(teamId, MarketPlatform.BOOKING, {
          step: BusinessCreationStep.CREATING_PROFILE,
          status: 'IN_PROGRESS' as any,
          message: 'Updating existing Booking.com business profile...',
          progressPercent: 50
        });
        
        businessProfileResult = await this.businessProfileCreationService.createBusinessProfile(
          teamId,
          MarketPlatform.BOOKING,
          bookingUrl
        );
      } else {
        console.log(`🆕 Creating new Booking.com business profile...`);
        
        await this.taskTracker.updateProgress(teamId, MarketPlatform.BOOKING, {
          step: BusinessCreationStep.CREATING_PROFILE,
          status: 'IN_PROGRESS' as any,
          message: 'Creating new Booking.com business profile...',
          progressPercent: 50
        });
        
        businessProfileResult = await this.businessProfileCreationService.createBusinessProfile(
          teamId,
          MarketPlatform.BOOKING,
          bookingUrl
        );
      }

      if (!businessProfileResult.success) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.BOOKING,
          BusinessCreationStep.CREATING_PROFILE,
          businessProfileResult.error || 'Failed to create/update Booking.com business profile'
        );
        return {
          success: false,
          error: businessProfileResult.error || 'Failed to create/update Booking.com business profile'
        };
      }

      await this.taskTracker.completeStep(
        teamId,
        MarketPlatform.BOOKING,
        BusinessCreationStep.CREATING_PROFILE,
        'Booking.com business profile created/updated successfully',
        { businessProfileId: businessProfileResult.businessProfileId }
      );

      // Step 2: Automatically trigger Booking.com reviews collection
      console.log(`🔍 Triggering Booking.com reviews collection...`);
      
      try {
        const reviewsResult = await this.getOrUpdateBookingReviews(teamId, bookingUrl, true); // Force refresh
        
        if (reviewsResult.success) {
          console.log(`✅ Booking.com reviews collection started: ${reviewsResult.message || 'Job scheduled'}`);
        } else {
          console.warn(`⚠️ Booking.com reviews collection failed but continuing: ${reviewsResult.error}`);
          // Don't fail the entire flow if reviews fail - the profile creation was successful
        }
      } catch (reviewError) {
        console.warn(`⚠️ Error triggering Booking.com reviews (continuing anyway):`, reviewError);
        // Don't fail the entire flow if reviews fail
      }

      // Return the business profile data
      const finalBusiness = await this.getBookingBusinessByUrl(bookingUrl);
      
      return {
        success: true,
        businessId: businessProfileResult.businessProfileId || existingBusiness?.businessId,
        profileData: finalBusiness
      };

    } catch (error) {
      console.error(`❌ Error in Booking.com business setup flow:`, error);
      
      // Try to mark current step as failed
      try {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.BOOKING,
          BusinessCreationStep.CREATING_PROFILE,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } catch (trackingError) {
        console.error('Failed to update task tracking:', trackingError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get or update Booking.com reviews for a business
   */
  async getOrUpdateBookingReviews(
    teamId: string,
    bookingUrl: string,
    forceRefresh: boolean = false
  ): Promise<ReviewsResult> {
    
    console.log(`🏨 Getting/updating Booking.com reviews for team ${teamId}, bookingUrl ${bookingUrl}, forceRefresh: ${forceRefresh}`);
    
    try {
      // Start reviews fetching step
      await this.taskTracker.startStep(
        teamId,
        MarketPlatform.BOOKING,
        BusinessCreationStep.FETCHING_REVIEWS,
        'Starting Booking.com reviews collection...'
      );

      // Find the business profile
      const business = await this.getBookingBusinessByUrl(bookingUrl);
      if (!business) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.BOOKING,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Booking.com business profile not found. Please create the profile first.'
        );
        return {
          success: false,
          error: 'Booking.com business profile not found. Please create the profile first.'
        };
      }

      // Get team limits for this user 
      const teamLimits = await this.teamService.getTeamLimits(teamId);
      if (!teamLimits) {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.BOOKING,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Team not found or inactive'
        );
        return {
          success: false,
          error: 'Team not found or inactive'
        };
      }

      await this.taskTracker.updateProgress(teamId, MarketPlatform.BOOKING, {
        step: BusinessCreationStep.FETCHING_REVIEWS,
        status: 'IN_PROGRESS' as any,
        message: 'Checking if reviews need to be refreshed...',
        progressPercent: 25
      });

      // Check if we should refresh reviews
      const shouldRefresh = forceRefresh || await this.shouldRefreshBookingReviews(business.businessId);
      
      if (!shouldRefresh) {
        const reviewCount = await this.getBookingReviewsCount(business.businessId);
        
        // Trigger analytics even when reviews are up to date (to ensure normalized tables are populated)
        try {
          console.log(`📊 Triggering Booking.com analytics for up-to-date reviews...`);
          const { BookingReviewAnalyticsService } = await import('./bookingReviewAnalyticsService');
          const analyticsService = new BookingReviewAnalyticsService();
          await analyticsService.processReviewsAndUpdateDashboard(business.businessId);
          console.log(`✅ Booking.com analytics completed for businessProfileId: ${business.businessId}`);
        } catch (analyticsError) {
          console.error(`❌ Error processing Booking.com analytics for up-to-date reviews:`, analyticsError);
          // Don't fail the whole request if analytics fails
        }
        
        await this.taskTracker.completeStep(
          teamId,
          MarketPlatform.BOOKING,
          BusinessCreationStep.FETCHING_REVIEWS,
          'Booking.com reviews are up to date',
          { reviewsCount: reviewCount, refreshed: false }
        );
        
        return {
          success: true,
          reviewsCount: reviewCount,
          message: 'Booking.com reviews are up to date'
        };
      }

      await this.taskTracker.updateProgress(teamId, MarketPlatform.BOOKING, {
        step: BusinessCreationStep.FETCHING_REVIEWS,
        status: 'IN_PROGRESS' as any,
        message: 'Scheduling Booking.com review scraping job...',
        progressPercent: 50
      });

      // Create Booking.com review scraping job
      const jobData = ReviewActorJobFactory.createBookingJob(
        bookingUrl,
        teamId,
        false, // Not initialization
        teamLimits.maxReviewsPerBusiness
      );

      // Create proper ActorJob for scheduling
      const actor = new BookingBusinessReviewsActor();
      actor.updateMemoryEstimate(false);
      
      const actorJob = new ActorJob(
        `booking-manual-${teamId}-${Date.now()}`,
        actor,
        jobData,
        async (actor, data) => {
          const { handleBookingBusinessReviews } = await import('../apifyService/actors/bookingBusinessReviewsActor');
          return await handleBookingBusinessReviews(data);
        }
      );

      await this.actorManager.schedule(actorJob, 'manual');
      
      console.log(`📝 Booking.com review scraping job scheduled: ${actorJob.id}`);

      await this.taskTracker.completeStep(
        teamId,
        MarketPlatform.BOOKING,
        BusinessCreationStep.FETCHING_REVIEWS,
        'Booking.com review scraping job scheduled successfully',
        { 
          jobId: actorJob.id, 
          maxReviews: teamLimits.maxReviewsPerBusiness,
          refreshed: true 
        }
      );
      
      return {
        success: true,
        jobId: actorJob.id,
        message: 'Booking.com review scraping job scheduled'
      };

    } catch (error) {
      console.error(`❌ Error getting/updating Booking.com reviews:`, error);
      
      // Try to mark step as failed
      try {
        await this.taskTracker.failStep(
          teamId,
          MarketPlatform.BOOKING,
          BusinessCreationStep.FETCHING_REVIEWS,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } catch (trackingError) {
        console.error('Failed to update task tracking:', trackingError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get Booking.com business data for a team
   */
  async getBookingBusinessData(teamId: string): Promise<BookingBusinessData | null> {
    try {
      const { data, error } = await this.supabase
        .from('BookingBusinessProfile')
        .select(`
          id,
          teamId,
          name,
          bookingUrl,
          hotelId,
          address,
          rating,
          numberOfReviews,
          propertyType,
          phone,
          website,
          scrapedAt,
          createdAt,
          updatedAt
        `)
        .eq('teamId', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return {
        businessId: data.id,
        teamId: data.teamId,
        title: data.name,
        bookingUrl: data.bookingUrl,
        hotelId: data.hotelId,
        address: data.address,
        rating: data.rating,
        reviewsCount: data.numberOfReviews,
        propertyType: data.propertyType,
        phone: data.phone,
        website: data.website,
        scrapedAt: data.scrapedAt ? new Date(data.scrapedAt) : undefined,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
    } catch (error) {
      console.error('Error fetching Booking.com business data:', error);
      return null;
    }
  }

  /**
   * Get Booking.com reviews for a team
   */
  async getBookingReviews(
    teamId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<BookingReviewData[]> {
    try {
      const { data, error } = await this.supabase
        .from('BookingReview')
        .select(`
          id,
          businessProfileId,
          reviewerId,
          reviewerName,
          rating,
          text,
          publishedDate,
          stayDate,
          lengthOfStay,
          roomType,
          guestType,
          likedMost,
          dislikedMost,
          cleanlinessRating,
          comfortRating,
          locationRating,
          facilitiesRating,
          staffRating,
          valueForMoneyRating,
          wifiRating,
          responseFromOwnerText,
          responseFromOwnerDate,
          isVerifiedStay,
          scrapedAt,
          BookingBusinessProfile!inner(teamId)
        `)
        .eq('BookingBusinessProfile.teamId', teamId)
        .order('publishedDate', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data.map(review => ({
        id: review.id,
        businessProfileId: review.businessProfileId,
        reviewerId: review.reviewerId || 'unknown',
        name: review.reviewerName,
        rating: review.rating,
        text: review.text || '',
        publishedAtDate: new Date(review.publishedDate),
        stayDate: review.stayDate ? new Date(review.stayDate) : undefined,
        lengthOfStay: review.lengthOfStay,
        roomType: review.roomType,
        guestType: review.guestType,
        likedMost: review.likedMost,
        dislikedMost: review.dislikedMost,
        cleanlinessRating: review.cleanlinessRating,
        comfortRating: review.comfortRating,
        locationRating: review.locationRating,
        facilitiesRating: review.facilitiesRating,
        staffRating: review.staffRating,
        valueForMoneyRating: review.valueForMoneyRating,
        wifiRating: review.wifiRating,
        responseFromOwnerText: review.responseFromOwnerText,
        responseFromOwnerDate: review.responseFromOwnerDate ? new Date(review.responseFromOwnerDate) : undefined,
        isVerifiedStay: review.isVerifiedStay,
        scrapedAt: new Date(review.scrapedAt)
      }));
    } catch (error) {
      console.error('Error fetching Booking.com reviews:', error);
      return [];
    }
  }

  private async getBookingBusinessByUrl(bookingUrl: string): Promise<BookingBusinessData | null> {
    try {
      const { data, error } = await this.supabase
        .from('BookingBusinessProfile')
        .select(`
          id,
          teamId,
          name,
          bookingUrl,
          hotelId,
          address,
          rating,
          numberOfReviews,
          propertyType,
          phone,
          website,
          scrapedAt,
          createdAt,
          updatedAt
        `)
        .eq('bookingUrl', bookingUrl)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return {
        businessId: data.id,
        teamId: data.teamId,
        title: data.name,
        bookingUrl: data.bookingUrl,
        hotelId: data.hotelId,
        address: data.address,
        rating: data.rating,
        reviewsCount: data.numberOfReviews,
        propertyType: data.propertyType,
        phone: data.phone,
        website: data.website,
        scrapedAt: data.scrapedAt ? new Date(data.scrapedAt) : undefined,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
    } catch (error) {
      console.error('Error fetching Booking.com business by URL:', error);
      return null;
    }
  }

  private async shouldRefreshBookingReviews(businessId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('BookingBusinessProfile')
        .select('scrapedAt')
        .eq('id', businessId)
        .single();

      if (error || !data) {
        return true; // If we can't determine, refresh
      }

      if (!data.scrapedAt) {
        return true; // Never scraped
      }

      // Refresh if last scrape was more than 24 hours ago
      const lastScrape = new Date(data.scrapedAt);
      const now = new Date();
      const hoursSinceLastScrape = (now.getTime() - lastScrape.getTime()) / (1000 * 60 * 60);
      
      return hoursSinceLastScrape > 24;
    } catch (error) {
      console.error('Error checking Booking.com refresh status:', error);
      return true; // If error, refresh to be safe
    }
  }

  private async getBookingReviewsCount(businessId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('BookingReview')
        .select('*', { count: 'exact', head: true })
        .eq('businessProfileId', businessId);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting Booking.com reviews count:', error);
      return 0;
    }
  }

  async close(): Promise<void> {
    await this.businessProfileCreationService.close();
    await this.teamService.close();
    await this.taskTracker.close();
    // Supabase client doesn't need explicit closing
  }
} 