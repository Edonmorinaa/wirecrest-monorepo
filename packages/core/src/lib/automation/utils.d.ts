/**
 * Automation Utility Functions
 * Business logic utilities for automation operations
 */
import { AutomationConfig, AutomationStats, AutomationProfile, AutomationAction } from './types';
/**
 * Validate automation configuration
 */
export declare const validateAutomationConfig: (config: Partial<AutomationConfig>) => string[];
/**
 * Get default automation configuration for platform
 */
export declare const getDefaultAutomationConfig: (platform: string) => AutomationConfig;
/**
 * Check if automation is within limits
 */
export declare const isWithinLimits: (config: AutomationConfig, currentStats: AutomationStats, platform: string) => boolean;
/**
 * Calculate next automation action time
 */
export declare const calculateNextActionTime: (config: AutomationConfig, lastActionTime: Date) => Date;
/**
 * Check if automation should run based on schedule
 */
export declare const shouldRunAutomation: (config: AutomationConfig) => boolean;
/**
 * Calculate automation success rate
 */
export declare const calculateSuccessRate: (actions: AutomationAction[]) => number;
/**
 * Calculate automation error rate
 */
export declare const calculateErrorRate: (actions: AutomationAction[]) => number;
/**
 * Get automation recommendations
 */
export declare const getAutomationRecommendations: (config: AutomationConfig, stats: AutomationStats) => string[];
/**
 * Check if content is safe for automation
 */
export declare const isContentSafe: (content: string, config: AutomationConfig) => boolean;
/**
 * Get automation status summary
 */
export declare const getAutomationStatusSummary: (profiles: AutomationProfile[]) => {
    total: number;
    active: number;
    inactive: number;
    errorRate: number;
    successRate: number;
};
/**
 * Check if automation profile is healthy
 */
export declare const isProfileHealthy: (profile: AutomationProfile) => boolean;
/**
 * Get automation performance score
 */
export declare const getAutomationPerformanceScore: (profile: AutomationProfile) => number;
//# sourceMappingURL=utils.d.ts.map