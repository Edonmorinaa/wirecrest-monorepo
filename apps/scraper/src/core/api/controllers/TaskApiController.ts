import { Request, Response } from 'express';
import { BaseApiController } from './BaseApiController';
import { ITaskTracker, TaskStatus, TaskStep } from '../../interfaces/ITaskTracker';
import { IDependencyContainer } from '../../interfaces/IDependencyContainer';
import { MarketPlatform } from '@prisma/client';
import { SERVICE_TOKENS } from '../../interfaces/IDependencyContainer';

/**
 * Task API Controller
 * Handles all task tracking related API requests.
 * Follows Single Responsibility Principle (SRP) - only handles task tracking concerns.
 * Follows Dependency Inversion Principle (DIP) - depends on ITaskTracker abstraction.
 */
export class TaskApiController extends BaseApiController {
  private container: IDependencyContainer;

  constructor(container: IDependencyContainer) {
    super();
    this.container = container;
  }

  /**
   * Handle main request routing
   * Follows Single Responsibility Principle (SRP) - only routes requests
   */
  async handleRequest(req: Request, res: Response): Promise<void> {
    const { teamId, platform } = req.params;

    if (!teamId || !platform) {
      this.sendErrorResponse(res, 400, 'teamId and platform are required');
      return;
    }

    const validatedPlatform = this.validatePlatform(platform);
    if (!validatedPlatform) {
      this.sendErrorResponse(res, 400, 'Invalid platform');
      return;
    }

    try {
      switch (req.method) {
        case 'GET':
          await this.getTaskStatus(req, res);
          break;
        case 'POST':
          await this.createTask(req, res);
          break;
        case 'PUT':
          await this.updateTask(req, res);
          break;
        case 'DELETE':
          await this.deleteTask(req, res);
          break;
        default:
          this.sendErrorResponse(res, 405, `Method ${req.method} not allowed for tasks`);
      }
    } catch (error) {
      this.handleServiceError(error, res, 'Task operation');
    }
  }

  /**
   * Get task status
   * Follows Single Responsibility Principle (SRP) - only gets task status
   */
  async getTaskStatus(req: Request, res: Response): Promise<void> {
    const { teamId, platform } = req.params;
    const { includeMessages } = req.query;

    const taskTracker = this.getTaskTracker();
    const task = await taskTracker.getTaskStatus(teamId, platform as MarketPlatform);

    if (!task) {
      this.sendErrorResponse(res, 404, 'Task not found');
      return;
    }

    const response: any = {
      success: true,
      timestamp: new Date().toISOString(),
      platform: task.platform,
      task: {
        id: task.id,
        teamId: task.teamId,
        platform: task.platform,
        status: task.status,
        currentStep: task.currentStep,
        progressPercent: task.progressPercent,
        completedSteps: task.completedSteps,
        totalSteps: task.totalSteps,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        lastActivityAt: task.lastActivityAt,
        errorCount: task.errorCount,
        lastError: task.lastError,
        maxRetries: task.maxRetries
      }
    };

    if (includeMessages === 'true') {
      const messages = await taskTracker.getRecentMessages(teamId, platform as MarketPlatform, 10);
      response.messages = messages;
    }

    this.sendSuccessResponse(res, 200, response);
  }

  /**
   * Create a new task
   * Follows Single Responsibility Principle (SRP) - only creates tasks
   */
  async createTask(req: Request, res: Response): Promise<void> {
    const { teamId, platform } = req.params;
    const { identifier } = req.body;

    if (!identifier) {
      this.sendErrorResponse(res, 400, 'identifier is required');
      return;
    }

    const taskTracker = this.getTaskTracker();
    
    try {
      // Check if task already exists
      const existingTask = await taskTracker.getTask(teamId, platform as MarketPlatform);
      if (existingTask) {
        this.sendErrorResponse(res, 409, 'Task already exists for this team and platform');
        return;
      }

      const task = await taskTracker.createTask(teamId, platform as MarketPlatform, identifier);
      
      this.sendSuccessResponse(res, 201, {
        success: true,
        timestamp: new Date().toISOString(),
        platform: task.platform,
        task: {
          id: task.id,
          teamId: task.teamId,
          platform: task.platform,
          status: task.status,
          identifier: task.identifier,
          totalSteps: task.totalSteps,
          progressPercent: task.progressPercent
        }
      });
    } catch (error) {
      this.handleServiceError(error, res, 'Task creation');
    }
  }

  /**
   * Update task (retry, status change, etc.)
   * Follows Single Responsibility Principle (SRP) - only updates tasks
   */
  async updateTask(req: Request, res: Response): Promise<void> {
    const { teamId, platform } = req.params;
    const { action, step, message, status } = req.body;

    const taskTracker = this.getTaskTracker();

    try {
      switch (action) {
        case 'start_step':
          if (!step || !message) {
            this.sendErrorResponse(res, 400, 'step and message are required for start_step action');
            return;
          }
          await taskTracker.startStep(teamId, platform as MarketPlatform, step as TaskStep, message);
          break;

        case 'update_progress':
          if (!step || !message) {
            this.sendErrorResponse(res, 400, 'step and message are required for update_progress action');
            return;
          }
          await taskTracker.updateProgress(teamId, platform as MarketPlatform, {
            step: step as TaskStep,
            status: status as TaskStatus || TaskStatus.IN_PROGRESS,
            message,
            messageType: req.body.messageType || 'info',
            progressPercent: req.body.progressPercent,
            itemsProcessed: req.body.itemsProcessed,
            totalItems: req.body.totalItems,
            metadata: req.body.metadata
          });
          break;

        case 'complete_step':
          if (!step || !message) {
            this.sendErrorResponse(res, 400, 'step and message are required for complete_step action');
            return;
          }
          await taskTracker.completeStep(teamId, platform as MarketPlatform, step as TaskStep, message, req.body.result);
          break;

        case 'fail_step':
          if (!step || !message) {
            this.sendErrorResponse(res, 400, 'step and message are required for fail_step action');
            return;
          }
          await taskTracker.failStep(teamId, platform as MarketPlatform, step as TaskStep, message);
          break;

        case 'retry':
          await taskTracker.retryTask(teamId, platform as MarketPlatform);
          break;

        case 'update_status':
          if (!status) {
            this.sendErrorResponse(res, 400, 'status is required for update_status action');
            return;
          }
          await taskTracker.updateTaskStatus(teamId, platform as MarketPlatform, status as TaskStatus);
          break;

        default:
          this.sendErrorResponse(res, 400, 'Invalid action. Supported actions: start_step, update_progress, complete_step, fail_step, retry, update_status');
          return;
      }

      this.sendSuccessResponse(res, 200, {
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleServiceError(error, res, `Task ${action}`);
    }
  }

  /**
   * Delete a task
   * Follows Single Responsibility Principle (SRP) - only deletes tasks
   */
  async deleteTask(req: Request, res: Response): Promise<void> {
    const { teamId, platform } = req.params;

    const taskTracker = this.getTaskTracker();

    try {
      await taskTracker.deleteTask(teamId, platform as MarketPlatform);
      
      this.sendSuccessResponse(res, 200, {
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleServiceError(error, res, 'Task deletion');
    }
  }

  /**
   * Get task tracker service
   * Follows Dependency Inversion Principle (DIP) - depends on abstraction
   */
  private getTaskTracker(): ITaskTracker {
    return this.container.getService<ITaskTracker>(SERVICE_TOKENS.TASK_TRACKER_SERVICE);
  }
}
