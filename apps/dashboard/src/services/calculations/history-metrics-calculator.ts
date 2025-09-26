import { 
  HistoryDataPoint,
  InstagramDailySnapshot 
} from '@/types/instagram-analytics';

import { InstagramCalculationUtils } from './instagram-calculation-utils';

/**
 * Calculator for history metrics (table data with deltas)
 * Follows Single Responsibility Principle
 */
export class HistoryMetricsCalculator {
  /**
   * Calculate history metrics from snapshots
   */
  static calculate(snapshots: InstagramDailySnapshot[]): HistoryDataPoint[] {
    if (snapshots.length === 0) {
      return [];
    }

    return snapshots.map((snapshot, index) => {
      const previousSnapshot = index > 0 ? snapshots[index - 1] : null;
      
      return {
        date: snapshot.snapshotDate.toISOString().split('T')[0],
        followersCount: snapshot.followersCount,
        followersDelta: previousSnapshot 
          ? InstagramCalculationUtils.calculateGrowth(
              snapshot.followersCount,
              previousSnapshot.followersCount
            )
          : 0,
        followingCount: snapshot.followingCount,
        followingDelta: previousSnapshot 
          ? InstagramCalculationUtils.calculateGrowth(
              snapshot.followingCount,
              previousSnapshot.followingCount
            )
          : 0,
        mediaCount: snapshot.mediaCount,
        mediaDelta: previousSnapshot 
          ? InstagramCalculationUtils.calculateGrowth(
              snapshot.mediaCount,
              previousSnapshot.mediaCount
            )
          : 0,
        engagementRate: InstagramCalculationUtils.calculateEngagementRate(snapshot),
        engagementRateDelta: previousSnapshot 
          ? InstagramCalculationUtils.calculateEngagementRate(snapshot) -
            InstagramCalculationUtils.calculateEngagementRate(previousSnapshot)
          : 0
      };
    });
  }
}
