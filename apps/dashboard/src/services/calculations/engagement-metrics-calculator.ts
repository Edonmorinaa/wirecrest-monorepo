import { 
  EngagementMetrics, 
  InstagramAnalytics, 
  InstagramDailySnapshot 
} from '@/types/instagram-analytics';

import { InstagramCalculationUtils } from './instagram-calculation-utils';

/**
 * Calculator for engagement metrics (rates, averages, charts)
 * Follows Single Responsibility Principle
 */
export class EngagementMetricsCalculator {
  /**
   * Calculate engagement metrics from snapshots and analytics
   */
  static calculate(
    snapshots: InstagramDailySnapshot[],
    analytics: InstagramAnalytics[]
  ): EngagementMetrics | null {
    if (snapshots.length === 0) {
      return null;
    }

    const latestAnalytics = analytics.length > 0 ? analytics[analytics.length - 1] : null;
    const latestSnapshot = snapshots[snapshots.length - 1];

    // Calculate engagement rate
    const engagementRate = InstagramCalculationUtils.formatPercentage(
      InstagramCalculationUtils.calculateEngagementRate(latestSnapshot)
    );

    // Calculate average likes and comments
    const avgLikes = InstagramCalculationUtils.formatNumber(
      InstagramCalculationUtils.calculateAvgLikesPerPost(latestSnapshot)
    );
    
    const avgComments = InstagramCalculationUtils.formatNumber(
      InstagramCalculationUtils.calculateAvgCommentsPerPost(latestSnapshot)
    );

    // Calculate weekly engagement rate (average of last 7 days)
    const weeklyEngagementRate = InstagramCalculationUtils.formatPercentage(
      this.calculateWeeklyEngagementRate(snapshots)
    );

    // Calculate weekly posts
    const weeklyPosts = InstagramCalculationUtils.formatNumber(
      InstagramCalculationUtils.calculateWeeklyPosts(snapshots)
    );

    // Calculate comments ratio
    const commentsRatio = InstagramCalculationUtils.formatPercentage(
      InstagramCalculationUtils.calculateCommentsRatio(latestSnapshot)
    );

    return {
      engagementRate,
      avgLikes,
      weeklyEngagementRate,
      weeklyPosts,
      avgComments,
      commentsRatio,
      engagementRateChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => InstagramCalculationUtils.calculateEngagementRate(snapshot)
      ),
      avgLikesChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => InstagramCalculationUtils.calculateAvgLikesPerPost(snapshot)
      ),
      weeklyEngagementRateChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot, index) => this.calculateWeeklyEngagementRateUpTo(snapshots, index)
      ),
      weeklyPostsChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot, index) => this.calculateWeeklyPostsUpTo(snapshots, index)
      ),
      avgCommentsChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => InstagramCalculationUtils.calculateAvgCommentsPerPost(snapshot)
      ),
      commentsRatioChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => InstagramCalculationUtils.calculateCommentsRatio(snapshot)
      )
    };
  }

  /**
   * Calculate weekly engagement rate (average of last 7 days)
   */
  private static calculateWeeklyEngagementRate(snapshots: InstagramDailySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    
    const recentSnapshots = snapshots.slice(-7);
    const engagementRates = recentSnapshots.map(snapshot => 
      InstagramCalculationUtils.calculateEngagementRate(snapshot)
    );
    
    const sum = engagementRates.reduce((total, rate) => total + rate, 0);
    return sum / engagementRates.length;
  }

  /**
   * Calculate weekly engagement rate up to a specific index
   */
  private static calculateWeeklyEngagementRateUpTo(
    snapshots: InstagramDailySnapshot[], 
    index: number
  ): number {
    const startIndex = Math.max(0, index - 6);
    const weekSnapshots = snapshots.slice(startIndex, index + 1);
    return this.calculateWeeklyEngagementRate(weekSnapshots);
  }

  /**
   * Calculate weekly posts up to a specific index
   */
  private static calculateWeeklyPostsUpTo(
    snapshots: InstagramDailySnapshot[], 
    index: number
  ): number {
    const startIndex = Math.max(0, index - 6);
    const weekSnapshots = snapshots.slice(startIndex, index + 1);
    return InstagramCalculationUtils.calculateWeeklyPosts(weekSnapshots);
  }
}
