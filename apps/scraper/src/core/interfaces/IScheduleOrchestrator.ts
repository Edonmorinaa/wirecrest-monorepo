/**
 * Schedule Orchestrator Interface
 * Follows Interface Segregation Principle (ISP)
 * Manages scheduling operations across platforms
 */

export interface ScheduleConfig {
  platform: string;
  scheduleType: "reviews" | "overview";
  intervalHours: number;
  cronExpression: string;
  maxReviewsPerRun: number;
  identifiers: string[];
}

export interface ScheduleResult {
  success: boolean;
  message: string;
  scheduleId?: string;
  nextRun?: Date;
}

export interface BusinessScheduleMapping {
  businessProfileId: string;
  teamId: string;
  platform: string;
  identifier: string;
  intervalHours: number;
}

export interface IScheduleOrchestrator {
  /**
   * Add business to global schedule
   */
  addBusinessToSchedule(
    businessProfileId: string,
    teamId: string,
    platform: string,
    identifier: string,
    intervalHours: number,
  ): Promise<ScheduleResult>;

  /**
   * Remove business from schedule
   */
  removeBusinessFromSchedule(
    businessProfileId: string,
    platform: string,
  ): Promise<ScheduleResult>;

  /**
   * Move business between schedules (tier change)
   */
  moveBusinessBetweenSchedules(
    businessProfileId: string,
    platform: string,
    fromIntervalHours: number,
    toIntervalHours: number,
  ): Promise<ScheduleResult>;

  /**
   * Initialize global schedules for all platforms
   */
  initializeGlobalSchedules(): Promise<{
    success: boolean;
    schedulesCreated: number;
    message: string;
  }>;
}

export interface ISubscriptionOrchestrator {
  /**
   * Handle new subscription activation
   */
  handleNewSubscription(teamId: string): Promise<{
    success: boolean;
    message: string;
    initialTasksStarted: number;
    businessesAdded: number;
    profilesCreated: number;
  }>;

  /**
   * Handle subscription tier change
   */
  handleSubscriptionUpdate(teamId: string): Promise<{
    success: boolean;
    message: string;
    businessesMoved: number;
  }>;

  /**
   * Handle subscription cancellation
   */
  handleSubscriptionCancellation(teamId: string): Promise<{
    success: boolean;
    message: string;
    businessesRemoved: number;
  }>;

  /**
   * Handle new platform being added to subscription
   */
  handlePlatformAdded(
    teamId: string,
    platform: string,
    identifier: string,
  ): Promise<{
    success: boolean;
    message: string;
    initialTaskStarted: boolean;
    businessAdded: boolean;
  }>;
}
