/**
 * Subscription Webhook Controller
 * Handles notifications from dashboard when subscription events occur
 */

import { Request, Response } from 'express';
import { SubscriptionOrchestrator } from '../services/subscription/SubscriptionOrchestrator';

export class SubscriptionWebhookController {
  private orchestrator: SubscriptionOrchestrator;

  constructor(orchestrator: SubscriptionOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Handle new subscription - create initial schedules
   * POST /api/subscription/created
   */
  async handleSubscriptionCreated(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.body;

      if (!teamId) {
        res.status(400).json({
          error: 'Missing required fields: teamId',
        });
        return;
      }

      console.log(`📋 Creating schedules for team ${teamId}`);

      await this.orchestrator.handleNewSubscription(teamId);

      res.json({
        success: true,
        message: 'Schedules created successfully',
        teamId
      });
    } catch (error: any) {
      console.error('Error handling subscription created:', error);
      res.status(500).json({
        error: error.message || 'Failed to create schedules',
      });
    }
  }

  /**
   * Handle subscription updated - adjust schedule intervals
   * POST /api/subscription/updated
   */
  async handleSubscriptionUpdated(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.body;

      if (!teamId) {
        res.status(400).json({
          error: 'Missing required fields: teamId',
        });
        return;
      }

      console.log(`🔄 Updating schedules for team ${teamId}`);

      await this.orchestrator.handleSubscriptionUpdate(teamId);

      res.json({
        success: true,
        message: 'Schedules updated successfully',
        teamId
      });
    } catch (error: any) {
      console.error('Error handling subscription updated:', error);
      res.status(500).json({
        error: error.message || 'Failed to update schedules',
      });
    }
  }

  /**
   * Handle subscription cancelled - pause schedules
   * POST /api/subscription/cancelled
   */
  async handleSubscriptionCancelled(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.body;

      if (!teamId) {
        res.status(400).json({
          error: 'Missing required field: teamId',
        });
        return;
      }

      console.log(`⏸️  Pausing schedules for team ${teamId}`);

      await this.orchestrator.handleSubscriptionCancellation(teamId);

      res.json({
        success: true,
        message: 'Schedules paused successfully',
        teamId,
      });
    } catch (error: any) {
      console.error('Error handling subscription cancelled:', error);
      res.status(500).json({
        error: error.message || 'Failed to pause schedules',
      });
    }
  }

  /**
   * Handle business location added - update schedule inputs
   * POST /api/business/added
   */
  async handleBusinessAdded(req: Request, res: Response): Promise<void> {
    try {
      const { teamId, platform, identifier } = req.body;

      if (!teamId || !platform || !identifier) {
        res.status(400).json({
          error: 'Missing required fields: teamId, platform, identifier',
        });
        return;
      }

      console.log(`➕ Adding business ${identifier} for team ${teamId} on ${platform}`);

      // Sync schedules to include new identifier
      await this.orchestrator.handlePlatformAdded(teamId, platform, identifier);

      res.json({
        success: true,
        message: 'Schedule updated with new location',
        teamId
      });
    } catch (error: any) {
      console.error('Error handling business added:', error);
      res.status(500).json({
        error: error.message || 'Failed to update schedule',
      });
    }
  }

  /**
   * Handle business location removed - update schedule inputs
   * POST /api/business/removed
   */
  async handleBusinessRemoved(req: Request, res: Response): Promise<void> {
    try {
      const { teamId, platform, identifier } = req.body;

      if (!teamId || !platform || !identifier) {
        res.status(400).json({
          error: 'Missing required fields: teamId, platform, identifier',
        });
        return;
      }

      console.log(`➖ Removing business ${identifier} for team ${teamId} on ${platform}`);

      // Sync schedules to remove identifier
      const result = await this.orchestrator.handlePlatformRemoved(teamId, platform, identifier);

      if (result.success) {
        res.json({
          success: true,
          message: 'Schedule updated - location removed',
          teamId
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      console.error('Error handling business removed:', error);
      res.status(500).json(error);
    }
  }
}
