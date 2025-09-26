/**
 * Enhanced ActorManager with Memory-Aware Priority Queuing
 * 
 * Features:
 * - Memory-based job scheduling with immediate execution when memory is available
 * - Priority queuing: Initialization > Polling > Manual jobs
 * - Immediate emission when memory becomes available
 * - Detailed event tracking and statistics
 * - Configurable priority levels for future flexibility
 * 
 * Usage Example:
 * ```typescript
 * const actorManager = new ActorManager({ memoryLimitMB: 32 * 1024 });
 * 
 * // Set up event listeners
 * actorManager.on('start', (data) => console.log(`Job ${data.jobId} started`));
 * actorManager.on('queued', (data) => console.log(`Job ${data.jobId} queued (${data.source})`));
 * actorManager.on('dequeued', (data) => console.log(`Job ${data.jobId} dequeued after ${data.waitTimeMs}ms`));
 * 
 * // Schedule jobs with different priorities
 * await actorManager.schedule(job, 'initialization');  // Highest priority
 * await actorManager.schedule(job, 'poll');           // Medium priority
 * await actorManager.schedule(job, 'manual');         // Lowest priority
 * 
 * // Monitor status
 * const stats = actorManager.getMemoryStats();
 * const queue = actorManager.getQueueInfo();
 * ```
 */

import EventEmitter from 'events';
import { ActorJob } from './actors/actor';

interface ActorManagerOptions {
  memoryLimitMB: number;
}

export enum JobPriority {
  INITIALIZATION = 1,  // Highest priority
  POLL = 2,           // Medium priority  
  MANUAL = 3          // Lowest priority
}

export type JobSource = 'initialization' | 'poll' | 'manual';

interface QueuedJob {
  job: ActorJob;
  queuedAt: Date;
  source: JobSource;
  priority: JobPriority;
}

export class ActorManager extends EventEmitter {
  private memoryLimitMB: number = 32 * 1024; // 32 GB
  private currentUsageMB: number = 0;
  private queue: QueuedJob[] = [];
  private runningJobs: Map<string, ActorJob> = new Map();

  constructor(options: ActorManagerOptions) {
    super();
    this.memoryLimitMB = options.memoryLimitMB;
  }

  /**
   * Schedule a job with memory awareness and priority
   * Jobs are prioritized: initialization > poll > manual
   */
  public async schedule(job: ActorJob, source: JobSource = 'manual'): Promise<void> {
    if (this.canRun(job.actor.memoryEstimateMB)) {
      await this.startJob(job);
    } else {
      const priority = this.getJobPriority(source);
      const queuedJob: QueuedJob = {
        job,
        queuedAt: new Date(),
        source,
        priority
      };
      
      // Add to queue and sort by priority
      this.queue.push(queuedJob);
      this.sortQueue();
      
      this.emit('queued', {
        jobId: job.id,
        memoryRequired: job.actor.memoryEstimateMB,
        memoryAvailable: this.memoryLimitMB - this.currentUsageMB,
        queuePosition: this.getQueuePosition(queuedJob),
        source,
        priority,
        queuedAt: queuedJob.queuedAt
      });
    }
  }

  /**
   * Get job priority based on source
   */
  private getJobPriority(source: JobSource): JobPriority {
    switch (source) {
      case 'initialization':
        return JobPriority.INITIALIZATION;
      case 'poll':
        return JobPriority.POLL;
      case 'manual':
        return JobPriority.MANUAL;
      default:
        return JobPriority.MANUAL;
    }
  }

  /**
   * Sort queue by priority (lower number = higher priority) and then by queue time
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // First sort by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // If same priority, sort by queue time (FIFO)
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });
  }

  /**
   * Get the position of a job in the queue after sorting
   */
  private getQueuePosition(targetJob: QueuedJob): number {
    return this.queue.findIndex(job => job.job.id === targetJob.job.id) + 1;
  }

  /**
   * Check if a job can run based on memory requirements
   */
  private canRun(memoryRequiredMB: number): boolean {
    return this.currentUsageMB + memoryRequiredMB <= this.memoryLimitMB;
  }

  /**
   * Start executing a job
   */
  private async startJob(job: ActorJob): Promise<void> {
    this.currentUsageMB += job.actor.memoryEstimateMB;
    this.runningJobs.set(job.id, job);
    
    this.emit('start', {
      jobId: job.id,
      memoryAllocated: job.actor.memoryEstimateMB,
      currentMemoryUsage: this.currentUsageMB,
      memoryUtilization: (this.currentUsageMB / this.memoryLimitMB) * 100,
      runningJobsCount: this.runningJobs.size
    });

    try {
      const success = await job.run();
      this.emit('success', {
        jobId: job.id,
        success,
        memoryFreed: job.actor.memoryEstimateMB
      });
    } catch (error) {
      this.emit('error', {
        jobId: job.id,
        error,
        memoryFreed: job.actor.memoryEstimateMB
      });
    } finally {
      // Clean up and free memory
      this.currentUsageMB -= job.actor.memoryEstimateMB;
      this.runningJobs.delete(job.id);
      
      this.emit('completed', {
        jobId: job.id,
        memoryFreed: job.actor.memoryEstimateMB,
        currentMemoryUsage: this.currentUsageMB,
        memoryUtilization: (this.currentUsageMB / this.memoryLimitMB) * 100,
        runningJobsCount: this.runningJobs.size
      });

      // Immediately check queue for jobs that can now run
      await this.processQueue();
    }
  }

  /**
   * Process the queue and start jobs that can now run
   * This is called immediately when memory is freed up
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    // Queue is already sorted by priority and time
    this.sortQueue();

    // Process jobs that can now run
    const jobsToStart: QueuedJob[] = [];
    const remainingQueue: QueuedJob[] = [];

    for (const queuedJob of this.queue) {
      if (this.canRun(queuedJob.job.actor.memoryEstimateMB)) {
        jobsToStart.push(queuedJob);
      } else {
        remainingQueue.push(queuedJob);
      }
    }

    // Update queue with remaining jobs
    this.queue = remainingQueue;

    // Start jobs that can run (emit immediately)
    for (const queuedJob of jobsToStart) {
      const waitTime = Date.now() - queuedJob.queuedAt.getTime();
      
      this.emit('dequeued', {
        jobId: queuedJob.job.id,
        source: queuedJob.source,
        priority: queuedJob.priority,
        waitTimeMs: waitTime,
        memoryRequired: queuedJob.job.actor.memoryEstimateMB,
        remainingQueueSize: this.queue.length
      });

      // Start the job (don't await to allow parallel execution)
      this.startJob(queuedJob.job).catch(error => {
        this.emit('error', {
          jobId: queuedJob.job.id,
          error,
          context: 'processQueue'
        });
      });
    }
  }

  /**
   * Get current memory statistics
   */
  public getMemoryStats(): {
    totalMemoryMB: number;
    usedMemoryMB: number;
    availableMemoryMB: number;
    utilizationPercent: number;
    runningJobs: number;
    queuedJobs: number;
    queueByPriority: {
      initialization: number;
      poll: number;
      manual: number;
    };
  } {
    const queueByPriority = {
      initialization: this.queue.filter(q => q.priority === JobPriority.INITIALIZATION).length,
      poll: this.queue.filter(q => q.priority === JobPriority.POLL).length,
      manual: this.queue.filter(q => q.priority === JobPriority.MANUAL).length
    };

    return {
      totalMemoryMB: this.memoryLimitMB,
      usedMemoryMB: this.currentUsageMB,
      availableMemoryMB: this.memoryLimitMB - this.currentUsageMB,
      utilizationPercent: (this.currentUsageMB / this.memoryLimitMB) * 100,
      runningJobs: this.runningJobs.size,
      queuedJobs: this.queue.length,
      queueByPriority
    };
  }

  /**
   * Get queue information
   */
  public getQueueInfo(): Array<{
    jobId: string;
    memoryRequired: number;
    source: string;
    priority: number;
    queuedAt: Date;
    waitTimeMs: number;
    position: number;
  }> {
    const now = Date.now();
    return this.queue.map((queuedJob, index) => ({
      jobId: queuedJob.job.id,
      memoryRequired: queuedJob.job.actor.memoryEstimateMB,
      source: queuedJob.source,
      priority: queuedJob.priority,
      queuedAt: queuedJob.queuedAt,
      waitTimeMs: now - queuedJob.queuedAt.getTime(),
      position: index + 1
    }));
  }

  /**
   * Force process queue (for manual triggering)
   */
  public async forceProcessQueue(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Clear all queued jobs
   */
  public clearQueue(): void {
    const clearedJobs = this.queue.map(q => q.job.id);
    this.queue = [];
    this.emit('queueCleared', { clearedJobIds: clearedJobs });
  }

  /**
   * Clear queued jobs by priority
   */
  public clearQueueByPriority(priority: JobPriority): void {
    const clearedJobs = this.queue
      .filter(q => q.priority === priority)
      .map(q => q.job.id);
    
    this.queue = this.queue.filter(q => q.priority !== priority);
    
    this.emit('queueCleared', { 
      clearedJobIds: clearedJobs, 
      priority 
    });
  }

  /**
   * Get running jobs information
   */
  public getRunningJobs(): Array<{
    jobId: string;
    memoryUsed: number;
    startedAt: Date;
    runningTimeMs: number;
  }> {
    const now = Date.now();
    return Array.from(this.runningJobs.values()).map(job => ({
      jobId: job.id,
      memoryUsed: job.actor.memoryEstimateMB,
      startedAt: new Date(), // You might want to track this separately
      runningTimeMs: 0 // You might want to track this separately
    }));
  }
}