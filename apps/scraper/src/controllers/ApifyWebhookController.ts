/**
 * Apify Webhook Controller
 * Handles Apify actor run completion events
 */

import { Request, Response } from 'express';
import { prisma } from '@wirecrest/db';
import { ApifyDataSyncService } from '../services/apify/ApifyDataSyncService';
import { ReviewDataProcessor } from '../services/processing/ReviewDataProcessor';
import { sendNotification } from '../utils/notificationHelper';
import type { ApifyWebhookPayload, Platform } from '../types/apify.types';

export class ApifyWebhookController {
  private syncService: ApifyDataSyncService;
  private dataProcessor: ReviewDataProcessor;

  constructor(apifyToken: string) {
    this.syncService = new ApifyDataSyncService(apifyToken);
    this.dataProcessor = new ReviewDataProcessor();
  }

  /**
   * Handle Apify webhook events
   * 🔒 Security: Verifies webhook token to prevent unauthorized calls
   * 🔄 Idempotency: Prevents duplicate processing of the same run
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // 🔒 SECURITY: Verify webhook token
      const { token } = req.query;
      const expectedToken = process.env.APIFY_WEBHOOK_SECRET;
      
      if (!expectedToken) {
        console.error('❌ APIFY_WEBHOOK_SECRET not configured - webhook security disabled!');
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }
      
      if (token !== expectedToken) {
        console.warn('⚠️  Invalid webhook token received - possible unauthorized access attempt');
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const payload: ApifyWebhookPayload = req.body;

      console.log(`📨 Apify webhook received: ${payload.eventType} for run ${payload.eventData.actorRunId}`);

      // 🔄 IDEMPOTENCY: Check if already processed successfully
      const existingLog = await prisma.apifyWebhookLog.findFirst({
        where: {
          apifyRunId: payload.eventData.actorRunId,
          processingStatus: 'success',
        },
      });

      if (existingLog) {
        console.log(`✅ Webhook already processed successfully for run: ${payload.eventData.actorRunId}`);
        res.json({ 
          received: true, 
          skipped: true, 
          reason: 'already_processed',
          previousProcessedAt: existingLog.processedAt,
        });
        return;
      }

      // Log webhook (only if not already successful)
      await prisma.apifyWebhookLog.create({
        data: {
          apifyRunId: payload.eventData.actorRunId,
          eventType: payload.eventType,
          payload: payload as any,
          processingStatus: 'pending',
        },
      });

      // Get sync record
      const syncRecord = await this.syncService.getSyncRecordByRunId(
        payload.eventData.actorRunId
      );

      if (!syncRecord) {
        console.warn(`⚠️  No sync record found for run: ${payload.eventData.actorRunId}`);
        res.status(404).json({ error: 'Sync record not found' });
        return;
      }

      // Handle based on event type
      switch (payload.eventType) {
        case 'ACTOR.RUN.SUCCEEDED':
          await this.handleRunSucceeded(payload, syncRecord);
          break;

        case 'ACTOR.RUN.FAILED':
          await this.handleRunFailed(payload, syncRecord);
          break;

        case 'ACTOR.RUN.ABORTED':
          await this.handleRunAborted(payload, syncRecord);
          break;

        default:
          console.log(`⚠️  Unhandled Apify event type: ${payload.eventType}`);
      }

      res.json({ received: true, processed: true });
    } catch (error: any) {
      console.error('❌ Error processing Apify webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  }

  /**
   * Handle successful actor run
   */
  private async handleRunSucceeded(
    payload: ApifyWebhookPayload,
    syncRecord: any
  ): Promise<void> {
    console.log('✅ Processing successful run:', payload.eventData.actorRunId);

    try {
      const datasetId = payload.eventData.defaultDatasetId;

      if (!datasetId) {
        throw new Error('No dataset ID in payload');
      }

      // Fetch data from Apify dataset
      const rawData = await this.syncService.fetchDatasetItems(datasetId);

      // Process data based on platform
      const result = await this.dataProcessor.processReviews(
        syncRecord.teamId,
        syncRecord.platform as Platform,
        rawData,
        syncRecord.syncType === 'initial'
      );

      // Update sync record with results
      await this.syncService.updateSyncRecord(syncRecord.id, {
        status: 'completed',
        reviewsProcessed: result.reviewsProcessed,
        reviewsNew: result.reviewsNew,
        reviewsDuplicate: result.reviewsDuplicate,
        businessesUpdated: result.businessesUpdated,
      });

      // Update schedule last run time
      await this.syncService.updateScheduleLastRun(
        syncRecord.teamId,
        syncRecord.platform,
        syncRecord.syncType
      );

      // Update webhook log
      await prisma.apifyWebhookLog.updateMany({
        where: { apifyRunId: payload.eventData.actorRunId },
        data: { processingStatus: 'success' },
      });

      console.log('✅ Successfully processed run:', payload.eventData.actorRunId, result);
    } catch (error: any) {
      console.error('Error processing succeeded run:', error);

      await this.syncService.updateSyncRecord(syncRecord.id, {
        status: 'failed',
        errorMessage: `Processing error: ${error.message}`,
      });

      await prisma.apifyWebhookLog.updateMany({
        where: { apifyRunId: payload.eventData.actorRunId },
        data: {
          processingStatus: 'failed',
          errorMessage: error.message,
        },
      });
    }
  }

  /**
   * Handle failed actor run
   */
  private async handleRunFailed(payload: ApifyWebhookPayload, syncRecord: any): Promise<void> {
    console.error('❌ Actor run failed:', payload.eventData.actorRunId);

    await this.syncService.updateSyncRecord(syncRecord.id, {
      status: 'failed',
      errorMessage: 'Apify actor run failed',
    });

    // Send admin notification about failure
    await sendNotification({
      type: 'mail',
      scope: 'super',
      superRole: 'ADMIN',
      title: `<p>Scraper run failed for <strong>${syncRecord.platform}</strong></p>`,
      category: 'System',
      metadata: {
        runId: payload.eventData.actorRunId,
        platform: syncRecord.platform,
        teamId: syncRecord.teamId,
        error: 'Apify actor run failed'
      },
      expiresInDays: 7
    });

    await prisma.apifyWebhookLog.updateMany({
      where: { apifyRunId: payload.eventData.actorRunId },
      data: {
        processingStatus: 'failed',
        errorMessage: 'Actor run failed',
      },
    });
  }

  /**
   * Handle aborted actor run
   */
  private async handleRunAborted(payload: ApifyWebhookPayload, syncRecord: any): Promise<void> {
    console.warn('⚠️ Actor run aborted:', payload.eventData.actorRunId);

    await this.syncService.updateSyncRecord(syncRecord.id, {
      status: 'failed',
      errorMessage: 'Apify actor run aborted',
    });

    // Send admin notification about abortion
    await sendNotification({
      type: 'delivery',
      scope: 'super',
      superRole: 'ADMIN',
      title: `<p>Scraper run aborted for <strong>${syncRecord.platform}</strong></p>`,
      category: 'System',
      metadata: { runId: payload.eventData.actorRunId, teamId: syncRecord.teamId },
      expiresInDays: 7
    });

    await prisma.apifyWebhookLog.updateMany({
      where: { apifyRunId: payload.eventData.actorRunId },
      data: {
        processingStatus: 'failed',
        errorMessage: 'Actor run aborted',
      },
    });
  }
}

