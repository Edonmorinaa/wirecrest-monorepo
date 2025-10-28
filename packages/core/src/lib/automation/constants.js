"use strict";
/**
 * Automation Constants and Default Configurations
 * Business logic constants for automation features
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEDULE_PRESETS = exports.CONTENT_FILTERS = exports.SAFETY_RULES = exports.AUTOMATION_ERRORS = exports.AUTOMATION_STATUS = exports.AUTOMATION_ACTIONS = exports.PLATFORM_LIMITS = exports.DEFAULT_AUTOMATION_CONFIG = void 0;
// Default automation configuration
exports.DEFAULT_AUTOMATION_CONFIG = {
    enabled: false,
    schedule: {
        type: 'daily',
        startTime: '09:00',
        endTime: '18:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        intervalMinutes: 120,
    },
    actions: {
        like: true,
        retweet: false,
        comment: true,
    },
    limits: {
        maxActionsPerDay: 50,
        maxActionsPerProfile: 10,
        cooldownMinutes: 30,
    },
    targeting: {
        keywords: ['technology', 'AI', 'automation'],
        excludeKeywords: ['spam', 'advertisement'],
        minFollowers: 100,
        maxFollowers: 100000,
        languages: ['en'],
    },
    safety: {
        avoidControversialTopics: true,
        avoidPoliticalContent: true,
        avoidSpamAccounts: true,
        maxActionsPerHour: 5,
    },
};
// Automation limits by platform
exports.PLATFORM_LIMITS = {
    TWITTER: {
        maxActionsPerDay: 100,
        maxActionsPerHour: 10,
        cooldownMinutes: 15,
    },
    INSTAGRAM: {
        maxActionsPerDay: 50,
        maxActionsPerHour: 5,
        cooldownMinutes: 30,
    },
    TIKTOK: {
        maxActionsPerDay: 30,
        maxActionsPerHour: 3,
        cooldownMinutes: 60,
    },
    FACEBOOK: {
        maxActionsPerDay: 20,
        maxActionsPerHour: 2,
        cooldownMinutes: 120,
    },
};
// Automation action types
exports.AUTOMATION_ACTIONS = {
    LIKE: 'like',
    RETWEET: 'retweet',
    COMMENT: 'comment',
    FOLLOW: 'follow',
    UNFOLLOW: 'unfollow',
    SHARE: 'share',
};
// Automation status types
exports.AUTOMATION_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
};
// Automation error types
exports.AUTOMATION_ERRORS = {
    RATE_LIMIT: 'rate_limit',
    INVALID_TARGET: 'invalid_target',
    NETWORK_ERROR: 'network_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    PERMISSION_ERROR: 'permission_error',
    QUOTA_EXCEEDED: 'quota_exceeded',
    UNKNOWN: 'unknown',
};
// Automation safety rules
exports.SAFETY_RULES = {
    MIN_FOLLOWERS: 100,
    MAX_FOLLOWERS: 1000000,
    MIN_ACCOUNT_AGE_DAYS: 30,
    MAX_ACTIONS_PER_HOUR: 10,
    MAX_ACTIONS_PER_DAY: 100,
    COOLDOWN_MINUTES: 15,
    RANDOM_DELAY_MINUTES: 5,
};
// Automation keywords for content filtering
exports.CONTENT_FILTERS = {
    SPAM_KEYWORDS: [
        'spam', 'advertisement', 'promotion', 'buy now', 'click here',
        'free money', 'get rich', 'crypto', 'investment', 'guaranteed'
    ],
    POLITICAL_KEYWORDS: [
        'politics', 'election', 'vote', 'government', 'policy',
        'democrat', 'republican', 'liberal', 'conservative'
    ],
    CONTROVERSIAL_KEYWORDS: [
        'hate', 'violence', 'discrimination', 'racism', 'sexism',
        'harassment', 'bullying', 'threat', 'illegal'
    ],
    BUSINESS_KEYWORDS: [
        'business', 'entrepreneur', 'startup', 'innovation', 'technology',
        'marketing', 'sales', 'growth', 'success', 'leadership'
    ],
};
// Automation scheduling presets
exports.SCHEDULE_PRESETS = {
    BUSINESS_HOURS: {
        name: 'Business Hours',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    },
    EXTENDED_HOURS: {
        name: 'Extended Hours',
        startTime: '08:00',
        endTime: '20:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday to Saturday
    },
    WEEKEND_ONLY: {
        name: 'Weekend Only',
        startTime: '10:00',
        endTime: '18:00',
        daysOfWeek: [0, 6], // Sunday and Saturday
    },
    CUSTOM: {
        name: 'Custom',
        startTime: '00:00',
        endTime: '23:59',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
    },
};
//# sourceMappingURL=constants.js.map