// ===========================================
// INSTAGRAM SNAPSHOT TYPES
// ===========================================

export interface InstagramBusinessProfile {
  id: string;
  teamId: string;
  username: string;
  userId: string;
  profileUrl: string;
  fullName?: string;
  biography?: string;
  website?: string;
  isVerified: boolean;
  isBusinessAccount: boolean;
  category?: string;
  // Contact information
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;

  // Current state (from latest snapshot)
  currentFollowersCount?: number;
  currentFollowingCount?: number;
  currentMediaCount?: number;

  // Metadata
  firstSnapshotAt?: Date;
  lastSnapshotAt?: Date;
  totalSnapshots: number;
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface InstagramDailySnapshot {
  id: string;
  businessProfileId: string;

  // Snapshot metadata
  snapshotDate: Date;
  snapshotTime: Date;
  snapshotType: "DAILY" | "MANUAL" | "INITIAL";

  // Profile metrics
  followersCount: number;
  followingCount: number;
  mediaCount: number;

  // Engagement metrics
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalSaves: number;
  totalShares: number;

  // Recent activity
  newPosts: number;
  newStories: number;
  newReels: number;

  // Story metrics
  storyViews: number;
  storyReplies: number;

  // Hashtag performance
  topHashtags?: Array<{
    hashtag: string;
    count: number;
    reach: number;
  }>;

  // Error tracking
  hasErrors: boolean;
  errorMessage?: string;

  // Timestamps
  createdAt: Date;
}

export interface InstagramMediaSnapshot {
  id: string;
  businessProfileId: string;
  dailySnapshotId: string;

  // Media identification
  mediaId: string;
  mediaCode?: string;
  mediaType: "photo" | "video" | "carousel" | "reel";

  // Media content
  caption?: string;
  hashtags: string[];
  mentions: string[];
  location?: {
    id: string;
    name: string;
    coordinates?: { lat: number; lng: number };
  };

  // Performance metrics
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  savesCount: number;
  sharesCount: number;

  // Engagement rate
  engagementRate: number;
  reachEstimate: number;

  // Timestamps
  publishedAt?: Date;
  snapshotAt: Date;
}

export interface InstagramCommentSnapshot {
  id: string;
  businessProfileId: string;
  dailySnapshotId: string;
  mediaSnapshotId?: string;

  // Comment identification
  commentId: string;
  mediaId: string;

  // Comment content
  text: string;
  authorUsername: string;
  authorUserId: string;

  // Engagement
  likesCount: number;
  hasReplies: boolean;

  // Sentiment analysis
  sentiment?: number; // -1.0 to 1.0
  keywords: string[];
  isBusinessReply: boolean;

  // Timestamps
  publishedAt?: Date;
  snapshotAt: Date;
}

export interface InstagramWeeklyAggregation {
  id: string;
  businessProfileId: string;

  // Week identification
  weekStartDate: Date;
  weekEndDate: Date;
  year: number;
  weekNumber: number;

  // Growth metrics
  followersGrowth: number;
  followersGrowthPercent: number;
  followingGrowth: number;
  followingGrowthPercent: number;
  mediaGrowth: number;

  // Engagement metrics
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalSaves: number;
  totalShares: number;

  // Average daily metrics
  avgDailyLikes: number;
  avgDailyComments: number;
  avgDailyViews: number;

  // Best performing content
  bestPerformingPost?: {
    mediaId: string;
    likes: number;
    comments: number;
    engagementRate: number;
  };
  topHashtags?: Array<{
    hashtag: string;
    count: number;
    reach: number;
  }>;

  // Sentiment analysis
  sentimentBreakdown?: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  topKeywords?: Array<{
    keyword: string;
    count: number;
    sentiment: number;
  }>;
  responseRate: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface InstagramMonthlyAggregation {
  id: string;
  businessProfileId: string;

  // Month identification
  monthStartDate: Date;
  monthEndDate: Date;
  year: number;
  month: number;

  // Growth metrics
  followersGrowth: number;
  followersGrowthPercent: number;
  followingGrowth: number;
  followingGrowthPercent: number;
  mediaGrowth: number;

  // Engagement metrics
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalSaves: number;
  totalShares: number;

  // Average metrics
  avgDailyLikes: number;
  avgDailyComments: number;
  avgDailyViews: number;
  avgEngagementRate: number;

  // Content analysis
  totalPosts: number;
  totalStories: number;
  totalReels: number;
  bestPerformingContent?: any;

  // Sentiment analysis
  sentimentBreakdown?: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  topKeywords?: Array<{
    keyword: string;
    count: number;
    sentiment: number;
  }>;
  responseRate: number;

  // Trends
  growthTrend: "increasing" | "decreasing" | "stable";
  engagementTrend: "increasing" | "decreasing" | "stable";

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface InstagramSnapshotSchedule {
  id: string;
  businessProfileId: string;

  // Schedule configuration
  isActive: boolean;
  snapshotTime: string; // HH:MM:SS format
  timezone: string;

  // Retry configuration
  maxRetries: number;
  retryDelayMinutes: number;

  // Last execution
  lastExecutedAt?: Date;
  lastSuccessAt?: Date;
  consecutiveFailures: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// API REQUEST/RESPONSE TYPES
// ===========================================

export interface CreateInstagramProfileRequest {
  teamId: string;
  instagramUsername: string;
  snapshotTime?: string; // Optional custom snapshot time
  timezone?: string; // Optional timezone
}

export interface CreateInstagramProfileResponse {
  success: boolean;
  businessProfileId?: string;
  message?: string;
  error?: string;
}

export interface TakeSnapshotRequest {
  businessProfileId: string;
  snapshotType?: "DAILY" | "MANUAL" | "INITIAL";
  includeMedia?: boolean;
  includeComments?: boolean;
  maxMedia?: number;
  maxComments?: number;
}

export interface TakeSnapshotResponse {
  success: boolean;
  snapshotId?: string;
  snapshotDate?: string;
  metrics?: {
    followersCount: number;
    followingCount: number;
    mediaCount: number;
    totalLikes: number;
    totalComments: number;
  };
  error?: string;
}

export interface GetAnalyticsRequest {
  businessProfileId: string;
  period: "week" | "month" | "quarter" | "year";
  startDate?: string;
  endDate?: string;
}

export interface GetAnalyticsResponse {
  success: boolean;
  analytics?: {
    growth: {
      followersGrowth: number;
      followersGrowthPercent: number;
      followingGrowth: number;
      mediaGrowth: number;
    };
    engagement: {
      totalLikes: number;
      totalComments: number;
      avgEngagementRate: number;
    };
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
      topKeywords: Array<{ keyword: string; count: number }>;
    };
    trends: {
      growthTrend: string;
      engagementTrend: string;
    };
  };
  error?: string;
}

// ===========================================
// HIKERAPI RESPONSE TYPES
// ===========================================

export interface HikerAPIUserResponse {
  pk: string;
  username: string;
  full_name: string;
  biography?: string;
  external_url?: string;
  follower_count: number;
  following_count: number;
  media_count: number;
  is_verified: boolean;
  is_business: boolean;
  category?: string;
  business_contact_method?: string;
  contact_phone_number?: string;
  address_street?: string;
}

export interface HikerAPIMediaResponse {
  id: string;
  code: string;
  media_type: number; // 1=photo, 2=video, 8=carousel
  caption?: {
    text: string;
  };
  like_count: number;
  comment_count: number;
  view_count?: number;
  taken_at: number;
  location?: {
    pk: string;
    name: string;
    lat: number;
    lng: number;
  };
  hashtags?: Array<{
    name: string;
  }>;
  user_mentions?: Array<{
    username: string;
  }>;
}

export interface HikerAPICommentResponse {
  pk: string;
  text: string;
  created_at: number;
  comment_like_count: number;
  child_comment_count: number;
  user: {
    pk: string;
    username: string;
    profile_pic_url: string;
  };
}
