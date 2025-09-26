/**
 * Automation Types and Interfaces
 * Business logic for automation features
 */

export interface AutomationConfig {
    enabled: boolean;
    schedule: {
      type: 'daily' | 'weekly' | 'custom';
      startTime: string;
      endTime: string;
      daysOfWeek: number[];
      intervalMinutes: number;
    };
    actions: {
      like: boolean;
      retweet: boolean;
      comment: boolean;
    };
    limits: {
      maxActionsPerDay: number;
      maxActionsPerProfile: number;
      cooldownMinutes: number;
    };
    targeting: {
      keywords: string[];
      excludeKeywords: string[];
      minFollowers: number;
      maxFollowers: number;
      languages: string[];
    };
    safety: {
      avoidControversialTopics: boolean;
      avoidPoliticalContent: boolean;
      avoidSpamAccounts: boolean;
      maxActionsPerHour: number;
    };
  }
  
  export interface AutomationSchedule {
    type: 'daily' | 'weekly' | 'custom';
    startTime: string;
    endTime: string;
    daysOfWeek: number[]; // 0-6, Sunday = 0
    intervalMinutes: number;
  }
  
  export interface AutomationActions {
    like: boolean;
    retweet: boolean;
    comment: boolean;
    follow: boolean;
    unfollow: boolean;
    share: boolean;
  }
  
  export interface AutomationLimits {
    maxActionsPerDay: number;
    maxActionsPerProfile: number;
    cooldownMinutes: number;
    maxActionsPerHour: number;
    maxFollowsPerDay: number;
    maxUnfollowsPerDay: number;
  }
  
  export interface AutomationTargeting {
    keywords: string[];
    excludeKeywords: string[];
    minFollowers: number;
    maxFollowers: number;
    languages: string[];
    locations: string[];
    interests: string[];
    hashtags: string[];
    mentions: string[];
  }
  
  export interface AutomationSafety {
    avoidControversialTopics: boolean;
    avoidPoliticalContent: boolean;
    avoidSpamAccounts: boolean;
    maxActionsPerHour: number;
    humanLikeBehavior: boolean;
    randomizeTiming: boolean;
    respectRateLimits: boolean;
  }
  
  export interface AutomationStats {
    totalProfiles: number;
    activeProfiles: number;
    totalActions: number;
    actionsToday: number;
    successRate: number;
    errorRate: number;
    lastActivity: Date;
    nextScheduledAction: Date;
  }
  
  export interface AutomationProfile {
    id: string;
    platform: string;
    username: string;
    isActive: boolean;
    lastAction: Date;
    actionsCount: number;
    successRate: number;
    errorCount: number;
    nextAction: Date;
    config: Partial<AutomationConfig>;
  }
  
  export interface AutomationAction {
    id: string;
    profileId: string;
    type: 'like' | 'retweet' | 'comment' | 'follow' | 'unfollow' | 'share';
    targetId: string;
    targetType: 'post' | 'user' | 'hashtag';
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    scheduledAt: Date;
    executedAt?: Date;
    error?: string;
    metadata?: Record<string, any>;
  }
  
  export interface AutomationReport {
    period: {
      start: Date;
      end: Date;
    };
    stats: AutomationStats;
    topPerformingProfiles: AutomationProfile[];
    topTargets: {
      id: string;
      type: string;
      actions: number;
      successRate: number;
    }[];
    errors: {
      type: string;
      count: number;
      lastOccurrence: Date;
    }[];
    recommendations: string[];
  }
  