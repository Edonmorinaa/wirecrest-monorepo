import { MarketPlatform } from "@prisma/client";

/**
 * Task Status Enum
 * Follows Single Responsibility Principle (SRP) - defines task statuses
 */
export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  RETRYING = "RETRYING",
}

/**
 * Task Step Enum
 * Follows Single Responsibility Principle (SRP) - defines task steps
 */
export enum TaskStep {
  CREATING_PROFILE = "CREATING_PROFILE",
  FETCHING_REVIEWS = "FETCHING_REVIEWS",
  PROCESSING_ANALYTICS = "PROCESSING_ANALYTICS",
  COMPLETED = "COMPLETED",
}

/**
 * Task Interface
 * Follows Single Responsibility Principle (SRP) - defines task structure
 */
export interface Task {
  id: string;
  teamId: string;
  platform: MarketPlatform;
  status: TaskStatus;
  currentStep?: TaskStep;
  identifier: string;
  totalSteps: number;
  completedSteps: number;
  progressPercent: number;
  startedAt?: Date;
  completedAt?: Date;
  lastActivityAt: Date;
  errorCount: number;
  lastError?: string;
  maxRetries: number;
  metadata?: Record<string, any>;
}

/**
 * Task Message Interface
 * Follows Single Responsibility Principle (SRP) - defines task message structure
 */
export interface TaskMessage {
  id: string;
  taskId: string;
  step: TaskStep;
  status: TaskStatus;
  message: string;
  messageType: "info" | "success" | "warning" | "error";
  progressPercent?: number;
  itemsProcessed?: number;
  totalItems?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Task Progress Update Interface
 * Follows Single Responsibility Principle (SRP) - defines progress update structure
 */
export interface TaskProgressUpdate {
  step: TaskStep;
  status: TaskStatus;
  message: string;
  messageType?: "info" | "success" | "warning" | "error";
  progressPercent?: number;
  itemsProcessed?: number;
  totalItems?: number;
  metadata?: Record<string, any>;
}

/**
 * Task Tracker Interface
 * Follows Interface Segregation Principle (ISP) - focused interface for task tracking
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export interface ITaskTracker {
  // Task Management
  createTask(
    teamId: string,
    platform: MarketPlatform,
    identifier: string,
  ): Promise<Task>;
  getTask(teamId: string, platform: MarketPlatform): Promise<Task | null>;
  updateTaskStatus(
    teamId: string,
    platform: MarketPlatform,
    status: TaskStatus,
  ): Promise<void>;
  deleteTask(teamId: string, platform: MarketPlatform): Promise<void>;

  // Step Management
  startStep(
    teamId: string,
    platform: MarketPlatform,
    step: TaskStep,
    message: string,
  ): Promise<void>;
  updateProgress(
    teamId: string,
    platform: MarketPlatform,
    update: TaskProgressUpdate,
  ): Promise<void>;
  completeStep(
    teamId: string,
    platform: MarketPlatform,
    step: TaskStep,
    message: string,
    result?: any,
  ): Promise<void>;
  failStep(
    teamId: string,
    platform: MarketPlatform,
    step: TaskStep,
    errorMessage: string,
  ): Promise<void>;

  // Message Management
  addMessage(
    teamId: string,
    platform: MarketPlatform,
    message: TaskMessage,
  ): Promise<void>;
  getMessages(
    teamId: string,
    platform: MarketPlatform,
    limit?: number,
  ): Promise<TaskMessage[]>;

  // Task Queries
  getTaskStatus(teamId: string, platform: MarketPlatform): Promise<Task | null>;
  getRecentMessages(
    teamId: string,
    platform: MarketPlatform,
    limit?: number,
  ): Promise<TaskMessage[]>;
  retryTask(teamId: string, platform: MarketPlatform): Promise<void>;
}
