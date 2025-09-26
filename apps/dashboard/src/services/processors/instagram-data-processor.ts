import { prisma } from '@wirecrest/db';
import { InstagramCalculationUtils } from '../calculations/instagram-calculation-utils';
import { InstagramDailySnapshot } from '@/types/instagram-analytics';

/**
 * Data processor for Instagram analytics
 * Calculates and stores computed fields for better performance
 * Follows Single Responsibility Principle
 */
export class InstagramDataProcessor {
  /**
   * Process and update calculated fields for a snapshot
   */
  static async processSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const snapshot = await prisma.instagramDailySnapshot.findUnique({
        where: { id: snapshotId }
      });

      if (!snapshot) {
        console.error(`Snapshot not found: ${snapshotId}`);
        return false;
      }

      // Calculate all computed fields
      const calculatedFields = this.calculateSnapshotFields(snapshot);

      // Update the snapshot with calculated fields
      await prisma.instagramDailySnapshot.update({
        where: { id: snapshotId },
        data: calculatedFields
      });

      console.log(`Successfully processed snapshot: ${snapshotId}`);
      return true;

    } catch (error) {
      console.error(`Error processing snapshot ${snapshotId}:`, error);
      return false;
    }
  }

  /**
   * Process all snapshots for a business profile
   */
  static async processBusinessProfileSnapshots(businessProfileId: string): Promise<number> {
    try {
      const snapshots = await prisma.instagramDailySnapshot.findMany({
        where: { businessProfileId },
        orderBy: { snapshotDate: 'asc' }
      });

      let processedCount = 0;

      for (const snapshot of snapshots) {
        const success = await this.processSnapshot(snapshot.id);
        if (success) {
          processedCount++;
        }
      }

      console.log(`Processed ${processedCount} snapshots for business profile: ${businessProfileId}`);
      return processedCount;

    } catch (error) {
      console.error(`Error processing snapshots for business profile ${businessProfileId}:`, error);
      return 0;
    }
  }

  /**
   * Process all unprocessed snapshots
   */
  static async processAllUnprocessedSnapshots(): Promise<number> {
    try {
      // Find snapshots that need processing (where calculated fields are 0 or null)
      const unprocessedSnapshots = await prisma.instagramDailySnapshot.findMany({
        where: {
          OR: [
            { avgLikesPerPost: 0 },
            { avgCommentsPerPost: 0 },
            { commentsRatio: 0 },
            { followersRatio: 0 }
          ]
        },
        orderBy: { snapshotDate: 'asc' }
      });

      let processedCount = 0;

      for (const snapshot of unprocessedSnapshots) {
        const success = await this.processSnapshot(snapshot.id);
        if (success) {
          processedCount++;
        }
      }

      console.log(`Processed ${processedCount} unprocessed snapshots`);
      return processedCount;

    } catch (error) {
      console.error('Error processing unprocessed snapshots:', error);
      return 0;
    }
  }

  /**
   * Calculate all computed fields for a snapshot
   */
  private static calculateSnapshotFields(snapshot: any) {
    return {
      engagementRate: InstagramCalculationUtils.calculateEngagementRate(snapshot),
      avgLikesPerPost: InstagramCalculationUtils.calculateAvgLikesPerPost(snapshot),
      avgCommentsPerPost: InstagramCalculationUtils.calculateAvgCommentsPerPost(snapshot),
      commentsRatio: InstagramCalculationUtils.calculateCommentsRatio(snapshot),
      followersRatio: InstagramCalculationUtils.calculateFollowersRatio(snapshot)
    };
  }

  /**
   * Calculate growth fields for a snapshot based on previous snapshots
   */
  static async calculateGrowthFields(snapshotId: string): Promise<boolean> {
    try {
      const snapshot = await prisma.instagramDailySnapshot.findUnique({
        where: { id: snapshotId }
      });

      if (!snapshot) {
        return false;
      }

      // Get previous snapshots for growth calculations
      const previousSnapshots = await prisma.instagramDailySnapshot.findMany({
        where: {
          businessProfileId: snapshot.businessProfileId,
          snapshotDate: { lt: snapshot.snapshotDate }
        },
        orderBy: { snapshotDate: 'desc' },
        take: 30 // Get up to 30 previous snapshots
      });

      const growthFields = this.calculateGrowthFieldsForSnapshot(snapshot, previousSnapshots);

      // Update the snapshot with growth fields
      await prisma.instagramDailySnapshot.update({
        where: { id: snapshotId },
        data: growthFields
      });

      return true;

    } catch (error) {
      console.error(`Error calculating growth fields for snapshot ${snapshotId}:`, error);
      return false;
    }
  }

  /**
   * Calculate growth fields for a snapshot
   */
  private static calculateGrowthFieldsForSnapshot(
    snapshot: any, 
    previousSnapshots: any[]
  ) {
    const previousDay = previousSnapshots[0];
    const previousWeek = previousSnapshots[6];
    const previousMonth = previousSnapshots[29];

    return {
      followersGrowth: previousDay 
        ? InstagramCalculationUtils.calculateGrowth(snapshot.followersCount, previousDay.followersCount)
        : 0,
      followingGrowth: previousDay 
        ? InstagramCalculationUtils.calculateGrowth(snapshot.followingCount, previousDay.followingCount)
        : 0,
      mediaGrowth: previousDay 
        ? InstagramCalculationUtils.calculateGrowth(snapshot.mediaCount, previousDay.mediaCount)
        : 0,
      weeklyFollowersGrowth: previousWeek 
        ? InstagramCalculationUtils.calculateGrowth(snapshot.followersCount, previousWeek.followersCount)
        : 0,
      monthlyFollowersGrowth: previousMonth 
        ? InstagramCalculationUtils.calculateGrowth(snapshot.followersCount, previousMonth.followersCount)
        : 0
    };
  }

  /**
   * Recalculate all analytics for a business profile
   */
  static async recalculateBusinessProfileAnalytics(businessProfileId: string): Promise<boolean> {
    try {
      // First, process all snapshots
      await this.processBusinessProfileSnapshots(businessProfileId);

      // Then, calculate growth fields for each snapshot
      const snapshots = await prisma.instagramDailySnapshot.findMany({
        where: { businessProfileId },
        orderBy: { snapshotDate: 'asc' }
      });

      for (const snapshot of snapshots) {
        await this.calculateGrowthFields(snapshot.id);
      }

      console.log(`Successfully recalculated analytics for business profile: ${businessProfileId}`);
      return true;

    } catch (error) {
      console.error(`Error recalculating analytics for business profile ${businessProfileId}:`, error);
      return false;
    }
  }
}
