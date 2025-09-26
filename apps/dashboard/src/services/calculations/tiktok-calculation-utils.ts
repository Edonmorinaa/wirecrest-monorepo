import { 
  ChartDataPoint,
  TikTokDailySnapshot, 
  CalculationResult 
} from '@/types/tiktok-analytics';

/**
 * Utility class for TikTok analytics calculations
 * Follows Single Responsibility Principle - each method has one clear purpose
 */
export class TikTokCalculationUtils {
  /**
   * Calculate engagement rate from snapshot data
   * Formula: (likes + comments + shares + downloads) / followers * 100
   */
  static calculateEngagementRate(snapshot: TikTokDailySnapshot): number {
    if (!snapshot.followerCount || snapshot.followerCount === 0) {
      return 0;
    }

    const totalEngagement = 
      (snapshot.totalLikes || 0) + 
      (snapshot.totalComments || 0) + 
      (snapshot.totalShares || 0) + 
      (snapshot.totalDownloads || 0);

    return (totalEngagement / snapshot.followerCount) * 100;
  }

  /**
   * Calculate average likes per video
   */
  static calculateAvgLikesPerVideo(snapshot: TikTokDailySnapshot): number {
    if (!snapshot.videoCount || snapshot.videoCount === 0) {
      return 0;
    }
    return (snapshot.totalLikes || 0) / snapshot.videoCount;
  }

  /**
   * Calculate average comments per video
   */
  static calculateAvgCommentsPerVideo(snapshot: TikTokDailySnapshot): number {
    if (!snapshot.videoCount || snapshot.videoCount === 0) {
      return 0;
    }
    return (snapshot.totalComments || 0) / snapshot.videoCount;
  }

  /**
   * Calculate average views per video
   */
  static calculateAvgViewsPerVideo(snapshot: TikTokDailySnapshot): number {
    if (!snapshot.videoCount || snapshot.videoCount === 0) {
      return 0;
    }
    return (snapshot.totalViews || 0) / snapshot.videoCount;
  }

  /**
   * Calculate average shares per video
   */
  static calculateAvgSharesPerVideo(snapshot: TikTokDailySnapshot): number {
    if (!snapshot.videoCount || snapshot.videoCount === 0) {
      return 0;
    }
    return (snapshot.totalShares || 0) / snapshot.videoCount;
  }

  /**
   * Calculate average downloads per video
   */
  static calculateAvgDownloadsPerVideo(snapshot: TikTokDailySnapshot): number {
    if (!snapshot.videoCount || snapshot.videoCount === 0) {
      return 0;
    }
    return (snapshot.totalDownloads || 0) / snapshot.videoCount;
  }

  /**
   * Calculate comments ratio (comments per 100 likes)
   */
  static calculateCommentsRatio(snapshot: TikTokDailySnapshot): number {
    if (!snapshot.totalLikes || snapshot.totalLikes === 0) {
      return 0;
    }
    return ((snapshot.totalComments || 0) / snapshot.totalLikes) * 100;
  }

  /**
   * Calculate followers ratio (followers / following)
   */
  static calculateFollowersRatio(snapshot: TikTokDailySnapshot): number {
    if (!snapshot.followingCount || snapshot.followingCount === 0) {
      return 0;
    }
    return (snapshot.followerCount || 0) / snapshot.followingCount;
  }

  /**
   * Calculate growth rate between two snapshots
   */
  static calculateGrowthRate(current: number, previous: number): number {
    if (!previous || previous === 0) {
      return 0;
    }
    return ((current - previous) / previous) * 100;
  }

  /**
   * Calculate absolute growth between two snapshots
   */
  static calculateGrowth(current: number, previous: number): number {
    return current - previous;
  }

  /**
   * Calculate weekly followers growth
   */
  static calculateWeeklyFollowers(snapshots: TikTokDailySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    
    const latest = snapshots[snapshots.length - 1];
    const weekAgoIndex = Math.max(0, snapshots.length - 7);
    const weekAgo = snapshots[weekAgoIndex];
    
    return this.calculateGrowth(latest.followerCount, weekAgo.followerCount);
  }

  /**
   * Calculate monthly followers growth
   */
  static calculateMonthlyFollowers(snapshots: TikTokDailySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    
    const latest = snapshots[snapshots.length - 1];
    const monthAgoIndex = Math.max(0, snapshots.length - 30);
    const monthAgo = snapshots[monthAgoIndex];
    
    return this.calculateGrowth(latest.followerCount, monthAgo.followerCount);
  }

  /**
   * Calculate 90-day growth rate
   */
  static calculate90DayGrowthRate(snapshots: TikTokDailySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    
    const latest = snapshots[snapshots.length - 1];
    const ninetyDaysAgoIndex = Math.max(0, snapshots.length - 90);
    const ninetyDaysAgo = snapshots[ninetyDaysAgoIndex];
    
    return this.calculateGrowthRate(latest.followerCount, ninetyDaysAgo.followerCount);
  }

  /**
   * Calculate steady growth rate (consistency measure)
   */
  static calculateSteadyGrowthRate(snapshots: TikTokDailySnapshot[]): number {
    if (snapshots.length < 7) return 0;
    
    const recentSnapshots = snapshots.slice(-7);
    const growthRates = recentSnapshots.map((snapshot, index) => {
      if (index === 0) return 0;
      const previous = recentSnapshots[index - 1];
      return this.calculateGrowthRate(snapshot.followerCount, previous.followerCount);
    });
    
    // Calculate standard deviation to measure consistency
    const mean = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const variance = growthRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / growthRates.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Return consistency score (lower deviation = higher consistency)
    return Math.max(0, 100 - standardDeviation);
  }

  /**
   * Calculate weekly videos count
   */
  static calculateWeeklyVideos(snapshots: TikTokDailySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    
    const recentSnapshots = snapshots.slice(-7);
    return recentSnapshots.reduce((sum, snapshot) => sum + (snapshot.newVideos || 0), 0);
  }

  /**
   * Generate chart data from snapshots
   */
  static generateChartData(
    snapshots: TikTokDailySnapshot[], 
    valueExtractor: (snapshot: TikTokDailySnapshot, index?: number) => number
  ): ChartDataPoint[] {
    return snapshots.map((snapshot, index) => ({
      date: snapshot.snapshotDate.toISOString().split('T')[0],
      value: valueExtractor(snapshot, index)
    }));
  }

  /**
   * Generate predicted followers chart
   */
  static generatePredictedFollowersChart(snapshots: TikTokDailySnapshot[]): ChartDataPoint[] {
    if (snapshots.length < 2) return [];
    
    const latest = snapshots[snapshots.length - 1];
    const avgDailyGrowth = this.calculateAverageDailyGrowth(snapshots);
    
    return snapshots.map((snapshot, index) => ({
      date: snapshot.snapshotDate.toISOString().split('T')[0],
      value: latest.followerCount + (avgDailyGrowth * (index + 1))
    }));
  }

  /**
   * Calculate average daily growth
   */
  private static calculateAverageDailyGrowth(snapshots: TikTokDailySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    
    const totalGrowth = snapshots.reduce((sum, snapshot, index) => {
      if (index === 0) return sum;
      const previous = snapshots[index - 1];
      return sum + this.calculateGrowth(snapshot.followerCount, previous.followerCount);
    }, 0);
    
    return totalGrowth / (snapshots.length - 1);
  }

  /**
   * Validate snapshot data
   */
  static validateSnapshotData(snapshots: TikTokDailySnapshot[]): CalculationResult<boolean> {
    const errors: string[] = [];
    
    if (snapshots.length === 0) {
      errors.push('No snapshots available');
    }
    
    snapshots.forEach((snapshot, index) => {
      if (snapshot.followerCount < 0) {
        errors.push(`Invalid follower count at index ${index}`);
      }
      if (snapshot.followingCount < 0) {
        errors.push(`Invalid following count at index ${index}`);
      }
      if (snapshot.videoCount < 0) {
        errors.push(`Invalid video count at index ${index}`);
      }
    });
    
    return {
      data: errors.length === 0,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Safe number formatting
   */
  static formatNumber(num: number | null | undefined): number {
    if (num == null || isNaN(num)) return 0;
    return Math.round(num * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Safe percentage formatting
   */
  static formatPercentage(num: number | null | undefined): number {
    if (num == null || isNaN(num)) return 0;
    return Math.round(num * 100) / 100; // Round to 2 decimal places
  }
}
