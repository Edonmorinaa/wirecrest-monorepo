/**
 * TikTok Data Service - Prisma Implementation
 * Handles TikTok business profile management and snapshot operations
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { SentimentAnalyzer } from "../sentimentAnalyzer/sentimentAnalyzer.js";
import type {
  TikTokBusinessProfile,
  TikTokDailySnapshot,
  TikTokSnapshotSchedule,
  TakeSnapshotRequest,
  GetAnalyticsRequest,
} from "../types/tiktok.js";

interface LamaTokConfig {
  baseUrl: string;
  accessKey: string;
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export class TikTokDataService {
  private prisma: PrismaClient;
  private lamaTokConfig: LamaTokConfig;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor(
    lamatokAccessKey: string,
    prismaClient?: PrismaClient,
    sentimentAnalyzer?: SentimentAnalyzer
  ) {
    this.prisma = prismaClient || new PrismaClient();
    this.sentimentAnalyzer = sentimentAnalyzer || new SentimentAnalyzer();

    this.lamaTokConfig = {
      baseUrl: "https://api.lamatok.com",
      accessKey: lamatokAccessKey,
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 10,
      },
    };
  }

  /**
   * Create or update TikTok business profile
   */
  async createBusinessProfile(
    locationId: string,
    tiktokUsername: string,
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      console.log("[TikTok] createBusinessProfile:start", {
        locationId,
        tiktokUsername,
      });

      // Check if profile already exists
      const existingProfile = await this.prisma.tikTokBusinessProfile.findUnique({
        where: { locationId },
      });

      if (existingProfile) {
        console.log("[TikTok] createBusinessProfile:existing-found", {
          businessProfileId: existingProfile.id,
        });
        return {
          success: true,
          businessProfileId: existingProfile.id,
        };
      }

      // Fetch user data from LamaTok API
      const userData = await this.fetchUserByUsername(tiktokUsername);
      console.log("[TikTok] createBusinessProfile:userData", {
        success: userData.success,
        hasUser: Boolean(userData.data?.user),
        error: userData.error,
      });

      if (!userData.success || !userData.data?.user) {
        return {
          success: false,
          error: `Failed to fetch TikTok user data: ${userData.error}`,
        };
      }

      const user = userData.data.user;

      // Create business profile
      const newBusinessProfileId = randomUUID();
      const businessProfile = await this.prisma.tikTokBusinessProfile.create({
        data: {
          id: newBusinessProfileId,
          locationId,
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
        },
        select: { id: true },
      });

      // Create initial snapshot (without videos due to API limitation)
      console.log("[TikTok] createBusinessProfile:inserted", {
        businessProfileId: businessProfile.id,
      });
      await this.takeDailySnapshot(businessProfile.id, {
        snapshotType: "INITIAL",
        includeVideos: false, // Disabled due to LamaTok API limitation
      });

      console.log("[TikTok] createBusinessProfile:complete", {
        businessProfileId: businessProfile.id,
      });
      return {
        success: true,
        businessProfileId: businessProfile.id,
      };
    } catch (error) {
      console.error("Error in createBusinessProfile:", error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get TikTok business profile by location ID
   */
  async getBusinessProfileByLocationId(locationId: string): Promise<{
    success: boolean;
    profile?: TikTokBusinessProfile;
    error?: string;
  }> {
    try {
      const profile = await this.prisma.tikTokBusinessProfile.findUnique({
        where: { locationId },
      });

      if (!profile) {
        return {
          success: false,
          error: "TikTok business profile not found",
        };
      }

      return {
        success: true,
        profile: profile as any,
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Take a daily snapshot of TikTok data
   */
  async takeDailySnapshot(
    businessProfileId: string,
    options: Partial<Omit<TakeSnapshotRequest, "businessProfileId">> = {},
  ): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
    try {
      console.log("[TikTok] takeDailySnapshot:start", {
        businessProfileId,
        options,
      });

      const {
        snapshotType = "DAILY",
        includeVideos = false,
        maxVideos = 10,
        includeComments = false,
        maxComments = 50,
      } = options;

      // Get business profile
      const businessProfile = await this.prisma.tikTokBusinessProfile.findUnique({
        where: { id: businessProfileId },
      });

      if (!businessProfile) {
        return {
          success: false,
          error: "Business profile not found",
        };
      }

      // Fetch current user data
      const userData = await this.fetchUserByUsername(businessProfile.username);
      console.log("[TikTok] takeDailySnapshot:userData", {
        success: userData.success,
        hasUser: Boolean(userData.data?.user),
        error: userData.error,
      });

      if (!userData.success || !userData.data?.user) {
        return {
          success: false,
          error: `Failed to fetch TikTok user data: ${userData.error}`,
        };
      }

      const user = userData.data.user;
      const now = new Date();
      const snapshotDate = new Date(now.toISOString().split("T")[0]);

      // Calculate daily metrics
      const previousSnapshot = await this.prisma.tikTokDailySnapshot.findFirst({
        where: { businessProfileId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      const totalLikes = user.heartCount;
      const totalComments = 0; // Will be calculated from videos if needed
      const totalShares = 0; // Will be calculated from videos if needed
      const totalViews = 0; // Will be calculated from videos if needed
      const totalDownloads = 0; // Will be calculated from videos if needed

      // Create snapshot
      const newSnapshotId = randomUUID();
      const snapshot = await this.prisma.tikTokDailySnapshot.create({
        data: {
          id: newSnapshotId,
          businessProfileId,
          snapshotDate,
          snapshotTime: now,
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
        },
        select: { id: true },
      });

      // Update business profile with latest data
      await this.prisma.tikTokBusinessProfile.update({
        where: { id: businessProfileId },
        data: {
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
        },
      });

      // Fetch videos and comments if requested
      if (includeVideos) {
        await this.fetchAndStoreVideoSnapshots(
          businessProfileId,
          snapshot.id,
          businessProfile.username,
          maxVideos,
          includeComments,
          maxComments,
        );
      }

      console.log("[TikTok] takeDailySnapshot:created", {
        snapshotId: snapshot.id,
      });
      return {
        success: true,
        snapshotId: snapshot.id,
      };
    } catch (error) {
      console.error("Error in takeDailySnapshot:", error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Enable automatic snapshots
   */
  async enableAutomaticSnapshots(
    businessProfileId: string,
    snapshotTime: string = "09:00:00",
    timezone: string = "UTC",
  ): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
    try {
      console.log("[TikTok] enableAutomaticSnapshots:start", {
        businessProfileId,
        snapshotTime,
        timezone,
      });

      // Check if a schedule already exists for this business profile
      const existing = await this.prisma.tikTokSnapshotSchedule.findUnique({
        where: { businessProfileId },
      });

      if (existing) {
        console.log("[TikTok] enableAutomaticSnapshots:update-existing", {
          scheduleId: existing.id,
        });

        const updated = await this.prisma.tikTokSnapshotSchedule.update({
          where: { id: existing.id },
          data: {
            isEnabled: true,
            snapshotTime,
            timezone,
            maxRetries: 3,
            retryDelayMinutes: 5,
          },
          select: { id: true },
        });

        console.log("[TikTok] enableAutomaticSnapshots:updated", {
          scheduleId: updated.id,
        });
        return { success: true, scheduleId: updated.id };
      } else {
        const newId = randomUUID();
        console.log("[TikTok] enableAutomaticSnapshots:insert-new", {
          scheduleId: newId,
        });

        const inserted = await this.prisma.tikTokSnapshotSchedule.create({
          data: {
            id: newId,
            businessProfileId,
            isEnabled: true,
            snapshotTime,
            timezone,
            maxRetries: 3,
            retryDelayMinutes: 5,
          },
          select: { id: true },
        });

        console.log("[TikTok] enableAutomaticSnapshots:inserted", {
          scheduleId: inserted.id,
        });
        return { success: true, scheduleId: inserted.id };
      }
    } catch (error) {
      console.error("[TikTok] enableAutomaticSnapshots:exception", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Disable automatic snapshots
   */
  async disableAutomaticSnapshots(
    businessProfileId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.prisma.tikTokSnapshotSchedule.update({
        where: { businessProfileId },
        data: { isEnabled: false },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Update snapshot schedule
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
      await this.prisma.tikTokSnapshotSchedule.update({
        where: { businessProfileId },
        data: settings,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get snapshot schedule status
   */
  async getSnapshotScheduleStatus(businessProfileId: string): Promise<{
    success: boolean;
    schedule?: TikTokSnapshotSchedule;
    error?: string;
  }> {
    try {
      const schedule = await this.prisma.tikTokSnapshotSchedule.findUnique({
        where: { businessProfileId },
      });

      return {
        success: true,
        schedule: schedule as any || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get snapshots
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
    snapshots?: TikTokDailySnapshot[];
    pagination?: any;
    error?: string;
  }> {
    try {
      const where: any = { businessProfileId };

      if (options.snapshotType) {
        where.snapshotType = options.snapshotType;
      }

      if (options.startDate) {
        where.snapshotDate = where.snapshotDate || {};
        where.snapshotDate.gte = new Date(options.startDate);
      }

      if (options.endDate) {
        where.snapshotDate = where.snapshotDate || {};
        where.snapshotDate.lte = new Date(options.endDate);
      }

      const snapshots = await this.prisma.tikTokDailySnapshot.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 100,
        skip: options.offset || 0,
      });

      return {
        success: true,
        snapshots: snapshots as any,
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get analytics
   */
  async getAnalytics(
    businessProfileId: string,
    request: GetAnalyticsRequest,
  ): Promise<{
    success: boolean;
    analytics?: any;
    error?: string;
  }> {
    try {
      const { period } = request;

      // Calculate date range based on period
      const end = new Date();
      const start = new Date();

      switch (period) {
        case "7":
          start.setDate(start.getDate() - 7);
          break;
        case "30":
          start.setDate(start.getDate() - 30);
          break;
        case "90":
          start.setDate(start.getDate() - 90);
          break;
        case "365":
          start.setDate(start.getDate() - 365);
          break;
      }

      // Get snapshots for the period
      const snapshots = await this.prisma.tikTokDailySnapshot.findMany({
        where: {
          businessProfileId,
          snapshotDate: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { snapshotDate: 'asc' },
      });

      if (!snapshots || snapshots.length === 0) {
        return {
          success: false,
          error: "No data found for the specified period",
        };
      }

      // Calculate analytics
      const firstSnapshot = snapshots[0];
      const lastSnapshot = snapshots[snapshots.length - 1];

      // Calculate growth metrics
      const followersGrowth =
        lastSnapshot.followerCount - firstSnapshot.followerCount;
      const followersGrowthPercent =
        firstSnapshot.followerCount > 0
          ? (followersGrowth / firstSnapshot.followerCount) * 100
          : 0;

      // Calculate engagement metrics
      const totalLikes = snapshots.reduce((sum, s) => sum + s.totalLikes, 0);
      const totalComments = snapshots.reduce(
        (sum, s) => sum + s.totalComments,
        0,
      );
      const totalShares = snapshots.reduce((sum, s) => sum + s.totalShares, 0);
      const totalViews = snapshots.reduce((sum, s) => sum + s.totalViews, 0);
      const totalDownloads = snapshots.reduce(
        (sum, s) => sum + s.totalDownloads,
        0,
      );

      // Calculate averages
      const avgEngagementRate = this.calculateAverageEngagementRate(snapshots);
      const avgContentPerDay =
        snapshots.reduce((sum, s) => sum + s.newVideos, 0) / snapshots.length;

      // Prepare chart data
      const chartData = {
        followers: snapshots.map((s) => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.followerCount,
          rawDate: s.snapshotDate,
        })),
        likes: snapshots.map((s) => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.totalLikes,
          rawDate: s.snapshotDate,
        })),
        comments: snapshots.map((s) => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.totalComments,
          rawDate: s.snapshotDate,
        })),
        shares: snapshots.map((s) => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.totalShares,
          rawDate: s.snapshotDate,
        })),
        views: snapshots.map((s) => ({
          date: new Date(s.snapshotDate).toLocaleDateString(),
          value: s.totalViews,
          rawDate: s.snapshotDate,
        })),
      };

      const analytics = {
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
          snapshots,
        },
        chartData,
      };

      return { success: true, analytics };
    } catch (error) {
      console.error("Error getting TikTok analytics:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Calculate average engagement rate from snapshots
   */
  private calculateAverageEngagementRate(
    snapshots: any[],
  ): number {
    if (snapshots.length === 0) return 0;

    let totalEngagement = 0;
    let totalFollowers = 0;

    snapshots.forEach((snapshot) => {
      const dailyEngagement =
        snapshot.totalLikes + snapshot.totalComments + snapshot.totalShares;
      totalEngagement += dailyEngagement;
      totalFollowers += snapshot.followerCount;
    });

    const avgFollowers = totalFollowers / snapshots.length;
    return avgFollowers > 0 ? (totalEngagement / avgFollowers) * 100 : 0;
  }

  /**
   * Fetch user data from LamaTok API
   */
  private async fetchUserByUsername(
    username: string,
  ): Promise<any> {
    try {
      const url = `${this.lamaTokConfig.baseUrl}/v1/user/by/username?username=${encodeURIComponent(username)}`;
      console.log("[LamaTok] fetchUserByUsername:request", { username, url });

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-access-key": this.lamaTokConfig.accessKey,
        },
      });

      const text = await response.text();
      console.log("[LamaTok] fetchUserByUsername:response", {
        status: response.status,
        ok: response.ok,
        bodyPreview: text?.slice(0, 300),
      });

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        /* keep text */
      }

      if (!response.ok || (data && data.success === false)) {
        return {
          success: false,
          error: data?.error
            ? String(data.error)
            : `API error (${response.status}): ${data?.message || text || "Unknown error"}`,
        };
      }

      if (data?.users) {
        const userEntry = data.users[username] || Object.values(data.users)[0];
        const statsEntry = data.stats
          ? data.stats[username] || Object.values(data.stats)[0]
          : undefined;

        if (!userEntry) {
          return {
            success: false,
            error: "User not found in LamaTok response",
          };
        }

        const normalized = {
          user: {
            id: userEntry.id,
            uniqueId: userEntry.uniqueId || username,
            nickname: userEntry.nickname || "",
            avatarThumb:
              userEntry.avatarThumb ||
              userEntry.avatarMedium ||
              userEntry.avatarLarger ||
              "",
            avatarMedium:
              userEntry.avatarMedium ||
              userEntry.avatarThumb ||
              userEntry.avatarLarger ||
              "",
            avatarLarger:
              userEntry.avatarLarger ||
              userEntry.avatarMedium ||
              userEntry.avatarThumb ||
              "",
            signature: userEntry.signature || "",
            verified: userEntry.verified || false,
            privateAccount: userEntry.privateAccount || false,
            followerCount: statsEntry?.followerCount || userEntry.followerCount || 0,
            followingCount: statsEntry?.followingCount || userEntry.followingCount || 0,
            heartCount: statsEntry?.heartCount || userEntry.heartCount || 0,
            videoCount: statsEntry?.videoCount || userEntry.videoCount || 0,
            diggCount: statsEntry?.diggCount || userEntry.diggCount || 0,
            isBusinessAccount: userEntry.commerceUserInfo?.commerceUser || false,
            category: userEntry.category || null,
          },
        };

        return { success: true, data: normalized };
      }

      return { success: false, error: "Unexpected response structure from LamaTok" };
    } catch (error) {
      console.error("[LamaTok] fetchUserByUsername:error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Fetch and store video snapshots
   */
  private async fetchAndStoreVideoSnapshots(
    businessProfileId: string,
    dailySnapshotId: string,
    username: string,
    maxVideos: number,
    includeComments: boolean,
    maxComments: number,
  ): Promise<void> {
    try {
      // Note: Video fetching has been disabled due to LamaTok API limitations
      // This is a placeholder for future implementation
      console.log("[TikTok] fetchAndStoreVideoSnapshots:disabled", {
        reason: "LamaTok API limitation",
        businessProfileId,
        dailySnapshotId,
      });
    } catch (error) {
      console.error("Error fetching video snapshots:", error);
    }
  }

  /**
   * Delay execution for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
