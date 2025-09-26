import { 
  ChartDataPoint,
  InstagramDailySnapshot, 
  CalculationResult 
} from '@/types/instagram-analytics';

/**
 * Utility class for Instagram analytics calculations
 * Follows Single Responsibility Principle - each method has one clear purpose
 */
export class InstagramCalculationUtils {
  /**
   * Calculate engagement rate from snapshot data
   * Formula: (likes + comments + saves + shares) / followers * 100
   */
  static calculateEngagementRate(snapshot: InstagramDailySnapshot): number {
    if (!snapshot.followersCount || snapshot.followersCount === 0) {
      return 0;
    }

    const totalEngagement = 
      (snapshot.totalLikes || 0) + 
      (snapshot.totalComments || 0) + 
      (snapshot.totalSaves || 0) + 
      (snapshot.totalShares || 0);

    return (totalEngagement / snapshot.followersCount) * 100;
  }

  /**
   * Calculate average likes per post
   */
  static calculateAvgLikesPerPost(snapshot: InstagramDailySnapshot): number {
    if (!snapshot.mediaCount || snapshot.mediaCount === 0) {
      return 0;
    }
    return (snapshot.totalLikes || 0) / snapshot.mediaCount;
  }

  /**
   * Calculate average comments per post
   */
  static calculateAvgCommentsPerPost(snapshot: InstagramDailySnapshot): number {
    if (!snapshot.mediaCount || snapshot.mediaCount === 0) {
      return 0;
    }
    return (snapshot.totalComments || 0) / snapshot.mediaCount;
  }

  /**
   * Calculate comments ratio (comments per 100 likes)
   */
  static calculateCommentsRatio(snapshot: InstagramDailySnapshot): number {
    if (!snapshot.totalLikes || snapshot.totalLikes === 0) {
      return 0;
    }
    return ((snapshot.totalComments || 0) / snapshot.totalLikes) * 100;
  }

  /**
   * Calculate followers ratio (followers / following)
   */
  static calculateFollowersRatio(snapshot: InstagramDailySnapshot): number {
    if (!snapshot.followingCount || snapshot.followingCount === 0) {
      return 0;
    }
    return (snapshot.followersCount || 0) / snapshot.followingCount;
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
  static calculateWeeklyFollowers(snapshots: InstagramDailySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    
    const latest = snapshots[snapshots.length - 1];
    const weekAgoIndex = Math.max(0, snapshots.length - 7);
    const weekAgo = snapshots[weekAgoIndex];
    
    return this.calculateGrowth(latest.followersCount, weekAgo.followersCount);
  }

  /**
   * Calculate monthly followers growth
   */
  static calculateMonthlyFollowers(snapshots: InstagramDailySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    
    const latest = snapshots[snapshots.length - 1];
    const monthAgoIndex = Math.max(0, snapshots.length - 30);
    const monthAgo = snapshots[monthAgoIndex];
    
    return this.calculateGrowth(latest.followersCount, monthAgo.followersCount);
  }

  /**
   * Calculate 90-day growth rate
   */
  static calculate90DayGrowthRate(snapshots: InstagramDailySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    
    const latest = snapshots[snapshots.length - 1];
    const ninetyDaysAgoIndex = Math.max(0, snapshots.length - 90);
    const ninetyDaysAgo = snapshots[ninetyDaysAgoIndex];
    
    return this.calculateGrowthRate(latest.followersCount, ninetyDaysAgo.followersCount);
  }

  /**
   * Calculate steady growth rate (consistency measure)
   */
  static calculateSteadyGrowthRate(snapshots: InstagramDailySnapshot[]): number {
    if (snapshots.length < 7) return 0;
    
    const recentSnapshots = snapshots.slice(-7);
    const growthRates = recentSnapshots.map((snapshot, index) => {
      if (index === 0) return 0;
      const previous = recentSnapshots[index - 1];
      return this.calculateGrowthRate(snapshot.followersCount, previous.followersCount);
    });
    
    // Calculate standard deviation to measure consistency
    const mean = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const variance = growthRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / growthRates.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Return consistency score (lower deviation = higher consistency)
    return Math.max(0, 100 - standardDeviation);
  }

  /**
   * Calculate weekly posts count
   */
  static calculateWeeklyPosts(snapshots: InstagramDailySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    
    const recentSnapshots = snapshots.slice(-7);
    return recentSnapshots.reduce((sum, snapshot) => sum + (snapshot.newPosts || 0), 0);
  }

  /**
   * Generate chart data from snapshots
   */
  static generateChartData(
    snapshots: InstagramDailySnapshot[], 
    valueExtractor: (snapshot: InstagramDailySnapshot, index?: number) => number
  ): ChartDataPoint[] {
    return snapshots.map((snapshot, index) => ({
      date: snapshot.snapshotDate.toISOString().split('T')[0],
      value: valueExtractor(snapshot, index)
    }));
  }

  /**
   * Generate predicted followers chart
   */
  static generatePredictedFollowersChart(snapshots: InstagramDailySnapshot[]): ChartDataPoint[] {
    if (snapshots.length < 2) return [];
    
    const latest = snapshots[snapshots.length - 1];
    const avgDailyGrowth = this.calculateAverageDailyGrowth(snapshots);
    
    return snapshots.map((snapshot, index) => ({
      date: snapshot.snapshotDate.toISOString().split('T')[0],
      value: latest.followersCount + (avgDailyGrowth * (index + 1))
    }));
  }

  /**
   * Calculate average daily growth
   */
  private static calculateAverageDailyGrowth(snapshots: InstagramDailySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    
    const totalGrowth = snapshots.reduce((sum, snapshot, index) => {
      if (index === 0) return sum;
      const previous = snapshots[index - 1];
      return sum + this.calculateGrowth(snapshot.followersCount, previous.followersCount);
    }, 0);
    
    return totalGrowth / (snapshots.length - 1);
  }

  /**
   * Validate snapshot data
   */
  static validateSnapshotData(snapshots: InstagramDailySnapshot[]): CalculationResult<boolean> {
    const errors: string[] = [];
    
    if (snapshots.length === 0) {
      errors.push('No snapshots available');
    }
    
    snapshots.forEach((snapshot, index) => {
      if (snapshot.followersCount < 0) {
        errors.push(`Invalid followers count at index ${index}`);
      }
      if (snapshot.followingCount < 0) {
        errors.push(`Invalid following count at index ${index}`);
      }
      if (snapshot.mediaCount < 0) {
        errors.push(`Invalid media count at index ${index}`);
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
