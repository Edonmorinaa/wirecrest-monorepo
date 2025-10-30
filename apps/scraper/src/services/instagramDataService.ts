import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '../supabase/database';
import { SentimentAnalyzer } from '../sentimentAnalyzer/sentimentAnalyzer';
import { MarketPlatform } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  InstagramBusinessProfile,
  InstagramDailySnapshot,
  InstagramMediaSnapshot,
  InstagramCommentSnapshot,
  InstagramWeeklyAggregation,
  InstagramMonthlyAggregation,
  InstagramSnapshotSchedule,
  CreateInstagramProfileRequest,
  TakeSnapshotRequest,
  GetAnalyticsRequest,
  HikerAPIUserResponse,
  HikerAPIMediaResponse,
  HikerAPICommentResponse
} from '../types/instagram';
import supabase from '../supabase/supabaseClient';

interface HikerAPIConfig {
  baseUrl: string;
  apiKey: string;
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

// Local interfaces for internal use (different from the main types)
interface InstagramMediaComment {
  id: string;
  businessProfileId: string;
  mediaId: string;
  commentId: string;
  text: string;
  author: {
    username: string;
    userId: string;
    profilePic?: string;
  };
  likesCount: number;
  timestamp: Date;
  hasReplies: boolean;
  sentiment?: number;
  keywords?: string[];
  isBusinessReply: boolean;
  scrapedAt: Date;
}

interface InstagramMediaData {
  id: string;
  code: string;
  mediaType: 'photo' | 'video' | 'carousel';
  caption?: string;
  likesCount: number;
  commentsCount: number;
  timestamp: Date;
  url: string;
  location?: {
    id: string;
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  hashtags: string[];
  mentions: string[];
}

export class InstagramDataService {
  private supabase: SupabaseClient;
  private database: DatabaseService;
  private sentimentAnalyzer: SentimentAnalyzer;
  private hikerConfig: HikerAPIConfig;

  constructor(hikerApiKey: string) {
    this.supabase = supabase;
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
   * Create or update Instagram business profile
   */
  async createBusinessProfile(
    teamId: string,
    instagramUsername: string
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      // Get user data from HikerAPI
      console.log('🔍 Fetching user data from HikerAPI for username:', instagramUsername);
      const userData = await this.fetchUserByUsername(instagramUsername);
      
      if (!userData) {
        return { success: false, error: 'Instagram user not found' };
      }

      // Debug: Log the HikerAPI response structure
      console.log('📊 HikerAPI Response Structure:', {
        hasUsername: !!userData.username,
        hasPk: !!userData.pk,
        hasFullName: !!userData.full_name,
        hasBiography: !!userData.biography,
        hasFollowerCount: !!userData.follower_count,
        hasFollowingCount: !!userData.following_count,
        hasMediaCount: !!userData.media_count,
        hasIsVerified: !!userData.is_verified,
        hasIsBusiness: !!userData.is_business,
        hasCategory: !!userData.category,
        hasPublicEmail: !!userData.public_email,
        hasPublicPhone: !!userData.public_phone_number,
        hasAddressStreet: !!userData.address_street,
        responseKeys: Object.keys(userData)
      });

      // Check if data is nested under 'user' object
      let actualUserData = userData;
      if (userData.user && typeof userData.user === 'object') {
        console.log('🔄 Found nested user data, extracting...');
        actualUserData = userData.user;
      }

      // Check if profile already exists
      const { data: existingProfile } = await this.supabase
        .from('InstagramBusinessProfile')
        .select('id')
        .eq('teamId', teamId)
        .eq('username', instagramUsername)
        .single();

      const profileData: Partial<InstagramBusinessProfile> = {
        teamId,
        username: instagramUsername, // Use the parameter, not userData.username
        userId: uuidv4(), // Generate UUID for userId
        profileUrl: `https://instagram.com/${instagramUsername}`, // Use the parameter
        fullName: actualUserData.full_name,
        biography: actualUserData.biography,
        website: actualUserData.external_url,
        currentFollowersCount: actualUserData.follower_count,
        currentFollowingCount: actualUserData.following_count,
        currentMediaCount: actualUserData.media_count,
        isVerified: actualUserData.is_verified || false,
        isBusinessAccount: actualUserData.is_business || false,
        category: actualUserData.category,
        contactEmail: actualUserData.business_contact_method === 'EMAIL' ? actualUserData.public_email : undefined,
        contactPhone: actualUserData.public_phone_number,
        contactAddress: actualUserData.address_street,
        updatedAt: new Date()
      };

      if (existingProfile) {
        // Update existing profile
        const { data, error } = await this.supabase
          .from('InstagramBusinessProfile')
          .update(profileData)
          .eq('id', existingProfile.id)
          .select('id')
          .single();

        if (error) throw error;
        return { success: true, businessProfileId: data.id };
      } else {
        // Create new profile
        profileData.id = uuidv4();
        profileData.createdAt = new Date();
        
        const { data, error } = await this.supabase
          .from('InstagramBusinessProfile')
          .insert(profileData)
          .select('id')
          .single();

        if (error) throw error;
        return { success: true, businessProfileId: data.id };
      }
    } catch (error) {
      console.error('Error creating Instagram business profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Scrape and analyze Instagram comments for sentiment analysis
   */
  async scrapeAndAnalyzeComments(
    businessProfileId: string,
    instagramUsername: string,
    maxPosts: number = 10,
    maxCommentsPerPost: number = 50
  ): Promise<{ success: boolean; processedComments: number; error?: string }> {
    try {
      // Get recent user media
      const userMedia = await this.fetchUserMedia(instagramUsername, maxPosts);
      let totalProcessedComments = 0;

      for (const media of userMedia) {
        // Get comments for each media
        const comments = await this.fetchMediaComments(media.id, maxCommentsPerPost);
        
        for (const comment of comments) {
          // Analyze sentiment
          const sentiment = await this.sentimentAnalyzer.analyzeSentiment(comment.text);
          const keywords = this.extractKeywords(comment.text);

          // Check if it's a business reply
          const isBusinessReply = comment.user.username.toLowerCase() === instagramUsername.toLowerCase();

          const commentData: Partial<InstagramMediaComment> = {
            businessProfileId,
            mediaId: media.id,
            commentId: comment.pk?.toString(),
            text: comment.text,
            author: {
              username: comment.user.username,
              userId: comment.user.pk?.toString(),
              profilePic: comment.user.profile_pic_url
            },
            likesCount: comment.comment_like_count || 0,
            timestamp: new Date(comment.created_at * 1000),
            hasReplies: comment.child_comment_count > 0,
            sentiment,
            keywords,
            isBusinessReply,
            scrapedAt: new Date()
          };

          // Save to database
          await this.supabase
            .from('InstagramMediaComment')
            .upsert(commentData, { onConflict: 'commentId' });

          totalProcessedComments++;
        }

        // Add delay to respect rate limits
        await this.delay(1000);
      }

      return { success: true, processedComments: totalProcessedComments };
    } catch (error) {
      console.error('Error scraping Instagram comments:', error);
      return { success: false, processedComments: 0, error: error.message };
    }
  }

  /**
   * Analyze Instagram engagement for business insights
   */
  async analyzeEngagementMetrics(businessProfileId: string): Promise<{
    averageEngagementRate: number;
    topPerformingPosts: any[];
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
    topKeywords: { keyword: string; count: number }[];
    responseRate: number;
  }> {
    try {
      // Get comments from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: comments } = await this.supabase
        .from('InstagramMediaComment')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .gte('timestamp', thirtyDaysAgo.toISOString());

      if (!comments || comments.length === 0) {
        return {
          averageEngagementRate: 0,
          topPerformingPosts: [],
          sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
          topKeywords: [],
          responseRate: 0
        };
      }

      // Calculate sentiment breakdown
      const sentimentBreakdown = comments.reduce(
        (acc, comment) => {
          if (comment.sentiment > 0.1) acc.positive++;
          else if (comment.sentiment < -0.1) acc.negative++;
          else acc.neutral++;
          return acc;
        },
        { positive: 0, neutral: 0, negative: 0 }
      );

      // Extract top keywords
      const keywordCounts = {};
      comments.forEach(comment => {
        comment.keywords?.forEach(keyword => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      });

      const topKeywords = Object.entries(keywordCounts)
        .map(([keyword, count]) => ({ keyword, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate response rate
      const businessReplies = comments.filter(c => c.isBusinessReply).length;
      const customerComments = comments.filter(c => !c.isBusinessReply).length;
      const responseRate = customerComments > 0 ? (businessReplies / customerComments) * 100 : 0;

      return {
        averageEngagementRate: 0, // Would need follower count and media data
        topPerformingPosts: [], // Would need media performance data
        sentimentBreakdown,
        topKeywords,
        responseRate
      };
    } catch (error) {
      console.error('Error analyzing engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Fetch user data from HikerAPI
   */
  private async fetchUserByUsername(username: string): Promise<any> {
    try {
      const response = await fetch(`${this.hikerConfig.baseUrl}/v2/user/by/username?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-access-key': this.hikerConfig.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HikerAPI error: ${response.status}`;
        
        // Provide specific error messages based on status code
        switch (response.status) {
          case 401:
            errorMessage = `HikerAPI authentication failed (401): Invalid or expired API key. Please check your HIKER_API_KEY in the environment variables.`;
            break;
          case 403:
            errorMessage = `HikerAPI access forbidden (403): API key lacks permissions for this endpoint.`;
            break;
          case 404:
            errorMessage = `Instagram user '@${username}' not found (404).`;
            break;
          case 429:
            errorMessage = `HikerAPI rate limit exceeded (429): Too many requests. Please try again later.`;
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = `HikerAPI server error (${response.status}): Service temporarily unavailable.`;
            break;
          default:
            errorMessage = `HikerAPI error (${response.status}): ${errorText}`;
        }
        
        console.error('HikerAPI Error Details:', {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText,
          username: username,
          endpoint: '/v2/user/by/username'
        });
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // Re-throw the error with the enhanced message if it's our custom error
      if (error instanceof Error && error.message.includes('HikerAPI')) {
        throw error;
      }
      
      // Handle network or other errors
      throw new Error(`Failed to connect to HikerAPI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch user media from HikerAPI
   */
  private async fetchUserMedia(username: string, count: number = 10): Promise<any[]> {
    try {
      console.log(`📸 Fetching media for username: ${username}, count: ${count}`);
      
      // First, get the user ID from the username
      let userData;
      try {
        userData = await this.fetchUserByUsername(username);
        console.log('📊 User data response:', userData);
      } catch (error) {
        console.error('❌ Failed to fetch user data:', error);
        throw error; // Re-throw to see the actual error
      }
      
      if (!userData || !userData.pk) {
        console.log('❌ Could not get user ID for username:', username);
        console.log('📊 User data structure:', userData);
        return [];
      }
      
      const userId = userData.pk;
      console.log(`✅ Got user ID: ${userId} for username: ${username}`);
      
      // Use the correct endpoint with user_id parameter
      const endpoint = `/v2/user/medias?user_id=${encodeURIComponent(userId)}`;
      
      try {
        console.log(`🔗 Trying HikerAPI endpoint: ${this.hikerConfig.baseUrl}${endpoint}`);
        
        const response = await fetch(`${this.hikerConfig.baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'x-access-key': this.hikerConfig.apiKey
          }
        });

        console.log(`📊 HikerAPI response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json() as any;
          console.log(`✅ Success with endpoint: ${endpoint}`);
          console.log(`📊 Response data keys:`, Object.keys(data));
          
          // The response should have an 'items' array according to the documentation
          const items = data.items || [];
          console.log(`✅ Fetched ${items.length} media items`);
          return items;
        } else {
          const errorText = await response.text();
          console.log(`❌ Endpoint failed: ${response.status} - ${errorText}`);
          throw new Error(`HikerAPI error: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.log(`❌ Endpoint error:`, error);
        throw error;
      }
    } catch (error) {
      console.error('Error fetching user media:', error);
      return [];
    }
  }

  /**
   * Fetch media comments from HikerAPI
   */
  private async fetchMediaComments(mediaId: string, count: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${this.hikerConfig.baseUrl}/v2/media/comments?id=${encodeURIComponent(mediaId)}&count=${count}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-access-key': this.hikerConfig.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HikerAPI error: ${response.status}`);
      }

      const data = await response.json() as { comments?: any[] };
      return data.comments || [];
    } catch (error) {
      console.error('Error fetching media comments:', error);
      return [];
    }
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - could be enhanced
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = ['this', 'that', 'with', 'have', 'will', 'been', 'they', 'were', 'said', 'each', 'which', 'their', 'time', 'about'];
    return stopWords.includes(word);
  }

  /**
   * Delay execution for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Take a daily snapshot of Instagram data
   */
  async takeDailySnapshot(
    businessProfileId: string,
    options: Partial<Omit<TakeSnapshotRequest, 'businessProfileId'>> = {}
  ): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
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

      // Check if data is nested under 'user' object
      let actualUserData = userData;
      if (userData.user && typeof userData.user === 'object') {
        actualUserData = userData.user;
      }

      // Get the previous snapshot to calculate daily changes
      const { data: previousSnapshot } = await this.supabase
        .from('InstagramDailySnapshot')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .order('snapshotDate', { ascending: false })
        .limit(1)
        .single();

      // Calculate daily metrics
      let dailyLikes = 0;
      let dailyComments = 0;
      let dailyViews = 0;
      let newPosts = 0;
      let newStories = 0;
      let newReels = 0;
      
      try {
        const userMedia = await this.fetchUserMedia(profile.username, options.maxMedia || 20);
        console.log(`📊 Fetched ${userMedia.length} media items for daily calculation`);
        
        // Calculate daily engagement from recent posts (last 24-48 hours)
        const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(today.getTime() - 48 * 60 * 60 * 1000);
        
        for (const media of userMedia) {
          const mediaDate = new Date(media.taken_at * 1000); // Convert timestamp to Date
          
          // Only count engagement from recent posts
          if (mediaDate >= twoDaysAgo) {
            dailyLikes += media.like_count || 0;
            dailyComments += media.comment_count || 0;
            dailyViews += media.play_count || 0;
            
            // Count new posts in the last 24 hours
            if (mediaDate >= oneDayAgo) {
              if (media.media_type === 1) newPosts++; // Photo
              else if (media.media_type === 2) newPosts++; // Video
              else if (media.media_type === 8) newPosts++; // Carousel
              // Note: Reels and Stories would need separate API calls
            }
          }
        }
        
        console.log(`📈 Calculated daily metrics:`, {
          dailyLikes,
          dailyComments,
          dailyViews,
          newPosts,
          mediaCount: userMedia.length
        });
      } catch (mediaError) {
        console.warn('⚠️ Could not fetch media for daily calculation:', mediaError);
        // Continue with 0 values if media fetch fails
      }

      // Calculate engagement rate
      const engagementRate = actualUserData.follower_count > 0 
        ? ((dailyLikes + dailyComments) / actualUserData.follower_count) * 100 
        : 0;

      // Create daily snapshot with proper point-in-time data
      const snapshotData: Partial<InstagramDailySnapshot> = {
        businessProfileId,
        snapshotDate: today,
        snapshotTime: today,
        snapshotType: options.snapshotType || 'DAILY',
        followersCount: actualUserData.follower_count,
        followingCount: actualUserData.following_count,
        mediaCount: actualUserData.media_count,
        // Daily engagement metrics (not cumulative)
        totalLikes: dailyLikes,
        totalComments: dailyComments,
        totalViews: dailyViews,
        totalSaves: 0, // Would need separate API call
        totalShares: 0, // Would need separate API call
        // Daily activity metrics
        newPosts,
        newStories,
        newReels,
        storyViews: 0, // Would need separate API call
        storyReplies: 0, // Would need separate API call
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

      // Update business profile with current metrics
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

      // If requested, fetch media and comments
      if (options.includeMedia) {
        await this.fetchAndStoreMediaSnapshots(
          businessProfileId,
          snapshot.id,
          profile.username,
          options.maxMedia || 10,
          options.includeComments,
          options.maxComments || 50
        );
      }

      return { success: true, snapshotId: snapshot.id };
    } catch (error) {
      console.error('Error taking daily snapshot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch and store media snapshots
   */
  private async fetchAndStoreMediaSnapshots(
    businessProfileId: string,
    dailySnapshotId: string,
    username: string,
    maxMedia: number,
    includeComments: boolean = false,
    maxComments: number = 50
  ): Promise<void> {
    try {
      const userMedia = await this.fetchUserMedia(username, maxMedia);

      for (const media of userMedia) {
        // Create media snapshot
        const mediaSnapshotData: Partial<InstagramMediaSnapshot> = {
          businessProfileId,
          dailySnapshotId,
          mediaId: media.id,
          mediaCode: media.code,
          mediaType: this.mapMediaType(media.media_type),
          caption: media.caption?.text,
          hashtags: media.hashtags?.map(h => h.name) || [],
          mentions: media.user_mentions?.map(m => m.username) || [],
          location: media.location ? {
            id: media.location.pk,
            name: media.location.name,
            coordinates: { lat: media.location.lat, lng: media.location.lng }
          } : undefined,
          likesCount: media.like_count,
          commentsCount: media.comment_count,
          viewsCount: media.view_count || 0,
          publishedAt: new Date(media.taken_at * 1000),
          snapshotAt: new Date()
        };

        mediaSnapshotData.id = uuidv4();
        const { data: mediaSnapshot, error: mediaError } = await this.supabase
          .from('InstagramMediaSnapshot')
          .insert(mediaSnapshotData)
          .select('id')
          .single();

        if (mediaError) {
          console.error('Error creating media snapshot:', mediaError);
          continue;
        }

        // If requested, fetch comments
        if (includeComments && mediaSnapshot) {
          await this.fetchAndStoreCommentSnapshots(
            businessProfileId,
            dailySnapshotId,
            mediaSnapshot.id,
            media.id,
            username,
            maxComments
          );
        }

        // Rate limiting
        await this.delay(500);
      }
    } catch (error) {
      console.error('Error fetching media snapshots:', error);
    }
  }

  /**
   * Fetch and store comment snapshots
   */
  private async fetchAndStoreCommentSnapshots(
    businessProfileId: string,
    dailySnapshotId: string,
    mediaSnapshotId: string,
    mediaId: string,
    username: string,
    maxComments: number
  ): Promise<void> {
    try {
      const comments = await this.fetchMediaComments(mediaId, maxComments);

      for (const comment of comments) {
        // Analyze sentiment
        const sentiment = await this.sentimentAnalyzer.analyzeSentiment(comment.text);
        const keywords = this.extractKeywords(comment.text);

        const commentSnapshotData: Partial<InstagramCommentSnapshot> = {
          businessProfileId,
          dailySnapshotId,
          mediaSnapshotId,
          commentId: comment.pk,
          mediaId,
          text: comment.text,
          authorUsername: comment.user.username,
          authorUserId: comment.user.pk,
          likesCount: comment.comment_like_count || 0,
          hasReplies: comment.child_comment_count > 0,
          sentiment,
          keywords,
          isBusinessReply: comment.user.username.toLowerCase() === username.toLowerCase(),
          publishedAt: new Date(comment.created_at * 1000),
          snapshotAt: new Date()
        };

        commentSnapshotData.id = uuidv4();
        await this.supabase
          .from('InstagramCommentSnapshot')
          .insert(commentSnapshotData);

        // Rate limiting
        await this.delay(100);
      }
    } catch (error) {
      console.error('Error fetching comment snapshots:', error);
    }
  }

  /**
   * Map HikerAPI media type to our enum
   */
  private mapMediaType(mediaType: number): 'photo' | 'video' | 'carousel' | 'reel' {
    switch (mediaType) {
      case 1: return 'photo';
      case 2: return 'video';
      case 8: return 'carousel';
      default: return 'photo';
    }
  }

  /**
   * Generate weekly aggregation from daily snapshots
   */
  async generateWeeklyAggregation(
    businessProfileId: string,
    weekStartDate: Date
  ): Promise<{ success: boolean; aggregationId?: string; error?: string }> {
    try {
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      // Get daily snapshots for the week
      const { data: snapshots } = await this.supabase
        .from('InstagramDailySnapshot')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .gte('snapshotDate', weekStartDate.toISOString().split('T')[0])
        .lte('snapshotDate', weekEndDate.toISOString().split('T')[0])
        .order('snapshotDate', { ascending: true });

      if (!snapshots || snapshots.length === 0) {
        return { success: false, error: 'No snapshots found for the week' };
      }

      // Calculate growth metrics
      const firstSnapshot = snapshots[0];
      const lastSnapshot = snapshots[snapshots.length - 1];

      const followersGrowth = lastSnapshot.followersCount - firstSnapshot.followersCount;
      const followersGrowthPercent = firstSnapshot.followersCount > 0 
        ? (followersGrowth / firstSnapshot.followersCount) * 100 
        : 0;

      const followingGrowth = lastSnapshot.followingCount - firstSnapshot.followingCount;
      const followingGrowthPercent = firstSnapshot.followingCount > 0 
        ? (followingGrowth / firstSnapshot.followingCount) * 100 
        : 0;

      const mediaGrowth = lastSnapshot.mediaCount - firstSnapshot.mediaCount;

      // Calculate weekly totals
      const totalLikes = snapshots.reduce((sum, s) => sum + s.totalLikes, 0);
      const totalComments = snapshots.reduce((sum, s) => sum + s.totalComments, 0);
      const totalViews = snapshots.reduce((sum, s) => sum + s.totalViews, 0);

      // Calculate averages
      const avgDailyLikes = totalLikes / snapshots.length;
      const avgDailyComments = totalComments / snapshots.length;
      const avgDailyViews = totalViews / snapshots.length;

      // Get week number
      const year = weekStartDate.getFullYear();
      const weekNumber = this.getWeekNumber(weekStartDate);

      // Create weekly aggregation
      const aggregationData: Partial<InstagramWeeklyAggregation> = {
        businessProfileId,
        weekStartDate,
        weekEndDate,
        year,
        weekNumber,
        followersGrowth,
        followersGrowthPercent,
        followingGrowth,
        followingGrowthPercent,
        mediaGrowth,
        totalLikes,
        totalComments,
        totalViews,
        avgDailyLikes,
        avgDailyComments,
        avgDailyViews,
        responseRate: 0 // Would need to calculate from comments
      };

      const { data: aggregation, error } = await this.supabase
        .from('InstagramWeeklyAggregation')
        .upsert(aggregationData, { onConflict: 'businessProfileId,weekStartDate' })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, aggregationId: aggregation.id };
    } catch (error) {
      console.error('Error generating weekly aggregation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get week number for a date
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Get analytics for a specific period
   */
  async getAnalytics(
    businessProfileId: string,
    request: GetAnalyticsRequest
  ): Promise<{ success: boolean; analytics?: any; error?: string }> {
    try {
      const { period, startDate, endDate } = request;

      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        // Default to last period
        end = new Date();
        start = new Date();
        
        switch (period) {
          case 'week':
            start.setDate(start.getDate() - 7);
            break;
          case 'month':
            start.setMonth(start.getMonth() - 1);
            break;
          case 'quarter':
            start.setMonth(start.getMonth() - 3);
            break;
          case 'year':
            start.setFullYear(start.getFullYear() - 1);
            break;
        }
      }

      // Get snapshots for the period
      const { data: snapshots } = await this.supabase
        .from('InstagramDailySnapshot')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .gte('snapshotDate', start.toISOString().split('T')[0])
        .lte('snapshotDate', end.toISOString().split('T')[0])
        .order('snapshotDate', { ascending: true });

      if (!snapshots || snapshots.length === 0) {
        return { success: false, error: 'No data found for the specified period' };
      }

      // Calculate analytics
      const firstSnapshot = snapshots[0];
      const lastSnapshot = snapshots[snapshots.length - 1];

      const analytics = {
        growth: {
          followersGrowth: lastSnapshot.followersCount - firstSnapshot.followersCount,
          followersGrowthPercent: firstSnapshot.followersCount > 0 
            ? ((lastSnapshot.followersCount - firstSnapshot.followersCount) / firstSnapshot.followersCount) * 100 
            : 0,
          followingGrowth: lastSnapshot.followingCount - firstSnapshot.followingCount,
          mediaGrowth: lastSnapshot.mediaCount - firstSnapshot.mediaCount
        },
        engagement: {
          totalLikes: snapshots.reduce((sum, s) => sum + s.totalLikes, 0),
          totalComments: snapshots.reduce((sum, s) => sum + s.totalComments, 0),
          totalViews: snapshots.reduce((sum, s) => sum + s.totalViews, 0),
          avgEngagementRate: this.calculateAverageEngagementRate(snapshots),
          avgDailyLikes: snapshots.reduce((sum, s) => sum + s.totalLikes, 0) / snapshots.length,
          avgDailyComments: snapshots.reduce((sum, s) => sum + s.totalComments, 0) / snapshots.length,
          avgDailyViews: snapshots.reduce((sum, s) => sum + s.totalViews, 0) / snapshots.length
        },
        sentiment: {
          positive: 0,
          neutral: 0,
          negative: 0,
          topKeywords: []
        },
        trends: {
          growthTrend: lastSnapshot.followersCount > firstSnapshot.followersCount ? 'increasing' : 'decreasing',
          engagementTrend: this.calculateEngagementTrend(snapshots)
        }
      };

      return { success: true, analytics };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable automatic daily snapshots for a business
   */
  async enableAutomaticSnapshots(
    businessProfileId: string,
    snapshotTime: string = '09:00:00',
    timezone: string = 'UTC'
  ): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
    try {
      const now = new Date();
      const scheduleData: Partial<InstagramSnapshotSchedule> = {
        id: uuidv4(),
        businessProfileId,
        snapshotTime,
        timezone,
        isActive: true,
        maxRetries: 3,
        retryDelayMinutes: 5,
        consecutiveFailures: 0,
        createdAt: now,
        updatedAt: now
      };

      const { data: schedule, error } = await this.supabase
        .from('InstagramSnapshotSchedule')
        .upsert(scheduleData, { onConflict: 'businessProfileId' })
        .select('id')
        .single();

      if (error) throw error;

      console.log(`✅ Enabled automatic snapshots for business ${businessProfileId} at ${snapshotTime}`);
      return { success: true, scheduleId: schedule.id };
    } catch (error) {
      console.error('Error enabling automatic snapshots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable automatic snapshots for a business
   */
  async disableAutomaticSnapshots(
    businessProfileId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('InstagramSnapshotSchedule')
        .update({ 
          isActive: false,
          updatedAt: new Date().toISOString()
        })
        .eq('businessProfileId', businessProfileId);

      if (error) throw error;

      console.log(`🛑 Disabled automatic snapshots for business ${businessProfileId}`);
      return { success: true };
    } catch (error) {
      console.error('Error disabling automatic snapshots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update snapshot schedule settings
   */
  async updateSnapshotSchedule(
    businessProfileId: string,
    settings: {
      snapshotTime?: string;
      timezone?: string;
      maxRetries?: number;
      retryDelayMinutes?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updatedAt: new Date().toISOString()
      };

      if (settings.snapshotTime) updateData.snapshotTime = settings.snapshotTime;
      if (settings.timezone) updateData.timezone = settings.timezone;
      if (settings.maxRetries) updateData.maxRetries = settings.maxRetries;
      if (settings.retryDelayMinutes) updateData.retryDelayMinutes = settings.retryDelayMinutes;

      const { error } = await this.supabase
        .from('InstagramSnapshotSchedule')
        .update(updateData)
        .eq('businessProfileId', businessProfileId);

      if (error) throw error;

      console.log(`⚙️  Updated snapshot schedule for business ${businessProfileId}`);
      return { success: true };
    } catch (error) {
      console.error('Error updating snapshot schedule:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get snapshot schedule status
   */
  async getSnapshotScheduleStatus(
    businessProfileId: string
  ): Promise<{ success: boolean; schedule?: InstagramSnapshotSchedule; error?: string }> {
    try {
      const { data: schedule, error } = await this.supabase
        .from('InstagramSnapshotSchedule')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      return { success: true, schedule: schedule || null };
    } catch (error) {
      console.error('Error getting snapshot schedule status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get snapshots for a business profile with pagination
   */
  async getSnapshots(
    businessProfileId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      snapshotType?: string;
    } = {}
  ): Promise<{ success: boolean; snapshots?: InstagramDailySnapshot[]; pagination?: any; error?: string }> {
    try {
      const { limit = 30, offset = 0, startDate, endDate, snapshotType } = options;

      // Build query
      let query = this.supabase
        .from('InstagramDailySnapshot')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .order('snapshotDate', { ascending: false });

      // Apply filters
      if (startDate) {
        query = query.gte('snapshotDate', startDate);
      }
      if (endDate) {
        query = query.lte('snapshotDate', endDate);
      }
      if (snapshotType) {
        query = query.eq('snapshotType', snapshotType);
      }

      // Get total count for pagination
      const { count } = await this.supabase
        .from('InstagramDailySnapshot')
        .select('*', { count: 'exact', head: true })
        .eq('businessProfileId', businessProfileId);

      // Apply pagination
      const { data: snapshots, error } = await query
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        success: true,
        snapshots: snapshots || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNextPage: (offset + limit) < (count || 0),
          hasPreviousPage: offset > 0
        }
      };
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get business profile by team ID
   */
  async getBusinessProfileByTeamId(teamId: string): Promise<{ success: boolean; profile?: InstagramBusinessProfile; error?: string }> {
    try {
      console.log('🔍 Looking for Instagram profile for teamId:', teamId);
      
      // First, let's check if any profile exists for this team (without isActive filter)
      const { data: allProfiles, error: listError } = await this.supabase
        .from('InstagramBusinessProfile')
        .select('*')
        .eq('teamId', teamId);

      if (listError) {
        console.error('Error listing profiles:', listError);
        throw listError;
      }

      console.log('📊 Found profiles for team:', allProfiles?.length || 0);
      if (allProfiles && allProfiles.length > 0) {
        console.log('📋 Profile details:', allProfiles[0]);
      }

      // Now try to get the active profile
      const { data: profile, error } = await this.supabase
        .from('InstagramBusinessProfile')
        .select('*')
        .eq('teamId', teamId)
        .eq('isActive', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('❌ No active Instagram profile found for teamId:', teamId);
          
          // Fallback: try to get any profile for this team (not just active ones)
          console.log('🔄 Trying to get any profile for teamId:', teamId);
          const { data: fallbackProfile, error: fallbackError } = await this.supabase
            .from('InstagramBusinessProfile')
            .select('*')
            .eq('teamId', teamId)
            .single();

          if (fallbackError) {
            console.log('❌ No Instagram profile found at all for teamId:', teamId);
            return { success: false, error: 'No Instagram profile found for this team' };
          }

          console.log('✅ Found inactive Instagram profile, using it:', fallbackProfile);
          return { success: true, profile: fallbackProfile };
        }
        console.error('❌ Error fetching profile:', error);
        throw error;
      }

      console.log('✅ Found active Instagram profile:', profile);
      return { success: true, profile };
    } catch (error) {
      console.error('Error fetching business profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close service connections
   */
  /**
   * Calculate average engagement rate from snapshots
   */
  private calculateAverageEngagementRate(snapshots: InstagramDailySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    
    let totalEngagement = 0;
    let totalFollowers = 0;
    
    snapshots.forEach(snapshot => {
      const dailyEngagement = snapshot.totalLikes + snapshot.totalComments;
      totalEngagement += dailyEngagement;
      totalFollowers += snapshot.followersCount;
    });
    
    const avgFollowers = totalFollowers / snapshots.length;
    return avgFollowers > 0 ? (totalEngagement / avgFollowers) * 100 : 0;
  }

  /**
   * Calculate engagement trend from snapshots
   */
  private calculateEngagementTrend(snapshots: InstagramDailySnapshot[]): 'increasing' | 'decreasing' | 'stable' {
    if (snapshots.length < 2) return 'stable';
    
    const midPoint = Math.floor(snapshots.length / 2);
    const firstHalf = snapshots.slice(0, midPoint);
    const secondHalf = snapshots.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.totalLikes + s.totalComments, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.totalLikes + s.totalComments, 0) / secondHalf.length;
    
    const change = secondHalfAvg - firstHalfAvg;
    const threshold = firstHalfAvg * 0.1; // 10% threshold
    
    if (change > threshold) return 'increasing';
    if (change < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Export Instagram data
   */
  async exportData(
    businessProfileId: string,
    options: {
      format?: 'json' | 'csv';
      includeSnapshots?: boolean;
      includeMedia?: boolean;
      includeComments?: boolean;
    } = {}
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { format = 'json', includeSnapshots = true, includeMedia = false, includeComments = false } = options;

      // Get business profile
      const { data: profile, error: profileError } = await this.supabase
        .from('InstagramBusinessProfile')
        .select('*')
        .eq('id', businessProfileId)
        .single();

      if (profileError) throw profileError;

      const exportData: any = {
        profile,
        exportDate: new Date().toISOString(),
        format,
        options
      };

      if (includeSnapshots) {
        const { data: snapshots, error: snapshotsError } = await this.supabase
          .from('InstagramDailySnapshot')
          .select('*')
          .eq('businessProfileId', businessProfileId)
          .order('snapshotDate', { ascending: false })
          .limit(100);

        if (snapshotsError) throw snapshotsError;
        exportData.snapshots = snapshots;
      }

      if (includeMedia) {
        const { data: media, error: mediaError } = await this.supabase
          .from('InstagramMediaSnapshot')
          .select('*')
          .eq('businessProfileId', businessProfileId)
          .order('timestamp', { ascending: false })
          .limit(500);

        if (mediaError) throw mediaError;
        exportData.media = media;
      }

      if (includeComments) {
        const { data: comments, error: commentsError } = await this.supabase
          .from('InstagramCommentSnapshot')
          .select('*')
          .eq('businessProfileId', businessProfileId)
          .order('timestamp', { ascending: false })
          .limit(1000);

        if (commentsError) throw commentsError;
        exportData.comments = comments;
      }

      console.log(`✅ Exported Instagram data for business ${businessProfileId}`);
      return { success: true, data: exportData };
    } catch (error) {
      console.error('Error exporting Instagram data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete all Instagram data for a business
   */
  async deleteAllData(businessProfileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete in order to respect foreign key constraints
      const tables = [
        'InstagramCommentSnapshot',
        'InstagramMediaSnapshot', 
        'InstagramDailySnapshot',
        'InstagramSnapshotSchedule',
        'InstagramBusinessProfile'
      ];

      for (const table of tables) {
        const { error } = await this.supabase
          .from(table)
          .delete()
          .eq('businessProfileId', businessProfileId);

        if (error) {
          console.error(`Error deleting from ${table}:`, error);
          throw error;
        }
      }

      console.log(`✅ Deleted all Instagram data for business ${businessProfileId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting Instagram data:', error);
      return { success: false, error: error.message };
    }
  }

  async close(): Promise<void> {
    await this.database.close();
  }
} 