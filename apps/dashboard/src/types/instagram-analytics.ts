// Instagram Analytics Types
// Based on actual database schema from Prisma

export interface InstagramDailySnapshot {
  id: string;
  businessProfileId: string;
  snapshotDate: Date;
  snapshotTime: Date;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalSaves: number;
  totalShares: number;
  newPosts: number;
  newStories: number;
  newReels: number;
  storyViews: number;
  storyReplies: number;
  engagementRate: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  commentsRatio: number;
  followersRatio: number;
  followersGrowth: number;
  followingGrowth: number;
  mediaGrowth: number;
  weeklyFollowersGrowth: number;
  monthlyFollowersGrowth: number;
  hasErrors: boolean;
  errorMessage?: string;
  snapshotType: 'DAILY' | 'MANUAL' | 'INITIAL';
}

export interface InstagramAnalytics {
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
  commentsRatio: number;
  weeklyPosts: number;
  followersRatio: number;
  predictedFollowers?: number;
  growthTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  calculatedAt: Date;
  updatedAt: Date;
}

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
  currentFollowersCount?: number;
  currentFollowingCount?: number;
  currentMediaCount?: number;
  firstSnapshotAt?: Date;
  lastSnapshotAt?: Date;
  totalSnapshots: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  contactAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
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
  posts: {
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
  weeklyPosts: number;
  followersRatio: number;
  commentsRatio: number;
  followersChart: ChartDataPoint[];
  followingChart: ChartDataPoint[];
  engagementRateChart: ChartDataPoint[];
  avgLikesChart: ChartDataPoint[];
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
  weeklyEngagementRate: number;
  weeklyPosts: number;
  avgComments: number;
  commentsRatio: number;
  engagementRateChart: ChartDataPoint[];
  avgLikesChart: ChartDataPoint[];
  weeklyEngagementRateChart: ChartDataPoint[];
  weeklyPostsChart: ChartDataPoint[];
  avgCommentsChart: ChartDataPoint[];
  commentsRatioChart: ChartDataPoint[];
}

export interface HistoryDataPoint {
  date: string;
  followersCount: number;
  followersDelta: number;
  followingCount: number;
  followingDelta: number;
  mediaCount: number;
  mediaDelta: number;
  engagementRate: number;
  engagementRateDelta: number;
}

export interface InstagramAnalyticsData {
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
