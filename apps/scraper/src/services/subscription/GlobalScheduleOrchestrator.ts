/**
 * Global Schedule Orchestrator
 * 
 * Manages global interval-based schedules where businesses across all teams
 * share schedules based on their subscription tier's update interval.
 * 
 * Core Principles:
 * - One schedule per (platform × interval × scheduleType × batchIndex) combination
 * - Businesses are mapped to schedules via BusinessScheduleMapping table
 * - Schedule inputs are dynamically rebuilt from mappings
 * - Automatic batching when schedule grows too large
 * - Strict data isolation via database relationships
 */

import { ApifyClient } from 'apify-client';
import { prisma } from '@wirecrest/db';
import type { Platform, ScheduleType } from '../../types/apify.types';
import { sendNotification } from '../../utils/notificationHelper';

const ACTOR_IDS: Record<Platform, string> = {
  google_reviews: 'Xb8osYTtOjlsgI6k9',
  facebook: 'dX3d80hsNMilEwjXG',
  tripadvisor: 'Hvp4YfFGyLM635Q2F',
  booking: 'PbMHke3jW25J6hSOA',
};

// Maximum businesses per schedule before batching
const MAX_BATCH_SIZE: Record<Platform, number> = {
  google_reviews: 50,  // Google can handle more efficiently
  facebook: 30,        // Facebook is slower
  tripadvisor: 30,
  booking: 30,
};

interface GlobalScheduleConfig {
  platform: Platform;
  scheduleType: ScheduleType;
  intervalHours: number;
  batchIndex?: number;
}

interface BusinessIdentifier {
  businessProfileId: string;
  teamId: string;
  identifier: string; // placeId, URL, etc.
}

export class GlobalScheduleOrchestrator {
  private apifyClient: ApifyClient;
  private webhookBaseUrl: string;

  constructor(apifyToken: string, webhookBaseUrl: string) {
    this.apifyClient = new ApifyClient({ token: apifyToken });
    this.webhookBaseUrl = webhookBaseUrl;
  }

  /**
   * Initialize all global schedules for common intervals
   * Run this ONCE during deployment
   */
  async initializeGlobalSchedules(): Promise<{
    success: boolean;
    schedulesCreated: number;
    message: string;
  }> {
    try {
      const platforms: Platform[] = ['google_reviews', 'facebook', 'tripadvisor', 'booking'];
      const intervals = [6, 12, 24, 72]; // Common intervals in hours
      const scheduleTypes: ScheduleType[] = ['reviews', 'overview'];

      let schedulesCreated = 0;

      for (const platform of platforms) {
        for (const interval of intervals) {
          for (const scheduleType of scheduleTypes) {
            // Check if schedule already exists
            const existing = await prisma.apifyGlobalSchedule.findUnique({
              where: {
                platform_scheduleType_intervalHours_batchIndex: {
                  platform,
                  scheduleType,
                  intervalHours: interval,
                  batchIndex: 0,
                },
              },
            });

            if (existing) {
              console.log(`✓ Schedule already exists: ${platform}_${scheduleType}_${interval}h`);
              continue;
            }

            // Create global schedule
            await this.createGlobalSchedule({
              platform,
              scheduleType,
              intervalHours: interval,
              batchIndex: 0,
            });

            schedulesCreated++;
            console.log(`✓ Created: ${platform}_${scheduleType}_${interval}h`);
          }
        }
      }

      return {
        success: true,
        schedulesCreated,
        message: `Initialized ${schedulesCreated} global schedules`,
      };
    } catch (error: any) {
      console.error('Error initializing global schedules:', error);
      return {
        success: false,
        schedulesCreated: 0,
        message: `Failed: ${error.message}`,
      };
    }
  }

  /**
   * Add a business to the appropriate global schedule
   */
  async addBusinessToSchedule(
    businessProfileId: string,
    teamId: string,
    platform: Platform,
    identifier: string,
    intervalHours: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if mapping already exists
      const existingMapping = await prisma.businessScheduleMapping.findUnique({
        where: {
          businessProfileId_platform: {
            businessProfileId,
            platform,
          },
        },
      });

      if (existingMapping) {
        return {
          success: false,
          message: 'Business already mapped to a schedule',
        };
      }

      // Find or create appropriate schedule for both reviews and overview
      for (const scheduleType of ['reviews', 'overview'] as ScheduleType[]) {
        const schedule = await this.getOrCreateScheduleForInterval(
          platform,
          scheduleType,
          intervalHours
        );

        // Create mapping
        const identifierField = this.getIdentifierFieldName(platform);
        await prisma.businessScheduleMapping.create({
          data: {
            teamId,
            businessProfileId,
            platform,
            scheduleId: schedule.id,
            intervalHours,
            [identifierField]: identifier,
            isActive: true,
          },
        });

        // Update schedule business count
        await prisma.apifyGlobalSchedule.update({
          where: { id: schedule.id },
          data: { businessCount: { increment: 1 } },
        });

        // Rebuild schedule input in Apify
        await this.updateScheduleInput(schedule.id);

        // Check if schedule needs batching
        if (schedule.businessCount + 1 >= MAX_BATCH_SIZE[platform]) {
          await this.checkAndSplitSchedule(schedule.id, platform);
        }
      }

      console.log(`✓ Added business ${businessProfileId} to ${platform} schedules (${intervalHours}h)`);

      return {
        success: true,
        message: `Business added to ${intervalHours}h schedules`,
      };
    } catch (error: any) {
      console.error('Error adding business to schedule:', error);
      
      // Notify admin of schedule management failure
      await sendNotification({
        type: 'chat',
        scope: 'super',
        superRole: 'ADMIN',
        title: `<p>Failed to add business to schedule: <strong>${platform}</strong></p>`,
        category: 'System',
        metadata: {
          teamId,
          businessProfileId,
          platform,
          intervalHours,
          error: error.message
        },
        expiresInDays: 7
      });
      
      return {
        success: false,
        message: `Failed: ${error.message}`,
      };
    }
  }

  /**
   * Move business between schedules (e.g., when subscription tier changes)
   */
  async moveBusinessBetweenSchedules(
    businessProfileId: string,
    platform: Platform,
    fromIntervalHours: number,
    toIntervalHours: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get current mapping
      const mapping = await prisma.businessScheduleMapping.findUnique({
        where: {
          businessProfileId_platform: {
            businessProfileId,
            platform,
          },
        },
        include: { schedule: true },
      });

      if (!mapping) {
        return {
          success: false,
          message: 'Business mapping not found',
        };
      }

      // If already at target interval, no-op
      if (mapping.intervalHours === toIntervalHours) {
        return {
          success: true,
          message: 'Business already at target interval',
        };
      }

      const oldScheduleId = mapping.scheduleId;
      const scheduleType = mapping.schedule.scheduleType as ScheduleType;

      // Find or create new schedule
      const newSchedule = await this.getOrCreateScheduleForInterval(
        platform,
        scheduleType,
        toIntervalHours
      );

      // Update mapping
      await prisma.businessScheduleMapping.update({
        where: { id: mapping.id },
        data: {
          scheduleId: newSchedule.id,
          intervalHours: toIntervalHours,
        },
      });

      // Update business counts
      await prisma.apifyGlobalSchedule.update({
        where: { id: oldScheduleId },
        data: { businessCount: { decrement: 1 } },
      });
      await prisma.apifyGlobalSchedule.update({
        where: { id: newSchedule.id },
        data: { businessCount: { increment: 1 } },
      });

      // Rebuild both schedule inputs
      await this.updateScheduleInput(oldScheduleId);
      await this.updateScheduleInput(newSchedule.id);

      console.log(`✓ Moved business ${businessProfileId} from ${fromIntervalHours}h → ${toIntervalHours}h`);

      return {
        success: true,
        message: `Business moved from ${fromIntervalHours}h to ${toIntervalHours}h`,
      };
    } catch (error: any) {
      console.error('Error moving business between schedules:', error);
      return {
        success: false,
        message: `Failed: ${error.message}`,
      };
    }
  }

  /**
   * Remove business from schedule (e.g., when business is deleted)
   */
  async removeBusinessFromSchedule(
    businessProfileId: string,
    platform: Platform
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get mapping
      const mapping = await prisma.businessScheduleMapping.findUnique({
        where: {
          businessProfileId_platform: {
            businessProfileId,
            platform,
          },
        },
      });

      if (!mapping) {
        return {
          success: true,
          message: 'Business not mapped to any schedule',
        };
      }

      const scheduleId = mapping.scheduleId;

      // Delete mapping
      await prisma.businessScheduleMapping.delete({
        where: { id: mapping.id },
      });

      // Update business count
      await prisma.apifyGlobalSchedule.update({
        where: { id: scheduleId },
        data: { businessCount: { decrement: 1 } },
      });

      // Rebuild schedule input
      await this.updateScheduleInput(scheduleId);

      console.log(`✓ Removed business ${businessProfileId} from schedule`);

      return {
        success: true,
        message: 'Business removed from schedule',
      };
    } catch (error: any) {
      console.error('Error removing business from schedule:', error);
      return {
        success: false,
        message: `Failed: ${error.message}`,
      };
    }
  }

  /**
   * Update schedule input in Apify based on current business mappings
   */
  async updateScheduleInput(scheduleId: string): Promise<void> {
    try {
      const schedule = await prisma.apifyGlobalSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          businessMappings: {
            where: { isActive: true },
          },
        },
      });

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Collect identifiers based on platform
      const identifiers = schedule.businessMappings
        .map((mapping) => {
          switch (schedule.platform) {
            case 'google_reviews':
              return mapping.placeId;
            case 'facebook':
              return mapping.facebookUrl;
            case 'tripadvisor':
              return mapping.tripAdvisorUrl;
            case 'booking':
              return mapping.bookingUrl;
            default:
              return null;
          }
        })
        .filter(Boolean) as string[];

      // Build input based on platform
      const input = this.buildScheduleInput(
        schedule.platform as Platform,
        identifiers,
        schedule.maxReviewsPerRun
      );

      // Build webhook config
      const webhookConfig = this.buildWebhookConfig(schedule.platform as Platform);

      // Get current schedule from Apify to preserve all settings
      const apifySchedule = await this.apifyClient.schedule(schedule.apifyScheduleId).get();

      // Clone existing actions but replace the input
      const updatedActions = apifySchedule.actions.map(action => ({
        ...action,
        runInput: {
          ...input,
          webhooks: webhookConfig,
        },
      }));

      // Update schedule in Apify with new actions
      await this.apifyClient.schedule(schedule.apifyScheduleId).update({
        isEnabled: identifiers.length > 0, // Disable if no businesses
        actions: updatedActions,
      });

      // Update database
      await prisma.apifyGlobalSchedule.update({
        where: { id: scheduleId },
        data: {
          isActive: identifiers.length > 0,
          businessCount: identifiers.length,
        },
      });

      console.log(`✓ Updated schedule ${schedule.platform}_${schedule.scheduleType}_${schedule.intervalHours}h with ${identifiers.length} businesses`);
    } catch (error: any) {
      console.error('Error updating schedule input:', error);
      throw error;
    }
  }

  /**
   * Get or create schedule for specific interval
   */
  private async getOrCreateScheduleForInterval(
    platform: Platform,
    scheduleType: ScheduleType,
    intervalHours: number
  ): Promise<any> {
    // Find existing schedule with capacity
    const schedules = await prisma.apifyGlobalSchedule.findMany({
      where: {
        platform,
        scheduleType,
        intervalHours,
        isActive: true,
        businessCount: {
          lt: MAX_BATCH_SIZE[platform],
        },
      },
      orderBy: {
        batchIndex: 'asc',
      },
    });

    if (schedules.length > 0) {
      return schedules[0];
    }

    // Find highest batch index
    const highestBatch = await prisma.apifyGlobalSchedule.findFirst({
      where: { platform, scheduleType, intervalHours },
      orderBy: { batchIndex: 'desc' },
    });

    const nextBatchIndex = highestBatch ? highestBatch.batchIndex + 1 : 0;

    // Create new schedule
    return this.createGlobalSchedule({
      platform,
      scheduleType,
      intervalHours,
      batchIndex: nextBatchIndex,
    });
  }

  /**
   * Create a new global schedule
   */
  private async createGlobalSchedule(config: GlobalScheduleConfig): Promise<any> {
    const actorId = ACTOR_IDS[config.platform];
    const cronExpression = this.intervalToCron(config.intervalHours, config.batchIndex);
    const batchSuffix = config.batchIndex && config.batchIndex > 0 ? `_batch_${config.batchIndex}` : '';

    // Create schedule in Apify
    const apifySchedule = await this.apifyClient.schedules().create({
      name: `${config.platform}_${config.scheduleType}_${config.intervalHours}h${batchSuffix}`,
      cronExpression,
      isEnabled: false, // Start disabled, enable when first business added
      isExclusive: false,
      actions: [
        {
          type: 'RUN_ACTOR' as any,
          actorId,
          runInput: {
            body: JSON.stringify({}),
            contentType: 'application/json',
          },
          runOptions: {
            build: 'latest',
            timeoutSecs: 3600,
            memoryMbytes: 4096,
          } as any,
        },
      ],
    });

    // Create database record
    const schedule = await prisma.apifyGlobalSchedule.create({
      data: {
        platform: config.platform,
        scheduleType: config.scheduleType,
        intervalHours: config.intervalHours,
        batchIndex: config.batchIndex || 0,
        apifyScheduleId: apifySchedule.id,
        apifyActorId: actorId,
        cronExpression,
        isActive: false,
        businessCount: 0,
      },
    });

    console.log(`✓ Created global schedule: ${apifySchedule.name}`);
    return schedule;
  }

  /**
   * Check if schedule needs batching and split if necessary
   */
  private async checkAndSplitSchedule(scheduleId: string, platform: Platform): Promise<void> {
    const schedule = await prisma.apifyGlobalSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        businessMappings: {
          where: { isActive: true },
        },
      },
    });

    if (!schedule || schedule.businessCount < MAX_BATCH_SIZE[platform]) {
      return;
    }

    console.log(`⚠️ Schedule ${scheduleId} has reached max capacity, splitting...`);

    // Create new batch
    const newSchedule = await this.createGlobalSchedule({
      platform: schedule.platform as Platform,
      scheduleType: schedule.scheduleType as ScheduleType,
      intervalHours: schedule.intervalHours,
      batchIndex: schedule.batchIndex + 1,
    });

    // Move half of businesses to new batch
    const businessesToMove = schedule.businessMappings.slice(
      Math.floor(schedule.businessCount / 2)
    );

    for (const business of businessesToMove) {
      await prisma.businessScheduleMapping.update({
        where: { id: business.id },
        data: { scheduleId: newSchedule.id },
      });
    }

    // Update counts
    await prisma.apifyGlobalSchedule.update({
      where: { id: scheduleId },
      data: { businessCount: schedule.businessCount - businessesToMove.length },
    });
    await prisma.apifyGlobalSchedule.update({
      where: { id: newSchedule.id },
      data: { businessCount: businessesToMove.length },
    });

    // Rebuild both schedules
    await this.updateScheduleInput(scheduleId);
    await this.updateScheduleInput(newSchedule.id);

    console.log(`✓ Split schedule: moved ${businessesToMove.length} businesses to new batch`);
  }

  /**
   * Build schedule input based on platform
   */
  private buildScheduleInput(
    platform: Platform,
    identifiers: string[],
    maxReviews: number
  ): any {
    switch (platform) {
      case 'google_reviews':
        return {
          placeIds: identifiers,
          maxReviews,
          reviewsSort: 'newest',
          language: 'en',
          reviewsOrigin: 'google',
          personalData: false,
        };

      case 'facebook':
        return {
          startUrls: identifiers.map((url) => ({ url })),
          resultsLimit: maxReviews,
          proxy: {
            apifyProxyGroups: ['RESIDENTIAL'],
          },
          maxRequestRetries: 10,
        };

      case 'tripadvisor':
        return {
          startUrls: identifiers.map((url) => ({ url })),
          maxItemsPerQuery: maxReviews,
          scrapeReviewerInfo: true,
          reviewRatings: ['ALL_REVIEW_RATINGS'],
          reviewsLanguages: ['ALL_REVIEW_LANGUAGES'],
        };

      case 'booking':
        return {
          startUrls: identifiers.map((url) => ({ url })),
          maxReviewsPerHotel: maxReviews,
          sortReviewsBy: 'f_recent_desc',
          reviewScores: ['ALL'],
          proxyConfiguration: {
            useApifyProxy: true,
          },
        };
    }
  }

  /**
   * Build webhook configuration
   */
  private buildWebhookConfig(platform: Platform): any[] {
    const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('APIFY_WEBHOOK_SECRET is required');
    }

    return [
      {
        eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED'],
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
   * Convert interval hours to cron expression with optional batch offset
   */
  private intervalToCron(hours: number, batchIndex: number = 0): string {
    // Calculate offset minutes to stagger batches
    const offsetMinutes = (batchIndex * 15) % 60; // Stagger by 15 minutes

    if (hours === 24) {
      return `${offsetMinutes} 9 * * *`; // Daily at 9:00 AM (+ offset)
    } else if (hours === 12) {
      return `${offsetMinutes} */12 * * *`; // Every 12 hours (+ offset)
    } else if (hours === 6) {
      return `${offsetMinutes} */6 * * *`; // Every 6 hours (+ offset)
    } else if (hours === 72) {
      return `${offsetMinutes} 10 */3 * *`; // Every 3 days at 10:00 AM (+ offset)
    } else {
      return `${offsetMinutes} */${hours} * * *`; // Every N hours (+ offset)
    }
  }

  /**
   * Get identifier field name based on platform
   */
  private getIdentifierFieldName(platform: Platform): string {
    switch (platform) {
      case 'google_reviews':
        return 'placeId';
      case 'facebook':
        return 'facebookUrl';
      case 'tripadvisor':
        return 'tripAdvisorUrl';
      case 'booking':
        return 'bookingUrl';
    }
  }
}

