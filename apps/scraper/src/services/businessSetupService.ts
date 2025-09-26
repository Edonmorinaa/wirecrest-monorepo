import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MarketPlatform } from '@prisma/client';
import { DataCleanupService } from './dataCleanupService';
import { BusinessProfileCreationService } from './businessProfileCreationService';
import { ActorManager } from '../apifyService/actorManager';
import { GoogleBusinessReviewsActorJob } from '../apifyService/actors/googleBusinessReviewsActor';
import { FacebookBusinessReviewsActorJob } from '../apifyService/actors/facebookBusinessReviewsActor';
import { TeamService } from '../supabase/teamService';
import { GoogleBusinessReviewsActor } from '../apifyService/actors/googleBusinessReviewsActor';
import { FacebookBusinessReviewsActor } from '../apifyService/actors/facebookBusinessReviewsActor';
import { ActorJob } from '../apifyService/actors/actor';

interface BusinessSetupStatus {
  status: 'loading' | 'completed' | 'error';
  message: string;
  error?: string;
  updatedAt: Date;
}

export class BusinessSetupService {
  private supabase: SupabaseClient;
  private dataCleanupService: DataCleanupService;
  private businessProfileCreationService: BusinessProfileCreationService;
  private actorManager: ActorManager;
  private teamService: TeamService;
  private googleApiKey: string;

  constructor(
    actorManager: ActorManager
  ) {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const apifyToken = process.env.APIFY_TOKEN!;
    const googleApiKey = process.env.GOOGLE_API_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    this.dataCleanupService = new DataCleanupService();
    this.businessProfileCreationService = new BusinessProfileCreationService(apifyToken);
    this.actorManager = actorManager;
    this.teamService = new TeamService();
    this.googleApiKey = googleApiKey;

    if (!this.googleApiKey) {
      console.warn('[WARN] Google API Key not provided to BusinessSetupService. Google profile functionality will be affected.');
    }
  }

  /**
   * Complete business setup in one simple flow
   */
  async setupBusiness(
    teamId: string, 
    platform: MarketPlatform, 
    identifier: string
  ): Promise<{ success: boolean; businessId?: string; error?: string }> {
    
    console.log(`🚀 Starting business setup for team ${teamId}, platform ${platform}, identifier ${identifier}`);
    
    try {
      // Step 1: Mark as loading
      await this.updateStatus(teamId, 'loading', 'Starting business setup...');

      // Step 2: Clean up old data if exists
      console.log('🧹 Cleaning up old data...');
      await this.updateStatus(teamId, 'loading', 'Cleaning up existing data...');
      
      const existingData = await this.checkExistingData(teamId, platform);
      if (existingData.businessProfileId && existingData.oldIdentifier) {
        await this.dataCleanupService.cleanupTeamPlatformData(
          teamId,
          platform,
          existingData.oldIdentifier
        );
      }

      // Step 3: Create business profile
      console.log('🏢 Creating business profile...');
      await this.updateStatus(teamId, 'loading', 'Creating business profile...');
      
      const profileResult = await this.businessProfileCreationService.createBusinessProfile(
        teamId,
        platform,
        identifier
      );

      if (!profileResult.success) {
        throw new Error(profileResult.error || 'Failed to create business profile');
      }

      // Step 4: Trigger review scraping
      console.log('🔍 Starting review collection...');
      await this.updateStatus(teamId, 'loading', 'Collecting customer reviews...');
      
      await this.triggerReviewScraping(teamId, platform, identifier);

      // Step 5: Mark as completed
      await this.updateStatus(teamId, 'completed', 'Business setup complete! Your analytics are ready.');
      
      console.log(`✅ Business setup completed for team ${teamId}`);
      
      return { 
        success: true, 
        businessId: profileResult.businessProfileId 
      };

    } catch (error) {
      console.error(`❌ Business setup failed for team ${teamId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await this.updateStatus(teamId, 'error', 'Setup failed', errorMessage);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  /**
   * Get current business setup status
   */
  async getStatus(teamId: string): Promise<BusinessSetupStatus> {
    try {
      const { data, error } = await this.supabase
        .from('BusinessSetupStatus')
        .select('status, message, error, updatedAt')
        .eq('teamId', teamId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No status record exists, check if business is already set up
        const hasExistingBusiness = await this.checkIfBusinessExists(teamId);
        
        if (hasExistingBusiness) {
          return {
            status: 'completed',
            message: 'Business analytics ready',
            updatedAt: new Date()
          };
        }
        
        return {
          status: 'loading',
          message: 'Business setup not started',
          updatedAt: new Date()
        };
      }

      if (error) {
        console.error('Error getting business status:', error);
        return {
          status: 'error',
          message: 'Failed to check status',
          error: error.message,
          updatedAt: new Date()
        };
      }

      return {
        ...data,
        updatedAt: new Date(data.updatedAt)
      };
    } catch (error) {
      console.error('Error getting business status:', error);
      return {
        status: 'error',
        message: 'Failed to check status',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date()
      };
    }
  }

  /**
   * Update business setup status
   */
  private async updateStatus(
    teamId: string, 
    status: 'loading' | 'completed' | 'error', 
    message: string,
    error?: string
  ): Promise<void> {
    try {
      const { error: upsertError } = await this.supabase
        .from('BusinessSetupStatus')
        .upsert({
          teamId,
          status,
          message,
          error: error || null,
          updatedAt: new Date().toISOString()
        }, {
          onConflict: 'teamId'
        });

      if (upsertError) {
        console.error('Error updating business status:', upsertError);
      }
    } catch (error) {
      console.error('Error updating business status:', error);
    }
  }

  /**
   * Check if business already exists for team
   */
  private async checkIfBusinessExists(teamId: string): Promise<boolean> {
    try {
      const [googleResult, facebookResult] = await Promise.all([
        this.supabase
          .from('GoogleBusinessProfile')
          .select('id', { count: 'exact', head: true })
          .eq('teamId', teamId),
        this.supabase
          .from('FacebookBusinessProfile')
          .select('id', { count: 'exact', head: true })
          .eq('teamId', teamId)
      ]);

      const googleCount = googleResult.count || 0;
      const facebookCount = facebookResult.count || 0;
      const totalBusinesses = googleCount + facebookCount;
      
      return totalBusinesses > 0;
    } catch (error) {
      console.error('Error checking if business exists:', error);
      return false;
    }
  }

  /**
   * Check for existing data that needs cleanup
   */
  private async checkExistingData(teamId: string, platform: MarketPlatform): Promise<{
    businessProfileId?: string;
    oldIdentifier?: string;
  }> {
    try {
      if (platform === MarketPlatform.GOOGLE_MAPS) {
        const { data, error } = await this.supabase
          .from('GoogleBusinessProfile')
          .select('id, placeId')
          .eq('teamId', teamId)
          .order('createdAt', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          return {
            businessProfileId: data.id,
            oldIdentifier: data.placeId
          };
        }
      } else if (platform === MarketPlatform.FACEBOOK) {
        const { data, error } = await this.supabase
          .from('FacebookBusinessProfile')
          .select('id, facebookUrl')
          .eq('teamId', teamId)
          .order('createdAt', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          return {
            businessProfileId: data.id,
            oldIdentifier: data.facebookUrl
          };
        }
      }

      return {};
    } catch (error) {
      console.error('Error checking existing data:', error);
      return {};
    }
  }

  /**
   * Trigger review scraping for the new business
   */
  private async triggerReviewScraping(
    teamId: string, 
    platform: MarketPlatform, 
    identifier: string
  ): Promise<void> {
    try {
      // Get team limits for review count
      const teamLimits = await this.teamService.getTeamLimits(teamId);
      const maxReviews = teamLimits?.maxReviewsPerBusiness || 1000;

      if (platform === MarketPlatform.GOOGLE_MAPS) {
        const job = new GoogleBusinessReviewsActorJob({
          platform: MarketPlatform.GOOGLE_MAPS,
          teamId: teamId,
          placeId: identifier,
          isInitialization: true,
          maxReviews: maxReviews
        }, process.env.APIFY_TOKEN!);
        
        // Create proper ActorJob for scheduling
        const actor = new GoogleBusinessReviewsActor();
        actor.updateMemoryEstimate(true);
        
        const jobData = {
          platform: MarketPlatform.GOOGLE_MAPS,
          teamId: teamId,
          placeID: identifier,
          isInitialization: true,
          maxReviews: maxReviews
        };
        
        const actorJob = new ActorJob(
          `google-init-${teamId}-${identifier}-${Date.now()}`,
          actor,
          jobData,
          async () => {
            await job.run();
            return true;
          }
        );
        
        await this.actorManager.schedule(actorJob, 'initialization');
        console.log(`🔍 Google review scraping job scheduled: ${actorJob.id}`);
        
      } else if (platform === MarketPlatform.FACEBOOK) {
        const job = new FacebookBusinessReviewsActorJob({
          platform: MarketPlatform.FACEBOOK,
          teamId: teamId,
          pageUrl: identifier,
          isInitialization: true,
          maxReviews: maxReviews
        }, process.env.APIFY_TOKEN!);
        
        // Create proper ActorJob for scheduling  
        const actor = new FacebookBusinessReviewsActor();
        actor.updateMemoryEstimate(true);
        
        const jobData = {
          platform: MarketPlatform.FACEBOOK,
          teamId: teamId,
          pageUrl: identifier,
          isInitialization: true,
          maxReviews: maxReviews
        };
        
        const actorJob = new ActorJob(
          `facebook-init-${teamId}-${Date.now()}`,
          actor,
          jobData,
          async () => {
            await job.run();
            return true;
          }
        );
        
        await this.actorManager.schedule(actorJob, 'initialization');
        console.log(`🔍 Facebook review scraping job scheduled: ${actorJob.id}`);
      }
    } catch (error) {
      console.error('Error triggering review scraping:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.dataCleanupService.close();
    await this.businessProfileCreationService.close();
    await this.teamService.close();
    // Supabase client doesn't need explicit closing
  }
} 