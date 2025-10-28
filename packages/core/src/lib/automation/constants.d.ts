/**
 * Automation Constants and Default Configurations
 * Business logic constants for automation features
 */
import { AutomationConfig } from './types';
export declare const DEFAULT_AUTOMATION_CONFIG: AutomationConfig;
export declare const PLATFORM_LIMITS: {
    readonly TWITTER: {
        readonly maxActionsPerDay: 100;
        readonly maxActionsPerHour: 10;
        readonly cooldownMinutes: 15;
    };
    readonly INSTAGRAM: {
        readonly maxActionsPerDay: 50;
        readonly maxActionsPerHour: 5;
        readonly cooldownMinutes: 30;
    };
    readonly TIKTOK: {
        readonly maxActionsPerDay: 30;
        readonly maxActionsPerHour: 3;
        readonly cooldownMinutes: 60;
    };
    readonly FACEBOOK: {
        readonly maxActionsPerDay: 20;
        readonly maxActionsPerHour: 2;
        readonly cooldownMinutes: 120;
    };
};
export declare const AUTOMATION_ACTIONS: {
    readonly LIKE: "like";
    readonly RETWEET: "retweet";
    readonly COMMENT: "comment";
    readonly FOLLOW: "follow";
    readonly UNFOLLOW: "unfollow";
    readonly SHARE: "share";
};
export declare const AUTOMATION_STATUS: {
    readonly PENDING: "pending";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly CANCELLED: "cancelled";
};
export declare const AUTOMATION_ERRORS: {
    readonly RATE_LIMIT: "rate_limit";
    readonly INVALID_TARGET: "invalid_target";
    readonly NETWORK_ERROR: "network_error";
    readonly AUTHENTICATION_ERROR: "authentication_error";
    readonly PERMISSION_ERROR: "permission_error";
    readonly QUOTA_EXCEEDED: "quota_exceeded";
    readonly UNKNOWN: "unknown";
};
export declare const SAFETY_RULES: {
    readonly MIN_FOLLOWERS: 100;
    readonly MAX_FOLLOWERS: 1000000;
    readonly MIN_ACCOUNT_AGE_DAYS: 30;
    readonly MAX_ACTIONS_PER_HOUR: 10;
    readonly MAX_ACTIONS_PER_DAY: 100;
    readonly COOLDOWN_MINUTES: 15;
    readonly RANDOM_DELAY_MINUTES: 5;
};
export declare const CONTENT_FILTERS: {
    readonly SPAM_KEYWORDS: readonly ["spam", "advertisement", "promotion", "buy now", "click here", "free money", "get rich", "crypto", "investment", "guaranteed"];
    readonly POLITICAL_KEYWORDS: readonly ["politics", "election", "vote", "government", "policy", "democrat", "republican", "liberal", "conservative"];
    readonly CONTROVERSIAL_KEYWORDS: readonly ["hate", "violence", "discrimination", "racism", "sexism", "harassment", "bullying", "threat", "illegal"];
    readonly BUSINESS_KEYWORDS: readonly ["business", "entrepreneur", "startup", "innovation", "technology", "marketing", "sales", "growth", "success", "leadership"];
};
export declare const SCHEDULE_PRESETS: {
    readonly BUSINESS_HOURS: {
        readonly name: "Business Hours";
        readonly startTime: "09:00";
        readonly endTime: "17:00";
        readonly daysOfWeek: readonly [1, 2, 3, 4, 5];
    };
    readonly EXTENDED_HOURS: {
        readonly name: "Extended Hours";
        readonly startTime: "08:00";
        readonly endTime: "20:00";
        readonly daysOfWeek: readonly [1, 2, 3, 4, 5, 6];
    };
    readonly WEEKEND_ONLY: {
        readonly name: "Weekend Only";
        readonly startTime: "10:00";
        readonly endTime: "18:00";
        readonly daysOfWeek: readonly [0, 6];
    };
    readonly CUSTOM: {
        readonly name: "Custom";
        readonly startTime: "00:00";
        readonly endTime: "23:59";
        readonly daysOfWeek: readonly [0, 1, 2, 3, 4, 5, 6];
    };
};
//# sourceMappingURL=constants.d.ts.map