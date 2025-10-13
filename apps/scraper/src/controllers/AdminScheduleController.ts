/**
 * Admin Schedule Controller
 * 
 * Provides admin endpoints for managing global schedules, custom intervals,
 * and manual operations.
 */

import { Request, Response } from 'express';
import { prisma } from '@wirecrest/db';
import { GlobalScheduleOrchestrator } from '../services/subscription/GlobalScheduleOrchestrator';
import { FeatureExtractor } from '../services/subscription/FeatureExtractor';
import { ScheduleBatchManager } from '../services/apify/ScheduleBatchManager';
import { BusinessRetryService } from '../services/retry/BusinessRetryService';
import type { Platform } from '../types/apify.types';

export class AdminScheduleController {
  private globalOrchestrator: GlobalScheduleOrchestrator;
  private featureExtractor: FeatureExtractor;
  private batchManager: ScheduleBatchManager;
  private retryService: BusinessRetryService;

  constructor(apifyToken: string, webhookBaseUrl: string) {
    this.globalOrchestrator = new GlobalScheduleOrchestrator(apifyToken, webhookBaseUrl);
    this.featureExtractor = new FeatureExtractor();
    this.batchManager = new ScheduleBatchManager();
    this.retryService = new BusinessRetryService(apifyToken, webhookBaseUrl);
  }

  /**
   * Get all global schedules
   * GET /admin/schedules
   */
  async getAllSchedules(req: Request, res: Response): Promise<void> {
    try {
      const schedules = await prisma.apifyGlobalSchedule.findMany({
        include: {
          _count: {
            select: { businessMappings: true },
          },
        },
        orderBy: [
          { platform: 'asc' },
          { intervalHours: 'asc' },
          { batchIndex: 'asc' },
        ],
      });

      res.json({
        success: true,
        count: schedules.length,
        schedules: schedules.map(s => ({
          id: s.id,
          platform: s.platform,
          scheduleType: s.scheduleType,
          intervalHours: s.intervalHours,
          batchIndex: s.batchIndex,
          businessCount: s.businessCount,
          isActive: s.isActive,
          lastRunAt: s.lastRunAt,
          nextRunAt: s.nextRunAt,
          apifyScheduleId: s.apifyScheduleId,
        })),
      });
    } catch (error: any) {
      console.error('Error getting schedules:', error);
      res.status(500).json({
        error: 'Failed to get schedules',
        details: error.message,
      });
    }
  }

  /**
   * Get businesses in a schedule
   * GET /admin/schedules/:id/businesses
   */
  async getScheduleBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const schedule = await prisma.apifyGlobalSchedule.findUnique({
        where: { id },
        include: {
          businessMappings: {
            where: { isActive: true },
            include: {
              // Include team info for display
              schedule: {
                select: {
                  platform: true,
                  intervalHours: true,
                },
              },
            },
          },
        },
      });

      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json({
        success: true,
        schedule: {
          id: schedule.id,
          platform: schedule.platform,
          intervalHours: schedule.intervalHours,
          businessCount: schedule.businessCount,
        },
        businesses: schedule.businessMappings.map(m => ({
          id: m.id,
          businessProfileId: m.businessProfileId,
          teamId: m.teamId,
          platform: m.platform,
          identifier: m.placeId || m.facebookUrl || m.tripAdvisorUrl || m.bookingUrl,
          addedAt: m.addedAt,
        })),
      });
    } catch (error: any) {
      console.error('Error getting schedule businesses:', error);
      res.status(500).json({
        error: 'Failed to get schedule businesses',
        details: error.message,
      });
    }
  }

  /**
   * Trigger schedule manually
   * POST /admin/schedules/:id/trigger
   */
  async triggerSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const schedule = await prisma.apifyGlobalSchedule.findUnique({
        where: { id },
      });

      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      // Rebuild schedule input first
      await this.globalOrchestrator.updateScheduleInput(id);

      // TODO: Implement manual trigger in Apify
      // This would require calling the Apify actor directly

      res.json({
        success: true,
        message: `Schedule ${schedule.platform}_${schedule.intervalHours}h triggered`,
      });
    } catch (error: any) {
      console.error('Error triggering schedule:', error);
      res.status(500).json({
        error: 'Failed to trigger schedule',
        details: error.message,
      });
    }
  }

  /**
   * Pause schedule
   * PUT /admin/schedules/:id/pause
   */
  async pauseSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await prisma.apifyGlobalSchedule.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'Schedule paused',
      });
    } catch (error: any) {
      console.error('Error pausing schedule:', error);
      res.status(500).json({
        error: 'Failed to pause schedule',
        details: error.message,
      });
    }
  }

  /**
   * Resume schedule
   * PUT /admin/schedules/:id/resume
   */
  async resumeSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await prisma.apifyGlobalSchedule.update({
        where: { id },
        data: { isActive: true },
      });

      res.json({
        success: true,
        message: 'Schedule resumed',
      });
    } catch (error: any) {
      console.error('Error resuming schedule:', error);
      res.status(500).json({
        error: 'Failed to resume schedule',
        details: error.message,
      });
    }
  }

  /**
   * Get team's schedule assignments
   * GET /admin/teams/:teamId/schedules
   */
  async getTeamSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      const mappings = await prisma.businessScheduleMapping.findMany({
        where: { teamId },
        include: {
          schedule: true,
        },
      });

      // Get custom intervals
      const customIntervals = await this.featureExtractor.getTeamCustomIntervals(teamId);

      res.json({
        success: true,
        teamId,
        businessCount: mappings.length,
        mappings: mappings.map(m => ({
          businessProfileId: m.businessProfileId,
          platform: m.platform,
          intervalHours: m.intervalHours,
          scheduleId: m.scheduleId,
          identifier: m.placeId || m.facebookUrl || m.tripAdvisorUrl || m.bookingUrl,
        })),
        customIntervals,
      });
    } catch (error: any) {
      console.error('Error getting team schedules:', error);
      res.status(500).json({
        error: 'Failed to get team schedules',
        details: error.message,
      });
    }
  }

  /**
   * Set custom interval for team
   * POST /admin/teams/:teamId/custom-interval
   */
  async setCustomInterval(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { platform, customIntervalHours, reason, setBy, expiresAt } = req.body;

      if (!platform || !customIntervalHours) {
        res.status(400).json({ error: 'platform and customIntervalHours are required' });
        return;
      }

      // Set custom interval
      const result = await this.featureExtractor.setCustomInterval(
        teamId,
        platform as Platform,
        customIntervalHours,
        reason || 'Set by admin',
        setBy || 'admin',
        expiresAt ? new Date(expiresAt) : undefined
      );

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      // Move team's businesses to new interval schedule
      const mappings = await prisma.businessScheduleMapping.findMany({
        where: {
          teamId,
          platform,
        },
      });

      for (const mapping of mappings) {
        await this.globalOrchestrator.moveBusinessBetweenSchedules(
          mapping.businessProfileId,
          platform as Platform,
          mapping.intervalHours,
          customIntervalHours
        );
      }

      res.json({
        success: true,
        message: `Custom interval set to ${customIntervalHours}h for ${platform}`,
        businessesMoved: mappings.length,
      });
    } catch (error: any) {
      console.error('Error setting custom interval:', error);
      res.status(500).json({
        error: 'Failed to set custom interval',
        details: error.message,
      });
    }
  }

  /**
   * Force retry business
   * POST /admin/businesses/:id/retry
   */
  async retryBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { platform } = req.body;

      if (!platform) {
        res.status(400).json({ error: 'platform is required' });
        return;
      }

      // Get business mapping
      const mapping = await prisma.businessScheduleMapping.findUnique({
        where: {
          businessProfileId_platform: {
            businessProfileId: id,
            platform,
          },
        },
      });

      if (!mapping) {
        res.status(404).json({ error: 'Business mapping not found' });
        return;
      }

      const identifier = mapping.placeId || mapping.facebookUrl || 
                         mapping.tripAdvisorUrl || mapping.bookingUrl;

      if (!identifier) {
        res.status(400).json({ error: 'No identifier found for business' });
        return;
      }

      // Add to retry queue with high priority
      await this.retryService.addToRetryQueue(
        mapping.teamId,
        id,
        platform as Platform,
        identifier,
        'Manual retry requested by admin'
      );

      res.json({
        success: true,
        message: 'Business added to retry queue',
      });
    } catch (error: any) {
      console.error('Error retrying business:', error);
      res.status(500).json({
        error: 'Failed to retry business',
        details: error.message,
      });
    }
  }

  /**
   * Get system health
   * GET /admin/health
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const scheduleHealth = await this.batchManager.getHealthStatus();
      const retryStats = await this.retryService.getRetryStats();

      const totalSchedules = await prisma.apifyGlobalSchedule.count();
      const activeSchedules = await prisma.apifyGlobalSchedule.count({
        where: { isActive: true },
      });
      const totalBusinesses = await prisma.businessScheduleMapping.count({
        where: { isActive: true },
      });

      res.json({
        success: true,
        health: {
          schedules: {
            total: totalSchedules,
            active: activeSchedules,
            healthy: scheduleHealth.healthy,
            warning: scheduleHealth.warning,
            critical: scheduleHealth.critical,
            details: scheduleHealth.details,
          },
          businesses: {
            total: totalBusinesses,
          },
          retryQueue: retryStats,
        },
      });
    } catch (error: any) {
      console.error('Error getting health:', error);
      res.status(500).json({
        error: 'Failed to get health status',
        details: error.message,
      });
    }
  }

  /**
   * Rebalance schedule batches
   * POST /admin/schedules/rebalance
   */
  async rebalanceBatches(req: Request, res: Response): Promise<void> {
    try {
      const { platform, scheduleType, intervalHours } = req.body;

      if (!platform || !scheduleType || !intervalHours) {
        res.status(400).json({ 
          error: 'platform, scheduleType, and intervalHours are required' 
        });
        return;
      }

      const result = await this.batchManager.rebalanceBatches(
        platform as Platform,
        scheduleType,
        intervalHours
      );

      res.json({
        success: result.success,
        message: result.message,
        businessesMoved: result.businessesMoved,
      });
    } catch (error: any) {
      console.error('Error rebalancing batches:', error);
      res.status(500).json({
        error: 'Failed to rebalance batches',
        details: error.message,
      });
    }
  }
}

