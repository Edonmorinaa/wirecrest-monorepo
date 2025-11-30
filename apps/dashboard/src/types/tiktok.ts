import { Prisma } from '@prisma/client';

// Base types derived from Prisma schema
export type TikTokBusinessProfile = Prisma.TikTokBusinessProfileGetPayload<{}>;
export type TikTokDailySnapshot = Prisma.TikTokDailySnapshotGetPayload<{}>;
export type TikTokSnapshotSchedule = Prisma.TikTokSnapshotScheduleGetPayload<{}>;
export type TikTokVideoSnapshot = Prisma.TikTokVideoSnapshotGetPayload<{}>;
export type TikTokCommentSnapshot = Prisma.TikTokCommentSnapshotGetPayload<{}>;

// Extended types with relations
export type TikTokBusinessProfileWithRelations = Prisma.TikTokBusinessProfileGetPayload<{
  include: {
    dailySnapshots: true;
    snapshotSchedule: true;
  };
}>;

export type TikTokDailySnapshotWithRelations = Prisma.TikTokDailySnapshotGetPayload<{
  include: {
    businessProfile: true;
  };
}>;

export type TikTokVideoSnapshotWithRelations = Prisma.TikTokVideoSnapshotGetPayload<{
  include: {
    dailySnapshot: true;
    businessProfile: true;
  };
}>;

export type TikTokCommentSnapshotWithRelations = Prisma.TikTokCommentSnapshotGetPayload<{
  include: {
    dailySnapshot: true;
    businessProfile: true;
  };
}>;

// Analytics and chart data types
export interface TikTokAnalytics {
  periodMetrics: {
    followersGrowth: number;
    followersGrowthPercent: number;
    avgEngagementRate: number;
    avgContentPerDay: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    totalDownloads: number;
    snapshots: TikTokDailySnapshot[];
  };
  chartData: {
    followers: Array<{ date: string; value: number; rawDate: string }>;
    likes: Array<{ date: string; value: number; rawDate: string }>;
    comments: Array<{ date: string; value: number; rawDate: string }>;
    shares: Array<{ date: string; value: number; rawDate: string }>;
    views: Array<{ date: string; value: number; rawDate: string }>;
    downloads: Array<{ date: string; value: number; rawDate: string }>;
  };
}

// Request/Response types
export interface CreateTikTokProfileRequest {
  locationId: string;
  username: string;
}

export interface TakeTikTokSnapshotRequest {
  businessProfileId: string;
  snapshotType: 'DAILY' | 'MANUAL' | 'INITIAL';
  includeVideos?: boolean;
  maxVideos?: number;
  includeComments?: boolean;
  maxComments?: number;
}

export interface GetTikTokAnalyticsRequest {
  period: '7' | '30' | '90' | '365';
  includeCharts?: boolean;
  includeMetrics?: boolean;
}

// API Response types for ScrapeCreators
export interface ScrapeCreatorsTikTokUserResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      uniqueId: string;
      nickname: string;
      avatarThumb: string;
      avatarMedium: string;
      avatarLarger: string;
      signature: string;
      verified: boolean;
      followerCount: number;
      followingCount: number;
      heartCount: number;
      videoCount: number;
      diggCount: number;
      privateAccount: boolean;
      isBusinessAccount: boolean;
      category?: string;
    };
  };
  error?: string;
}

export interface ScrapeCreatorsTikTokVideoResponse {
  success: boolean;
  data?: {
    videos: Array<{
      id: string;
      videoId: string;
      desc: string;
      createTime: number;
      video: {
        playAddr: string;
        downloadAddr: string;
        cover: string;
        duration: number;
        width: number;
        height: number;
      };
      stats: {
        playCount: number;
        diggCount: number;
        commentCount: number;
        shareCount: number;
        downloadCount: number;
      };
      hashtags: string[];
      mentions: string[];
      music?: {
        id: string;
        title: string;
        author: string;
        playUrl: string;
      };
      location?: {
        id: string;
        name: string;
        address: string;
      };
      isAd: boolean;
      isPrivate: boolean;
      isDownloadable: boolean;
    }>;
  };
  error?: string;
}

export interface ScrapeCreatorsTikTokCommentResponse {
  success: boolean;
  data?: {
    comments: Array<{
      id: string;
      commentId: string;
      videoId: string;
      text: string;
      author: {
        userId: string;
        uniqueId: string;
        nickname: string;
        avatarThumb: string;
        verified: boolean;
      };
      createTime: number;
      likeCount: number;
      replyCount: number;
      isReply: boolean;
      parentCommentId?: string;
    }>;
  };
  error?: string;
}

// Enum types
export type TikTokSnapshotType = 'DAILY' | 'MANUAL' | 'INITIAL';

// Utility types for form handling
export interface TikTokProfileFormData {
  username: string;
  nickname?: string;
  category?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  location?: string;
}

export interface TikTokSnapshotScheduleFormData {
  isEnabled: boolean;
  snapshotTime: string;
  timezone: string;
  maxRetries: number;
  retryDelayMinutes: number;
}

// Chart data types for analytics
export interface TikTokChartDataPoint {
  date: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  rawDate: string;
}

export interface TikTokPeriodMetrics {
  snapshots: TikTokDailySnapshot[];
  firstSnapshot: TikTokDailySnapshot;
  latestSnapshot: TikTokDailySnapshot;
  followersGrowth: number;
  followingGrowth: number;
  heartGrowth: number;
  videoGrowth: number;
  diggGrowth: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  totalDownloads: number;
  avgDailyLikes: number;
  avgDailyComments: number;
  avgDailyShares: number;
  avgDailyViews: number;
  avgDailyDownloads: number;
  avgEngagementRate: number;
  engagementTrend: number;
  bestPerformingDay: { date: Date | null; engagement: number };
  contentFrequency: number;
  avgContentPerDay: number;
  followersGrowthPercent: number;
} 