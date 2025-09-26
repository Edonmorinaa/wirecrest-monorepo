import { 
  InstagramDailySnapshot, 
  InstagramAnalytics, 
  GrowthMetrics 
} from '@/types/instagram-analytics';
import { InstagramCalculationUtils } from './instagram-calculation-utils';

/**
 * Calculator for growth metrics (growth rates, trends, predictions)
 * Follows Single Responsibility Principle
 */
export class GrowthMetricsCalculator {
  /**
   * Calculate growth metrics from snapshots and analytics
   */
  static calculate(
    snapshots: InstagramDailySnapshot[],
    analytics: InstagramAnalytics[]
  ): GrowthMetrics | null {
    if (snapshots.length === 0) {
      return null;
    }

    const latestAnalytics = analytics.length > 0 ? analytics[analytics.length - 1] : null;
    const latestSnapshot = snapshots[snapshots.length - 1];

    // Calculate growth rates
    const followersGrowthRate90d = InstagramCalculationUtils.formatPercentage(
      latestAnalytics?.followersGrowthRate90d || 
      InstagramCalculationUtils.calculate90DayGrowthRate(snapshots)
    );
    
    const steadyGrowthRate = InstagramCalculationUtils.formatPercentage(
      latestAnalytics?.steadyGrowthRate || 
      InstagramCalculationUtils.calculateSteadyGrowthRate(snapshots)
    );

    // Calculate follower counts
    const dailyFollowers = InstagramCalculationUtils.formatNumber(
      InstagramCalculationUtils.calculateWeeklyFollowers(snapshots)
    );
    
    const weeklyFollowers = InstagramCalculationUtils.formatNumber(
      InstagramCalculationUtils.calculateWeeklyFollowers(snapshots)
    );
    
    const monthlyFollowers = InstagramCalculationUtils.formatNumber(
      InstagramCalculationUtils.calculateMonthlyFollowers(snapshots)
    );

    return {
      followersGrowthRate90d,
      steadyGrowthRate,
      dailyFollowers,
      weeklyFollowers,
      monthlyFollowers,
      followersChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => snapshot.followersCount
      ),
      followingChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot) => snapshot.followingCount
      ),
      newDailyFollowersChart: InstagramCalculationUtils.generateChartData(
        snapshots,
        (snapshot, index) => {
          if (index === 0) return 0;
          const previous = snapshots[index - 1];
          if (!previous) return 0;
          return InstagramCalculationUtils.calculateGrowth(
            snapshot.followersCount,
            previous.followersCount
          );
        }
      ),
      predictedFollowersChart: InstagramCalculationUtils.generatePredictedFollowersChart(snapshots)
    };
  }
}
