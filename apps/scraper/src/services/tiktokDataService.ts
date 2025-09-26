import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../supabase/database';
import { SentimentAnalyzer } from '../sentimentAnalyzer/sentimentAnalyzer';
import {
  TikTokBusinessProfile,
  TikTokDailySnapshot,
  TikTokSnapshotSchedule,
  TikTokVideo,
  TikTokComment,
  TikTokAnalytics,
  TakeSnapshotRequest,
  GetAnalyticsRequest,
  LamaTokUserResponse,
  LamaTokVideoResponse,
  LamaTokCommentResponse,
  LamaTokConfig,
} from '../types/tiktok';

export class TikTokDataService {
  private supabase: SupabaseClient;
  private database: DatabaseService;
  private sentimentAnalyzer: SentimentAnalyzer;
  private lamaTokConfig: LamaTokConfig;

  constructor(lamatokAccessKey: string) {
    this.supabase = new SupabaseClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.database = new DatabaseService();
    this.sentimentAnalyzer = new SentimentAnalyzer(['en']);
    this.lamaTokConfig = {
      baseUrl: 'https://api.lamatok.com',
      accessKey: lamatokAccessKey,
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 10,
      },
    };
  }

  async createBusinessProfile(
    teamId: string,
    tiktokUsername: string
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      console.log('[TikTok] createBusinessProfile:start', { teamId, tiktokUsername });
      // Check if profile already exists
      const existingProfile = await this.supabase
        .from('TikTokBusinessProfile')
        .select('*')
        .eq('teamId', teamId)
        .single();

      if (existingProfile.data) {
        console.log('[TikTok] createBusinessProfile:existing-found', { businessProfileId: existingProfile.data.id });
        return {
          success: true,
          businessProfileId: existingProfile.data.id,
        };
      }

      // Fetch user data from LamaTok API
      const userData = await this.fetchUserByUsername(tiktokUsername);
      console.log('[TikTok] createBusinessProfile:userData', { success: userData.success, hasUser: Boolean(userData.data?.user), error: userData.error });
      if (!userData.success || !userData.data?.user) {
        return {
          success: false,
          error: `Failed to fetch TikTok user data: ${userData.error}`,
        };
      }

      const user = userData.data.user;

      // Create business profile
      const newBusinessProfileId = randomUUID();
      const { data: businessProfile, error } = await this.supabase
        .from('TikTokBusinessProfile')
        .insert({
          id: newBusinessProfileId,
          teamId,
          username: user.uniqueId,
          nickname: user.nickname,
          avatarUrl: user.avatarLarger,
          signature: user.signature,
          followerCount: user.followerCount,
          followingCount: user.followingCount,
          heartCount: user.heartCount,
          videoCount: user.videoCount,
          diggCount: user.diggCount,
          verified: user.verified,
          privateAccount: user.privateAccount,
          isBusinessAccount: user.isBusinessAccount,
          category: user.category,
          isActive: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating TikTok business profile:', error);
        return {
          success: false,
          error: `Database error: ${error.message}`,
        };
      }

      // Create initial snapshot (without videos due to API limitation)
      console.log('[TikTok] createBusinessProfile:inserted', { businessProfileId: businessProfile.id });
      await this.takeDailySnapshot(businessProfile.id, {
        snapshotType: 'INITIAL',
        includeVideos: false, // Disabled due to LamaTok API limitation
      });

      console.log('[TikTok] createBusinessProfile:complete', { businessProfileId: businessProfile.id });
      return {
        success: true,
        businessProfileId: businessProfile.id,
      };
    } catch (error) {
      console.error('Error in createBusinessProfile:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async takeDailySnapshot(
    businessProfileId: string,
    options: Partial<Omit<TakeSnapshotRequest, 'businessProfileId'>> = {}
  ): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
    try {
      console.log('[TikTok] takeDailySnapshot:start', { businessProfileId, options });
      const {
        snapshotType = 'DAILY',
        includeVideos = false,
        maxVideos = 10,
        includeComments = false,
        maxComments = 50,
      } = options;

      // Get business profile
      const { data: businessProfile, error: profileError } = await this.supabase
        .from('TikTokBusinessProfile')
        .select('*')
        .eq('id', businessProfileId)
        .single();

      if (profileError || !businessProfile) {
        return {
          success: false,
          error: 'Business profile not found',
        };
      }

      // Fetch current user data
      const userData = await this.fetchUserByUsername(businessProfile.username);
      console.log('[TikTok] takeDailySnapshot:userData', { success: userData.success, hasUser: Boolean(userData.data?.user), error: userData.error });
      if (!userData.success || !userData.data?.user) {
        return {
          success: false,
          error: `Failed to fetch TikTok user data: ${userData.error}`,
        };
      }

      const user = userData.data.user;
      const now = new Date();
      const snapshotDate = now.toISOString().split('T')[0];
      const snapshotTime = now.toISOString();

      // Calculate daily metrics
      const previousSnapshot = await this.supabase
        .from('TikTokDailySnapshot')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();

      const totalLikes = user.heartCount;
      const totalComments = 0; // Will be calculated from videos if needed
      const totalShares = 0; // Will be calculated from videos if needed
      const totalViews = 0; // Will be calculated from videos if needed
      const totalDownloads = 0; // Will be calculated from videos if needed

      // Create snapshot
      const newSnapshotId = randomUUID();
      const { data: snapshot, error: snapshotError } = await this.supabase
        .from('TikTokDailySnapshot')
        .insert({
          id: newSnapshotId,
          businessProfileId,
          snapshotDate,
          snapshotTime,
          snapshotType,
          followerCount: user.followerCount,
          followingCount: user.followingCount,
          heartCount: user.heartCount,
          videoCount: user.videoCount,
          diggCount: user.diggCount,
          totalLikes,
          totalComments,
          totalShares,
          totalViews,
          totalDownloads,
          newVideos: 0,
          newComments: 0,
          hasErrors: false,
          errorMessage: null,
        })
        .select()
        .single();

      if (snapshotError) {
        console.error('Error creating TikTok snapshot:', snapshotError);
        return {
          success: false,
          error: `Snapshot creation error: ${snapshotError.message}`,
        };
      }

      // Update business profile with latest data
      await this.supabase
        .from('TikTokBusinessProfile')
        .update({
          followerCount: user.followerCount,
          followingCount: user.followingCount,
          heartCount: user.heartCount,
          videoCount: user.videoCount,
          diggCount: user.diggCount,
          verified: user.verified,
          privateAccount: user.privateAccount,
          isBusinessAccount: user.isBusinessAccount,
          lastSnapshotAt: now,
          updatedAt: now,
        })
        .eq('id', businessProfileId);

      // Fetch videos and comments if requested
      if (includeVideos) {
        await this.fetchAndStoreVideoSnapshots(
          businessProfileId,
          snapshot.id,
          businessProfile.username,
          maxVideos,
          includeComments,
          maxComments
        );
      }

      console.log('[TikTok] takeDailySnapshot:created', { snapshotId: snapshot.id });
      return {
        success: true,
        snapshotId: snapshot.id,
      };
    } catch (error) {
      console.error('Error in takeDailySnapshot:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async enableAutomaticSnapshots(
    businessProfileId: string,
    snapshotTime: string = '09:00:00',
    timezone: string = 'UTC'
  ): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
    try {
      console.log('[TikTok] enableAutomaticSnapshots:start', { businessProfileId, snapshotTime, timezone });
      // Check if a schedule already exists for this business profile
      const { data: existing, error: findErr } = await this.supabase
        .from('TikTokSnapshotSchedule')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .maybeSingle();

      if (findErr) {
        console.error('[TikTok] enableAutomaticSnapshots:query-error', { error: findErr.message });
        return { success: false, error: `Failed to query snapshot schedule: ${findErr.message}` };
      }

      if (existing) {
        console.log('[TikTok] enableAutomaticSnapshots:update-existing', { scheduleId: existing.id });
        const { data: updated, error: updErr } = await this.supabase
          .from('TikTokSnapshotSchedule')
          .update({
            isEnabled: true,
            snapshotTime,
            timezone,
            maxRetries: 3,
            retryDelayMinutes: 5,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updErr) {
          console.error('[TikTok] enableAutomaticSnapshots:update-error', { error: updErr.message });
          return { success: false, error: `Failed to enable automatic snapshots: ${updErr.message}` };
        }

        console.log('[TikTok] enableAutomaticSnapshots:updated', { scheduleId: updated.id });
        return { success: true, scheduleId: updated.id };
      } else {
        const newId = randomUUID();
        console.log('[TikTok] enableAutomaticSnapshots:insert-new', { scheduleId: newId });
        const { data: inserted, error: insErr } = await this.supabase
          .from('TikTokSnapshotSchedule')
          .insert({
            id: newId,
            businessProfileId,
            isEnabled: true,
            snapshotTime,
            timezone,
            maxRetries: 3,
            retryDelayMinutes: 5,
          })
          .select()
          .single();

        if (insErr) {
          console.error('[TikTok] enableAutomaticSnapshots:insert-error', { error: insErr.message });
          return { success: false, error: `Failed to enable automatic snapshots: ${insErr.message}` };
        }

        console.log('[TikTok] enableAutomaticSnapshots:inserted', { scheduleId: inserted.id });
        return { success: true, scheduleId: inserted.id };
      }
    } catch (error) {
      console.error('[TikTok] enableAutomaticSnapshots:exception', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async disableAutomaticSnapshots(
    businessProfileId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('TikTokSnapshotSchedule')
        .update({ isEnabled: false })
        .eq('businessProfileId', businessProfileId);

      if (error) {
        return {
          success: false,
          error: `Failed to disable automatic snapshots: ${error.message}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

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
      const { error } = await this.supabase
        .from('TikTokSnapshotSchedule')
        .update(settings)
        .eq('businessProfileId', businessProfileId);

      if (error) {
        return {
          success: false,
          error: `Failed to update snapshot schedule: ${error.message}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getSnapshotScheduleStatus(
    businessProfileId: string
  ): Promise<{ success: boolean; schedule?: TikTokSnapshotSchedule; error?: string }> {
    try {
      const { data: schedule, error } = await this.supabase
        .from('TikTokSnapshotSchedule')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return {
          success: false,
          error: `Failed to get schedule status: ${error.message}`,
        };
      }

      return {
        success: true,
        schedule: schedule || null,
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getSnapshots(
    businessProfileId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      snapshotType?: string;
    } = {}
  ): Promise<{ success: boolean; snapshots?: TikTokDailySnapshot[]; pagination?: any; error?: string }> {
    try {
      let query = this.supabase
        .from('TikTokDailySnapshot')
        .select('*')
        .eq('businessProfileId', businessProfileId)
        .order('createdAt', { ascending: false });

      if (options.snapshotType) {
        query = query.eq('snapshotType', options.snapshotType);
      }

      if (options.startDate) {
        query = query.gte('snapshotDate', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('snapshotDate', options.endDate);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data: snapshots, error } = await query;

      if (error) {
        return {
          success: false,
          error: `Failed to fetch snapshots: ${error.message}`,
        };
      }

      return {
        success: true,
        snapshots: snapshots || [],
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getBusinessProfileByTeamId(teamId: string): Promise<{ success: boolean; profile?: TikTokBusinessProfile; error?: string }> {
    try {
      const { data: profile, error } = await this.supabase
        .from('TikTokBusinessProfile')
        .select('*')
        .eq('teamId', teamId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return {
          success: false,
          error: `Failed to fetch business profile: ${error.message}`,
        };
      }

      return {
        success: true,
        profile: profile || null,
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getAnalytics(
    businessProfileId: string,
    request: GetAnalyticsRequest
  ): Promise<{ success: boolean; analytics?: TikTokAnalytics; error?: string }> {
    try {
      const { period } = request;

      // Calculate date range based on period
      const end = new Date();
      const start = new Date();
      
      switch (period) {
        case '7':
          start.setDate(start.getDate() - 7);
          break;
        case '30':
          start.setDate(start.getDate() - 30);
          break;
        case '90':
          start.setDate(start.getDate() - 90);
          break;
        case '365':
          start.setDate(start.getDate() - 365);
          break;
      }

      // Get snapshots for the period
      const { data: snapshots } = await this.supabase
        .from('TikTokDailySnapshot')
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

      // Calculate growth metrics
      const followersGrowth = lastSnapshot.followerCount - firstSnapshot.followerCount;
      const followersGrowthPercent = firstSnapshot.followerCount > 0 
        ? (followersGrowth / firstSnapshot.followerCount) * 100 
        : 0;

      // Calculate engagement metrics
      const totalLikes = snapshots.reduce((sum, s) => sum + s.totalLikes, 0);
      const totalComments = snapshots.reduce((sum, s) => sum + s.totalComments, 0);
      const totalShares = snapshots.reduce((sum, s) => sum + s.totalShares, 0);
      const totalViews = snapshots.reduce((sum, s) => sum + s.totalViews, 0);
      const totalDownloads = snapshots.reduce((sum, s) => sum + s.totalDownloads, 0);

      // Calculate averages
      const avgEngagementRate = this.calculateAverageEngagementRate(snapshots);
      const avgContentPerDay = snapshots.reduce((sum, s) => sum + s.newVideos, 0) / snapshots.length;

      // Prepare chart data
      const chartData = {
        followers: snapshots.map(s => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.followerCount,
          rawDate: s.snapshotDate
        })),
        likes: snapshots.map(s => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.totalLikes,
          rawDate: s.snapshotDate
        })),
        comments: snapshots.map(s => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.totalComments,
          rawDate: s.snapshotDate
        })),
        shares: snapshots.map(s => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.totalShares,
          rawDate: s.snapshotDate
        })),
        views: snapshots.map(s => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.totalViews,
          rawDate: s.snapshotDate
        }))
      };

      const analytics: TikTokAnalytics = {
        periodMetrics: {
          followersGrowth,
          followersGrowthPercent,
          avgEngagementRate,
          avgContentPerDay,
          totalLikes,
          totalComments,
          totalShares,
          totalViews,
          totalDownloads,
          snapshots
        },
        chartData
      };

      return { success: true, analytics };
    } catch (error) {
      console.error('Error getting TikTok analytics:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Calculate average engagement rate from snapshots
   */
  private calculateAverageEngagementRate(snapshots: TikTokDailySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    
    let totalEngagement = 0;
    let totalFollowers = 0;
    
    snapshots.forEach(snapshot => {
      const dailyEngagement = snapshot.totalLikes + snapshot.totalComments + snapshot.totalShares;
      totalEngagement += dailyEngagement;
      totalFollowers += snapshot.followerCount;
    });
    
    const avgFollowers = totalFollowers / snapshots.length;
    return avgFollowers > 0 ? (totalEngagement / avgFollowers) * 100 : 0;
  }

  private async fetchUserByUsername(username: string): Promise<LamaTokUserResponse> {
    try {
      const url = `${this.lamaTokConfig.baseUrl}/v1/user/by/username?username=${encodeURIComponent(username)}`;
      console.log('[LamaTok] fetchUserByUsername:request', { username, url });
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-access-key': this.lamaTokConfig.accessKey,
        },
      });

      let data: any = null;
      const text = await response.text();
      console.log('[LamaTok] fetchUserByUsername:response', { status: response.status, ok: response.ok, bodyPreview: text?.slice(0, 300) });
      try { data = JSON.parse(text); } catch { /* keep text */ }

      if (!response.ok || (data && data.success === false)) {
        return {
          success: false,
          error: data?.error ? String(data.error) : `API error (${response.status}): ${data?.message || text || 'Unknown error'}`,
        };
      }

      if (data?.users) {
        const userEntry = data.users[username] || Object.values(data.users)[0];
        const statsEntry = data.stats ? (data.stats[username] || Object.values(data.stats)[0]) : undefined;

        if (!userEntry) {
          return { success: false, error: 'User not found in LamaTok response' };
        }

        const normalized = {
          user: {
            id: userEntry.id,
            uniqueId: userEntry.uniqueId || username,
            nickname: userEntry.nickname || '',
            avatarThumb: userEntry.avatarThumb || userEntry.avatarMedium || userEntry.avatarLarger || '',
            avatarMedium: userEntry.avatarMedium || userEntry.avatarThumb || userEntry.avatarLarger || '',
            avatarLarger: userEntry.avatarLarger || userEntry.avatarMedium || userEntry.avatarThumb || '',
            signature: userEntry.signature || '',
            verified: Boolean(userEntry.verified),
            followerCount: statsEntry?.followerCount ?? userEntry.followerCount ?? 0,
            followingCount: statsEntry?.followingCount ?? userEntry.followingCount ?? 0,
            heartCount: statsEntry?.heartCount ?? statsEntry?.heart ?? userEntry.heartCount ?? 0,
            videoCount: statsEntry?.videoCount ?? userEntry.videoCount ?? 0,
            diggCount: statsEntry?.diggCount ?? userEntry.diggCount ?? 0,
            privateAccount: Boolean(userEntry.privateAccount),
            isBusinessAccount: Boolean(userEntry.isBusinessAccount),
            category: userEntry.category,
            secUid: userEntry.secUid,
          }
        } as LamaTokUserResponse['data'];

        return { success: true, data: normalized };
      }

      return { success: true, data: data as LamaTokUserResponse['data'] };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async fetchUserVideos(username: string, count: number = 10): Promise<LamaTokVideoResponse> {
    try {
      // Note: LamaTok API doesn't have a direct endpoint for user videos
      // We'll need to implement this differently or use a different approach
      // For now, we'll return an empty response with a note about the limitation
      
      console.warn('⚠️  LamaTok API does not provide a direct endpoint for fetching user videos');
      console.warn('⚠️  This functionality may need to be implemented differently');
      
      return {
        success: true,
        data: {
          videos: [],
          hasMore: false,
          cursor: undefined
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // New method: Fetch user followers
  private async fetchUserFollowers(username: string, count: number = 30, pageId?: string): Promise<any> {
    try {
      const url = `${this.lamaTokConfig.baseUrl}/v1/user/followers/by/username?username=${encodeURIComponent(username)}&count=${count}${pageId ? `&page_id=${pageId}` : ''}`;
      console.log('[LamaTok] fetchUserFollowers:request', { username, count, pageId, url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-access-key': this.lamaTokConfig.accessKey,
        },
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: `API error (${response.status}): ${data.error || 'Unknown error'}`,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // New method: Fetch user following
  private async fetchUserFollowing(username: string, count: number = 30, pageId?: string): Promise<any> {
    try {
      const url = `${this.lamaTokConfig.baseUrl}/v1/user/following/by/username?username=${encodeURIComponent(username)}&count=${count}${pageId ? `&page_id=${pageId}` : ''}`;
      console.log('[LamaTok] fetchUserFollowing:request', { username, count, pageId, url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-access-key': this.lamaTokConfig.accessKey,
        },
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: `API error (${response.status}): ${data.error || 'Unknown error'}`,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // New method: Fetch user playlists
  private async fetchUserPlaylists(username: string, count: number = 30, pageId?: string): Promise<any> {
    try {
      const url = `${this.lamaTokConfig.baseUrl}/v1/user/playlists/by/username?username=${encodeURIComponent(username)}&count=${count}${pageId ? `&page_id=${pageId}` : ''}`;
      console.log('[LamaTok] fetchUserPlaylists:request', { username, count, pageId, url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-access-key': this.lamaTokConfig.accessKey,
        },
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: `API error (${response.status}): ${data.error || 'Unknown error'}`,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // New method: Fetch media by URL
  private async fetchMediaByUrl(url: string): Promise<any> {
    try {
      const apiUrl = `${this.lamaTokConfig.baseUrl}/v1/media/by/url?url=${encodeURIComponent(url)}`;
      console.log('[LamaTok] fetchMediaByUrl:request', { url, apiUrl });
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-access-key': this.lamaTokConfig.accessKey,
        },
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: `API error (${response.status}): ${data.error || 'Unknown error'}`,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // New method: Fetch hashtag info
  private async fetchHashtagInfo(hashtag: string): Promise<any> {
    try {
      const url = `${this.lamaTokConfig.baseUrl}/v1/hashtag/info?hashtag=${encodeURIComponent(hashtag)}`;
      console.log('[LamaTok] fetchHashtagInfo:request', { hashtag, url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-access-key': this.lamaTokConfig.accessKey,
        },
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: `API error (${response.status}): ${data.error || 'Unknown error'}`,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async fetchVideoComments(videoId: string, count: number = 50): Promise<LamaTokCommentResponse> {
    try {
      const response = await fetch(`${this.lamaTokConfig.baseUrl}/v1/media/comments/by/id?id=${encodeURIComponent(videoId)}&count=${count}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-access-key': this.lamaTokConfig.accessKey,
        },
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: `API error (${response.status}): ${data.error || 'Unknown error'}`,
        };
      }

      return {
        success: true,
        data: data as LamaTokCommentResponse['data'],
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async fetchAndStoreVideoSnapshots(
    businessProfileId: string,
    dailySnapshotId: string,
    username: string,
    maxVideos: number,
    includeComments: boolean = false,
    maxComments: number = 50
  ): Promise<void> {
    try {
      const videosData = await this.fetchUserVideos(username, maxVideos);
      if (!videosData.success || !videosData.data?.videos) {
        console.error('Failed to fetch TikTok videos:', videosData.error);
        return;
      }

      for (const video of videosData.data.videos) {
        // Store video snapshot
        const { error: videoError } = await this.supabase
          .from('TikTokVideoSnapshot')
          .insert({
            dailySnapshotId,
            businessProfileId,
            videoId: video.videoId,
            description: video.desc,
            createTime: new Date(video.createTime * 1000),
            videoUrl: video.video.playAddr,
            coverUrl: video.video.cover,
            duration: video.video.duration,
            width: video.video.width,
            height: video.video.height,
            playCount: video.stats.playCount,
            diggCount: video.stats.diggCount,
            commentCount: video.stats.commentCount,
            shareCount: video.stats.shareCount,
            downloadCount: video.stats.downloadCount,
            hashtags: video.hashtags,
            mentions: video.mentions,
            isAd: video.isAd,
            isPrivate: video.isPrivate,
            isDownloadable: video.isDownloadable,
          });

        if (videoError) {
          console.error('Error storing video snapshot:', videoError);
          continue;
        }

        // Fetch and store comments if requested
        if (includeComments) {
          await this.fetchAndStoreCommentSnapshots(
            businessProfileId,
            dailySnapshotId,
            video.videoId,
            maxComments
          );
        }
      }
    } catch (error) {
      console.error('Error in fetchAndStoreVideoSnapshots:', error);
    }
  }

  private async fetchAndStoreCommentSnapshots(
    businessProfileId: string,
    dailySnapshotId: string,
    videoId: string,
    maxComments: number
  ): Promise<void> {
    try {
      const commentsData = await this.fetchVideoComments(videoId, maxComments);
      if (!commentsData.success || !commentsData.data?.comments) {
        console.error('Failed to fetch TikTok comments:', commentsData.error);
        return;
      }

      for (const comment of commentsData.data.comments) {
        // Analyze sentiment
        const sentiment = comment.text ? await this.sentimentAnalyzer.analyzeSentiment(comment.text) : 0;
        const keywords = comment.text ? this.extractKeywords(comment.text) : [];

        const { error: commentError } = await this.supabase
          .from('TikTokCommentSnapshot')
          .insert({
            dailySnapshotId,
            businessProfileId,
            videoId,
            commentId: comment.commentId,
            text: comment.text,
            authorUserId: comment.author.userId,
            authorUsername: comment.author.uniqueId,
            authorNickname: comment.author.nickname,
            authorAvatarUrl: comment.author.avatarThumb,
            authorVerified: comment.author.verified,
            createTime: new Date(comment.createTime * 1000),
            likeCount: comment.likeCount,
            replyCount: comment.replyCount,
            isReply: comment.isReply,
            parentCommentId: comment.parentCommentId,
            sentiment,
            keywords,
          });

        if (commentError) {
          console.error('Error storing comment snapshot:', commentError);
        }
      }
    } catch (error) {
      console.error('Error in fetchAndStoreCommentSnapshots:', error);
    }
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));
    
    return [...new Set(words)].slice(0, 10);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);
    return stopWords.has(word);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    await this.database.close();
  }
} 