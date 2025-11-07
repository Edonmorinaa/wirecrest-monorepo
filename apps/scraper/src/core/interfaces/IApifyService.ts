import { MarketPlatform } from "@prisma/client";

/**
 * Apify Service Interface
 * Follows Interface Segregation Principle (ISP) - clients depend only on interfaces they use
 */

export interface IApifyJob {
  id: string;
  platform: MarketPlatform;
  teamId: string;
  identifier: string;
  isInitialization: boolean;
  maxReviews?: number;
  priority: ApifyJobPriority;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: ApifyJobStatus;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

export enum ApifyJobPriority {
  HIGH = 1, // Initialization jobs
  MEDIUM = 2, // Polling jobs
  LOW = 3, // Manual jobs
}

export enum ApifyJobStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  RETRYING = "RETRYING",
  CANCELLED = "CANCELLED",
}

export interface IApifyJobResult {
  success: boolean;
  jobId: string;
  platform: MarketPlatform;
  reviewsProcessed: number;
  data?: any;
  error?: string;
  processingTimeMs: number;
}

export interface IApifyJobScheduler {
  scheduleJob(job: IApifyJob): Promise<void>;
  cancelJob(jobId: string): Promise<void>;
  getJobStatus(jobId: string): Promise<IApifyJob | null>;
  getJobsByTeam(teamId: string): Promise<IApifyJob[]>;
  getJobsByStatus(status: ApifyJobStatus): Promise<IApifyJob[]>;
  retryJob(jobId: string): Promise<void>;
}

export interface IApifyActor {
  actorId: string;
  platform: MarketPlatform;
  memoryEstimateMB: number;
  execute(input: any): Promise<IApifyJobResult>;
  validateInput(input: any): boolean;
  getMemoryEstimate(input: any): number;
}

export interface IApifyDataProcessor {
  processReviewData(rawData: any, platform: MarketPlatform): Promise<any>;
  validateReviewData(data: any): boolean;
  transformReviewData(data: any, platform: MarketPlatform): Promise<any>;
}

export interface IApifyService {
  // Job Management
  createJob(
    platform: MarketPlatform,
    teamId: string,
    identifier: string,
    options?: ApifyJobOptions,
  ): Promise<IApifyJob>;
  executeJob(job: IApifyJob): Promise<IApifyJobResult>;
  getJobStatus(jobId: string): Promise<IApifyJob | null>;
  cancelJob(jobId: string): Promise<void>;
  retryJob(jobId: string): Promise<void>;

  // Batch Operations
  executeBatchJobs(jobs: IApifyJob[]): Promise<IApifyJobResult[]>;
  scheduleBatchJobs(jobs: IApifyJob[]): Promise<void>;

  // Monitoring
  getActiveJobs(): Promise<IApifyJob[]>;
  getJobsByTeam(teamId: string): Promise<IApifyJob[]>;
  getJobsByPlatform(platform: MarketPlatform): Promise<IApifyJob[]>;
  getJobStatistics(): Promise<ApifyJobStatistics>;

  // Configuration
  setJobPriority(jobId: string, priority: ApifyJobPriority): Promise<void>;
  setMaxConcurrentJobs(maxJobs: number): void;
  setMemoryLimit(memoryLimitMB: number): void;
}

export interface ApifyJobOptions {
  isInitialization?: boolean;
  maxReviews?: number;
  priority?: ApifyJobPriority;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface ApifyJobStatistics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  runningJobs: number;
  pendingJobs: number;
  averageProcessingTimeMs: number;
  successRate: number;
  platformBreakdown: Record<MarketPlatform, number>;
}
