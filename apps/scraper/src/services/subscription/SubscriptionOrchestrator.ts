/**
 * Subscription Orchestrator
 * Orchestrates subscription lifecycle using GLOBAL SCHEDULES
 * 
 * This orchestrator now works with the GlobalScheduleOrchestrator to:
 * - Add team's businesses to global interval-based schedules
 * - Move businesses between schedules when tier changes
 * - Remove businesses from schedules when subscription ends
 */

import { prisma } from '@wirecrest/db';
import { ApifyTaskService } from '../apify/ApifyTaskService';
import { ApifyDataSyncService } from '../apify/ApifyDataSyncService';
import { FeatureExtractor } from './FeatureExtractor';
import { GlobalScheduleOrchestrator } from './GlobalScheduleOrchestrator';
import type { Platform, TaskRunConfig } from '../../types/apify.types';

export class SubscriptionOrchestrator {
  private taskService: ApifyTaskService;
  private syncService: ApifyDataSyncService;
  private featureExtractor: FeatureExtractor;
  private globalOrchestrator: GlobalScheduleOrchestrator;

  constructor(apifyToken: string, webhookBaseUrl: string) {
    this.taskService = new ApifyTaskService(apifyToken, webhookBaseUrl);
    this.syncService = new ApifyDataSyncService(apifyToken);
    this.featureExtractor = new FeatureExtractor();
    this.globalOrchestrator = new GlobalScheduleOrchestrator(apifyToken, webhookBaseUrl);
  }

  /**
   * Handle new subscription: trigger initial fetch and add businesses to global schedules
   * 
   * NEW APPROACH: Add team's businesses to global interval-based schedules
   */
  async handleNewSubscription(teamId: string): Promise<{
    success: boolean;
    message: string;
    initialTasksStarted: number;
    businessesAdded: number;
  }> {
    try {
      console.log(`🆕 Handling new subscription for team ${teamId}`);
      
      // Extract features and limits
      const features = await this.featureExtractor.extractTeamFeatures(teamId);
      
      // Get enabled platforms
      const enabledPlatforms = await this.featureExtractor.getEnabledPlatforms(teamId);
      
      if (enabledPlatforms.length === 0) {
        return {
          success: false,
          message: 'No platforms enabled in subscription',
          initialTasksStarted: 0,
          businessesAdded: 0,
        };
      }

      // Get business identifiers for all enabled platforms
      const identifiers = await this.getTeamBusinessIdentifiers(teamId, enabledPlatforms);

      let initialTasksStarted = 0;
      let businessesAdded = 0;

      // For each enabled platform
      for (const platform of enabledPlatforms) {
        const platformIdentifiers = identifiers[platform as Platform];
        
        if (!platformIdentifiers || platformIdentifiers.length === 0) {
          console.warn(`No business identifiers found for platform: ${platform}`);
          continue;
        }

        console.log(`  📍 Processing ${platformIdentifiers.length} ${platform} business(es)`);

        // Trigger initial data fetch
        const taskConfig: TaskRunConfig = {
          platform: platform as Platform,
          identifiers: platformIdentifiers,
          isInitial: true,
          maxReviews: features.limits.maxReviewsPerBusiness,
          webhookUrl: '',
        };

        const taskResult = await this.taskService.runInitialTask(taskConfig);
        
        // Create sync record
        await this.syncService.createSyncRecord(
          teamId,
          platform as Platform,
          'initial',
          taskResult.apifyRunId
        );

        initialTasksStarted++;

        // Get interval for this platform (checks custom intervals first)
        const interval = await this.featureExtractor.getIntervalForTeamPlatform(
          teamId,
          platform as Platform,
          'reviews'
        );

        // Add each business to the appropriate global schedule
        for (const identifier of platformIdentifiers) {
          // Get business profile ID from identifier
          const businessProfileId = await this.getBusinessProfileId(teamId, platform as Platform, identifier);
          
          if (businessProfileId) {
            const result = await this.globalOrchestrator.addBusinessToSchedule(
              businessProfileId,
              teamId,
              platform as Platform,
              identifier,
              interval
            );

            if (result.success) {
              businessesAdded++;
              console.log(`    ✓ Added ${identifier} to global schedule (${interval}h)`);
            } else {
              console.error(`    ✗ Failed to add ${identifier}: ${result.message}`);
            }
          }
        }
      }

      const message = `Successfully started ${initialTasksStarted} initial tasks and added ${businessesAdded} businesses to global schedules`;
      console.log(`✅ ${message}`);

      return {
        success: true,
        message,
        initialTasksStarted,
        businessesAdded,
      };
    } catch (error: any) {
      console.error('Error handling new subscription:', error);
      return {
        success: false,
        message: `Failed to setup subscription: ${error.message}`,
        initialTasksStarted: 0,
        businessesAdded: 0,
      };
    }
  }

  /**
   * Handle subscription update: move businesses between global schedules based on new tier
   * 
   * NEW APPROACH: Move team's businesses to schedules matching new interval
   */
  async handleSubscriptionUpdate(teamId: string): Promise<{
    success: boolean;
    message: string;
    businessesMoved: number;
  }> {
    try {
      console.log(`🔄 Handling subscription update for team ${teamId}`);

      const enabledPlatforms = await this.featureExtractor.getEnabledPlatforms(teamId);
      let businessesMoved = 0;

      // For each enabled platform
      for (const platform of enabledPlatforms) {
        // Get new interval for this platform
        const newInterval = await this.featureExtractor.getIntervalForTeamPlatform(
          teamId,
          platform as Platform,
          'reviews'
        );

        // Get all business mappings for this team + platform
        const mappings = await prisma.businessScheduleMapping.findMany({
          where: {
            teamId,
            platform,
            isActive: true,
          },
        });

        console.log(`  📍 ${platform}: ${mappings.length} business(es), new interval: ${newInterval}h`);

        // Move each business to new schedule if interval changed
        for (const mapping of mappings) {
          const oldInterval = mapping.intervalHours;

          if (oldInterval !== newInterval) {
            const identifier = mapping.placeId || mapping.facebookUrl || 
                              mapping.tripAdvisorUrl || mapping.bookingUrl;

            console.log(`    🔀 Moving business from ${oldInterval}h → ${newInterval}h`);

            const result = await this.globalOrchestrator.moveBusinessBetweenSchedules(
              mapping.businessProfileId,
              platform as Platform,
              oldInterval,
              newInterval
            );

            if (result.success) {
              businessesMoved++;
              console.log(`    ✓ Moved ${identifier}`);
            } else {
              console.error(`    ✗ Failed to move ${identifier}: ${result.message}`);
            }
          } else {
            console.log(`    ⏭️  Business already at ${newInterval}h, skipping`);
          }
        }
      }

      const message = businessesMoved > 0 
        ? `Successfully moved ${businessesMoved} businesses to new intervals`
        : 'No businesses needed to be moved';
      
      console.log(`✅ ${message}`);

      return {
        success: true,
        message,
        businessesMoved,
      };
    } catch (error: any) {
      console.error('Error handling subscription update:', error);
      return {
        success: false,
        message: `Failed to update subscription: ${error.message}`,
        businessesMoved: 0,
      };
    }
  }

  /**
   * Handle subscription cancellation: remove all businesses from global schedules
   * 
   * NEW APPROACH: Remove team's businesses from all global schedules
   */
  async handleSubscriptionCancellation(teamId: string): Promise<{
    success: boolean;
    message: string;
    businessesRemoved: number;
  }> {
    try {
      console.log(`🚫 Handling subscription cancellation for team ${teamId}`);

      // Get all business mappings for this team
      const mappings = await prisma.businessScheduleMapping.findMany({
        where: { teamId },
      });

      console.log(`  Found ${mappings.length} businesses to remove`);

      let businessesRemoved = 0;

      // Remove each business from its global schedule
      for (const mapping of mappings) {
        const result = await this.globalOrchestrator.removeBusinessFromSchedule(
          mapping.businessProfileId,
          mapping.platform as Platform
        );

        if (result.success) {
          businessesRemoved++;
        } else {
          console.error(`  ✗ Failed to remove business ${mapping.businessProfileId}: ${result.message}`);
        }
      }

      const message = `Successfully removed ${businessesRemoved} businesses from global schedules`;
      console.log(`✅ ${message}`);

      return {
        success: true,
        message,
        businessesRemoved,
      };
    } catch (error: any) {
      console.error('Error handling subscription cancellation:', error);
      return {
        success: false,
        message: `Failed to cancel subscription: ${error.message}`,
        businessesRemoved: 0,
      };
    }
  }

  /**
   * Get business profile ID from identifier
   * Helper method to look up the business profile ID for a given identifier
   */
  private async getBusinessProfileId(
    teamId: string,
    platform: Platform,
    identifier: string
  ): Promise<string | null> {
    try {
      switch (platform) {
        case 'google_reviews':
          const googleProfile = await prisma.googleBusinessProfile.findFirst({
            where: { teamId, placeId: identifier },
            select: { id: true },
          });
          return googleProfile?.id || null;

        case 'facebook':
          const facebookProfile = await prisma.facebookBusinessProfile.findFirst({
            where: { teamId, facebookUrl: identifier },
            select: { id: true },
          });
          return facebookProfile?.id || null;

        case 'tripadvisor':
          const tripAdvisorProfile = await prisma.tripAdvisorBusinessProfile.findFirst({
            where: { teamId, tripAdvisorUrl: identifier },
            select: { id: true },
          });
          return tripAdvisorProfile?.id || null;

        case 'booking':
          const bookingProfile = await prisma.bookingBusinessProfile.findFirst({
            where: { teamId, bookingUrl: identifier },
            select: { id: true },
          });
          return bookingProfile?.id || null;

        default:
          return null;
      }
    } catch (error) {
      console.error(`Error getting business profile ID for ${platform}:${identifier}`, error);
      return null;
    }
  }

  /**
   * Get business identifiers for team across platforms
   * 🔄 FULLY DYNAMIC: Supports multiple businesses per platform
   */
  private async getTeamBusinessIdentifiers(
    teamId: string,
    platforms: string[]
  ): Promise<Record<string, string[]>> {
    const identifiers: Record<string, string[]> = {};

    for (const platform of platforms) {
      switch (platform) {
        case 'google_reviews':
          // Get ALL Google business profiles for this team
          const googleProfiles = await prisma.googleBusinessProfile.findMany({
            where: { teamId },
            select: { placeId: true },
          });
          const placeIds = googleProfiles
            .map((p) => p.placeId)
            .filter(Boolean) as string[];
          if (placeIds.length > 0) {
            identifiers['google_reviews'] = placeIds;
          }
          break;

        case 'facebook':
          // Get ALL Facebook pages for this team
          const facebookProfiles = await prisma.facebookBusinessProfile.findMany({
            where: { teamId },
            select: { facebookUrl: true },
          });
          const facebookUrls = facebookProfiles
            .map((p) => p.facebookUrl)
            .filter(Boolean) as string[];
          if (facebookUrls.length > 0) {
            identifiers['facebook'] = facebookUrls;
          }
          break;

        case 'tripadvisor':
          // Get ALL TripAdvisor locations for this team
          const tripAdvisorProfiles = await prisma.tripAdvisorBusinessProfile.findMany({
            where: { teamId },
            select: { tripAdvisorUrl: true },
          });
          const tripAdvisorUrls = tripAdvisorProfiles
            .map((p) => p.tripAdvisorUrl)
            .filter(Boolean) as string[];
          if (tripAdvisorUrls.length > 0) {
            identifiers['tripadvisor'] = tripAdvisorUrls;
          }
          break;

        case 'booking':
          // Get ALL Booking.com properties for this team
          const bookingProfiles = await prisma.bookingBusinessProfile.findMany({
            where: { teamId },
            select: { bookingUrl: true },
          });
          const bookingUrls = bookingProfiles
            .map((p) => p.bookingUrl)
            .filter(Boolean) as string[];
          if (bookingUrls.length > 0) {
            identifiers['booking'] = bookingUrls;
          }
          break;
      }
    }

    return identifiers;
  }
}

