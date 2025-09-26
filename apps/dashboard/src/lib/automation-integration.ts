import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export interface AutomationStatus {
  isRunning: boolean;
  lastRun?: string;
  nextRun?: string;
  error?: string;
}

export interface AutomationTask {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error';
  type: 'telegram' | 'flow' | 'schedule' | 'twitter';
  lastRun?: string;
  nextRun?: string;
}

export class AutomationIntegration {
  private automationPath: string;

  constructor() {
    this.automationPath = path.join(process.cwd(), 'automation-system');
  }

  async getTaskStatus(taskType: string): Promise<AutomationStatus> {
    try {
      const scriptPath = this.getScriptPath(taskType);
      
      if (!fs.existsSync(scriptPath)) {
        return { isRunning: false, error: 'Script not found' };
      }

      const { stdout } = await execAsync(`node "${scriptPath}" status`, {
        cwd: this.automationPath,
        timeout: 10000,
      });

      // Parse the output to determine status
      const isRunning = stdout.includes('running') || stdout.includes('active');
      const lastRunMatch = stdout.match(/last run: (.+)/i);
      const nextRunMatch = stdout.match(/next run: (.+)/i);

      return {
        isRunning,
        lastRun: lastRunMatch ? lastRunMatch[1] : undefined,
        nextRun: nextRunMatch ? nextRunMatch[1] : undefined,
      };
    } catch (error) {
      console.error(`Error getting status for ${taskType}:`, error);
      return { isRunning: false, error: 'Failed to get status' };
    }
  }

  async startTask(taskType: string, parameters?: any): Promise<boolean> {
    try {
      const scriptPath = this.getScriptPath(taskType);
      
      if (!fs.existsSync(scriptPath)) {
        throw new Error('Script not found');
      }

      let command = `node "${scriptPath}" start`;
      
      // Add action type and parameters for flow automation
      if (taskType === 'flow' && parameters && parameters.actionType) {
        command += ` --action ${parameters.actionType}`;
        
        // Add additional parameters
        if (parameters.targetUrl) {
          command += ` --url "${parameters.targetUrl}"`;
        }
        if (parameters.profileId) {
          command += ` --profile "${parameters.profileId}"`;
        }
        if (parameters.delay) {
          command += ` --delay "${parameters.delay}"`;
        }
        if (parameters.comment) {
          command += ` --comment "${parameters.comment}"`;
        }
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.automationPath,
        timeout: 30000,
      });

      if (stderr) {
        console.error('Start task stderr:', stderr);
      }

      return stdout.includes('started') || stdout.includes('success');
    } catch (error) {
      console.error(`Error starting ${taskType}:`, error);
      return false;
    }
  }

  async stopTask(taskType: string): Promise<boolean> {
    try {
      const scriptPath = this.getScriptPath(taskType);
      
      if (!fs.existsSync(scriptPath)) {
        throw new Error('Script not found');
      }

      const { stdout, stderr } = await execAsync(`node "${scriptPath}" stop`, {
        cwd: this.automationPath,
        timeout: 30000,
      });

      if (stderr) {
        console.error('Stop task stderr:', stderr);
      }

      return stdout.includes('stopped') || stdout.includes('success');
    } catch (error) {
      console.error(`Error stopping ${taskType}:`, error);
      return false;
    }
  }

  async getAllTasks(): Promise<AutomationTask[]> {
    const tasks: AutomationTask[] = [
      {
        id: 'telegram-bot',
        name: 'Telegram Bot Automation',
        description: 'Automated messaging and response system',
        status: 'stopped',
        type: 'telegram',
      },
      {
        id: 'flow-automation',
        name: 'Flow Automation',
        description: 'Complex workflow automation system',
        status: 'stopped',
        type: 'flow',
      },
      {
        id: 'scheduled-tasks',
        name: 'Scheduled Tasks',
        description: 'Time-based automation tasks',
        status: 'stopped',
        type: 'schedule',
      },
      {
        id: 'twitter-automation',
        name: 'Twitter Automation',
        description: 'Human-like Twitter activities automation',
        status: 'stopped',
        type: 'twitter',
      },
    ];

    // Get actual status for each task
    for (const task of tasks) {
      const status = await this.getTaskStatus(task.type);
      task.status = status.isRunning ? 'running' : 'stopped';
      task.lastRun = status.lastRun;
      task.nextRun = status.nextRun;
    }

    return tasks;
  }

  private getScriptPath(taskType: string): string {
    switch (taskType) {
      case 'telegram':
        return path.join(this.automationPath, 'telegram-wrapper.cjs');
      case 'flow':
        return path.join(this.automationPath, 'automation-wrapper.cjs');
      case 'schedule':
        return path.join(this.automationPath, 'index.cjs');
      case 'twitter':
        return path.join(process.cwd(), 'twitter-automation-wrapper.js');
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }
}

export const automationIntegration = new AutomationIntegration(); 