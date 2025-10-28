"use strict";
/**
 * Automation Utility Functions
 * Business logic utilities for automation operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAutomationPerformanceScore = exports.isProfileHealthy = exports.getAutomationStatusSummary = exports.isContentSafe = exports.getAutomationRecommendations = exports.calculateErrorRate = exports.calculateSuccessRate = exports.shouldRunAutomation = exports.calculateNextActionTime = exports.isWithinLimits = exports.getDefaultAutomationConfig = exports.validateAutomationConfig = void 0;
const constants_1 = require("./constants");
/**
 * Validate automation configuration
 */
const validateAutomationConfig = (config) => {
    const errors = [];
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
exports.validateAutomationConfig = validateAutomationConfig;
/**
 * Get default automation configuration for platform
 */
const getDefaultAutomationConfig = (platform) => {
    const config = { ...constants_1.DEFAULT_AUTOMATION_CONFIG };
    // Apply platform-specific limits
    const platformLimits = constants_1.PLATFORM_LIMITS[platform.toUpperCase()];
    if (platformLimits) {
        config.limits = {
            ...config.limits,
            ...platformLimits,
        };
    }
    return config;
};
exports.getDefaultAutomationConfig = getDefaultAutomationConfig;
/**
 * Check if automation is within limits
 */
const isWithinLimits = (config, currentStats, platform) => {
    const platformLimits = constants_1.PLATFORM_LIMITS[platform.toUpperCase()];
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
exports.isWithinLimits = isWithinLimits;
/**
 * Calculate next automation action time
 */
const calculateNextActionTime = (config, lastActionTime) => {
    const cooldownMs = config.limits.cooldownMinutes * 60 * 1000;
    const randomDelayMs = Math.random() * 5 * 60 * 1000; // 0-5 minutes random delay
    return new Date(lastActionTime.getTime() + cooldownMs + randomDelayMs);
};
exports.calculateNextActionTime = calculateNextActionTime;
/**
 * Check if automation should run based on schedule
 */
const shouldRunAutomation = (config) => {
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
exports.shouldRunAutomation = shouldRunAutomation;
/**
 * Calculate automation success rate
 */
const calculateSuccessRate = (actions) => {
    if (actions.length === 0) {
        return 0;
    }
    const completedActions = actions.filter(action => action.status === constants_1.AUTOMATION_STATUS.COMPLETED);
    return (completedActions.length / actions.length) * 100;
};
exports.calculateSuccessRate = calculateSuccessRate;
/**
 * Calculate automation error rate
 */
const calculateErrorRate = (actions) => {
    if (actions.length === 0) {
        return 0;
    }
    const failedActions = actions.filter(action => action.status === constants_1.AUTOMATION_STATUS.FAILED);
    return (failedActions.length / actions.length) * 100;
};
exports.calculateErrorRate = calculateErrorRate;
/**
 * Get automation recommendations
 */
const getAutomationRecommendations = (config, stats) => {
    const recommendations = [];
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
exports.getAutomationRecommendations = getAutomationRecommendations;
/**
 * Check if content is safe for automation
 */
const isContentSafe = (content, config) => {
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
exports.isContentSafe = isContentSafe;
/**
 * Get automation status summary
 */
const getAutomationStatusSummary = (profiles) => {
    const total = profiles.length;
    const active = profiles.filter(p => p.isActive).length;
    const inactive = total - active;
    const allActions = profiles.flatMap(p => []); // This would need actual action data
    const errorRate = (0, exports.calculateErrorRate)(allActions);
    const successRate = (0, exports.calculateSuccessRate)(allActions);
    return {
        total,
        active,
        inactive,
        errorRate,
        successRate,
    };
};
exports.getAutomationStatusSummary = getAutomationStatusSummary;
/**
 * Check if automation profile is healthy
 */
const isProfileHealthy = (profile) => {
    return profile.isActive &&
        profile.successRate > 80 &&
        profile.errorCount < 5;
};
exports.isProfileHealthy = isProfileHealthy;
/**
 * Get automation performance score
 */
const getAutomationPerformanceScore = (profile) => {
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
exports.getAutomationPerformanceScore = getAutomationPerformanceScore;
//# sourceMappingURL=utils.js.map