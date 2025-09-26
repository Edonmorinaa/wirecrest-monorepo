import { 
  HistoryDataPoint,
  TikTokDailySnapshot
} from '@/types/tiktok-analytics';
import { TikTokCalculationUtils } from './tiktok-calculation-utils';

/**
 * TikTok History Metrics Calculator
 * Follows Single Responsibility Principle - only calculates history metrics
 */
export class TikTokHistoryMetricsCalculator {
  /**
   * Calculate history metrics
   */
  static calculate(snapshots: TikTokDailySnapshot[]): HistoryDataPoint[] {
    if (snapshots.length === 0) {
      return [];
    }

    return snapshots.map((snapshot, index) => {
      const previousSnapshot = index > 0 ? snapshots[index - 1] : null;
      
      const followersDelta = previousSnapshot 
        ? TikTokCalculationUtils.calculateGrowth(snapshot.followerCount, previousSnapshot.followerCount)
        : 0;
        
      const followingDelta = previousSnapshot 
        ? TikTokCalculationUtils.calculateGrowth(snapshot.followingCount, previousSnapshot.followingCount)
        : 0;
        
      const videoDelta = previousSnapshot 
        ? TikTokCalculationUtils.calculateGrowth(snapshot.videoCount, previousSnapshot.videoCount)
        : 0;
        
      const engagementRate = TikTokCalculationUtils.calculateEngagementRate(snapshot);
      const previousEngagementRate = previousSnapshot 
        ? TikTokCalculationUtils.calculateEngagementRate(previousSnapshot)
        : 0;
        
      const engagementRateDelta = engagementRate - previousEngagementRate;

      return {
        date: snapshot.snapshotDate.toISOString().split('T')[0],
        followerCount: snapshot.followerCount,
        followersDelta: TikTokCalculationUtils.formatNumber(followersDelta),
        followingCount: snapshot.followingCount,
        followingDelta: TikTokCalculationUtils.formatNumber(followingDelta),
        videoCount: snapshot.videoCount,
        videoDelta: TikTokCalculationUtils.formatNumber(videoDelta),
        engagementRate: TikTokCalculationUtils.formatPercentage(engagementRate),
        engagementRateDelta: TikTokCalculationUtils.formatPercentage(engagementRateDelta)
      };
    });
  }
}
