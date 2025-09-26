/**
 * Automation Utility Functions
 * Business logic utilities for automation operations
 */

import { AutomationConfig, AutomationStats, AutomationProfile, AutomationAction } from './types';
import { DEFAULT_AUTOMATION_CONFIG, PLATFORM_LIMITS, AUTOMATION_ACTIONS, AUTOMATION_STATUS } from './constants';

/**
 * Validate automation configuration
 */
export const validateAutomationConfig = (config: Partial<AutomationConfig>): string[] => {
  const errors: string[] = [];

  if (config.schedule) {
    if (config.schedule.startTime && config.schedule.endTime) {
      const start = new Date(`2000-01-01T${config.schedule.startTime}`);
      const end = new Date(`2000-01-01T${config.schedule.endTime}`);
      
      if (start >= end) {
        errors.push('Start time must be before end time');
      }
    }

    if (config.schedule.intervalMinutes && config.schedule.intervalMinutes < 5) {
      errors.push('Interval must be at least 5 minutes');
    }

    if (config.schedule.daysOfWeek && config.schedule.daysOfWeek.length === 0) {
      errors.push('At least one day must be selected');
    }
  }

  if (config.limits) {
    if (config.limits.maxActionsPerDay && config.limits.maxActionsPerDay < 1) {
      errors.push('Max actions per day must be at least 1');
    }

    if (config.safety?.maxActionsPerHour && config.safety.maxActionsPerHour < 1) {
      errors.push('Max actions per hour must be at least 1');
    }

    if (config.limits.cooldownMinutes && config.limits.cooldownMinutes < 1) {
      errors.push('Cooldown must be at least 1 minute');
    }
  }

  if (config.targeting) {
    if (config.targeting.minFollowers && config.targeting.maxFollowers) {
      if (config.targeting.minFollowers > config.targeting.maxFollowers) {
        errors.push('Min followers cannot be greater than max followers');
      }
    }
  }

  return errors;
};

/**
 * Get default automation configuration for platform
 */
export const getDefaultAutomationConfig = (platform: string): AutomationConfig => {
  const config = { ...DEFAULT_AUTOMATION_CONFIG };
  
  // Apply platform-specific limits
  const platformLimits = PLATFORM_LIMITS[platform.toUpperCase() as keyof typeof PLATFORM_LIMITS];
  if (platformLimits) {
    config.limits = {
      ...config.limits,
      ...platformLimits,
    };
  }

  return config;
};

/**
 * Check if automation is within limits
 */
export const isWithinLimits = (
  config: AutomationConfig,
  currentStats: AutomationStats,
  platform: string
): boolean => {
  const platformLimits = PLATFORM_LIMITS[platform.toUpperCase() as keyof typeof PLATFORM_LIMITS];
  
  if (!platformLimits) {
    return true;
  }

  // Check daily limits
  if (currentStats.actionsToday >= config.limits.maxActionsPerDay) {
    return false;
  }

  // Check hourly limits
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentActions = currentStats.totalActions; // This would need to be calculated from actual data
  
  if (recentActions >= config.safety.maxActionsPerHour) {
    return false;
  }

  return true;
};

/**
 * Calculate next automation action time
 */
export const calculateNextActionTime = (
  config: AutomationConfig,
  lastActionTime: Date
): Date => {
  const cooldownMs = config.limits.cooldownMinutes * 60 * 1000;
  const randomDelayMs = Math.random() * 5 * 60 * 1000; // 0-5 minutes random delay
  
  return new Date(lastActionTime.getTime() + cooldownMs + randomDelayMs);
};

/**
 * Check if automation should run based on schedule
 */
export const shouldRunAutomation = (config: AutomationConfig): boolean => {
  if (!config.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Check if current day is in schedule
  if (!config.schedule.daysOfWeek.includes(currentDay)) {
    return false;
  }

  // Check if current time is within schedule
  if (currentTime < config.schedule.startTime || currentTime > config.schedule.endTime) {
    return false;
  }

  return true;
};

/**
 * Calculate automation success rate
 */
export const calculateSuccessRate = (actions: AutomationAction[]): number => {
  if (actions.length === 0) {
    return 0;
  }

  const completedActions = actions.filter(action => action.status === AUTOMATION_STATUS.COMPLETED);
  return (completedActions.length / actions.length) * 100;
};

/**
 * Calculate automation error rate
 */
export const calculateErrorRate = (actions: AutomationAction[]): number => {
  if (actions.length === 0) {
    return 0;
  }

  const failedActions = actions.filter(action => action.status === AUTOMATION_STATUS.FAILED);
  return (failedActions.length / actions.length) * 100;
};

/**
 * Get automation recommendations
 */
export const getAutomationRecommendations = (
  config: AutomationConfig,
  stats: AutomationStats
): string[] => {
  const recommendations: string[] = [];

  if (stats.successRate < 80) {
    recommendations.push('Consider improving targeting criteria to increase success rate');
  }

  if (stats.errorRate > 20) {
    recommendations.push('High error rate detected. Check automation configuration and platform limits');
  }

  if (config.limits.maxActionsPerDay > 100) {
    recommendations.push('High daily action limit may trigger rate limits');
  }

  // Note: humanLikeBehavior and randomizeTiming are not in the current AutomationConfig interface
  // These would need to be added to the interface if needed

  return recommendations;
};

/**
 * Check if content is safe for automation
 */
export const isContentSafe = (content: string, config: AutomationConfig): boolean => {
  if (!config.safety.avoidControversialTopics && !config.safety.avoidPoliticalContent) {
    return true;
  }

  const lowerContent = content.toLowerCase();
  
  // Check for controversial topics
  if (config.safety.avoidControversialTopics) {
    const controversialKeywords = ['hate', 'violence', 'discrimination', 'racism', 'sexism'];
    if (controversialKeywords.some(keyword => lowerContent.includes(keyword))) {
      return false;
    }
  }

  // Check for political content
  if (config.safety.avoidPoliticalContent) {
    const politicalKeywords = ['politics', 'election', 'vote', 'government', 'policy'];
    if (politicalKeywords.some(keyword => lowerContent.includes(keyword))) {
      return false;
    }
  }

  return true;
};

/**
 * Get automation status summary
 */
export const getAutomationStatusSummary = (profiles: AutomationProfile[]): {
  total: number;
  active: number;
  inactive: number;
  errorRate: number;
  successRate: number;
} => {
  const total = profiles.length;
  const active = profiles.filter(p => p.isActive).length;
  const inactive = total - active;
  
  const allActions = profiles.flatMap(p => []); // This would need actual action data
  const errorRate = calculateErrorRate(allActions);
  const successRate = calculateSuccessRate(allActions);

  return {
    total,
    active,
    inactive,
    errorRate,
    successRate,
  };
};

/**
 * Check if automation profile is healthy
 */
export const isProfileHealthy = (profile: AutomationProfile): boolean => {
  return profile.isActive && 
         profile.successRate > 80 && 
         profile.errorCount < 5;
};

/**
 * Get automation performance score
 */
export const getAutomationPerformanceScore = (profile: AutomationProfile): number => {
  let score = 0;
  
  // Base score for active profile
  if (profile.isActive) {
    score += 40;
  }
  
  // Success rate contribution
  score += (profile.successRate / 100) * 40;
  
  // Error penalty
  score -= Math.min(profile.errorCount * 5, 20);
  
  // Action frequency bonus
  if (profile.actionsCount > 0) {
    score += Math.min(profile.actionsCount / 10, 20);
  }
  
  return Math.max(0, Math.min(100, score));
};
