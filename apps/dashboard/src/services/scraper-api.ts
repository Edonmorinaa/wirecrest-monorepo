/**
 * Scraper API Client (Read-Only)
 * 
 * Service for reading sync status from the scraper service.
 * 
 * NOTE: Dashboard does NOT trigger scraper operations!
 * All scraper operations are triggered by Stripe webhooks directly.
 * This client is ONLY for reading status.
 */

import axios from 'axios';

const SCRAPER_API_URL =
  process.env.NEXT_PUBLIC_SCRAPER_API_URL || 'http://localhost:3001';

export class ScraperApiClient {
  // =================== READ-ONLY METHODS ===================
  // Dashboard only observes scraper state, doesn't control it

  /**
   * Get sync status for team
   */
  static async getSyncStatus(teamId: string): Promise<{
    recentSyncs: Array<{
      id: string;
      platform: string;
      syncType: string;
      status: string;
      reviewsNew: number;
      reviewsDuplicate: number;
      startedAt: Date;
      completedAt: Date | null;
    }>;
    activeSchedules: number;
    lastSync: Date | null;
  }> {
    const response = await axios.get(
      `${SCRAPER_API_URL}/api/sync-status/${teamId}`
    );
    return response.data;
  }

  /**
   * Get schedules for team
   */
  static async getSchedules(teamId: string): Promise<
    Array<{
      id: string;
      platform: string;
      scheduleType: string;
      cronExpression: string;
      intervalHours: number;
      isActive: boolean;
      lastRunAt: Date | null;
      nextRunAt: Date | null;
    }>
  > {
    const response = await axios.get(
      `${SCRAPER_API_URL}/api/schedules/${teamId}`
    );
    return response.data;
  }
}

