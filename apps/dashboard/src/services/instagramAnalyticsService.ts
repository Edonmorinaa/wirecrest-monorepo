import { prisma } from '@wirecrest/db';

export interface InstagramAnalyticsData {
  general: {
    profilePicture: string;
    bio: string;
    followers: {
      count: number;
      delta: number;
    };
    following: {
      count: number;
      delta: number;
    };
    posts: {
      count: number;
      delta: number;
    };
  };
  overview: {
    followersGrowthRate90d: number;
    weeklyFollowers: number;
    engagementRate: number;
    avgLikes: number;
    avgComments: number;
    weeklyPosts: number;
    followersRatio: number;
    commentsRatio: number;
    followersChart: Array<{ date: string; value: number }>;
    followingChart: Array<{ date: string; value: number }>;
    engagementRateChart: Array<{ date: string; value: number }>;
    avgLikesChart: Array<{ date: string; value: number }>;
  };
  growth: {
    followersGrowthRate90d: number;
    steadyGrowthRate: number;
    dailyFollowers: Array<{ date: string; value: number }>;
    weeklyFollowers: Array<{ date: string; value: number }>;
    monthlyFollowers: Array<{ date: string; value: number }>;
    followersChart: Array<{ date: string; value: number }>;
    followingChart: Array<{ date: string; value: number }>;
    newDailyFollowersChart: Array<{ date: string; value: number }>;
    predictedFollowersChart: Array<{ date: string; value: number }>;
  };
  engagement: {
    engagementRate: number;
    avgLikes: number;
    weeklyEngagementRate: number;
    weeklyPosts: number;
    avgComments: number;
    commentsRatio: number;
    engagementRateChart: Array<{ date: string; value: number }>;
    avgLikesChart: Array<{ date: string; value: number }>;
    weeklyEngagementRateChart: Array<{ date: string; value: number }>;
    weeklyPostsChart: Array<{ date: string; value: number }>;
    avgCommentsChart: Array<{ date: string; value: number }>;
    commentsRatioChart: Array<{ date: string; value: number }>;
  };
  history: Array<{
    date: string;
    followersCount: number;
    followersDelta: number;
    followingCount: number;
    mediaCount: number;
    mediaDelta: number;
    engagementRate: number;
    engagementDelta: number;
  }>;
}

export class InstagramAnalyticsService {
  /**
   * Get comprehensive analytics data for Instagram business profile
   */
  async getAnalyticsData(
    businessProfileId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InstagramAnalyticsData> {
    // Get daily snapshots for the date range
    const snapshots = await prisma.instagramDailySnapshot.findMany({
      where: {
        businessProfileId,
        snapshotDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        snapshotDate: 'asc'
      }
    });

    if (snapshots.length === 0) {
      // Return empty data structure instead of throwing error
      return {
        general: null,
        overview: null,
        growth: null,
        engagement: null,
        history: []
      };
    }

    // Get analytics data
    const analytics = await prisma.instagramAnalytics.findMany({
      where: {
        businessProfileId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Get business profile for general info
    const businessProfile = await prisma.instagramBusinessProfile.findUnique({
      where: { id: businessProfileId }
    });

    const latestSnapshot = snapshots[snapshots.length - 1];
    const firstSnapshot = snapshots[0];

    return {
      general: this.calculateGeneralMetrics(businessProfile, latestSnapshot, firstSnapshot),
      overview: this.calculateOverviewMetrics(snapshots, analytics),
      growth: this.calculateGrowthMetrics(snapshots, analytics),
      engagement: this.calculateEngagementMetrics(snapshots, analytics),
      history: this.calculateHistoryMetrics(snapshots)
    };
  }

  /**
   * Calculate general metrics (profile info, current counts, deltas)
   */
  private calculateGeneralMetrics(
    businessProfile: any,
    latestSnapshot: any,
    firstSnapshot: any
  ) {
    return {
      profilePicture: businessProfile?.profilePictureUrl || '',
      bio: businessProfile?.biography || '',
      followers: {
        count: latestSnapshot.followersCount,
        delta: latestSnapshot.followersCount - firstSnapshot.followersCount
      },
      following: {
        count: latestSnapshot.followingCount,
        delta: latestSnapshot.followingCount - firstSnapshot.followingCount
      },
      posts: {
        count: latestSnapshot.mediaCount,
        delta: latestSnapshot.mediaCount - firstSnapshot.mediaCount
      }
    };
  }

  /**
   * Calculate overview metrics (growth rates, engagement, charts)
   */
  private calculateOverviewMetrics(snapshots: any[], analytics: any[]) {
    const latestAnalytics = analytics[analytics.length - 1];
    const latestSnapshot = snapshots[snapshots.length - 1];

    return {
      followersGrowthRate90d: latestAnalytics?.followersGrowthRate90d || 0,
      weeklyFollowers: snapshots.reduce((sum, s) => sum + (s.weeklyFollowersGrowth || 0), 0),
      engagementRate: latestSnapshot.engagementRate || 0,
      avgLikes: latestSnapshot.avgLikesPerPost || 0,
      avgComments: latestSnapshot.avgCommentsPerPost || 0,
      weeklyPosts: snapshots.reduce((sum, s) => sum + (s.newPosts || 0), 0),
      followersRatio: latestSnapshot.followersRatio || 0,
      commentsRatio: latestSnapshot.commentsRatio || 0,
      followersChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.followersCount
      })),
      followingChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.followingCount
      })),
      engagementRateChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.engagementRate || 0
      })),
      avgLikesChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.avgLikesPerPost || 0
      }))
    };
  }

  /**
   * Calculate growth metrics (growth rates, trends, predictions)
   */
  private calculateGrowthMetrics(snapshots: any[], analytics: any[]) {
    const latestAnalytics = analytics[analytics.length - 1];

    return {
      followersGrowthRate90d: latestAnalytics?.followersGrowthRate90d || 0,
      steadyGrowthRate: latestAnalytics?.steadyGrowthRate || 0,
      dailyFollowers: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.followersGrowth || 0
      })),
      weeklyFollowers: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.weeklyFollowersGrowth || 0
      })),
      monthlyFollowers: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.monthlyFollowersGrowth || 0
      })),
      followersChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.followersCount
      })),
      followingChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.followingCount
      })),
      newDailyFollowersChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.followersGrowth || 0
      })),
      predictedFollowersChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.followersCount + (s.followersGrowth || 0) * 30 // Simple prediction
      }))
    };
  }

  /**
   * Calculate engagement metrics (rates, averages, charts)
   */
  private calculateEngagementMetrics(snapshots: any[], analytics: any[]) {
    const latestAnalytics = analytics[analytics.length - 1];
    const latestSnapshot = snapshots[snapshots.length - 1];

    return {
      engagementRate: latestSnapshot.engagementRate || 0,
      avgLikes: latestSnapshot.avgLikesPerPost || 0,
      weeklyEngagementRate: latestAnalytics?.weeklyEngagementRate || 0,
      weeklyPosts: snapshots.reduce((sum, s) => sum + (s.newPosts || 0), 0),
      avgComments: latestSnapshot.avgCommentsPerPost || 0,
      commentsRatio: latestSnapshot.commentsRatio || 0,
      engagementRateChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.engagementRate || 0
      })),
      avgLikesChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.avgLikesPerPost || 0
      })),
      weeklyEngagementRateChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.engagementRate || 0
      })),
      weeklyPostsChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.newPosts || 0
      })),
      avgCommentsChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.avgCommentsPerPost || 0
      })),
      commentsRatioChart: snapshots.map(s => ({
        date: s.snapshotDate.toISOString().split('T')[0],
        value: s.commentsRatio || 0
      }))
    };
  }

  /**
   * Calculate history table data
   */
  private calculateHistoryMetrics(snapshots: any[]) {
    return snapshots.map((snapshot, index) => {
      const previousSnapshot = index > 0 ? snapshots[index - 1] : null;
      return {
        date: snapshot.snapshotDate.toISOString().split('T')[0],
        followersCount: snapshot.followersCount,
        followersDelta: previousSnapshot ? snapshot.followersCount - previousSnapshot.followersCount : 0,
        followingCount: snapshot.followingCount,
        mediaCount: snapshot.mediaCount,
        mediaDelta: previousSnapshot ? snapshot.mediaCount - previousSnapshot.mediaCount : 0,
        engagementRate: snapshot.engagementRate || 0,
        engagementDelta: previousSnapshot ? (snapshot.engagementRate || 0) - (previousSnapshot.engagementRate || 0) : 0
      };
    });
  }

  /**
   * Get analytics data for a specific date range with caching
   */
  async getCachedAnalyticsData(
    businessProfileId: string,
    startDate: Date,
    endDate: Date,
    forceRefresh: boolean = false
  ): Promise<InstagramAnalyticsData> {
    try {
      // Check if we have recent analytics data
      if (!forceRefresh) {
        const recentAnalytics = await prisma.instagramAnalytics.findFirst({
          where: {
            businessProfileId,
            date: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          orderBy: {
            calculatedAt: 'desc'
          }
        });

        if (recentAnalytics) {
          return this.getAnalyticsData(businessProfileId, startDate, endDate);
        }
      }

      // If no recent data or force refresh, trigger calculation
      // This would typically trigger the worker to recalculate analytics
      return this.getAnalyticsData(businessProfileId, startDate, endDate);
    } catch (error) {
      // If there's an error (like no data found), return empty data structure
      console.warn('No analytics data available, returning empty structure:', error);
      return {
        general: null,
        overview: null,
        growth: null,
        engagement: null,
        history: []
      };
    }
  }

  /**
   * Get summary metrics for dashboard
   */
  async getSummaryMetrics(businessProfileId: string): Promise<{
    totalFollowers: number;
    totalFollowing: number;
    totalPosts: number;
    avgEngagementRate: number;
    growthRate: number;
    lastUpdated: Date;
  }> {
    const latestSnapshot = await prisma.instagramDailySnapshot.findFirst({
      where: { businessProfileId },
      orderBy: { snapshotDate: 'desc' }
    });

    const analytics = await prisma.instagramAnalytics.findFirst({
      where: { businessProfileId },
      orderBy: { calculatedAt: 'desc' }
    });

    if (!latestSnapshot) {
      // Return default values instead of throwing error
      return {
        totalFollowers: 0,
        totalFollowing: 0,
        totalPosts: 0,
        avgEngagementRate: 0,
        avgLikesPerPost: 0,
        avgCommentsPerPost: 0,
        followersGrowthRate: 0,
        followingGrowthRate: 0,
        postsGrowthRate: 0
      };
    }

    return {
      totalFollowers: latestSnapshot.followersCount,
      totalFollowing: latestSnapshot.followingCount,
      totalPosts: latestSnapshot.mediaCount,
      avgEngagementRate: latestSnapshot.engagementRate || 0,
      growthRate: analytics?.followersGrowthRate90d || 0,
      lastUpdated: latestSnapshot.snapshotDate
    };
  }
}
