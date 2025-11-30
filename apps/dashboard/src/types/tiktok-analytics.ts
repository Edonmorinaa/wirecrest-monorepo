// TikTok Analytics Types
// Based on actual database schema from Prisma

export interface TikTokDailySnapshot {
  id: string;
  businessProfileId: string;
  snapshotDate: Date;
  snapshotTime: Date;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalShares: number;
  totalDownloads: number;
  newVideos: number;
  newLikes: number;
  newComments: number;
  newViews: number;
  newShares: number;
  newDownloads: number;
  engagementRate: number;
  avgLikesPerVideo: number;
  avgCommentsPerVideo: number;
  avgViewsPerVideo: number;
  avgSharesPerVideo: number;
  avgDownloadsPerVideo: number;
  commentsRatio: number;
  followersRatio: number;
  followersGrowth: number;
  followingGrowth: number;
  videoGrowth: number;
  weeklyFollowersGrowth: number;
  monthlyFollowersGrowth: number;
  hasErrors: boolean;
  errorMessage?: string;
  snapshotType: 'DAILY' | 'MANUAL' | 'INITIAL';
}

export interface TikTokAnalytics {
  id: string;
  businessProfileId: string;
  date: Date;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  followersGrowthRate90d: number;
  steadyGrowthRate: number;
  dailyFollowersGrowth: number;
  weeklyFollowersGrowth: number;
  monthlyFollowersGrowth: number;
  engagementRate: number;
  weeklyEngagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  avgShares: number;
  avgDownloads: number;
  commentsRatio: number;
  followersRatio: number;
  predictedFollowers?: number;
  growthTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  calculatedAt: Date;
  updatedAt: Date;
}

export interface TikTokBusinessProfile {
  id: string;
  locationId: string;
  username: string;
  nickname?: string;
  avatarUrl?: string;
  signature?: string;
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
  lastSnapshotAt?: Date;
  totalSnapshots: number;
  firstSnapshotAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  dailySnapshots?: TikTokDailySnapshot[];
  snapshotSchedule?: any;
}

// Chart Data Point Interface
export interface ChartDataPoint {
  date: string;
  value: number;
}

// Analytics Data Interfaces
export interface GeneralMetrics {
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
  videos: {
    count: number;
    delta: number;
  };
  hearts: {
    count: number;
    delta: number;
  };
  diggs: {
    count: number;
    delta: number;
  };
}

export interface OverviewMetrics {
  followersGrowthRate90d: number;
  weeklyFollowers: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  avgShares: number;
  avgDownloads: number;
  weeklyVideos: number;
  followersRatio: number;
  commentsRatio: number;
  followersChart: ChartDataPoint[];
  followingChart: ChartDataPoint[];
  engagementRateChart: ChartDataPoint[];
  avgLikesChart: ChartDataPoint[];
  avgViewsChart: ChartDataPoint[];
}

export interface GrowthMetrics {
  followersGrowthRate90d: number;
  steadyGrowthRate: number;
  dailyFollowers: number;
  weeklyFollowers: number;
  monthlyFollowers: number;
  followersChart: ChartDataPoint[];
  followingChart: ChartDataPoint[];
  newDailyFollowersChart: ChartDataPoint[];
  predictedFollowersChart: ChartDataPoint[];
}

export interface EngagementMetrics {
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  avgShares: number;
  avgDownloads: number;
  weeklyEngagementRate: number;
  weeklyVideos: number;
  commentsRatio: number;
  engagementRateChart: ChartDataPoint[];
  avgLikesChart: ChartDataPoint[];
  avgViewsChart: ChartDataPoint[];
  weeklyEngagementRateChart: ChartDataPoint[];
  weeklyVideosChart: ChartDataPoint[];
  avgCommentsChart: ChartDataPoint[];
  avgSharesChart: ChartDataPoint[];
  avgDownloadsChart: ChartDataPoint[];
  commentsRatioChart: ChartDataPoint[];
}

export interface HistoryDataPoint {
  date: string;
  followerCount: number;
  followersDelta: number;
  followingCount: number;
  followingDelta: number;
  videoCount: number;
  videoDelta: number;
  engagementRate: number;
  engagementRateDelta: number;
}

export interface TikTokAnalyticsData {
  general: GeneralMetrics | null;
  overview: OverviewMetrics | null;
  growth: GrowthMetrics | null;
  engagement: EngagementMetrics | null;
  history: HistoryDataPoint[];
}

// Service Response Types
export interface AnalyticsServiceResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
  error?: string;
}

// Calculation Result Types
export interface CalculationResult<T> {
  data: T;
  isValid: boolean;
  errors: string[];
}
