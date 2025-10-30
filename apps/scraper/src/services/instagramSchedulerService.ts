/**
 * LEGACY FILE - For reference only
 * Supabase has been removed. This service is deprecated.
 */

import { InstagramDataService } from './instagramDataService';
import { InstagramSnapshotSchedule } from '../types/instagram';
import supabase from '../supabase/supabaseClient';

export class InstagramSchedulerService {
  private supabase: any; // LEGACY: Supabase removed
  private instagramService: InstagramDataService;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastSnapshotTimes: Map<string, Date> = new Map(); // Track last snapshot time per business

  constructor(instagramService: InstagramDataService) {
    this.supabase = supabase;
    this.instagramService = instagramService;
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Instagram scheduler is already running');
      return;
    }

    console.log('🚀 Starting Instagram snapshot scheduler...');
    this.isRunning = true;

    // Check for scheduled snapshots every 5 minutes (more efficient)
    this.schedulerInterval = setInterval(async () => {
      await this.checkAndExecuteScheduledSnapshots();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Also run immediately to catch any missed snapshots
    await this.checkAndExecuteScheduledSnapshots();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Instagram scheduler stopped');
  }

  /**
   * Check for and execute scheduled snapshots
   */
  private async checkAndExecuteScheduledSnapshots(): Promise<void> {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
      const currentDate = now.toISOString().split('T')[0];

      // Get all active schedules with business profile info
      const { data: schedules, error } = await this.supabase
        .from('InstagramSnapshotSchedule')
        .select(`
          *,
          businessProfile:InstagramBusinessProfile!inner(
            id,
            username,
            teamId
          )
        `)
        .eq('isActive', true);

      if (error) {
        console.error('Error fetching Instagram schedules:', error);
        return;
      }

      if (!schedules || schedules.length === 0) {
        return;
      }

      console.log(`📅 Checking ${schedules.length} Instagram snapshot schedules...`);

      for (const schedule of schedules) {
        await this.processSchedule(schedule, currentTime, currentDate, now);
      }
    } catch (error) {
      console.error('Error in Instagram scheduler:', error);
    }
  }

  /**
   * Process a single schedule with rate limiting and time gaps
   */
  private async processSchedule(
    schedule: InstagramSnapshotSchedule & { businessProfile: any },
    currentTime: string,
    currentDate: string,
    now: Date
  ): Promise<void> {
    try {
      const businessId = schedule.businessProfileId;
      const lastSnapshotTime = this.lastSnapshotTimes.get(businessId);
      
      // Check if it's time to take a snapshot (within 5 minutes of scheduled time)
      const scheduledTime = new Date();
      const [hours, minutes] = schedule.snapshotTime.split(':').map(Number);
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      const timeDiff = Math.abs(now.getTime() - scheduledTime.getTime());
      const isScheduledTime = timeDiff <= 5 * 60 * 1000; // Within 5 minutes of scheduled time
      
      if (!isScheduledTime) {
        return;
      }

      // Check time gap between snapshots (minimum 6 hours to avoid rate limits)
      const minTimeGap = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
      if (lastSnapshotTime && (now.getTime() - lastSnapshotTime.getTime()) < minTimeGap) {
        console.log(`⏰ Skipping snapshot for ${schedule.businessProfile.username} - too soon since last snapshot`);
        return;
      }

      // Check if we already took a snapshot today
      const { data: existingSnapshot } = await this.supabase
        .from('InstagramDailySnapshot')
        .select('id')
        .eq('businessProfileId', businessId)
        .eq('snapshotDate', currentDate)
        .single();

      if (existingSnapshot) {
        console.log(`✅ Snapshot already exists for ${schedule.businessProfile.username} on ${currentDate}`);
        return;
      }

      // Check daily snapshot limit (max 2 per day to avoid rate limits)
      const { data: todaySnapshots } = await this.supabase
        .from('InstagramDailySnapshot')
        .select('id')
        .eq('businessProfileId', businessId)
        .eq('snapshotDate', currentDate);

      if (todaySnapshots && todaySnapshots.length >= 2) {
        console.log(`⚠️  Daily limit reached for ${schedule.businessProfile.username} (${todaySnapshots.length}/2 snapshots)`);
        return;
      }

      console.log(`📸 Taking scheduled snapshot for ${schedule.businessProfile.username}...`);

      // Update last executed time
      await this.supabase
        .from('InstagramSnapshotSchedule')
        .update({ 
          lastExecutedAt: now.toISOString(),
          updatedAt: now.toISOString()
        })
        .eq('id', schedule.id);

      // Take the snapshot
      const result = await this.instagramService.takeDailySnapshot(
        businessId,
        {
          snapshotType: 'DAILY',
          includeMedia: true,
          includeComments: true,
          maxMedia: 10,
          maxComments: 50
        }
      );

      if (result.success) {
        // Update success time and reset failure count
          await this.supabase
          .from('InstagramSnapshotSchedule')
          .update({ 
            lastSuccessAt: now.toISOString(),
            consecutiveFailures: 0,
            updatedAt: now.toISOString()
          })
          .eq('id', schedule.id);

        // Track the last snapshot time for this business
        this.lastSnapshotTimes.set(businessId, now);

        console.log(`✅ Successfully took snapshot ${result.snapshotId} for ${schedule.businessProfile.username}`);
      } else {
        // Increment failure count
        const newFailureCount = schedule.consecutiveFailures + 1;
          await this.supabase
          .from('InstagramSnapshotSchedule')
          .update({ 
              consecutiveFailures: newFailureCount,
            updatedAt: now.toISOString()
          })
          .eq('id', schedule.id);

        console.error(`❌ Failed to take snapshot for ${schedule.businessProfile.username}: ${result.error}`);

        // If too many consecutive failures, deactivate the schedule
        if (newFailureCount >= schedule.maxRetries) {
          await this.supabase
            .from('InstagramSnapshotSchedule')
            .update({ 
              isEnabled: false,
              updatedAt: now.toISOString()
            })
            .eq('id', schedule.id);

          console.warn(`⚠️  Deactivated schedule for ${schedule.businessProfile.username} due to ${newFailureCount} consecutive failures`);
        }
      }
    } catch (error) {
      console.error(`Error processing schedule ${schedule.id}:`, error);
    }
  }

  /**
   * Manually trigger snapshots for all active schedules
   */
  async triggerAllSnapshots(): Promise<{ success: boolean; processed: number; errors: number }> {
    try {
      const { data: schedules, error } = await this.supabase
        .from('InstagramSnapshotSchedule')
        .select('*')
        .eq('isActive', true);

      if (error) {
        console.error('Error fetching Instagram schedules:', error);
        return { success: false, processed: 0, errors: 1 };
      }

      if (!schedules || schedules.length === 0) {
        return { success: true, processed: 0, errors: 0 };
      }

      console.log(`🔄 Manually triggering ${schedules.length} Instagram snapshots...`);

      let processed = 0;
      let errors = 0;

      for (const schedule of schedules) {
        try {
          const result = await this.instagramService.takeDailySnapshot(
            schedule.businessProfileId,
            {
              snapshotType: 'MANUAL',
              includeMedia: true,
              includeComments: true,
              maxMedia: 10,
              maxComments: 50
            }
          );

          if (result.success) {
            processed++;
            console.log(`✅ Manual snapshot successful for business ${schedule.businessProfileId}`);
          } else {
            errors++;
            console.error(`❌ Manual snapshot failed for business ${schedule.businessProfileId}: ${result.error}`);
          }
        } catch (error) {
          errors++;
          console.error(`❌ Error taking manual snapshot for business ${schedule.businessProfileId}:`, error);
        }

        // Add delay between snapshots to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      return { success: true, processed, errors };
    } catch (error) {
      console.error('Error triggering all snapshots:', error);
      return { success: false, processed: 0, errors: 1 };
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    nextCheck: Date;
    activeSchedules: number;
  } {
    const nextCheck = new Date();
    nextCheck.setMinutes(nextCheck.getMinutes() + 1);
    nextCheck.setSeconds(0);
    nextCheck.setMilliseconds(0);

    return {
      isRunning: this.isRunning,
      nextCheck,
      activeSchedules: 0 // Would need to query database for actual count
    };
  }

  /**
   * Clean up old snapshots (optional maintenance)
   */
  async cleanupOldSnapshots(olderThanDays: number = 90): Promise<{ success: boolean; deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Delete old snapshots
      const { data: deletedSnapshots, error: snapshotError } = await this.supabase
        .from('InstagramDailySnapshot')
        .delete()
        .lt('snapshotDate', cutoffDate.toISOString().split('T')[0])
        .select('id');

      if (snapshotError) {
        console.error('Error deleting old snapshots:', snapshotError);
        return { success: false, deleted: 0 };
      }

      const deletedCount = deletedSnapshots?.length || 0;
      console.log(`🧹 Cleaned up ${deletedCount} Instagram snapshots older than ${olderThanDays} days`);

      return { success: true, deleted: deletedCount };
    } catch (error) {
      console.error('Error cleaning up old snapshots:', error);
      return { success: false, deleted: 0 };
    }
  }
} 