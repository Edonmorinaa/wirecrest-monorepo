/**
 * Instagram Data Service - Prisma Implementation
 * Handles Instagram business profile management and snapshot operations
 */

import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { SentimentAnalyzer } from "../sentimentAnalyzer/sentimentAnalyzer.js";
import type {
  InstagramBusinessProfile,
  InstagramDailySnapshot,
  InstagramMediaSnapshot,
  InstagramCommentSnapshot,
  InstagramSnapshotSchedule,
  TakeSnapshotRequest,
  GetAnalyticsRequest,
} from "../types/instagram.js";

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
  mediaType: "photo" | "video" | "carousel";
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
  private prisma: PrismaClient;
  private hikerConfig: HikerAPIConfig;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor(
    hikerApiKey: string,
    prismaClient?: PrismaClient,
    sentimentAnalyzer?: SentimentAnalyzer
  ) {
    this.prisma = prismaClient || new PrismaClient();
    this.sentimentAnalyzer = sentimentAnalyzer || new SentimentAnalyzer();

    this.hikerConfig = {
      baseUrl: "https://api.hikerapi.com",
      apiKey: hikerApiKey,
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 10,
      },
    };
  }

  /**
   * Create or update Instagram business profile
   */
  async createBusinessProfile(
    locationId: string,
    instagramUsername: string,
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      // Get user data from HikerAPI
      console.log(
        "🔍 Fetching user data from HikerAPI for username:",
        instagramUsername,
      );
      const userData = await this.fetchUserByUsername(instagramUsername);

      if (!userData) {
        return { success: false, error: "Instagram user not found" };
      }

      // Debug: Log the HikerAPI Response Structure
      console.log("📊 HikerAPI Response Structure:", {
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
        responseKeys: Object.keys(userData),
      });

      // Check if data is nested under 'user' object
      let actualUserData = userData;
      if (userData.user && typeof userData.user === "object") {
        console.log("🔄 Found nested user data, extracting...");
        actualUserData = userData.user;
      }

      // Check if profile already exists
      const existingProfile = await this.prisma.instagramBusinessProfile.findUnique({
        where: {
          locationId,
        },
      });

      const profileData = {
        locationId,
        username: instagramUsername,
        userId: actualUserData.pk?.toString() || uuidv4(),
        profileUrl: `https://instagram.com/${instagramUsername}`,
        fullName: actualUserData.full_name,
        biography: actualUserData.biography,
        website: actualUserData.external_url,
        currentFollowersCount: actualUserData.follower_count,
        currentFollowingCount: actualUserData.following_count,
        currentMediaCount: actualUserData.media_count,
        isVerified: actualUserData.is_verified || false,
        isBusinessAccount: actualUserData.is_business || false,
        category: actualUserData.category,
        contactEmail:
          actualUserData.business_contact_method === "EMAIL"
            ? actualUserData.public_email
            : undefined,
        contactPhone: actualUserData.public_phone_number,
        contactAddress: actualUserData.address_street,
        updatedAt: new Date(),
      };

      if (existingProfile) {
        // Update existing profile
        const updated = await this.prisma.instagramBusinessProfile.update({
          where: { id: existingProfile.id },
          data: {
            ...profileData,
            updatedAt: new Date(),
          },
          select: { id: true },
        });

        return { success: true, businessProfileId: updated.id };
      } else {
        // Create new profile
        const created = await this.prisma.instagramBusinessProfile.create({
          data: {
            id: uuidv4(),
            ...profileData,
            isActive: true,
            totalSnapshots: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          select: { id: true },
        });

        return { success: true, businessProfileId: created.id };
      }
    } catch (error) {
      console.error("Error creating Instagram business profile:", error);
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
    maxCommentsPerPost: number = 50,
  ): Promise<{ success: boolean; processedComments: number; error?: string }> {
    try {
      // Get recent user media
      const userMedia = await this.fetchUserMedia(instagramUsername, maxPosts);
      let totalProcessedComments = 0;

      for (const media of userMedia) {
        // Get comments for each media
        const comments = await this.fetchMediaComments(
          media.id,
          maxCommentsPerPost,
        );

        for (const comment of comments) {
          // Analyze sentiment
          const sentiment = await this.sentimentAnalyzer.analyzeSentiment(
            comment.text,
          );
          const keywords = this.extractKeywords(comment.text);

          // Check if it's a business reply
          const isBusinessReply =
            comment.user.username.toLowerCase() ===
            instagramUsername.toLowerCase();

          const commentData: Partial<InstagramMediaComment> = {
            businessProfileId,
            mediaId: media.id,
            commentId: comment.pk?.toString(),
            text: comment.text,
            author: {
              username: comment.user.username,
              userId: comment.user.pk?.toString(),
              profilePic: comment.user.profile_pic_url,
            },
            likesCount: comment.comment_like_count || 0,
            timestamp: new Date(comment.created_at * 1000),
            hasReplies: comment.child_comment_count > 0,
            sentiment,
            keywords,
            isBusinessReply,
            scrapedAt: new Date(),
          };

          // Save to database - Note: Comment snapshots are part of daily snapshots
          // This functionality has been deprecated in favor of snapshot-based approach
          // Comments are now stored as InstagramCommentSnapshot linked to daily snapshots

          totalProcessedComments++;
        }

        // Add delay to respect rate limits
        await this.delay(1000);
      }

      return { success: true, processedComments: totalProcessedComments };
    } catch (error) {
      console.error("Error scraping Instagram comments:", error);
      return { success: false, processedComments: 0, error: error.message };
    }
  }

  /**
   * Fetch user data from HikerAPI
   */
  private async fetchUserByUsername(username: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.hikerConfig.baseUrl}/v2/user/by/username?username=${encodeURIComponent(username)}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-access-key": this.hikerConfig.apiKey,
          },
        },
      );

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

        console.error("HikerAPI Error Details:", {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText,
          username: username,
          endpoint: "/v2/user/by/username",
        });

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching user data:", error);

      // Re-throw the error with the enhanced message if it's our custom error
      if (error instanceof Error && error.message.includes("HikerAPI")) {
        throw error;
      }

      // Handle network or other errors
      throw new Error(
        `Failed to connect to HikerAPI: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Fetch user media from HikerAPI
   */
  private async fetchUserMedia(
    username: string,
    count: number = 10,
  ): Promise<any[]> {
    try {
      console.log(
        `📸 Fetching media for username: ${username}, count: ${count}`,
      );

      // First, get the user ID from the username
      let userData;
      try {
        userData = await this.fetchUserByUsername(username);
        console.log("📊 User data response:", userData);
      } catch (error) {
        console.error("❌ Failed to fetch user data:", error);
        throw error; // Re-throw to see the actual error
      }

      if (!userData || !userData.pk) {
        console.log("❌ Could not get user ID for username:", username);
        console.log("📊 User data structure:", userData);
        return [];
      }

      const userId = userData.pk;
      console.log(`✅ Got user ID: ${userId} for username: ${username}`);

      // Use the correct endpoint with user_id parameter
      const endpoint = `/v2/user/medias?user_id=${encodeURIComponent(userId)}`;

      try {
        console.log(
          `🔗 Trying HikerAPI endpoint: ${this.hikerConfig.baseUrl}${endpoint}`,
        );

        const response = await fetch(`${this.hikerConfig.baseUrl}${endpoint}`, {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-access-key": this.hikerConfig.apiKey,
          },
        });

        console.log(`📊 HikerAPI response status: ${response.status}`);

        if (response.ok) {
          const data = (await response.json()) as any;
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
      console.error("Error fetching user media:", error);
      return [];
    }
  }

  /**
   * Fetch media comments from HikerAPI
   */
  private async fetchMediaComments(
    mediaId: string,
    count: number = 50,
  ): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.hikerConfig.baseUrl}/v2/media/comments?id=${encodeURIComponent(mediaId)}&count=${count}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-access-key": this.hikerConfig.apiKey,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HikerAPI error: ${response.status}`);
      }

      const data = (await response.json()) as { comments?: any[] };
      return data.comments || [];
    } catch (error) {
      console.error("Error fetching media comments:", error);
      return [];
    }
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - could be enhanced
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word) => !this.isStopWord(word));

    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      "this",
      "that",
      "with",
      "have",
      "will",
      "been",
      "they",
      "were",
      "said",
      "each",
      "which",
      "their",
      "time",
      "about",
    ];
    return stopWords.includes(word);
  }

  /**
   * Delay execution for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Take a daily snapshot of Instagram data
   */
  async takeDailySnapshot(
    businessProfileId: string,
    options: Partial<Omit<TakeSnapshotRequest, "businessProfileId">> = {},
  ): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
    try {
      // Get business profile
      const profile = await this.prisma.instagramBusinessProfile.findUnique({
        where: { id: businessProfileId },
      });

      if (!profile) {
        return { success: false, error: "Business profile not found" };
      }

      // Check if snapshot already exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to beginning of day
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingSnapshot = await this.prisma.instagramDailySnapshot.findFirst({
        where: {
          businessProfileId,
          snapshotDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existingSnapshot) {
        return { success: false, error: "Snapshot already exists for today" };
      }

      // Fetch current data from HikerAPI
      const userData = await this.fetchUserByUsername(profile.username);
      if (!userData) {
        return { success: false, error: "Failed to fetch Instagram data" };
      }

      // Check if data is nested under 'user' object
      let actualUserData = userData;
      if (userData.user && typeof userData.user === "object") {
        actualUserData = userData.user;
      }

      // Get the previous snapshot to calculate daily changes
      const previousSnapshot = await this.prisma.instagramDailySnapshot.findFirst({
        where: { businessProfileId },
        orderBy: { snapshotDate: 'desc' },
        take: 1,
      });

      // Calculate daily metrics
      let dailyLikes = 0;
      let dailyComments = 0;
      let dailyViews = 0;
      let newPosts = 0;
      let newStories = 0;
      let newReels = 0;

      try {
        const userMedia = await this.fetchUserMedia(
          profile.username,
          options.maxMedia || 20,
        );
        console.log(
          `📊 Fetched ${userMedia.length} media items for daily calculation`,
        );

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
              if (media.media_type === 1)
                newPosts++; // Photo
              else if (media.media_type === 2)
                newPosts++; // Video
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
          mediaCount: userMedia.length,
        });
      } catch (mediaError) {
        console.warn(
          "⚠️ Could not fetch media for daily calculation:",
          mediaError,
        );
        // Continue with 0 values if media fetch fails
      }

      // Calculate engagement rate
      const engagementRate =
        actualUserData.follower_count > 0
          ? ((dailyLikes + dailyComments) / actualUserData.follower_count) * 100
          : 0;

      // Calculate growth metrics from previous snapshot
      const followersGrowth = previousSnapshot
        ? actualUserData.follower_count - previousSnapshot.followersCount
        : 0;
      const followingGrowth = previousSnapshot
        ? actualUserData.following_count - previousSnapshot.followingCount
        : 0;
      const mediaGrowth = previousSnapshot
        ? actualUserData.media_count - previousSnapshot.mediaCount
        : 0;
      const followersRatio = previousSnapshot && previousSnapshot.followersCount > 0
        ? (followersGrowth / previousSnapshot.followersCount) * 100
        : 0;

      // Calculate averages
      const avgLikesPerPost = actualUserData.media_count > 0
        ? dailyLikes / actualUserData.media_count
        : 0;
      const avgCommentsPerPost = actualUserData.media_count > 0
        ? dailyComments / actualUserData.media_count
        : 0;
      const commentsRatio = dailyLikes > 0
        ? (dailyComments / dailyLikes) * 100
        : 0;

      // Insert snapshot with calculated values
      const snapshot = await this.prisma.instagramDailySnapshot.create({
        data: {
          businessProfileId,
          snapshotDate: today,
          snapshotTime: today,
          snapshotType: options.snapshotType || "DAILY",
          followersCount: actualUserData.follower_count,
          followingCount: actualUserData.following_count,
          mediaCount: actualUserData.media_count,
          totalLikes: dailyLikes,
          totalComments: dailyComments,
          totalViews: dailyViews,
          totalSaves: 0,
          totalShares: 0,
          newPosts,
          newStories,
          newReels,
          storyViews: 0,
          storyReplies: 0,
          hasErrors: false,
          followersGrowth,
          followersRatio,
          followingGrowth,
          mediaGrowth,
          weeklyFollowersGrowth: 0,
          monthlyFollowersGrowth: 0,
          avgLikesPerPost,
          avgCommentsPerPost,
          commentsRatio,
          engagementRate,
        },
        select: { id: true },
      });

      // Update business profile with current metrics
      await this.prisma.instagramBusinessProfile.update({
        where: { id: businessProfileId },
        data: {
          currentFollowersCount: actualUserData.follower_count,
          currentFollowingCount: actualUserData.following_count,
          currentMediaCount: actualUserData.media_count,
          lastSnapshotAt: today,
          totalSnapshots: (profile.totalSnapshots || 0) + 1,
          updatedAt: new Date(),
        },
      });

      // If requested, fetch media and comments
      if (options.includeMedia) {
        await this.fetchAndStoreMediaSnapshots(
          businessProfileId,
          snapshot.id,
          profile.username,
          options.maxMedia || 10,
          options.includeComments,
          options.maxComments || 50,
        );
      }

      return { success: true, snapshotId: snapshot.id };
    } catch (error) {
      console.error("Error taking daily snapshot:", error);
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
    maxComments: number = 50,
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
          hashtags: media.hashtags?.map((h) => h.name) || [],
          mentions: media.user_mentions?.map((m) => m.username) || [],
          location: media.location
            ? {
              id: media.location.pk,
              name: media.location.name,
              coordinates: {
                lat: media.location.lat,
                lng: media.location.lng,
              },
            }
            : undefined,
          likesCount: media.like_count,
          commentsCount: media.comment_count,
          viewsCount: media.view_count || 0,
          publishedAt: new Date(media.taken_at * 1000),
          snapshotAt: new Date(),
        };

        const mediaSnapshot = await this.prisma.instagramMediaSnapshot.create({
          data: {
            id: uuidv4(),
            ...mediaSnapshotData,
            businessProfileId,
            dailySnapshotId,
            engagementRate: 0,
            reachEstimate: 0,
            savesCount: 0,
            sharesCount: 0,
          },
          select: { id: true },
        });

        // If requested, fetch comments
        if (includeComments && mediaSnapshot) {
          await this.fetchAndStoreCommentSnapshots(
            businessProfileId,
            dailySnapshotId,
            mediaSnapshot.id,
            media.id,
            username,
            maxComments,
          );
        }

        // Rate limiting
        await this.delay(500);
      }
    } catch (error) {
      console.error("Error fetching media snapshots:", error);
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
    maxComments: number,
  ): Promise<void> {
    try {
      const comments = await this.fetchMediaComments(mediaId, maxComments);

      for (const comment of comments) {
        // Analyze sentiment
        const sentiment = await this.sentimentAnalyzer.analyzeSentiment(
          comment.text,
        );
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
          isBusinessReply:
            comment.user.username.toLowerCase() === username.toLowerCase(),
          publishedAt: new Date(comment.created_at * 1000),
          snapshotAt: new Date(),
        };

        await this.prisma.instagramCommentSnapshot.create({
          data: {
            id: uuidv4(),
            ...commentSnapshotData,
            businessProfileId,
            dailySnapshotId,
            mediaSnapshotId,
          },
        });

        // Rate limiting
        await this.delay(100);
      }
    } catch (error) {
      console.error("Error fetching comment snapshots:", error);
    }
  }

  /**
   * Map HikerAPI media type to our enum
   */
  private mapMediaType(
    mediaType: number,
  ): "photo" | "video" | "carousel" | "reel" {
    switch (mediaType) {
      case 1:
        return "photo";
      case 2:
        return "video";
      case 8:
        return "carousel";
      default:
        return "photo";
    }
  }

  /**
   * Enable automatic daily snapshots for a business
   */
  async enableAutomaticSnapshots(
    businessProfileId: string,
    snapshotTime: string = "09:00:00",
    timezone: string = "UTC",
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
        updatedAt: now,
      };

      const schedule = await this.prisma.instagramSnapshotSchedule.upsert({
        where: { businessProfileId },
        update: {
          isEnabled: true,
          snapshotTime,
          timezone,
          updatedAt: now,
        },
        create: {
          id: uuidv4(),
          businessProfileId,
          snapshotTime,
          timezone,
          isEnabled: true,
          maxRetries: 3,
          retryDelayMinutes: 5,
          consecutiveFailures: 0,
          createdAt: now,
          updatedAt: now,
        },
        select: { id: true },
      });

      console.log(
        `✅ Enabled automatic snapshots for business ${businessProfileId} at ${snapshotTime}`,
      );
      return { success: true, scheduleId: schedule.id };
    } catch (error) {
      console.error("Error enabling automatic snapshots:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable automatic snapshots for a business
   */
  async disableAutomaticSnapshots(
    businessProfileId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.prisma.instagramSnapshotSchedule.updateMany({
        where: { businessProfileId },
        data: {
          isEnabled: false,
          updatedAt: new Date(),
        },
      });

      console.log(
        `🛑 Disabled automatic snapshots for business ${businessProfileId}`,
      );
      return { success: true };
    } catch (error) {
      console.error("Error disabling automatic snapshots:", error);
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
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      if (settings.snapshotTime)
        updateData.snapshotTime = settings.snapshotTime;
      if (settings.timezone) updateData.timezone = settings.timezone;
      if (settings.maxRetries) updateData.maxRetries = settings.maxRetries;
      if (settings.retryDelayMinutes)
        updateData.retryDelayMinutes = settings.retryDelayMinutes;

      await this.prisma.instagramSnapshotSchedule.updateMany({
        where: { businessProfileId },
        data: updateData,
      });

      console.log(
        `⚙️  Updated snapshot schedule for business ${businessProfileId}`,
      );
      return { success: true };
    } catch (error) {
      console.error("Error updating snapshot schedule:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get snapshot schedule status
   */
  async getSnapshotScheduleStatus(businessProfileId: string): Promise<{
    success: boolean;
    schedule?: InstagramSnapshotSchedule;
    error?: string;
  }> {
    try {
      const schedule = await this.prisma.instagramSnapshotSchedule.findUnique({
        where: { businessProfileId },
      });

      return { success: true, schedule: schedule || undefined };
    } catch (error) {
      console.error("Error getting snapshot schedule status:", error);
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
    } = {},
  ): Promise<{
    success: boolean;
    snapshots?: InstagramDailySnapshot[];
    pagination?: any;
    error?: string;
  }> {
    try {
      const {
        limit = 30,
        offset = 0,
        startDate,
        endDate,
        snapshotType,
      } = options;

      // Build where clause
      const where: any = {
        businessProfileId,
      };

      if (startDate) {
        where.snapshotDate = { ...where.snapshotDate, gte: new Date(startDate) };
      }
      if (endDate) {
        where.snapshotDate = { ...where.snapshotDate, lte: new Date(endDate) };
      }
      if (snapshotType) {
        where.snapshotType = snapshotType;
      }

      // Get total count for pagination
      const count = await this.prisma.instagramDailySnapshot.count({
        where,
      });

      // Apply pagination
      const snapshots = await this.prisma.instagramDailySnapshot.findMany({
        where,
        orderBy: { snapshotDate: 'desc' },
        skip: offset,
        take: limit,
      });

      return {
        success: true,
        snapshots,
        pagination: {
          limit,
          offset,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasNextPage: offset + limit < count,
          hasPreviousPage: offset > 0,
        },
      };
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get business profile by location ID
   */
  async getBusinessProfileByLocationId(locationId: string): Promise<{
    success: boolean;
    profile?: InstagramBusinessProfile;
    error?: string;
  }> {
    try {
      console.log("🔍 Looking for Instagram profile for locationId:", locationId);

      // First, let's check if any profile exists for this location (without isActive filter)
      const allProfiles = await this.prisma.instagramBusinessProfile.findMany({
        where: { locationId },
      });

      console.log("📊 Found profiles for location:", allProfiles.length);
      if (allProfiles.length > 0) {
        console.log("📋 Profile details:", allProfiles[0]);
      }

      // Now try to get the active profile
      const profile = await this.prisma.instagramBusinessProfile.findFirst({
        where: {
          locationId,
          isActive: true,
        },
      });

      if (!profile) {
        console.log(
          "❌ No active Instagram profile found for locationId:",
          locationId,
        );

        // Fallback: try to get any profile for this location (not just active ones)
        console.log("🔄 Trying to get any profile for locationId:", locationId);
        const fallbackProfile = await this.prisma.instagramBusinessProfile.findFirst({
          where: { locationId },
        });

        if (!fallbackProfile) {
          console.log(
            "❌ No Instagram profile found at all for locationId:",
            locationId,
          );
          return {
            success: false,
            error: "No Instagram profile found for this location",
          };
        }

        console.log(
          "✅ Found inactive Instagram profile, using it:",
          fallbackProfile,
        );
        return { success: true, profile: fallbackProfile };
      }

      console.log("✅ Found active Instagram profile:", profile);
      return { success: true, profile };
    } catch (error) {
      console.error("Error fetching business profile:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close service connections
   */
  /**
   * Calculate average engagement rate from snapshots
   */
  private calculateAverageEngagementRate(
    snapshots: InstagramDailySnapshot[],
  ): number {
    if (snapshots.length === 0) return 0;

    let totalEngagement = 0;
    let totalFollowers = 0;

    snapshots.forEach((snapshot) => {
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
  private calculateEngagementTrend(
    snapshots: InstagramDailySnapshot[],
  ): "increasing" | "decreasing" | "stable" {
    if (snapshots.length < 2) return "stable";

    const midPoint = Math.floor(snapshots.length / 2);
    const firstHalf = snapshots.slice(0, midPoint);
    const secondHalf = snapshots.slice(midPoint);

    const firstHalfAvg =
      firstHalf.reduce((sum, s) => sum + s.totalLikes + s.totalComments, 0) /
      firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, s) => sum + s.totalLikes + s.totalComments, 0) /
      secondHalf.length;

    const change = secondHalfAvg - firstHalfAvg;
    const threshold = firstHalfAvg * 0.1; // 10% threshold

    if (change > threshold) return "increasing";
    if (change < -threshold) return "decreasing";
    return "stable";
  }

  /**
   * Export Instagram data
   */
  async exportData(
    businessProfileId: string,
    options: {
      format?: "json" | "csv";
      includeSnapshots?: boolean;
      includeMedia?: boolean;
      includeComments?: boolean;
    } = {},
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const {
        format = "json",
        includeSnapshots = true,
        includeMedia = false,
        includeComments = false,
      } = options;

      // Get business profile
      const profile = await this.prisma.instagramBusinessProfile.findUnique({
        where: { id: businessProfileId },
      });

      if (!profile) throw new Error('Business profile not found');

      const exportData: any = {
        profile,
        exportDate: new Date().toISOString(),
        format,
        options,
      };

      if (includeSnapshots) {
        const snapshots = await this.prisma.instagramDailySnapshot.findMany({
          where: { businessProfileId },
          orderBy: { snapshotDate: 'desc' },
          take: 100,
        });
        exportData.snapshots = snapshots;
      }

      if (includeMedia) {
        const media = await this.prisma.instagramMediaSnapshot.findMany({
          where: { businessProfileId },
          orderBy: { snapshotAt: 'desc' },
          take: 500,
        });
        exportData.media = media;
      }

      if (includeComments) {
        const comments = await this.prisma.instagramCommentSnapshot.findMany({
          where: { businessProfileId },
          orderBy: { snapshotAt: 'desc' },
          take: 1000,
        });
        exportData.comments = comments;
      }

      console.log(
        `✅ Exported Instagram data for business ${businessProfileId}`,
      );
      return { success: true, data: exportData };
    } catch (error) {
      console.error("Error exporting Instagram data:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete all Instagram data for a business
   */
  async deleteAllData(
    businessProfileId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Prisma will handle cascading deletes based on schema
      // Delete the business profile and all related data will be cascade deleted
      await this.prisma.instagramBusinessProfile.delete({
        where: { id: businessProfileId },
      });

      console.log(
        `✅ Deleted all Instagram data for business ${businessProfileId}`,
      );
      return { success: true };
    } catch (error) {
      console.error("Error deleting Instagram data:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close Prisma connection (if needed for cleanup)
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
