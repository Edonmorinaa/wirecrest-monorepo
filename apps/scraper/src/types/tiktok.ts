export interface TikTokUser {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  signature: string;
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  diggCount: number;
  verified: boolean;
  privateAccount: boolean;
  isBusinessAccount: boolean;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TikTokVideo {
  id: string;
  videoId: string;
  description: string;
  createTime: Date;
  videoUrl: string;
  coverUrl: string;
  duration: number;
  width: number;
  height: number;
  playCount: number;
  diggCount: number;
  commentCount: number;
  shareCount: number;
  downloadCount: number;
  hashtags: string[];
  mentions: string[];
  music?: {
    id: string;
    title: string;
    author: string;
    url: string;
  };
  location?: {
    id: string;
    name: string;
    address: string;
  };
  isAd: boolean;
  isPrivate: boolean;
  isDownloadable: boolean;
  scrapedAt: Date;
}

export interface TikTokComment {
  id: string;
  commentId: string;
  videoId: string;
  text: string;
  author: {
    userId: string;
    username: string;
    nickname: string;
    avatarUrl: string;
    verified: boolean;
  };
  createTime: Date;
  likeCount: number;
  replyCount: number;
  isReply: boolean;
  parentCommentId?: string;
  sentiment?: number;
  keywords?: string[];
  scrapedAt: Date;
}

export interface TikTokBusinessProfile {
  id: string;
  locationId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  signature: string;
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  diggCount: number;
  verified: boolean;
  privateAccount: boolean;
  isBusinessAccount: boolean;
  category?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSnapshotAt?: Date;
  totalSnapshots: number;
  firstSnapshotAt?: Date;
}

export interface TikTokDailySnapshot {
  id: string;
  businessProfileId: string;
  snapshotDate: string;
  snapshotTime: string;
  snapshotType: "DAILY" | "MANUAL" | "INITIAL";
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  diggCount: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  totalDownloads: number;
  newVideos: number;
  newComments: number;
  hasErrors: boolean;
  errorMessage: string | null;
  createdAt: Date;
}

export interface TikTokSnapshotSchedule {
  id: string;
  businessProfileId: string;
  isEnabled: boolean;
  snapshotTime: string;
  timezone: string;
  maxRetries: number;
  retryDelayMinutes: number;
  lastSnapshotAt?: Date;
  nextSnapshotAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

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
  };
}

export interface TakeSnapshotRequest {
  businessProfileId: string;
  snapshotType: "DAILY" | "MANUAL" | "INITIAL";
  includeVideos?: boolean;
  maxVideos?: number;
  includeComments?: boolean;
  maxComments?: number;
}

export interface GetAnalyticsRequest {
  period: "7" | "30" | "90" | "365";
  includeCharts?: boolean;
  includeMetrics?: boolean;
}

// LamaTok API Response Types
export interface LamaTokConfig {
  baseUrl: string;
  accessKey: string;
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export interface LamaTokUserResponse {
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
      secUid?: string;
    };
  };
  error?: string;
}

export interface LamaTokVideoResponse {
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
    hasMore: boolean;
    cursor?: string;
  };
  error?: string;
}

export interface LamaTokCommentResponse {
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
    hasMore: boolean;
    cursor?: string;
  };
  error?: string;
}

// New LamaTok API Response Types
export interface LamaTokFollowersResponse {
  success: boolean;
  data?: {
    followers: Array<{
      id: string;
      uniqueId: string;
      nickname: string;
      avatarThumb: string;
      verified: boolean;
      followerCount: number;
      followingCount: number;
      heartCount: number;
      videoCount: number;
    }>;
    hasMore: boolean;
    nextPageId?: string;
  };
  error?: string;
}

export interface LamaTokFollowingResponse {
  success: boolean;
  data?: {
    following: Array<{
      id: string;
      uniqueId: string;
      nickname: string;
      avatarThumb: string;
      verified: boolean;
      followerCount: number;
      followingCount: number;
      heartCount: number;
      videoCount: number;
    }>;
    hasMore: boolean;
    nextPageId?: string;
  };
  error?: string;
}

export interface LamaTokPlaylistsResponse {
  success: boolean;
  data?: {
    playlists: Array<{
      id: string;
      name: string;
      description: string;
      videoCount: number;
      coverUrl: string;
      createTime: number;
    }>;
    hasMore: boolean;
    nextPageId?: string;
  };
  error?: string;
}

export interface LamaTokMediaByUrlResponse {
  success: boolean;
  data?: {
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
  };
  error?: string;
}

export interface LamaTokHashtagInfoResponse {
  success: boolean;
  data?: {
    id: number;
    name: string;
    title: string;
    description: string;
    videoCount: number;
    viewCount: number;
    shareCount: number;
  };
  error?: string;
}

export interface LamaTokHashtagMediasResponse {
  success: boolean;
  data?: {
    medias: Array<{
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
      author: {
        id: string;
        uniqueId: string;
        nickname: string;
        avatarThumb: string;
        verified: boolean;
      };
      hashtags: string[];
      mentions: string[];
    }>;
    hasMore: boolean;
    cursor?: number;
  };
  error?: string;
}

// Legacy types for backward compatibility
export interface ScrapeCreatorsTikTokUserResponse extends LamaTokUserResponse { }
export interface ScrapeCreatorsTikTokVideoResponse
  extends LamaTokVideoResponse { }
export interface ScrapeCreatorsTikTokCommentResponse
  extends LamaTokCommentResponse { }
