import { 
  GrowthMetrics,
  TikTokAnalytics,
  TikTokDailySnapshot
} from '@/types/tiktok-analytics';

import { TikTokCalculationUtils } from './tiktok-calculation-utils';

/**
 * TikTok Growth Metrics Calculator
 * Follows Single Responsibility Principle - only calculates growth metrics
 */
export class TikTokGrowthMetricsCalculator {
  /**
   * Calculate growth metrics
   */
  static calculate(
    snapshots: TikTokDailySnapshot[],
    analytics: TikTokAnalytics[]
  ): GrowthMetrics | null {
    if (snapshots.length === 0) {
      return null;
    }

    const latestSnapshot = snapshots[snapshots.length - 1];
    const firstSnapshot = snapshots[0];

    // Calculate growth rates
    const followersGrowthRate90d = TikTokCalculationUtils.calculate90DayGrowthRate(snapshots);
    const steadyGrowthRate = TikTokCalculationUtils.calculateSteadyGrowthRate(snapshots);
    
    // Calculate growth amounts
    const dailyFollowers = latestSnapshot.followersGrowth || 0;
    const weeklyFollowers = TikTokCalculationUtils.calculateWeeklyFollowers(snapshots);
    const monthlyFollowers = TikTokCalculationUtils.calculateMonthlyFollowers(snapshots);

    // Generate chart data
    const followersChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => snapshot.followerCount
    );
    
    const followingChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => snapshot.followingCount
    );
    
    const newDailyFollowersChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => snapshot.followersGrowth || 0
    );
    
    const predictedFollowersChart = TikTokCalculationUtils.generatePredictedFollowersChart(snapshots);

    return {
      followersGrowthRate90d: TikTokCalculationUtils.formatPercentage(followersGrowthRate90d),
      steadyGrowthRate: TikTokCalculationUtils.formatPercentage(steadyGrowthRate),
      dailyFollowers: TikTokCalculationUtils.formatNumber(dailyFollowers),
      weeklyFollowers: TikTokCalculationUtils.formatNumber(weeklyFollowers),
      monthlyFollowers: TikTokCalculationUtils.formatNumber(monthlyFollowers),
      followersChart,
      followingChart,
      newDailyFollowersChart,
      predictedFollowersChart
    };
  }
}
