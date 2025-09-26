import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { MarketPlatform } from '@prisma/client';

export enum BusinessCreationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

export enum BusinessCreationStep {
  CREATING_IDENTIFIER = 'CREATING_IDENTIFIER',
  CREATING_PROFILE = 'CREATING_PROFILE',
  FETCHING_REVIEWS = 'FETCHING_REVIEWS',
  FETCHING_SNAPSHOTS = 'FETCHING_SNAPSHOTS',
  CREATING_OVERVIEW = 'CREATING_OVERVIEW',
  CREATING_METADATA = 'CREATING_METADATA'
}

export enum PlatformType {
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  TRIPADVISOR = 'TRIPADVISOR',
  BOOKING = 'BOOKING',
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK'
}

export interface BusinessCreationTask {
  id: string;
  teamId: string;
  platform: PlatformType;
  status: BusinessCreationStatus;
  currentStep?: BusinessCreationStep;
  googlePlaceId?: string;
  facebookUrl?: string;
  tripAdvisorUrl?: string;
  bookingUrl?: string;
  instagramUsername?: string;
  tiktokUsername?: string;
  totalSteps: number;
  completedSteps: number;
  progressPercent: number;
  startedAt?: Date;
  completedAt?: Date;
  lastActivityAt: Date;
  errorCount: number;
  lastError?: string;
  maxRetries: number;
}

export interface BusinessStatusMessage {
  id: string;
  businessCreationId: string;
  step: BusinessCreationStep;
  status: BusinessCreationStatus;
  message: string;
  messageType: string;
  progressPercent?: number;
  itemsProcessed?: number;
  totalItems?: number;
  metadata?: any;
  timestamp: Date;
}

export interface BusinessCreationStepLog {
  id: string;
  businessCreationId: string;
  step: BusinessCreationStep;
  status: BusinessCreationStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  result?: any;
  retryAttempt: number;
}

export interface TaskProgressUpdate {
  step: BusinessCreationStep;
  status: BusinessCreationStatus;
  message: string;
  messageType?: 'info' | 'success' | 'warning' | 'error';
  progressPercent?: number;
  itemsProcessed?: number;
  totalItems?: number;
  metadata?: any;
}

export class BusinessTaskTracker {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Convert MarketPlatform to PlatformType
   */
  private mapPlatformType(platform: MarketPlatform): PlatformType {
    switch (platform) {
      case MarketPlatform.GOOGLE_MAPS:
        return PlatformType.GOOGLE;
      case MarketPlatform.FACEBOOK:
        return PlatformType.FACEBOOK;
      case MarketPlatform.TRIPADVISOR:
        return PlatformType.TRIPADVISOR;
      case MarketPlatform.BOOKING:
        return PlatformType.BOOKING;
      case MarketPlatform.INSTAGRAM:
        return PlatformType.INSTAGRAM;
      case MarketPlatform.TIKTOK:
        return PlatformType.TIKTOK;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Find or create a business creation task
   */
  async findOrCreateTask(
    teamId: string,
    platform: MarketPlatform,
    identifier: string
  ): Promise<BusinessCreationTask> {
    const platformType = this.mapPlatformType(platform);
    
    // Try to find existing task
    const { data: existingTask, error: findError } = await this.supabase
      .from('BusinessCreationTask')
      .select('*')
      .eq('teamId', teamId)
      .eq('platform', platformType)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      throw new Error(`Failed to find task: ${findError.message}`);
    }

    if (existingTask) {
      return existingTask as BusinessCreationTask;
    }

    // Create new task
    const taskData: Partial<BusinessCreationTask> = {
      id: randomUUID(),
      teamId,
      platform: platformType,
      status: BusinessCreationStatus.PENDING,
      totalSteps: platform === MarketPlatform.INSTAGRAM ? 3 : 4, // Instagram has fewer steps
      completedSteps: 0,
      progressPercent: 0,
      errorCount: 0,
      maxRetries: 3,
      lastActivityAt: new Date()
    };

    // Set platform-specific identifier
    if (platform === MarketPlatform.GOOGLE_MAPS) {
      taskData.googlePlaceId = identifier;
    } else if (platform === MarketPlatform.FACEBOOK) {
      taskData.facebookUrl = identifier;
    } else if (platform === MarketPlatform.TRIPADVISOR) {
      taskData.tripAdvisorUrl = identifier;
    } else if (platform === MarketPlatform.BOOKING) {
      taskData.bookingUrl = identifier;
    } else if (platform === MarketPlatform.INSTAGRAM) {
      taskData.instagramUsername = identifier;
    }

    const { data: newTask, error: createError } = await this.supabase
      .from('BusinessCreationTask')
      .insert(taskData)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create task: ${createError.message}`);
    }

    return newTask as BusinessCreationTask;
  }

  /**
   * Start a specific step for a task
   */
  async startStep(
    teamId: string,
    platform: MarketPlatform,
    step: BusinessCreationStep,
    message: string
  ): Promise<void> {
    const platformType = this.mapPlatformType(platform);

    try {
      // Update main task
      const { error: updateError } = await this.supabase
        .from('BusinessCreationTask')
        .update({
          status: BusinessCreationStatus.IN_PROGRESS,
          currentStep: step,
          lastActivityAt: new Date(),
          startedAt: new Date() // Will be overridden if already set
        })
        .eq('teamId', teamId)
        .eq('platform', platformType);

      if (updateError) {
        throw new Error(`Failed to update task: ${updateError.message}`);
      }

      // Get task ID for related records
      const { data: task, error: getError } = await this.supabase
        .from('BusinessCreationTask')
        .select('id')
        .eq('teamId', teamId)
        .eq('platform', platformType)
        .single();

      if (getError || !task) {
        throw new Error(`Failed to get task ID: ${getError?.message}`);
      }

      // Create step log
      const { error: logError } = await this.supabase
        .from('BusinessCreationStepLog')
        .insert({
          id: randomUUID(),
          businessCreationId: task.id,
          step,
          status: BusinessCreationStatus.IN_PROGRESS,
          startedAt: new Date(),
          success: false,
          retryAttempt: 0
        });

      if (logError) {
        console.error('Failed to create step log:', logError);
      }

      // Create status message
      await this.addStatusMessage(task.id, {
        step,
        status: BusinessCreationStatus.IN_PROGRESS,
        message,
        messageType: 'info'
      });

    } catch (error) {
      console.error(`Failed to start step ${step}:`, error);
      throw error;
    }
  }

  /**
   * Update progress during step execution
   */
  async updateProgress(
    teamId: string,
    platform: MarketPlatform,
    update: TaskProgressUpdate
  ): Promise<void> {
    const platformType = this.mapPlatformType(platform);

    try {
      // Get task ID
      const { data: task, error: getError } = await this.supabase
        .from('BusinessCreationTask')
        .select('id')
        .eq('teamId', teamId)
        .eq('platform', platformType)
        .single();

      if (getError || !task) {
        console.error(`Failed to get task for progress update: ${getError?.message}`);
        return;
      }

      // Update last activity
      const { error: updateError } = await this.supabase
        .from('BusinessCreationTask')
        .update({
          lastActivityAt: new Date()
        })
        .eq('id', task.id);

      if (updateError) {
        console.error('Failed to update task activity:', updateError);
      }

      // Add status message
      await this.addStatusMessage(task.id, update);

    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }

  /**
   * Complete a step successfully
   */
  async completeStep(
    teamId: string,
    platform: MarketPlatform,
    step: BusinessCreationStep,
    message: string,
    result?: any
  ): Promise<void> {
    const platformType = this.mapPlatformType(platform);

    try {
      // Get current task
      const { data: task, error: getError } = await this.supabase
        .from('BusinessCreationTask')
        .select('*')
        .eq('teamId', teamId)
        .eq('platform', platformType)
        .single();

      if (getError || !task) {
        throw new Error(`Failed to get task: ${getError?.message}`);
      }

      const newCompletedSteps = task.completedSteps + 1;
      const newProgressPercent = (newCompletedSteps * 100.0) / task.totalSteps;
      const isFullyComplete = newCompletedSteps >= task.totalSteps;

      // Update main task
      const { error: updateError } = await this.supabase
        .from('BusinessCreationTask')
        .update({
          status: isFullyComplete ? BusinessCreationStatus.COMPLETED : BusinessCreationStatus.IN_PROGRESS,
          currentStep: step,
          completedSteps: newCompletedSteps,
          progressPercent: newProgressPercent,
          completedAt: isFullyComplete ? new Date() : null,
          lastActivityAt: new Date()
        })
        .eq('id', task.id);

      if (updateError) {
        throw new Error(`Failed to update task: ${updateError.message}`);
      }

      // Complete step log
      const { error: logError } = await this.supabase
        .from('BusinessCreationStepLog')
        .update({
          status: BusinessCreationStatus.COMPLETED,
          completedAt: new Date(),
          success: true,
          result: result || null
        })
        .eq('businessCreationId', task.id)
        .eq('step', step)
        .is('completedAt', null);

      if (logError) {
        console.error('Failed to complete step log:', logError);
      }

      // Create success message
      await this.addStatusMessage(task.id, {
        step,
        status: BusinessCreationStatus.COMPLETED,
        message,
        messageType: 'success',
        progressPercent: 100.0
      });

    } catch (error) {
      console.error(`Failed to complete step ${step}:`, error);
      throw error;
    }
  }

  /**
   * Mark a step as failed
   */
  async failStep(
    teamId: string,
    platform: MarketPlatform,
    step: BusinessCreationStep,
    errorMessage: string
  ): Promise<void> {
    const platformType = this.mapPlatformType(platform);

    try {
      // Get task
      const { data: task, error: getError } = await this.supabase
        .from('BusinessCreationTask')
        .select('*')
        .eq('teamId', teamId)
        .eq('platform', platformType)
        .single();

      if (getError || !task) {
        throw new Error(`Failed to get task: ${getError?.message}`);
      }

      const newErrorCount = task.errorCount + 1;
      const shouldRetry = newErrorCount <= task.maxRetries;

      // Update main task
      const { error: updateError } = await this.supabase
        .from('BusinessCreationTask')
        .update({
          status: shouldRetry ? BusinessCreationStatus.RETRYING : BusinessCreationStatus.FAILED,
          lastError: errorMessage,
          errorCount: newErrorCount,
          lastActivityAt: new Date()
        })
        .eq('id', task.id);

      if (updateError) {
        throw new Error(`Failed to update task: ${updateError.message}`);
      }

      // Complete step log with error
      const { error: logError } = await this.supabase
        .from('BusinessCreationStepLog')
        .update({
          status: BusinessCreationStatus.FAILED,
          completedAt: new Date(),
          success: false,
          errorMessage
        })
        .eq('businessCreationId', task.id)
        .eq('step', step)
        .is('completedAt', null);

      if (logError) {
        console.error('Failed to update step log:', logError);
      }

      // Create error message
      await this.addStatusMessage(task.id, {
        step,
        status: shouldRetry ? BusinessCreationStatus.RETRYING : BusinessCreationStatus.FAILED,
        message: errorMessage,
        messageType: 'error'
      });

      // Log retry information
      if (shouldRetry) {
        console.log(`🔄 Task will retry (${newErrorCount}/${task.maxRetries}): ${errorMessage}`);
      } else {
        console.log(`❌ Task failed permanently after ${task.maxRetries} retries: ${errorMessage}`);
      }

    } catch (error) {
      console.error(`Failed to fail step ${step}:`, error);
      throw error;
    }
  }

  /**
   * Add a status message
   */
  private async addStatusMessage(
    businessCreationId: string,
    update: TaskProgressUpdate
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('BusinessStatusMessage')
        .insert({
          id: randomUUID(),
          businessCreationId,
          step: update.step,
          status: update.status,
          message: update.message,
          messageType: update.messageType || 'info',
          progressPercent: update.progressPercent,
          itemsProcessed: update.itemsProcessed,
          totalItems: update.totalItems,
          metadata: update.metadata,
          timestamp: new Date()
        });

      if (error) {
        console.error('Failed to create status message:', error);
      }
    } catch (error) {
      console.error('Failed to add status message:', error);
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(teamId: string, platform: MarketPlatform): Promise<BusinessCreationTask | null> {
    const platformType = this.mapPlatformType(platform);

    try {
      const { data, error } = await this.supabase
        .from('BusinessCreationTask')
        .select('*')
        .eq('teamId', teamId)
        .eq('platform', platformType)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Task not found
        }
        throw new Error(`Failed to get task status: ${error.message}`);
      }

      return data as BusinessCreationTask;
    } catch (error) {
      console.error('Failed to get task status:', error);
      return null;
    }
  }

  /**
   * Get recent status messages for a task
   */
  async getStatusMessages(teamId: string, platform: MarketPlatform, limit: number = 10): Promise<BusinessStatusMessage[]> {
    const platformType = this.mapPlatformType(platform);

    try {
      // First get the task
      const { data: task, error: taskError } = await this.supabase
        .from('BusinessCreationTask')
        .select('id')
        .eq('teamId', teamId)
        .eq('platform', platformType)
        .single();

      if (taskError || !task) {
        return [];
      }

      // Get status messages
      const { data, error } = await this.supabase
        .from('BusinessStatusMessage')
        .select('*')
        .eq('businessCreationId', task.id)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get status messages:', error);
        return [];
      }

      return data as BusinessStatusMessage[];
    } catch (error) {
      console.error('Failed to get status messages:', error);
      return [];
    }
  }

  /**
   * Update task status directly
   */
  async updateTaskStatus(teamId: string, platform: MarketPlatform, status: BusinessCreationStatus): Promise<void> {
    const platformType = this.mapPlatformType(platform);

    try {
      const { error } = await this.supabase
        .from('BusinessCreationTask')
        .update({
          status,
          lastActivityAt: new Date(),
          ...(status === 'COMPLETED' ? { completedAt: new Date() } : {})
        })
        .eq('teamId', teamId)
        .eq('platform', platformType);

      if (error) {
        console.error('Failed to update task status:', error);
        throw new Error(`Failed to update task status: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  }

  /**
   * Retry a failed task
   */
  async retryTask(teamId: string, platform: MarketPlatform): Promise<void> {
    const platformType = this.mapPlatformType(platform);

    try {
      const { data: task, error: getError } = await this.supabase
        .from('BusinessCreationTask')
        .select('*')
        .eq('teamId', teamId)
        .eq('platform', platformType)
        .single();

      if (getError || !task) {
        throw new Error(`Failed to get task: ${getError?.message}`);
      }

      if (task.status !== 'FAILED' && task.status !== 'RETRYING') {
        throw new Error('Task is not in a failed state and cannot be retried');
      }

      // Reset task for retry
      const { error: updateError } = await this.supabase
        .from('BusinessCreationTask')
        .update({
          status: BusinessCreationStatus.PENDING,
          errorCount: 0,
          lastError: null,
          lastActivityAt: new Date()
        })
        .eq('id', task.id);

      if (updateError) {
        throw new Error(`Failed to reset task: ${updateError.message}`);
      }

      // Create retry status message
      await this.addStatusMessage(task.id, {
        step: task.currentStep || 'CREATING_PROFILE',
        status: BusinessCreationStatus.PENDING,
        message: 'Task retry initiated',
        messageType: 'info'
      });

      console.log(`🔄 Task retry initiated for ${platform} (teamId: ${teamId})`);
    } catch (error) {
      console.error('Failed to retry task:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
  }
} 