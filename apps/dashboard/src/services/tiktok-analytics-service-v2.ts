import { prisma } from '@wirecrest/db';

import { 
  AnalyticsServiceResponse,
  EngagementMetrics,
  GeneralMetrics,
  GrowthMetrics,
  HistoryDataPoint,
  OverviewMetrics,
  TikTokAnalyticsData
} from '../types/tiktok-analytics';

/**
 * Enhanced TikTok Analytics Service
 * Follows SOLID principles and Next.js best practices
 */
export class TikTokAnalyticsServiceV2 {
  private readonly CACHE_TTL_HOURS = 24;
  private readonly MAX_DATE_RANGE_DAYS = 90;

  /**
   * Get comprehensive analytics data for TikTok business profile
   * Main entry point for analytics calculation
   */
  async getAnalyticsData(
    businessProfileId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsServiceResponse<TikTokAnalyticsData>> {
    try {
      console.log('TikTok Analytics service - Getting analytics data:', {
        businessProfileId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // Fetch business profile with snapshots
      const businessProfile = await prisma.tikTokBusinessProfile.findUnique({
        where: { id: businessProfileId },
        include: {
          dailySnapshots: {
            where: {
              snapshotDate: {
                gte: startDate,
                lte: endDate
              }
            },
            orderBy: {
              snapshotDate: 'asc'
            }
          }
        }
      });

      if (!businessProfile) {
        return {
          success: false,
          data: null,
          error: 'TikTok business profile not found'
        };
      }

      // Calculate analytics data
      const analyticsData = await this.calculateAnalyticsData(businessProfile, startDate, endDate);

      return {
        success: true,
        data: analyticsData
      };

    } catch (error) {
      console.error('Error in getAnalyticsData:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get cached analytics data with TTL
   */
  async getCachedAnalyticsData(
    businessProfileId: string,
    startDate: Date,
    endDate: Date,
    forceRefresh: boolean = false
  ): Promise<AnalyticsServiceResponse<TikTokAnalyticsData>> {
    try {
      console.log('TikTok Analytics service - Getting cached analytics data:', {
        businessProfileId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        forceRefresh
      });

      // For now, just call getAnalyticsData
      return await this.getAnalyticsData(businessProfileId, startDate, endDate);

    } catch (error) {
      console.error('Error in getCachedAnalyticsData:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Calculate comprehensive analytics data from business profile and snapshots
   */
  private async calculateAnalyticsData(
    businessProfile: any,
    startDate: Date,
    endDate: Date
  ): Promise<TikTokAnalyticsData> {
    const snapshots = businessProfile.dailySnapshots || [];
    
    // Calculate general metrics
    const general = this.calculateGeneralMetrics(businessProfile, snapshots);
    
    // Calculate overview metrics
    const overview = await this.calculateOverviewMetrics(snapshots, businessProfile.id);
    
    // Calculate growth metrics
    const growth = await this.calculateGrowthMetrics(snapshots, businessProfile.id);
    
    // Calculate engagement metrics
    const engagement = this.calculateEngagementMetrics(snapshots);
    
    // Calculate history data
    const history = this.calculateHistoryData(snapshots);

    return {
      general,
      overview,
      growth,
      engagement,
      history
    };
  }

  /**
   * Calculate general metrics (profile info, current counts)
   */
  private calculateGeneralMetrics(businessProfile: any, snapshots: any[]): GeneralMetrics {
    const latestSnapshot = snapshots[snapshots.length - 1];
    const firstSnapshot = snapshots[0];

    return {
      profilePicture: businessProfile.avatarUrl || '',
      bio: businessProfile.signature || '',
      followers: {
        count: businessProfile.followerCount || 0,
        delta: latestSnapshot ? (latestSnapshot.followerCount - (firstSnapshot?.followerCount || 0)) : 0
      },
      following: {
        count: businessProfile.followingCount || 0,
        delta: latestSnapshot ? (latestSnapshot.followingCount - (firstSnapshot?.followingCount || 0)) : 0
      },
      videos: {
        count: businessProfile.videoCount || 0,
        delta: latestSnapshot ? (latestSnapshot.videoCount - (firstSnapshot?.videoCount || 0)) : 0
      },
      hearts: {
        count: businessProfile.heartCount || 0,
        delta: latestSnapshot ? (latestSnapshot.totalLikes - (firstSnapshot?.totalLikes || 0)) : 0
      },
      diggs: {
        count: businessProfile.diggCount || 0,
        delta: latestSnapshot ? (latestSnapshot.totalViews - (firstSnapshot?.totalViews || 0)) : 0
      }
    };
  }

  /**
   * Calculate overview metrics
   */
  private async calculateOverviewMetrics(snapshots: any[], businessProfileId: string): Promise<OverviewMetrics | null> {
    if (snapshots.length === 0) return null;

    const latestSnapshot = snapshots[snapshots.length - 1];
    const firstSnapshot = snapshots[0];

    // Calculate 90-day growth rate based on actual last 90 days of data, not date range
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const last90DaysSnapshots = await prisma.tikTokBusinessProfile.findUnique({
      where: { id: businessProfileId },
      include: {
        dailySnapshots: {
          where: {
            snapshotDate: {
              gte: ninetyDaysAgo
            }
          },
          orderBy: {
            snapshotDate: 'asc'
          }
        }
      }
    });

    const followersGrowthRate90d = last90DaysSnapshots?.dailySnapshots && last90DaysSnapshots.dailySnapshots.length > 0
      ? this.calculateGrowthRate(
          last90DaysSnapshots.dailySnapshots[0]?.followerCount || 0,
          last90DaysSnapshots.dailySnapshots[last90DaysSnapshots.dailySnapshots.length - 1]?.followerCount || 0
        )
      : this.calculateGrowthRate(
          firstSnapshot?.followerCount || 0,
          latestSnapshot?.followerCount || 0
        );

    const weeklyFollowers = this.calculateWeeklyGrowth(snapshots, 'followerCount');
    const engagementRate = this.calculateEngagementRate(latestSnapshot);
    const avgLikes = this.calculateAverage(snapshots, 'totalLikes');
    const avgComments = this.calculateAverage(snapshots, 'totalComments');
    const avgViews = this.calculateAverage(snapshots, 'totalViews');
    const avgShares = this.calculateAverage(snapshots, 'totalShares');
    const avgDownloads = this.calculateAverage(snapshots, 'totalDownloads');
    const weeklyVideos = this.calculateWeeklyGrowth(snapshots, 'videoCount');
    const followersRatio = this.calculateFollowersRatio(latestSnapshot);
    const commentsRatio = this.calculateCommentsRatio(latestSnapshot);

    return {
      followersGrowthRate90d,
      weeklyFollowers,
      engagementRate,
      avgLikes,
      avgComments,
      avgViews,
      avgShares,
      avgDownloads,
      weeklyVideos,
      followersRatio,
      commentsRatio,
      followersChart: this.generateChartData(snapshots, 'followerCount'),
      followingChart: this.generateChartData(snapshots, 'followingCount'),
      engagementRateChart: this.generateEngagementRateChart(snapshots),
      avgLikesChart: this.generateChartData(snapshots, 'totalLikes'),
      avgViewsChart: this.generateChartData(snapshots, 'totalViews')
    };
  }

  /**
   * Calculate growth metrics
   */
  private async calculateGrowthMetrics(snapshots: any[], businessProfileId: string): Promise<GrowthMetrics | null> {
    if (snapshots.length === 0) return null;

    const latestSnapshot = snapshots[snapshots.length - 1];
    const firstSnapshot = snapshots[0];

    // Calculate 90-day growth rate based on actual last 90 days of data, not date range
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const last90DaysSnapshots = await prisma.tikTokBusinessProfile.findUnique({
      where: { id: businessProfileId },
      include: {
        dailySnapshots: {
          where: {
            snapshotDate: {
              gte: ninetyDaysAgo
            }
          },
          orderBy: {
            snapshotDate: 'asc'
          }
        }
      }
    });

    const followersGrowthRate90d = last90DaysSnapshots?.dailySnapshots && last90DaysSnapshots.dailySnapshots.length > 0
      ? this.calculateGrowthRate(
          last90DaysSnapshots.dailySnapshots[0]?.followerCount || 0,
          last90DaysSnapshots.dailySnapshots[last90DaysSnapshots.dailySnapshots.length - 1]?.followerCount || 0
        )
      : this.calculateGrowthRate(
          firstSnapshot?.followerCount || 0,
          latestSnapshot?.followerCount || 0
        );

    const steadyGrowthRate = this.calculateSteadyGrowthRate(snapshots);
    const dailyFollowers = latestSnapshot?.followersGrowth || 0;
    const weeklyFollowers = this.calculateWeeklyGrowth(snapshots, 'followerCount');
    const monthlyFollowers = this.calculateMonthlyGrowth(snapshots, 'followerCount');

    return {
      followersGrowthRate90d,
      steadyGrowthRate,
      dailyFollowers,
      weeklyFollowers,
      monthlyFollowers,
      followersChart: this.generateChartData(snapshots, 'followerCount'),
      followingChart: this.generateChartData(snapshots, 'followingCount'),
      newDailyFollowersChart: this.generateChartData(snapshots, 'followersGrowth'),
      predictedFollowersChart: this.generatePredictedFollowersChart(snapshots)
    };
  }

  /**
   * Calculate engagement metrics
   */
  private calculateEngagementMetrics(snapshots: any[]): EngagementMetrics | null {
    if (snapshots.length === 0) return null;

    const latestSnapshot = snapshots[snapshots.length - 1];
    const engagementRate = this.calculateEngagementRate(latestSnapshot);
    const avgLikes = this.calculateAverage(snapshots, 'totalLikes');
    const avgComments = this.calculateAverage(snapshots, 'totalComments');
    const avgViews = this.calculateAverage(snapshots, 'totalViews');
    const avgShares = this.calculateAverage(snapshots, 'totalShares');
    const avgDownloads = this.calculateAverage(snapshots, 'totalDownloads');
    const weeklyEngagementRate = this.calculateWeeklyEngagementRate(snapshots);
    const weeklyVideos = this.calculateWeeklyGrowth(snapshots, 'videoCount');
    const commentsRatio = this.calculateCommentsRatio(latestSnapshot);

    return {
      engagementRate,
      avgLikes,
      avgComments,
      avgViews,
      avgShares,
      avgDownloads,
      weeklyEngagementRate,
      weeklyVideos,
      commentsRatio,
      engagementRateChart: this.generateEngagementRateChart(snapshots),
      avgLikesChart: this.generateChartData(snapshots, 'totalLikes'),
      avgViewsChart: this.generateChartData(snapshots, 'totalViews'),
      weeklyEngagementRateChart: this.generateWeeklyEngagementRateChart(snapshots),
      weeklyVideosChart: this.generateChartData(snapshots, 'videoCount'),
      avgCommentsChart: this.generateChartData(snapshots, 'totalComments'),
      avgSharesChart: this.generateChartData(snapshots, 'totalShares'),
      avgDownloadsChart: this.generateChartData(snapshots, 'totalDownloads'),
      commentsRatioChart: this.generateCommentsRatioChart(snapshots)
    };
  }

  /**
   * Calculate history data points
   */
  private calculateHistoryData(snapshots: any[]): HistoryDataPoint[] {
    return snapshots.map((snapshot, index) => {
      const previousSnapshot = index > 0 ? snapshots[index - 1] : null;
      
      const followersDelta = previousSnapshot 
        ? snapshot.followerCount - previousSnapshot.followerCount 
        : 0;
        
      const followingDelta = previousSnapshot 
        ? snapshot.followingCount - previousSnapshot.followingCount 
        : 0;
        
      const videoDelta = previousSnapshot 
        ? snapshot.videoCount - previousSnapshot.videoCount 
        : 0;
        
      const engagementRate = this.calculateEngagementRate(snapshot);
      const previousEngagementRate = previousSnapshot 
        ? this.calculateEngagementRate(previousSnapshot)
        : 0;
        
      const engagementRateDelta = engagementRate - previousEngagementRate;

      return {
        date: snapshot.snapshotDate.toISOString().split('T')[0],
        followerCount: snapshot.followerCount,
        followersDelta,
        followingCount: snapshot.followingCount,
        followingDelta,
        videoCount: snapshot.videoCount,
        videoDelta,
        engagementRate,
        engagementRateDelta
      };
    });
  }

  // Helper methods for calculations
  private calculateGrowthRate(initial: number, current: number): number {
    if (initial === 0) return 0;
    return ((current - initial) / initial) * 100;
  }

  private calculateEngagementRate(snapshot: any): number {
    if (!snapshot || !snapshot.followerCount || snapshot.followerCount === 0) return 0;
    const totalEngagement = (snapshot.totalLikes || 0) + (snapshot.totalComments || 0) + (snapshot.totalShares || 0) + (snapshot.totalDownloads || 0);
    return (totalEngagement / snapshot.followerCount) * 100;
  }

  private calculateAverage(snapshots: any[], field: string): number {
    if (snapshots.length === 0) return 0;
    const sum = snapshots.reduce((acc, snapshot) => acc + (snapshot[field] || 0), 0);
    return sum / snapshots.length;
  }

  private calculateWeeklyGrowth(snapshots: any[], field: string): number {
    if (snapshots.length < 7) return 0;
    const latest = snapshots[snapshots.length - 1];
    const weekAgo = snapshots[Math.max(0, snapshots.length - 7)];
    return latest[field] - weekAgo[field];
  }

  private calculateMonthlyGrowth(snapshots: any[], field: string): number {
    if (snapshots.length < 30) return 0;
    const latest = snapshots[snapshots.length - 1];
    const monthAgo = snapshots[Math.max(0, snapshots.length - 30)];
    return latest[field] - monthAgo[field];
  }

  private calculateSteadyGrowthRate(snapshots: any[]): number {
    if (snapshots.length < 2) return 0;
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const days = Math.max(1, (last.snapshotDate - first.snapshotDate) / (1000 * 60 * 60 * 24));
    return this.calculateGrowthRate(first.followerCount, last.followerCount) / days;
  }

  private calculateWeeklyEngagementRate(snapshots: any[]): number {
    if (snapshots.length < 7) return 0;
    const recentSnapshots = snapshots.slice(-7);
    const avgEngagement = recentSnapshots.reduce((acc, snapshot) => acc + this.calculateEngagementRate(snapshot), 0);
    return avgEngagement / recentSnapshots.length;
  }

  private calculateFollowersRatio(snapshot: any): number {
    if (!snapshot || !snapshot.followingCount || snapshot.followingCount === 0) return 0;
    return snapshot.followerCount / snapshot.followingCount;
  }

  private calculateCommentsRatio(snapshot: any): number {
    if (!snapshot || !snapshot.totalLikes || snapshot.totalLikes === 0) return 0;
    return (snapshot.totalComments || 0) / snapshot.totalLikes;
  }

  private generateChartData(snapshots: any[], field: string): Array<{ date: string; value: number }> {
    return snapshots.map(snapshot => ({
      date: snapshot.snapshotDate.toISOString().split('T')[0],
      value: snapshot[field] || 0
    }));
  }

  private generateEngagementRateChart(snapshots: any[]): Array<{ date: string; value: number }> {
    return snapshots.map(snapshot => ({
      date: snapshot.snapshotDate.toISOString().split('T')[0],
      value: this.calculateEngagementRate(snapshot)
    }));
  }

  private generateWeeklyEngagementRateChart(snapshots: any[]): Array<{ date: string; value: number }> {
    const weeklyRates = [];
    for (let i = 6; i < snapshots.length; i++) {
      const weekSnapshots = snapshots.slice(i - 6, i + 1);
      const avgEngagement = weekSnapshots.reduce((acc, snapshot) => acc + this.calculateEngagementRate(snapshot), 0);
      weeklyRates.push({
        date: snapshots[i].snapshotDate.toISOString().split('T')[0],
        value: avgEngagement / weekSnapshots.length
      });
    }
    return weeklyRates;
  }

  private generateCommentsRatioChart(snapshots: any[]): Array<{ date: string; value: number }> {
    return snapshots.map(snapshot => ({
      date: snapshot.snapshotDate.toISOString().split('T')[0],
      value: this.calculateCommentsRatio(snapshot)
    }));
  }

  private generatePredictedFollowersChart(snapshots: any[]): Array<{ date: string; value: number }> {
    if (snapshots.length < 2) return [];
    
    const lastSnapshot = snapshots[snapshots.length - 1];
    const growthRate = this.calculateSteadyGrowthRate(snapshots);
    const predictions = [];
    
    for (let i = 1; i <= 30; i++) {
      const futureDate = new Date(lastSnapshot.snapshotDate);
      futureDate.setDate(futureDate.getDate() + i);
      const predictedFollowers = lastSnapshot.followerCount * (1 + (growthRate / 100) * i);
      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        value: Math.max(0, predictedFollowers)
      });
    }
    
    return predictions;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  }

  private formatPercentage(num: number): string {
    return num.toFixed(1) + '%';
  }
}