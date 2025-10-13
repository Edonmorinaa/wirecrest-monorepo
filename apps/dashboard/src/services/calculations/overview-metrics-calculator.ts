import { 
  OverviewMetrics, 
  InstagramAnalytics, 
  InstagramDailySnapshot 
} from '@/types/instagram-analytics';

import { InstagramCalculationUtils } from './instagram-calculation-utils';

/**
 * Calculator for overview metrics (growth rates, engagement, charts)
 * Follows Single Responsibility Principle
 */
export class OverviewMetricsCalculator {
  /**
   * Calculate overview metrics from snapshots and analytics
   */
  static calculate(
    snapshots: InstagramDailySnapshot[],
    analytics: InstagramAnalytics[]
  ): OverviewMetrics | null {
    if (snapshots.length === 0) {
      return null;
    }

    const latestAnalytics = analytics.length > 0 ? analytics[analytics.length - 1] : null;
    const latestSnapshot = snapshots[snapshots.length - 1];

    // Calculate weekly followers growth
    const weeklyFollowers = InstagramCalculationUtils.calculateWeeklyFollowers(snapshots);
    
    // Calculate weekly posts
    const weeklyPosts = InstagramCalculationUtils.calculateWeeklyPosts(snapshots);

    // Calculate engagement rate
    const engagementRate = InstagramCalculationUtils.calculateEngagementRate(latestSnapshot);
    
    // Calculate average likes and comments
    const avgLikes = InstagramCalculationUtils.calculateAvgLikesPerPost(latestSnapshot);
    const avgComments = InstagramCalculationUtils.calculateAvgCommentsPerPost(latestSnapshot);
    
    // Calculate ratios
    const followersRatio = InstagramCalculationUtils.calculateFollowersRatio(latestSnapshot);
    const commentsRatio = InstagramCalculationUtils.calculateCommentsRatio(latestSnapshot);

    return {
      followersGrowthRate90d: InstagramCalculationUtils.formatPercentage(
        latestAnalytics?.followersGrowthRate90d || 
        InstagramCalculationUtils.calculate90DayGrowthRate(snapshots)
      ),
      weeklyFollowers: InstagramCalculationUtils.formatNumber(weeklyFollowers),
      engagementRate: InstagramCalculationUtils.formatPercentage(engagementRate),
      avgLikes: InstagramCalculationUtils.formatNumber(avgLikes),
      avgComments: InstagramCalculationUtils.formatNumber(avgComments),
      weeklyPosts: InstagramCalculationUtils.formatNumber(weeklyPosts),
      followersRatio: InstagramCalculationUtils.formatNumber(followersRatio),
      commentsRatio: InstagramCalculationUtils.formatPercentage(commentsRatio),
      followersChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => snapshot.followersCount
      ),
      followingChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => snapshot.followingCount
      ),
      engagementRateChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => InstagramCalculationUtils.calculateEngagementRate(snapshot)
      ),
      avgLikesChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => InstagramCalculationUtils.calculateAvgLikesPerPost(snapshot)
      )
    };
  }
}
