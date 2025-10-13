/**
 * Business Retry Service
 * 
 * Handles per-business retry logic for failed scrapes.
 * Uses exponential backoff and isolated retry queue.
 */

import { prisma } from '@wirecrest/db';
import { ApifyClient } from 'apify-client';
import type { Platform } from '../../types/apify.types';
import { sendNotification } from '../../utils/notificationHelper';

const ACTOR_IDS: Record<Platform, string> = {
  google_reviews: 'Xb8osYTtOjlsgI6k9',
  facebook: 'dX3d80hsNMilEwjXG',
  tripadvisor: 'Hvp4YfFGyLM635Q2F',
  booking: 'PbMHke3jW25J6hSOA',
};

const MAX_RETRIES = 3;
const BASE_BACKOFF_MINUTES = 5; // Start with 5 minutes

export class BusinessRetryService {
  private apifyClient: ApifyClient;
  private webhookBaseUrl: string;

  constructor(apifyToken: string, webhookBaseUrl: string) {
    this.apifyClient = new ApifyClient({ token: apifyToken });
    this.webhookBaseUrl = webhookBaseUrl;
  }

  /**
   * Add business to retry queue
   */
  async addToRetryQueue(
    teamId: string,
    businessProfileId: string,
    platform: Platform,
    identifier: string,
    error: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if already in queue
      const existing = await prisma.businessRetryQueue.findUnique({
        where: {
          businessProfileId_platform: {
            businessProfileId,
            platform,
          },
        },
      });

      if (existing) {
        // Update existing entry
        const newRetryCount = existing.retryCount + 1;
        const nextRetryAt = this.calculateNextRetry(newRetryCount);

        if (newRetryCount >= existing.maxRetries) {
          // Max retries reached, mark as failed
          await prisma.businessRetryQueue.update({
            where: { id: existing.id },
            data: {
              status: 'failed',
              lastError: error,
              lastAttemptAt: new Date(),
              retryCount: newRetryCount,
            },
          });

          // Send notification to team
          await sendNotification({
            type: 'order',
            scope: 'team',
            teamId,
            title: `<p>Business scraping failed after <strong>${newRetryCount}</strong> retries</p>`,
            category: 'System',
            metadata: {
              businessProfileId,
              platform,
              error: error.substring(0, 200),
              identifier
            },
            expiresInDays: 14
          });
          
          // Send admin notification for critical failures
          await sendNotification({
            type: 'payment',
            scope: 'super',
            superRole: 'ADMIN',
            title: `<p>Business scraping permanently failed: <strong>${platform}</strong></p>`,
            category: 'Critical',
            metadata: { teamId, businessProfileId, platform, retries: newRetryCount },
            expiresInDays: 30
          });

          console.error(`❌ Business ${businessProfileId} failed after ${newRetryCount} retries`);

          return {
            success: false,
            message: `Max retries (${existing.maxRetries}) reached`,
          };
        }

        await prisma.businessRetryQueue.update({
          where: { id: existing.id },
          data: {
            retryCount: newRetryCount,
            lastError: error,
            lastAttemptAt: new Date(),
            nextRetryAt,
            status: 'pending',
          },
        });

        console.log(`⚠️ Business ${businessProfileId} queued for retry ${newRetryCount}/${existing.maxRetries} at ${nextRetryAt.toISOString()}`);
      } else {
        // Create new entry
        const nextRetryAt = this.calculateNextRetry(1);

        await prisma.businessRetryQueue.create({
          data: {
            teamId,
            businessProfileId,
            platform,
            identifier,
            retryCount: 0,
            maxRetries: MAX_RETRIES,
            lastError: error,
            nextRetryAt,
            status: 'pending',
          },
        });

        console.log(`⚠️ Business ${businessProfileId} added to retry queue, next retry at ${nextRetryAt.toISOString()}`);
      }

      return {
        success: true,
        message: 'Added to retry queue',
      };
    } catch (error: any) {
      console.error('Error adding to retry queue:', error);
      return {
        success: false,
        message: `Failed: ${error.message}`,
      };
    }
  }

  /**
   * Process retry queue
   * This should be called by a cron job every 5 minutes
   */
  async processRetryQueue(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    try {
      // Get businesses ready for retry
      const businessesToRetry = await prisma.businessRetryQueue.findMany({
        where: {
          status: 'pending',
          nextRetryAt: {
            lte: new Date(),
          },
        },
        take: 10, // Process 10 at a time to avoid overload
      });

      let processed = 0;
      let succeeded = 0;
      let failed = 0;

      for (const business of businessesToRetry) {
        // Mark as retrying
        await prisma.businessRetryQueue.update({
          where: { id: business.id },
          data: {
            status: 'retrying',
            lastAttemptAt: new Date(),
          },
        });

        try {
          // Trigger Apify actor run for this specific business
          await this.retryBusinessScrape(
            business.platform as Platform,
            business.identifier
          );

          // Mark as resolved
          await prisma.businessRetryQueue.update({
            where: { id: business.id },
            data: {
              status: 'resolved',
              resolvedAt: new Date(),
            },
          });

          succeeded++;
          console.log(`✓ Successfully retried business ${business.businessProfileId}`);
        } catch (error: any) {
          // Retry failed, add back to queue with incremented count
          const newRetryCount = business.retryCount + 1;
          const nextRetryAt = this.calculateNextRetry(newRetryCount);

          if (newRetryCount >= business.maxRetries) {
            // Max retries reached
            await prisma.businessRetryQueue.update({
              where: { id: business.id },
              data: {
                status: 'failed',
                retryCount: newRetryCount,
                lastError: error.message,
              },
            });

            // TODO: Alert team owner
            console.error(`❌ Business ${business.businessProfileId} failed permanently`);
            failed++;
          } else {
            // Queue for next retry
            await prisma.businessRetryQueue.update({
              where: { id: business.id },
              data: {
                status: 'pending',
                retryCount: newRetryCount,
                lastError: error.message,
                nextRetryAt,
              },
            });

            console.log(`⚠️ Retry failed for ${business.businessProfileId}, will retry again at ${nextRetryAt.toISOString()}`);
          }
        }

        processed++;
      }

      if (processed > 0) {
        console.log(`✓ Processed ${processed} retry attempts: ${succeeded} succeeded, ${failed} failed`);
      }

      return { processed, succeeded, failed };
    } catch (error: any) {
      console.error('Error processing retry queue:', error);
      return { processed: 0, succeeded: 0, failed: 0 };
    }
  }

  /**
   * Retry scrape for a specific business
   */
  private async retryBusinessScrape(
    platform: Platform,
    identifier: string
  ): Promise<void> {
    const actorId = ACTOR_IDS[platform];
    const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('APIFY_WEBHOOK_SECRET is required');
    }

    // Build input for single business
    const input = this.buildSingleBusinessInput(platform, identifier);

    // Build webhook
    const webhooks = [
      {
        eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED'],
        requestUrl: `${this.webhookBaseUrl}/webhooks/apify?token=${webhookSecret}`,
        payloadTemplate: JSON.stringify({
          platform,
          eventType: '{{eventType}}',
          actorRunId: '{{resource.id}}',
          datasetId: '{{resource.defaultDatasetId}}',
          status: '{{resource.status}}',
          isRetry: true,
        }),
      },
    ];

    // Run actor
    await this.apifyClient.actor(actorId).call({
      ...input,
      webhooks,
    });

    console.log(`✓ Triggered retry scrape for ${platform}:${identifier}`);
  }

  /**
   * Build input for single business scrape
   */
  private buildSingleBusinessInput(platform: Platform, identifier: string): any {
    switch (platform) {
      case 'google_reviews':
        return {
          placeIds: [identifier],
          maxReviews: 50,
          reviewsSort: 'newest',
          language: 'en',
          reviewsOrigin: 'google',
          personalData: false,
        };

      case 'facebook':
        return {
          startUrls: [{ url: identifier }],
          resultsLimit: 50,
          proxy: {
            apifyProxyGroups: ['RESIDENTIAL'],
          },
          maxRequestRetries: 10,
        };

      case 'tripadvisor':
        return {
          startUrls: [{ url: identifier }],
          maxItemsPerQuery: 50,
          scrapeReviewerInfo: true,
          reviewRatings: ['ALL_REVIEW_RATINGS'],
          reviewsLanguages: ['ALL_REVIEW_LANGUAGES'],
        };

      case 'booking':
        return {
          startUrls: [{ url: identifier }],
          maxReviewsPerHotel: 50,
          sortReviewsBy: 'f_recent_desc',
          reviewScores: ['ALL'],
          proxyConfiguration: {
            useApifyProxy: true,
          },
        };
    }
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  private calculateNextRetry(retryCount: number): Date {
    // Exponential backoff: 5min, 15min, 45min
    const backoffMinutes = BASE_BACKOFF_MINUTES * Math.pow(3, retryCount - 1);
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
    return nextRetry;
  }

  /**
   * Remove business from retry queue (when it succeeds)
   */
  async removeFromRetryQueue(
    businessProfileId: string,
    platform: Platform
  ): Promise<void> {
    const existing = await prisma.businessRetryQueue.findUnique({
      where: {
        businessProfileId_platform: {
          businessProfileId,
          platform,
        },
      },
    });

    if (existing) {
      await prisma.businessRetryQueue.update({
        where: { id: existing.id },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });

      console.log(`✓ Removed business ${businessProfileId} from retry queue (resolved)`);
    }
  }

  /**
   * Get retry queue statistics
   */
  async getRetryStats(): Promise<{
    pending: number;
    retrying: number;
    failed: number;
    resolved: number;
    totalErrors: number;
  }> {
    const [pending, retrying, failed, resolved] = await Promise.all([
      prisma.businessRetryQueue.count({ where: { status: 'pending' } }),
      prisma.businessRetryQueue.count({ where: { status: 'retrying' } }),
      prisma.businessRetryQueue.count({ where: { status: 'failed' } }),
      prisma.businessRetryQueue.count({ where: { status: 'resolved' } }),
    ]);

    return {
      pending,
      retrying,
      failed,
      resolved,
      totalErrors: pending + retrying + failed,
    };
  }

  /**
   * Clean up old resolved entries
   */
  async cleanupOldEntries(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.businessRetryQueue.deleteMany({
      where: {
        status: 'resolved',
        resolvedAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`✓ Cleaned up ${result.count} old retry queue entries`);
    return result.count;
  }
}

