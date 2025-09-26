import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '../supabase/database';
import { SentimentAnalyzer } from '../sentimentAnalyzer/sentimentAnalyzer';
import { v4 as uuidv4 } from 'uuid';
import {
  InstagramBusinessProfile,
  InstagramDailySnapshot,
  InstagramMediaSnapshot,
  InstagramCommentSnapshot,
  InstagramAnalytics,
  CreateInstagramProfileRequest,
  TakeSnapshotRequest,
  HikerAPIUserResponse,
  HikerAPIMediaResponse,
  HikerAPICommentResponse
} from '../types/instagram';

interface HikerAPIConfig {
  baseUrl: string;
  apiKey: string;
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

interface InstagramAnalyticsData {
  // Growth metrics
  followersGrowthRate90d: number;
  steadyGrowthRate: number;
  dailyFollowersGrowth: number;
  weeklyFollowersGrowth: number;
  monthlyFollowersGrowth: number;
  
  // Engagement metrics
  engagementRate: number;
  weeklyEngagementRate: number;
  avgLikes: number;
  avgComments: number;
  commentsRatio: number;
  weeklyPosts: number;
  
  // Ratios
  followersRatio: number;
  
  // Predictions
  predictedFollowers?: number;
  growthTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export class EnhancedInstagramDataService {
  private supabase: SupabaseClient;
  private database: DatabaseService;
  private sentimentAnalyzer: SentimentAnalyzer;
  private hikerConfig: HikerAPIConfig;

  constructor(hikerApiKey: string) {
    this.supabase = require('../supabase/supabaseClient').default;
    this.database = new DatabaseService();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    
    this.hikerConfig = {
      baseUrl: 'https://api.hikerapi.com',
      apiKey: hikerApiKey,
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 10
      }
    };
  }

  /**
   * Enhanced daily snapshot with all analytics calculations
   */
  async takeEnhancedDailySnapshot(
    businessProfileId: string,
    options: Partial<Omit<TakeSnapshotRequest, 'businessProfileId'>> = {}
  ): Promise<{ success: boolean; snapshotId?: string; analyticsId?: string; error?: string }> {
    try {
      // Get business profile
      const { data: profile } = await this.supabase
        .from('InstagramBusinessProfile')
        .select('*')
        .eq('id', businessProfileId)
        .single();

      if (!profile) {
        return { success: false, error: 'Business profile not found' };
      }

      // Check if snapshot already exists for today
      const today = new Date();
      const todayDateString = today.toISOString().split('T')[0];
      const { data: existingSnapshot } = await this.supabase
        .from('InstagramDailySnapshot')
        .select('id')
        .eq('businessProfileId', businessProfileId)
        .eq('snapshotDate', todayDateString)
        .single();

      if (existingSnapshot) {
        return { success: false, error: 'Snapshot already exists for today' };
      }

      // Fetch current data from HikerAPI
      const userData = await this.fetchUserByUsername(profile.username);
      if (!userData) {
        return { success: false, error: 'Failed to fetch Instagram data' };
      }

      let actualUserData = userData;
      if (userData.user && typeof userData.user === 'object') {
        actualUserData = userData.user;
      }

      // Get historical snapshots for calculations
      const { data: historicalSnapshots } = await this.supabase
        .from('InstagramDailySnapshot')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .order('snapshotDate', { ascending: false })
        .limit(90); // Get last 90 days for growth calculations

      // Get previous day snapshot
      const previousSnapshot = historicalSnapshots?.[0];
      
      // Get snapshots from 7 and 30 days ago
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

      const weeklySnapshot = historicalSnapshots?.find(s => 
        new Date(s.snapshotDate) <= sevenDaysAgo
      );
      const monthlySnapshot = historicalSnapshots?.find(s => 
        new Date(s.snapshotDate) <= thirtyDaysAgo
      );
      const ninetyDaySnapshot = historicalSnapshots?.find(s => 
        new Date(s.snapshotDate) <= ninetyDaysAgo
      );

      // Fetch recent media for engagement calculations
      const userMedia = await this.fetchUserMedia(profile.username, options.maxMedia || 20);
      
      // Calculate daily engagement metrics
      const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(today.getTime() - 48 * 60 * 60 * 1000);
      
      let dailyLikes = 0;
      let dailyComments = 0;
      let dailyViews = 0;
      let dailySaves = 0;
      let dailyShares = 0;
      let newPosts = 0;
      let newStories = 0;
      let newReels = 0;

      for (const media of userMedia) {
        const mediaDate = new Date(media.taken_at * 1000);
        
        if (mediaDate >= twoDaysAgo) {
          dailyLikes += media.like_count || 0;
          dailyComments += media.comment_count || 0;
          dailyViews += media.play_count || 0;
          dailySaves += media.saved_count || 0;
          dailyShares += media.share_count || 0;
          
          if (mediaDate >= oneDayAgo) {
            if (media.media_type === 1) newPosts++; // Photo
            else if (media.media_type === 2) newPosts++; // Video
            else if (media.media_type === 8) newPosts++; // Carousel
            else if (media.media_type === 2 && media.is_reel) newReels++; // Reel
          }
        }
      }

      // Calculate growth metrics
      const followersGrowth = previousSnapshot 
        ? actualUserData.follower_count - previousSnapshot.followersCount 
        : 0;
      const followingGrowth = previousSnapshot 
        ? actualUserData.following_count - previousSnapshot.followingCount 
        : 0;
      const mediaGrowth = previousSnapshot 
        ? actualUserData.media_count - previousSnapshot.mediaCount 
        : 0;

      const weeklyFollowersGrowth = weeklySnapshot 
        ? actualUserData.follower_count - weeklySnapshot.followersCount 
        : 0;
      const monthlyFollowersGrowth = monthlySnapshot 
        ? actualUserData.follower_count - monthlySnapshot.followersCount 
        : 0;

      // Calculate engagement rate
      const engagementRate = actualUserData.follower_count > 0 
        ? ((dailyLikes + dailyComments + dailySaves + dailyShares) / actualUserData.follower_count) * 100 
        : 0;

      // Calculate ratios
      const followersRatio = actualUserData.following_count > 0 
        ? actualUserData.follower_count / actualUserData.following_count 
        : 0;
      const commentsRatio = dailyLikes > 0 
        ? (dailyComments / dailyLikes) * 100 
        : 0;

      // Calculate averages
      const avgLikesPerPost = newPosts > 0 ? dailyLikes / newPosts : 0;
      const avgCommentsPerPost = newPosts > 0 ? dailyComments / newPosts : 0;

      // Create enhanced daily snapshot
      const snapshotData: Partial<InstagramDailySnapshot> = {
        businessProfileId,
        snapshotDate: today,
        snapshotTime: today,
        snapshotType: options.snapshotType || 'DAILY',
        
        // Core metrics
        followersCount: actualUserData.follower_count,
        followingCount: actualUserData.following_count,
        mediaCount: actualUserData.media_count,
        
        // Daily engagement metrics
        totalLikes: dailyLikes,
        totalComments: dailyComments,
        totalViews: dailyViews,
        totalSaves: dailySaves,
        totalShares: dailyShares,
        
        // Content metrics
        newPosts,
        newStories,
        newReels,
        storyViews: 0, // Would need separate API call
        storyReplies: 0, // Would need separate API call
        
        // Calculated metrics
        engagementRate,
        avgLikesPerPost,
        avgCommentsPerPost,
        commentsRatio,
        followersRatio,
        
        // Growth metrics
        followersGrowth,
        followingGrowth,
        mediaGrowth,
        weeklyFollowersGrowth,
        monthlyFollowersGrowth,
        
        hasErrors: false
      };

      // Insert snapshot
      snapshotData.id = uuidv4();
      const { data: snapshot, error: snapshotError } = await this.supabase
        .from('InstagramDailySnapshot')
        .insert(snapshotData)
        .select('id')
        .single();

      if (snapshotError) throw snapshotError;

      // Calculate analytics metrics
      const analyticsData = await this.calculateAnalyticsMetrics(
        businessProfileId,
        actualUserData,
        historicalSnapshots || [],
        today
      );

      // Create analytics record
      const analyticsRecord: Partial<InstagramAnalytics> = {
        businessProfileId,
        date: today,
        period: 'DAILY',
        ...analyticsData,
        calculatedAt: today
      };

      analyticsRecord.id = uuidv4();
      const { data: analytics, error: analyticsError } = await this.supabase
        .from('InstagramAnalytics')
        .upsert(analyticsRecord, { 
          onConflict: 'businessProfileId,date,period' 
        })
        .select('id')
        .single();

      if (analyticsError) {
        console.warn('Analytics calculation failed:', analyticsError);
      }

      // Update business profile
      await this.supabase
        .from('InstagramBusinessProfile')
        .update({
          currentFollowersCount: actualUserData.follower_count,
          currentFollowingCount: actualUserData.following_count,
          currentMediaCount: actualUserData.media_count,
          lastSnapshotAt: today.toISOString(),
          totalSnapshots: (profile.totalSnapshots || 0) + 1,
          updatedAt: today.toISOString()
        })
        .eq('id', businessProfileId);

      return { 
        success: true, 
        snapshotId: snapshot.id,
        analyticsId: analytics?.id
      };

    } catch (error) {
      console.error('Error taking enhanced daily snapshot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate comprehensive analytics metrics
   */
  private async calculateAnalyticsMetrics(
    businessProfileId: string,
    currentData: any,
    historicalSnapshots: InstagramDailySnapshot[],
    currentDate: Date
  ): Promise<InstagramAnalyticsData> {
    const ninetyDaysAgo = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find snapshots for different periods
    const ninetyDaySnapshot = historicalSnapshots.find(s => 
      new Date(s.snapshotDate) <= ninetyDaysAgo
    );
    const weeklySnapshots = historicalSnapshots.filter(s => 
      new Date(s.snapshotDate) >= sevenDaysAgo
    );
    const monthlySnapshots = historicalSnapshots.filter(s => 
      new Date(s.snapshotDate) >= thirtyDaysAgo
    );

    // Calculate 90-day growth rate
    const followersGrowthRate90d = ninetyDaySnapshot 
      ? ((currentData.follower_count - ninetyDaySnapshot.followersCount) / ninetyDaySnapshot.followersCount) * 100
      : 0;

    // Calculate steady growth rate (consistency of growth)
    const growthRates = [];
    for (let i = 1; i < historicalSnapshots.length; i++) {
      const current = historicalSnapshots[i - 1];
      const previous = historicalSnapshots[i];
      const growthRate = previous.followersCount > 0 
        ? ((current.followersCount - previous.followersCount) / previous.followersCount) * 100
        : 0;
      growthRates.push(growthRate);
    }

    // Calculate steady growth rate (consistency)
    const avgGrowthRate = growthRates.length > 0 
      ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length 
      : 0;
    const growthVariance = growthRates.length > 0 
      ? growthRates.reduce((sum, rate) => sum + Math.pow(rate - avgGrowthRate, 2), 0) / growthRates.length 
      : 0;
    const steadyGrowthRate = Math.max(0, 100 - (Math.sqrt(growthVariance) * 10));

    // Calculate daily, weekly, monthly growth
    const dailyFollowersGrowth = historicalSnapshots.length > 0 
      ? currentData.follower_count - historicalSnapshots[0].followersCount 
      : 0;
    const weeklyFollowersGrowth = weeklySnapshots.length > 0 
      ? currentData.follower_count - weeklySnapshots[weeklySnapshots.length - 1].followersCount 
      : 0;
    const monthlyFollowersGrowth = monthlySnapshots.length > 0 
      ? currentData.follower_count - monthlySnapshots[monthlySnapshots.length - 1].followersCount 
      : 0;

    // Calculate engagement metrics
    const recentSnapshots = historicalSnapshots.slice(0, 7); // Last 7 days
    const avgEngagementRate = recentSnapshots.length > 0 
      ? recentSnapshots.reduce((sum, s) => sum + (s.engagementRate || 0), 0) / recentSnapshots.length 
      : 0;
    
    const weeklyEngagementRate = recentSnapshots.reduce((sum, s) => sum + (s.engagementRate || 0), 0);
    
    const avgLikes = recentSnapshots.length > 0 
      ? recentSnapshots.reduce((sum, s) => sum + (s.avgLikesPerPost || 0), 0) / recentSnapshots.length 
      : 0;
    
    const avgComments = recentSnapshots.length > 0 
      ? recentSnapshots.reduce((sum, s) => sum + (s.avgCommentsPerPost || 0), 0) / recentSnapshots.length 
      : 0;
    
    const commentsRatio = recentSnapshots.length > 0 
      ? recentSnapshots.reduce((sum, s) => sum + (s.commentsRatio || 0), 0) / recentSnapshots.length 
      : 0;
    
    const weeklyPosts = recentSnapshots.reduce((sum, s) => sum + (s.newPosts || 0), 0);

    // Calculate followers ratio
    const followersRatio = currentData.following_count > 0 
      ? currentData.follower_count / currentData.following_count 
      : 0;

    // Predict future followers (simple linear regression)
    let predictedFollowers: number | undefined;
    if (historicalSnapshots.length >= 7) {
      const recentGrowth = historicalSnapshots.slice(0, 7);
      const totalGrowth = recentGrowth[0].followersCount - recentGrowth[6].followersCount;
      const avgDailyGrowth = totalGrowth / 7;
      predictedFollowers = currentData.follower_count + (avgDailyGrowth * 30); // 30-day prediction
    }

    // Determine growth trend
    let growthTrend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
    if (historicalSnapshots.length >= 3) {
      const recentGrowth = historicalSnapshots.slice(0, 3);
      const growth1 = recentGrowth[0].followersCount - recentGrowth[1].followersCount;
      const growth2 = recentGrowth[1].followersCount - recentGrowth[2].followersCount;
      
      if (growth1 > growth2 * 1.1) growthTrend = 'INCREASING';
      else if (growth1 < growth2 * 0.9) growthTrend = 'DECREASING';
    }

    return {
      followersGrowthRate90d,
      steadyGrowthRate,
      dailyFollowersGrowth,
      weeklyFollowersGrowth,
      monthlyFollowersGrowth,
      engagementRate: avgEngagementRate,
      weeklyEngagementRate,
      avgLikes,
      avgComments,
      commentsRatio,
      weeklyPosts,
      followersRatio,
      predictedFollowers,
      growthTrend
    };
  }

  /**
   * Get analytics data for frontend consumption
   */
  async getAnalyticsData(
    businessProfileId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    success: boolean;
    data?: {
      general: any;
      overview: any;
      growth: any;
      engagement: any;
      history: any;
    };
    error?: string;
  }> {
    try {
      // Get snapshots for the date range
      const { data: snapshots } = await this.supabase
        .from('InstagramDailySnapshot')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .gte('snapshotDate', startDate.toISOString())
        .lte('snapshotDate', endDate.toISOString())
        .order('snapshotDate', { ascending: true });

      if (!snapshots || snapshots.length === 0) {
        return { success: false, error: 'No data found for the specified date range' };
      }

      // Get analytics data
      const { data: analytics } = await this.supabase
        .from('InstagramAnalytics')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: true });

      const latestSnapshot = snapshots[snapshots.length - 1];
      const firstSnapshot = snapshots[0];

      // Calculate general metrics
      const general = {
        profilePicture: '', // Would need to fetch from profile
        bio: '', // Would need to fetch from profile
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

      // Calculate overview metrics
      const overview = {
        followersGrowthRate90d: analytics?.[analytics.length - 1]?.followersGrowthRate90d || 0,
        weeklyFollowers: snapshots.reduce((sum, s) => sum + (s.weeklyFollowersGrowth || 0), 0),
        engagementRate: latestSnapshot.engagementRate || 0,
        avgLikes: latestSnapshot.avgLikesPerPost || 0,
        avgComments: latestSnapshot.avgCommentsPerPost || 0,
        weeklyPosts: snapshots.reduce((sum, s) => sum + (s.newPosts || 0), 0),
        followersRatio: latestSnapshot.followersRatio || 0,
        commentsRatio: latestSnapshot.commentsRatio || 0,
        followersChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.followersCount
        })),
        followingChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.followingCount
        })),
        engagementRateChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.engagementRate || 0
        })),
        avgLikesChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.avgLikesPerPost || 0
        }))
      };

      // Calculate growth metrics
      const growth = {
        followersGrowthRate90d: analytics?.[analytics.length - 1]?.followersGrowthRate90d || 0,
        steadyGrowthRate: analytics?.[analytics.length - 1]?.steadyGrowthRate || 0,
        dailyFollowers: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.followersGrowth || 0
        })),
        weeklyFollowers: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.weeklyFollowersGrowth || 0
        })),
        monthlyFollowers: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.monthlyFollowersGrowth || 0
        })),
        followersChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.followersCount
        })),
        followingChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.followingCount
        })),
        newDailyFollowersChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.followersGrowth || 0
        })),
        predictedFollowersChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.followersCount + (s.followersGrowth || 0) * 30 // Simple prediction
        }))
      };

      // Calculate engagement metrics
      const engagement = {
        engagementRate: latestSnapshot.engagementRate || 0,
        avgLikes: latestSnapshot.avgLikesPerPost || 0,
        weeklyEngagementRate: analytics?.[analytics.length - 1]?.weeklyEngagementRate || 0,
        weeklyPosts: snapshots.reduce((sum, s) => sum + (s.newPosts || 0), 0),
        avgComments: latestSnapshot.avgCommentsPerPost || 0,
        commentsRatio: latestSnapshot.commentsRatio || 0,
        engagementRateChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.engagementRate || 0
        })),
        avgLikesChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.avgLikesPerPost || 0
        })),
        weeklyEngagementRateChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.engagementRate || 0
        })),
        weeklyPostsChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.newPosts || 0
        })),
        avgCommentsChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.avgCommentsPerPost || 0
        })),
        commentsRatioChart: snapshots.map(s => ({
          date: s.snapshotDate,
          value: s.commentsRatio || 0
        }))
      };

      // Calculate history table
      const history = snapshots.map((snapshot, index) => {
        const previousSnapshot = index > 0 ? snapshots[index - 1] : null;
        return {
          date: snapshot.snapshotDate,
          followersCount: snapshot.followersCount,
          followersDelta: previousSnapshot ? snapshot.followersCount - previousSnapshot.followersCount : 0,
          followingCount: snapshot.followingCount,
          mediaCount: snapshot.mediaCount,
          mediaDelta: previousSnapshot ? snapshot.mediaCount - previousSnapshot.mediaCount : 0,
          engagementRate: snapshot.engagementRate || 0,
          engagementDelta: previousSnapshot ? (snapshot.engagementRate || 0) - (previousSnapshot.engagementRate || 0) : 0
        };
      });

      return {
        success: true,
        data: {
          general,
          overview,
          growth,
          engagement,
          history
        }
      };

    } catch (error) {
      console.error('Error getting analytics data:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods (simplified versions of the original service)
  private async fetchUserByUsername(username: string): Promise<any> {
    // Implementation would use HikerAPI
    // This is a placeholder
    return null;
  }

  private async fetchUserMedia(username: string, maxMedia: number): Promise<any[]> {
    // Implementation would use HikerAPI
    // This is a placeholder
    return [];
  }
}
