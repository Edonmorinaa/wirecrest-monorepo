/**
 * Apify Schedule Service
 * Handles creation, update, and management of Apify schedules
 */

import { ApifyClient } from 'apify-client';
import { prisma } from '@wirecrest/db';
import type {
  Platform,
  ScheduleType,
  ScheduleConfig,
  ApifyScheduleInfo,
  ApifyWebhookConfig,
  ApifyEventType,
} from '../../types/apify.types';

const ACTOR_IDS: Record<Platform, string> = {
  google_reviews: 'Xb8osYTtOjlsgI6k9', // Google Maps Reviews Scraper (specialized, cost-effective)
  facebook: 'dX3d80hsNMilEwjXG',        // Facebook Reviews Scraper (specialized)
  tripadvisor: 'Hvp4YfFGyLM635Q2F',    // TripAdvisor Reviews Scraper (specialized)
  booking: 'PbMHke3jW25J6hSOA',         // Booking.com Reviews Scraper (specialized)
};

export class ApifyScheduleService {
  private apifyClient: ApifyClient;
  private webhookBaseUrl: string;

  constructor(apifyToken: string, webhookBaseUrl: string) {
    this.apifyClient = new ApifyClient({ token: apifyToken });
    this.webhookBaseUrl = webhookBaseUrl;
  }

  /**
   * Create or update a schedule for a team
   */
  async upsertSchedule(teamId: string, config: ScheduleConfig): Promise<ApifyScheduleInfo> {
    // Check if schedule already exists
    const existingSchedule = await prisma.apifySchedule.findUnique({
      where: {
        teamId_platform_scheduleType: {
          teamId,
          platform: config.platform,
          scheduleType: config.scheduleType,
        },
      },
    });

    if (existingSchedule) {
      // Update existing schedule
      return this.updateSchedule(teamId, existingSchedule.apifyScheduleId, config);
    } else {
      // Create new schedule
      return this.createSchedule(teamId, config);
    }
  }

  /**
   * Create a new Apify schedule
   */
  private async createSchedule(teamId: string, config: ScheduleConfig): Promise<ApifyScheduleInfo> {
    const actorId = ACTOR_IDS[config.platform];
    const input = this.buildScheduleInput(config);
    const webhookConfig = this.buildWebhookConfig(config.platform);

    // Create schedule in Apify
    const apifySchedule = await this.apifyClient.schedules().create({
      name: `${teamId}_${config.platform}_${config.scheduleType}`,
      cronExpression: config.cronExpression,
      isEnabled: true,
      isExclusive: false,
      actions: [
        {
          type: 'RUN_ACTOR' as any,
          actorId,
          runInput: {
            ...input,
            webhooks: webhookConfig,
          },
          runOptions: {
            build: 'latest',
            timeoutSecs: 3600,
            memoryMbytes: 4096,
          } as any,
        },
      ],
    });

    // Store schedule in database
    const dbSchedule = await prisma.apifySchedule.create({
      data: {
        teamId,
        platform: config.platform,
        scheduleType: config.scheduleType,
        apifyScheduleId: apifySchedule.id,
        apifyActorId: actorId,
        cronExpression: config.cronExpression,
        intervalHours: config.intervalHours,
        maxReviewsPerRun: config.maxReviewsPerRun,
        isActive: true,
        nextRunAt: apifySchedule.nextRunAt ? new Date(apifySchedule.nextRunAt) : null,
      },
    });

    return {
      id: dbSchedule.id,
      apifyScheduleId: dbSchedule.apifyScheduleId,
      platform: config.platform,
      scheduleType: config.scheduleType,
      cronExpression: dbSchedule.cronExpression,
      nextRun: dbSchedule.nextRunAt || new Date(),
      isActive: dbSchedule.isActive,
    };
  }

  /**
   * Update an existing Apify schedule
   */
  private async updateSchedule(
    teamId: string,
    apifyScheduleId: string,
    config: ScheduleConfig
  ): Promise<ApifyScheduleInfo> {
    const input = this.buildScheduleInput(config);
    const webhookConfig = this.buildWebhookConfig(config.platform);

    // Get current schedule from Apify to preserve all settings
    const currentSchedule = await this.apifyClient.schedule(apifyScheduleId).get();

    // Clone existing actions but replace the input
    const updatedActions = currentSchedule.actions.map(action => ({
      ...action,
      runInput: {
        ...input,
        webhooks: webhookConfig,
      },
    }));

    // Update schedule in Apify with new actions
    const apifySchedule = await this.apifyClient.schedule(apifyScheduleId).update({
      cronExpression: config.cronExpression,
      isEnabled: true,
      actions: updatedActions,
    });

    // Update database record
    const dbSchedule = await prisma.apifySchedule.update({
      where: { apifyScheduleId },
      data: {
        cronExpression: config.cronExpression,
        intervalHours: config.intervalHours,
        maxReviewsPerRun: config.maxReviewsPerRun,
        nextRunAt: apifySchedule.nextRunAt ? new Date(apifySchedule.nextRunAt) : null,
        updatedAt: new Date(),
      },
    });

    return {
      id: dbSchedule.id,
      apifyScheduleId: dbSchedule.apifyScheduleId,
      platform: config.platform,
      scheduleType: config.scheduleType,
      cronExpression: dbSchedule.cronExpression,
      nextRun: dbSchedule.nextRunAt || new Date(),
      isActive: dbSchedule.isActive,
    };
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(teamId: string, platform: Platform, scheduleType: ScheduleType): Promise<void> {
    const schedule = await prisma.apifySchedule.findUnique({
      where: {
        teamId_platform_scheduleType: { teamId, platform, scheduleType },
      },
    });

    if (!schedule) {
      return;
    }

    // Delete from Apify
    await this.apifyClient.schedule(schedule.apifyScheduleId).delete();

    // Delete from database
    await prisma.apifySchedule.delete({
      where: { id: schedule.id },
    });
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(teamId: string, platform: Platform, scheduleType: ScheduleType): Promise<void> {
    const schedule = await prisma.apifySchedule.findUnique({
      where: {
        teamId_platform_scheduleType: { teamId, platform, scheduleType },
      },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Get current schedule from Apify to preserve all settings
    const currentSchedule = await this.apifyClient.schedule(schedule.apifyScheduleId).get();

    // Update schedule in Apify - preserve all actions, just disable
    await this.apifyClient.schedule(schedule.apifyScheduleId).update({
      isEnabled: false,
      actions: currentSchedule.actions,
    });

    // Update database
    await prisma.apifySchedule.update({
      where: { id: schedule.id },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  /**
   * Resume a schedule by team, platform, and schedule type
   */
  async resumeSchedule(teamId: string, platform: Platform, scheduleType: ScheduleType): Promise<void> {
    const schedule = await prisma.apifySchedule.findUnique({
      where: {
        teamId_platform_scheduleType: { teamId, platform, scheduleType },
      },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Get current schedule from Apify to preserve all settings
    const currentSchedule = await this.apifyClient.schedule(schedule.apifyScheduleId).get();

    // Update schedule in Apify - preserve all actions, just enable
    await this.apifyClient.schedule(schedule.apifyScheduleId).update({
      isEnabled: true,
      actions: currentSchedule.actions,
    });

    // Update database
    await prisma.apifySchedule.update({
      where: { id: schedule.id },
      data: { isActive: true, updatedAt: new Date() },
    });
  }

  /**
   * Resume a schedule directly by apifyScheduleId
   */
  private async resumeScheduleById(apifyScheduleId: string): Promise<void> {
    // Get current schedule from Apify to preserve all settings
    const currentSchedule = await this.apifyClient.schedule(apifyScheduleId).get();

    // Update schedule in Apify - preserve all actions, just enable
    await this.apifyClient.schedule(apifyScheduleId).update({
      isEnabled: true,
      actions: currentSchedule.actions,
    });
  }

  /**
   * Build schedule input based on platform
   * Note: Google Maps Reviews Scraper accepts an ARRAY of placeIds, so we batch them all together
   * Other platforms use startUrls array
   */
  private buildScheduleInput(config: ScheduleConfig): any {
    switch (config.platform) {
      case 'google_reviews':
        // Google Maps Reviews Scraper - batches all placeIds together
        // Cost-effective: ~$0.50 per 1000 reviews vs $4 per 1000 places
        return {
          placeIds: config.identifiers,
          maxReviews: config.maxReviewsPerRun,
          reviewsSort: 'newest',
          language: 'en',
          reviewsOrigin: 'google',  // Only Google reviews (not TripAdvisor)
          personalData: false,       // GDPR compliant
        };

      case 'facebook': {
        // Facebook Reviews Scraper
        const input: any = {
          startUrls: config.identifiers.map((url) => ({ url })),
          proxy: {
            apifyProxyGroups: ['RESIDENTIAL'],
          },
          maxRequestRetries: 10,
        };
        // Only add limit if reasonable (not "unlimited")
        if (config.maxReviewsPerRun < 99999) {
          input.resultsLimit = config.maxReviewsPerRun;
        }
        return input;
      }

      case 'tripadvisor': {
        // TripAdvisor Reviews Scraper
        const input: any = {
          startUrls: config.identifiers.map((url) => ({ url })),
          scrapeReviewerInfo: true,
          reviewRatings: ['ALL_REVIEW_RATINGS'],
          reviewsLanguages: ['ALL_REVIEW_LANGUAGES'],
        };
        // Only add limit if reasonable (not "unlimited")
        if (config.maxReviewsPerRun < 99999) {
          input.maxItemsPerQuery = config.maxReviewsPerRun;
        }
        return input;
      }

      case 'booking': {
        // Booking.com Reviews Scraper
        const input: any = {
          startUrls: config.identifiers.map((url) => ({ url })),
          sortReviewsBy: 'f_recent_desc',  // Newest first for deduplication
          reviewScores: ['ALL'],
          proxyConfiguration: {
            useApifyProxy: true,
          },
        };
        // Only add limit if reasonable (not "unlimited")
        if (config.maxReviewsPerRun < 99999) {
          input.maxReviewsPerHotel = config.maxReviewsPerRun;
        }
        return input;
      }
    }
  }

  /**
   * Build webhook configuration
   * 🔒 Security: Includes secret token to prevent unauthorized webhook calls
   */
  private buildWebhookConfig(platform: Platform): ApifyWebhookConfig[] {
    const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('APIFY_WEBHOOK_SECRET environment variable is required for webhook security');
    }

    const eventTypes: ApifyEventType[] = [
      'ACTOR.RUN.SUCCEEDED',
      'ACTOR.RUN.FAILED',
      'ACTOR.RUN.ABORTED',
    ];

    return [
      {
        eventTypes,
        requestUrl: `${this.webhookBaseUrl}/webhooks/apify?token=${webhookSecret}`,
        payloadTemplate: JSON.stringify({
          platform,
          eventType: '{{eventType}}',
          actorRunId: '{{resource.id}}',
          datasetId: '{{resource.defaultDatasetId}}',
          status: '{{resource.status}}',
        }),
      },
    ];
  }

  /**
   * Get all schedules for a team
   */
  async getTeamSchedules(teamId: string): Promise<ApifyScheduleInfo[]> {
    const schedules = await prisma.apifySchedule.findMany({
      where: { teamId },
    });

    return schedules.map((s) => ({
      id: s.id,
      apifyScheduleId: s.apifyScheduleId,
      platform: s.platform as Platform,
      scheduleType: s.scheduleType as ScheduleType,
      cronExpression: s.cronExpression,
      nextRun: s.nextRunAt || new Date(),
      isActive: s.isActive,
    }));
  }

  /**
   * Delete all schedules for a team
   */
  async deleteTeamSchedules(teamId: string): Promise<number> {
    const schedules = await prisma.apifySchedule.findMany({
      where: { teamId },
    });

    let deletedCount = 0;
    for (const schedule of schedules) {
      try {
        await this.apifyClient.schedule(schedule.apifyScheduleId).delete();
        await prisma.apifySchedule.delete({
          where: { id: schedule.id },
        });
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete schedule ${schedule.id}:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * Trigger a schedule manually
   */
  async triggerSchedule(apifyScheduleId: string): Promise<void> {
    // Apify doesn't have a direct "trigger" API, so we need to manually start the actor
    // Get the schedule details first
    const schedule = await this.apifyClient.schedule(apifyScheduleId).get();
    
    if (!schedule || !schedule.actions || schedule.actions.length === 0) {
      throw new Error('Schedule not found or has no actions');
    }

    const action = schedule.actions[0] as any;
    if (!action.actorId) {
      throw new Error('Schedule action has no actorId');
    }

    // Run the actor with the schedule's input
    await this.apifyClient.actor(action.actorId).call(action.runInput || {});
  }
}

