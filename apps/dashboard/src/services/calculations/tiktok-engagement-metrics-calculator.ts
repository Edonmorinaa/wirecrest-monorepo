import { 
  TikTokAnalytics,
  EngagementMetrics,
  TikTokDailySnapshot
} from '@/types/tiktok-analytics';

import { TikTokCalculationUtils } from './tiktok-calculation-utils';

/**
 * TikTok Engagement Metrics Calculator
 * Follows Single Responsibility Principle - only calculates engagement metrics
 */
export class TikTokEngagementMetricsCalculator {
  /**
   * Calculate engagement metrics
   */
  static calculate(
    snapshots: TikTokDailySnapshot[],
    analytics: TikTokAnalytics[]
  ): EngagementMetrics | null {
    if (snapshots.length === 0) {
      return null;
    }

    const latestSnapshot = snapshots[snapshots.length - 1];

    // Calculate engagement metrics
    const engagementRate = TikTokCalculationUtils.calculateEngagementRate(latestSnapshot);
    const avgLikes = TikTokCalculationUtils.calculateAvgLikesPerVideo(latestSnapshot);
    const avgComments = TikTokCalculationUtils.calculateAvgCommentsPerVideo(latestSnapshot);
    const avgViews = TikTokCalculationUtils.calculateAvgViewsPerVideo(latestSnapshot);
    const avgShares = TikTokCalculationUtils.calculateAvgSharesPerVideo(latestSnapshot);
    const avgDownloads = TikTokCalculationUtils.calculateAvgDownloadsPerVideo(latestSnapshot);
    
    // Calculate weekly metrics
    const weeklyEngagementRate = this.calculateWeeklyEngagementRate(snapshots);
    const weeklyVideos = TikTokCalculationUtils.calculateWeeklyVideos(snapshots);
    const commentsRatio = TikTokCalculationUtils.calculateCommentsRatio(latestSnapshot);

    // Generate chart data
    const engagementRateChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => TikTokCalculationUtils.calculateEngagementRate(snapshot)
    );
    
    const avgLikesChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => TikTokCalculationUtils.calculateAvgLikesPerVideo(snapshot)
    );
    
    const avgViewsChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => TikTokCalculationUtils.calculateAvgViewsPerVideo(snapshot)
    );
    
    const weeklyEngagementRateChart = this.generateWeeklyEngagementRateChart(snapshots);
    
    const weeklyVideosChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => snapshot.newVideos || 0
    );
    
    const avgCommentsChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => TikTokCalculationUtils.calculateAvgCommentsPerVideo(snapshot)
    );
    
    const avgSharesChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => TikTokCalculationUtils.calculateAvgSharesPerVideo(snapshot)
    );
    
    const avgDownloadsChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => TikTokCalculationUtils.calculateAvgDownloadsPerVideo(snapshot)
    );
    
    const commentsRatioChart = TikTokCalculationUtils.generateChartData(
      snapshots,
      (snapshot) => TikTokCalculationUtils.calculateCommentsRatio(snapshot)
    );

    return {
      engagementRate: TikTokCalculationUtils.formatPercentage(engagementRate),
      avgLikes: TikTokCalculationUtils.formatNumber(avgLikes),
      avgComments: TikTokCalculationUtils.formatNumber(avgComments),
      avgViews: TikTokCalculationUtils.formatNumber(avgViews),
      avgShares: TikTokCalculationUtils.formatNumber(avgShares),
      avgDownloads: TikTokCalculationUtils.formatNumber(avgDownloads),
      weeklyEngagementRate: TikTokCalculationUtils.formatPercentage(weeklyEngagementRate),
      weeklyVideos: TikTokCalculationUtils.formatNumber(weeklyVideos),
      commentsRatio: TikTokCalculationUtils.formatPercentage(commentsRatio),
      engagementRateChart,
      avgLikesChart,
      avgViewsChart,
      weeklyEngagementRateChart,
      weeklyVideosChart,
      avgCommentsChart,
      avgSharesChart,
      avgDownloadsChart,
      commentsRatioChart
    };
  }

  /**
   * Calculate weekly engagement rate
   */
  private static calculateWeeklyEngagementRate(snapshots: TikTokDailySnapshot[]): number {
    if (snapshots.length < 7) return 0;
    
    const recentSnapshots = snapshots.slice(-7);
    const totalEngagement = recentSnapshots.reduce((sum, snapshot) => sum + TikTokCalculationUtils.calculateEngagementRate(snapshot), 0);
    
    return totalEngagement / recentSnapshots.length;
  }

  /**
   * Generate weekly engagement rate chart
   */
  private static generateWeeklyEngagementRateChart(snapshots: TikTokDailySnapshot[]) {
    const weeklyData = [];
    
    for (let i = 6; i < snapshots.length; i++) {
      const weekSnapshots = snapshots.slice(i - 6, i + 1);
      const weeklyEngagementRate = this.calculateWeeklyEngagementRate(weekSnapshots);
      
      weeklyData.push({
        date: snapshots[i].snapshotDate.toISOString().split('T')[0],
        value: TikTokCalculationUtils.formatPercentage(weeklyEngagementRate)
      });
    }
    
    return weeklyData;
  }
}
