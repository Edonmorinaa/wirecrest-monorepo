import { randomUUID } from 'crypto';
import { MarketPlatform } from '@prisma/client';
import type { ITaskTracker, Task, TaskMessage, TaskProgressUpdate, TaskStatus, TaskStep } from '../interfaces/ITaskTracker';
import type { IDependencyContainer } from '../interfaces/IDependencyContainer';

/**
 * Task Tracker Service
 * Follows Single Responsibility Principle (SRP) - only handles task tracking
 * Follows Dependency Inversion Principle (DIP) - depends on IDependencyContainer abstraction
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 */
export class TaskTrackerService implements ITaskTracker {
  private container: IDependencyContainer;

  constructor(container: IDependencyContainer) {
    this.container = container;
  }

  /**
   * Create a new task
   * Follows Single Responsibility Principle (SRP) - only creates tasks
   */
  async createTask(teamId: string, platform: MarketPlatform, identifier: string): Promise<Task> {
    const taskId = randomUUID();
    const now = new Date();

    const task: Task = {
      id: taskId,
      teamId,
      platform,
      status: TaskStatus.PENDING,
      identifier,
      totalSteps: this.getTotalStepsForPlatform(platform),
      completedSteps: 0,
      progressPercent: 0,
      lastActivityAt: now,
      errorCount: 0,
      maxRetries: 3,
      metadata: {}
    };

    // TODO: Store task in database via repository
    // For now, we'll use in-memory storage
    this.storeTask(task);

    return task;
  }

  /**
   * Get a task by team and platform
   * Follows Single Responsibility Principle (SRP) - only retrieves tasks
   */
  async getTask(teamId: string, platform: MarketPlatform): Promise<Task | null> {
    // TODO: Retrieve from database via repository
    // For now, we'll use in-memory storage
    return this.getStoredTask(teamId, platform);
  }

  /**
   * Update task status
   * Follows Single Responsibility Principle (SRP) - only updates task status
   */
  async updateTaskStatus(teamId: string, platform: MarketPlatform, status: TaskStatus): Promise<void> {
    const task = await this.getTask(teamId, platform);
    if (!task) {
      throw new Error(`Task not found for team ${teamId} and platform ${platform}`);
    }

    task.status = status;
    task.lastActivityAt = new Date();

    if (status === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
      task.progressPercent = 100;
    }

    this.storeTask(task);
  }

  /**
   * Delete a task
   * Follows Single Responsibility Principle (SRP) - only deletes tasks
   */
  async deleteTask(teamId: string, platform: MarketPlatform): Promise<void> {
    // TODO: Delete from database via repository
    this.deleteStoredTask(teamId, platform);
  }

  /**
   * Start a specific step
   * Follows Single Responsibility Principle (SRP) - only starts steps
   */
  async startStep(teamId: string, platform: MarketPlatform, step: TaskStep, message: string): Promise<void> {
    const task = await this.getTask(teamId, platform);
    if (!task) {
      throw new Error(`Task not found for team ${teamId} and platform ${platform}`);
    }

    task.currentStep = step;
    task.status = TaskStatus.IN_PROGRESS;
    task.lastActivityAt = new Date();

    this.storeTask(task);

    // Add message
    await this.addMessage(teamId, platform, {
      id: randomUUID(),
      taskId: task.id,
      step,
      status: TaskStatus.IN_PROGRESS,
      message,
      messageType: 'info',
      timestamp: new Date()
    });
  }

  /**
   * Update task progress
   * Follows Single Responsibility Principle (SRP) - only updates progress
   */
  async updateProgress(teamId: string, platform: MarketPlatform, update: TaskProgressUpdate): Promise<void> {
    const task = await this.getTask(teamId, platform);
    if (!task) {
      throw new Error(`Task not found for team ${teamId} and platform ${platform}`);
    }

    task.currentStep = update.step;
    task.status = update.status;
    task.lastActivityAt = new Date();

    if (update.progressPercent !== undefined) {
      task.progressPercent = update.progressPercent;
    }

    this.storeTask(task);

    // Add message
    await this.addMessage(teamId, platform, {
      id: randomUUID(),
      taskId: task.id,
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
  }

  /**
   * Complete a step
   * Follows Single Responsibility Principle (SRP) - only completes steps
   */
  async completeStep(teamId: string, platform: MarketPlatform, step: TaskStep, message: string, result?: any): Promise<void> {
    const task = await this.getTask(teamId, platform);
    if (!task) {
      throw new Error(`Task not found for team ${teamId} and platform ${platform}`);
    }

    task.completedSteps += 1;
    task.progressPercent = Math.round((task.completedSteps / task.totalSteps) * 100);
    task.lastActivityAt = new Date();

    // Check if all steps are completed
    if (task.completedSteps >= task.totalSteps) {
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
    }

    this.storeTask(task);

    // Add message
    await this.addMessage(teamId, platform, {
      id: randomUUID(),
      taskId: task.id,
      step,
      status: TaskStatus.COMPLETED,
      message,
      messageType: 'success',
      progressPercent: task.progressPercent,
      metadata: result ? { result } : undefined,
      timestamp: new Date()
    });
  }

  /**
   * Fail a step
   * Follows Single Responsibility Principle (SRP) - only handles step failures
   */
  async failStep(teamId: string, platform: MarketPlatform, step: TaskStep, errorMessage: string): Promise<void> {
    const task = await this.getTask(teamId, platform);
    if (!task) {
      throw new Error(`Task not found for team ${teamId} and platform ${platform}`);
    }

    task.errorCount += 1;
    task.lastError = errorMessage;
    task.lastActivityAt = new Date();

    // Check if we should retry or fail
    if (task.errorCount >= task.maxRetries) {
      task.status = TaskStatus.FAILED;
    } else {
      task.status = TaskStatus.RETRYING;
    }

    this.storeTask(task);

    // Add message
    await this.addMessage(teamId, platform, {
      id: randomUUID(),
      taskId: task.id,
      step,
      status: task.status,
      message: errorMessage,
      messageType: 'error',
      metadata: { errorCount: task.errorCount, maxRetries: task.maxRetries },
      timestamp: new Date()
    });
  }

  /**
   * Add a message to a task
   * Follows Single Responsibility Principle (SRP) - only adds messages
   */
  async addMessage(teamId: string, platform: MarketPlatform, message: TaskMessage): Promise<void> {
    // TODO: Store message in database via repository
    this.storeMessage(message);
  }

  /**
   * Get messages for a task
   * Follows Single Responsibility Principle (SRP) - only retrieves messages
   */
  async getMessages(teamId: string, platform: MarketPlatform, limit: number = 10): Promise<TaskMessage[]> {
    // TODO: Retrieve from database via repository
    return this.getStoredMessages(teamId, platform, limit);
  }

  /**
   * Get task status
   * Follows Single Responsibility Principle (SRP) - only retrieves task status
   */
  async getTaskStatus(teamId: string, platform: MarketPlatform): Promise<Task | null> {
    return this.getTask(teamId, platform);
  }

  /**
   * Get recent messages
   * Follows Single Responsibility Principle (SRP) - only retrieves recent messages
   */
  async getRecentMessages(teamId: string, platform: MarketPlatform, limit: number = 10): Promise<TaskMessage[]> {
    return this.getMessages(teamId, platform, limit);
  }

  /**
   * Retry a failed task
   * Follows Single Responsibility Principle (SRP) - only retries tasks
   */
  async retryTask(teamId: string, platform: MarketPlatform): Promise<void> {
    const task = await this.getTask(teamId, platform);
    if (!task) {
      throw new Error(`Task not found for team ${teamId} and platform ${platform}`);
    }

    task.status = TaskStatus.PENDING;
    task.errorCount = 0;
    task.lastError = undefined;
    task.lastActivityAt = new Date();

    this.storeTask(task);

    // Add message
    await this.addMessage(teamId, platform, {
      id: randomUUID(),
      taskId: task.id,
      step: task.currentStep || TaskStep.CREATING_PROFILE,
      status: TaskStatus.PENDING,
      message: 'Task retry initiated',
      messageType: 'info',
      timestamp: new Date()
    });
  }

  /**
   * Get total steps for a platform
   * Follows Single Responsibility Principle (SRP) - only calculates steps
   */
  private getTotalStepsForPlatform(platform: MarketPlatform): number {
    switch (platform) {
      case MarketPlatform.GOOGLE_MAPS:
      case MarketPlatform.FACEBOOK:
      case MarketPlatform.TRIPADVISOR:
      case MarketPlatform.BOOKING:
        return 3; // Create Profile, Fetch Reviews, Process Analytics
      default:
        return 3;
    }
  }

  // TODO: Replace with proper database operations via repository
  private taskStorage = new Map<string, Task>();
  private messageStorage = new Map<string, TaskMessage[]>();

  private storeTask(task: Task): void {
    const key = `${task.teamId}-${task.platform}`;
    this.taskStorage.set(key, task);
  }

  private getStoredTask(teamId: string, platform: MarketPlatform): Task | null {
    const key = `${teamId}-${platform}`;
    return this.taskStorage.get(key) || null;
  }

  private deleteStoredTask(teamId: string, platform: MarketPlatform): void {
    const key = `${teamId}-${platform}`;
    this.taskStorage.delete(key);
    this.messageStorage.delete(key);
  }

  private storeMessage(message: TaskMessage): void {
    const key = message.taskId;
    if (!this.messageStorage.has(key)) {
      this.messageStorage.set(key, []);
    }
    this.messageStorage.get(key)!.push(message);
  }

  private getStoredMessages(teamId: string, platform: MarketPlatform, limit: number): TaskMessage[] {
    const task = this.getStoredTask(teamId, platform);
    if (!task) return [];

    const messages = this.messageStorage.get(task.id) || [];
    return messages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
