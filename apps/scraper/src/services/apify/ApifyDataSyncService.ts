/**
 * Apify Data Sync Service
 * Handles fetching data from Apify datasets and syncing to database
 */

import { ApifyClient } from 'apify-client';
import { prisma } from '@wirecrest/db';
import type { Platform, SyncType, SyncResult } from '../../types/apify.types';

export class ApifyDataSyncService {
  private apifyClient: ApifyClient;

  constructor(apifyToken: string) {
    this.apifyClient = new ApifyClient({ token: apifyToken });
  }

  /**
   * Fetch data from Apify dataset
   */
  async fetchDatasetItems<T = any>(datasetId: string): Promise<T[]> {
    const dataset = this.apifyClient.dataset(datasetId);
    const { items } = await dataset.listItems();
    return items as T[];
  }

  /**
   * Create sync record for tracking
   */
  async createSyncRecord(
    teamId: string,
    platform: Platform,
    syncType: SyncType,
    apifyRunId: string,
    datasetId?: string
  ): Promise<string> {
    const syncRecord = await prisma.syncRecord.create({
      data: {
        teamId,
        platform,
        syncType,
        apifyRunId,
        apifyDatasetId: datasetId || null,
        status: 'running',
        startedAt: new Date(),
      },
    });

    return syncRecord.id;
  }

  /**
   * Update sync record with results
   */
  async updateSyncRecord(
    syncRecordId: string,
    result: Partial<SyncResult> & { status: 'completed' | 'failed'; errorMessage?: string }
  ): Promise<void> {
    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: {
        status: result.status,
        completedAt: new Date(),
        reviewsProcessed: result.reviewsProcessed || 0,
        reviewsNew: result.reviewsNew || 0,
        reviewsDuplicate: result.reviewsDuplicate || 0,
        businessesUpdated: result.businessesUpdated || 0,
        errorMessage: result.errorMessage || null,
      },
    });
  }

  /**
   * Get sync record by Apify run ID
   */
  async getSyncRecordByRunId(apifyRunId: string): Promise<any | null> {
    return prisma.syncRecord.findUnique({
      where: { apifyRunId },
      include: { team: true },
    });
  }

  /**
   * Get recent sync records for a team
   */
  async getTeamSyncHistory(
    teamId: string,
    platform?: Platform,
    limit: number = 10
  ): Promise<any[]> {
    return prisma.syncRecord.findMany({
      where: {
        teamId,
        ...(platform && { platform }),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Update schedule last run time
   */
  async updateScheduleLastRun(
    teamId: string,
    platform: Platform,
    scheduleType: string
  ): Promise<void> {
    await prisma.apifySchedule.updateMany({
      where: {
        teamId,
        platform,
        scheduleType,
      },
      data: {
        lastRunAt: new Date(),
      },
    });
  }

  /**
   * Cancel sync record
   */
  async cancelSyncRecord(syncRecordId: string): Promise<void> {
    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorMessage: 'Sync cancelled by user or system',
      },
    });
  }

  /**
   * Get active syncs for a team
   */
  async getActiveSyncs(teamId: string): Promise<any[]> {
    return prisma.syncRecord.findMany({
      where: {
        teamId,
        status: { in: ['pending', 'running'] },
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}

