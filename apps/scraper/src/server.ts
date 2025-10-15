/**
 * Scraper Service - New Apify-Native Architecture
 * Entry point for the review scraping service with Stripe subscription integration
 */

// Load environment variables first
import 'dotenv/config';

import express, { Request, Response } from 'express';
import cors from 'cors';
import { StripeWebhookController } from './controllers/StripeWebhookController';
import { ApifyWebhookController } from './controllers/ApifyWebhookController';
import { PlatformConfigWebhookController } from './controllers/PlatformConfigWebhookController';
import { SubscriptionOrchestrator } from './services/subscription/SubscriptionOrchestrator';
import { ApifyScheduleService } from './services/apify/ApifyScheduleService';
import { ApifyTaskService } from './services/apify/ApifyTaskService';
import { FeatureExtractor } from './services/subscription/FeatureExtractor';
import { validateEnv } from './config/env';

// Validate environment before starting
const env = validateEnv();

const app = express();
const PORT = env.PORT;

// Configuration
const APIFY_TOKEN = env.APIFY_TOKEN;
const WEBHOOK_BASE_URL = env.WEBHOOK_BASE_URL || `http://localhost:${PORT}`;
const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;

// Middleware
app.use(cors());

// IMPORTANT: For Stripe webhooks, we need raw body
app.use(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' })
);

// JSON body parser for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize controllers
let stripeWebhookController: StripeWebhookController;
let apifyWebhookController: ApifyWebhookController;
let platformConfigWebhookController: PlatformConfigWebhookController;
let orchestrator: SubscriptionOrchestrator;
let scheduleService: ApifyScheduleService;
let taskService: ApifyTaskService;
let featureExtractor: FeatureExtractor;

/**
 * Initialize services
 */
async function initializeServices(): Promise<void> {
  try {
    console.log('🔧 Initializing services...');

    stripeWebhookController = new StripeWebhookController(
      APIFY_TOKEN,
      WEBHOOK_BASE_URL,
      STRIPE_WEBHOOK_SECRET
    );

    apifyWebhookController = new ApifyWebhookController(APIFY_TOKEN);
    platformConfigWebhookController = new PlatformConfigWebhookController(APIFY_TOKEN, WEBHOOK_BASE_URL);
    orchestrator = new SubscriptionOrchestrator(APIFY_TOKEN, WEBHOOK_BASE_URL);
    scheduleService = new ApifyScheduleService(APIFY_TOKEN, WEBHOOK_BASE_URL);
    taskService = new ApifyTaskService(APIFY_TOKEN, WEBHOOK_BASE_URL);
    featureExtractor = new FeatureExtractor();

    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

// =================== HEALTH CHECK ===================

app.get('/health', (_req: Request, res: Response) => {
  const isInitializing = !(
    stripeWebhookController &&
    apifyWebhookController &&
    platformConfigWebhookController &&
    orchestrator &&
    scheduleService &&
    taskService
  );

  if (isInitializing) {
    // Return 200 during initialization to pass Railway health checks
    res.status(200).json({
      success: true,
      status: 'starting',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Services initializing...',
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    port: PORT,
  });
});

// =================== WEBHOOK ENDPOINTS ===================

/**
 * Stripe webhook endpoint
 * Handles subscription lifecycle events
 */
app.post('/webhooks/stripe', async (req: Request, res: Response) => {
  if (!stripeWebhookController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await stripeWebhookController.handleWebhook(req, res);
});

/**
 * Apify webhook endpoint
 * Handles actor run completion events
 */
app.post('/webhooks/apify', async (req: Request, res: Response) => {
  if (!apifyWebhookController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await apifyWebhookController.handleWebhook(req, res);
});

/**
 * Platform configuration webhook endpoint
 * Handles platform setup from dashboard
 */
app.post('/api/webhooks/platform-configured', async (req: Request, res: Response) => {
  if (!platformConfigWebhookController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await platformConfigWebhookController.handlePlatformConfigured(req, res);
});

// =================== DASHBOARD API ENDPOINTS (Read-Only) ===================
// Note: All write operations are handled by Stripe webhooks
// Dashboard only reads status, doesn't trigger scraper operations

/**
 * Get sync status for team
 * GET /api/sync-status/:teamId
 */
app.get('/api/sync-status/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { prisma } = await import('@wirecrest/db');

    const recentSyncs = await prisma.syncRecord.findMany({
      where: { teamId },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        platform: true,
        syncType: true,
        status: true,
        reviewsNew: true,
        reviewsDuplicate: true,
        startedAt: true,
        completedAt: true,
      },
    });

    const activeSchedules = await prisma.apifySchedule.count({
      where: { teamId, isActive: true },
    });

    res.json({
      recentSyncs,
      activeSchedules,
      lastSync: recentSyncs[0]?.completedAt,
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get schedules for team
 * GET /api/schedules/:teamId
 */
app.get('/api/schedules/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    if (!scheduleService) {
      res.status(503).json({ error: 'Service not ready' });
      return;
    }

    const schedules = await scheduleService.getTeamSchedules(teamId);
    res.json(schedules);
  } catch (error: any) {
    console.error('Error getting schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== ADMIN API ENDPOINTS ===================
// ⚠️  SECURITY: These endpoints should be protected by admin authentication!

import { AdminController } from './controllers/AdminController';
import { ApifyDataSyncService } from './services/apify/ApifyDataSyncService';

let adminController: AdminController;
let syncService: ApifyDataSyncService;

// Initialize admin controller
async function initializeAdminController(): Promise<void> {
  if (!adminController && orchestrator && scheduleService && taskService) {
    if (!syncService) {
      syncService = new ApifyDataSyncService(APIFY_TOKEN);
    }
    adminController = new AdminController(
      orchestrator,
      scheduleService,
      taskService,
      syncService,
      featureExtractor
    );
  }
}

/**
 * Get all teams with schedule status
 * GET /api/admin/teams
 */
app.get('/api/admin/teams', async (req: Request, res: Response) => {
  await initializeAdminController();
  if (!adminController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await adminController.getAllTeams(req, res);
});

/**
 * Get detailed status for a team
 * GET /api/admin/teams/:teamId/status
 */
app.get('/api/admin/teams/:teamId/status', async (req: Request, res: Response) => {
  await initializeAdminController();
  if (!adminController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await adminController.getTeamStatus(req, res);
});

/**
 * Manually trigger full subscription setup
 * POST /api/admin/teams/:teamId/setup
 */
app.post('/api/admin/teams/:teamId/setup', async (req: Request, res: Response) => {
  await initializeAdminController();
  if (!adminController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await adminController.triggerSubscriptionSetup(req, res);
});

/**
 * Manually trigger platform sync
 * POST /api/admin/teams/:teamId/platforms/:platform/sync
 */
app.post('/api/admin/teams/:teamId/platforms/:platform/sync', async (req: Request, res: Response) => {
  await initializeAdminController();
  if (!adminController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await adminController.triggerPlatformSync(req, res);
});

/**
 * Refresh schedules (re-sync identifiers)
 * POST /api/admin/teams/:teamId/schedules/refresh
 */
app.post('/api/admin/teams/:teamId/schedules/refresh', async (req: Request, res: Response) => {
  await initializeAdminController();
  if (!adminController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await adminController.refreshSchedules(req, res);
});

/**
 * Pause all schedules for a team
 * POST /api/admin/teams/:teamId/schedules/pause
 */
app.post('/api/admin/teams/:teamId/schedules/pause', async (req: Request, res: Response) => {
  await initializeAdminController();
  if (!adminController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await adminController.pauseSchedules(req, res);
});

/**
 * Resume all schedules for a team
 * POST /api/admin/teams/:teamId/schedules/resume
 */
app.post('/api/admin/teams/:teamId/schedules/resume', async (req: Request, res: Response) => {
  await initializeAdminController();
  if (!adminController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await adminController.resumeSchedules(req, res);
});

/**
 * Delete all schedules for a team
 * DELETE /api/admin/teams/:teamId/schedules
 */
app.delete('/api/admin/teams/:teamId/schedules', async (req: Request, res: Response) => {
  await initializeAdminController();
  if (!adminController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await adminController.deleteSchedules(req, res);
});

/**
 * Trigger specific schedule manually
 * POST /api/admin/schedules/:scheduleId/trigger
 */
app.post('/api/admin/schedules/:scheduleId/trigger', async (req: Request, res: Response) => {
  await initializeAdminController();
  if (!adminController) {
    res.status(503).json({ error: 'Service not ready' });
    return;
  }
  await adminController.triggerSchedule(req, res);
});

/**
 * Get team schedules
 */
app.get('/api/schedules/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    if (!scheduleService) {
      res.status(503).json({ error: 'Service not ready' });
      return;
    }

    const schedules = await scheduleService.getTeamSchedules(teamId);
    res.json({ success: true, schedules });
  } catch (error: any) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get team features
 */
app.get('/api/features/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    if (!featureExtractor) {
      res.status(503).json({ error: 'Service not ready' });
      return;
    }

    const features = await featureExtractor.extractTeamFeatures(teamId);
    res.json({ success: true, features });
  } catch (error: any) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== ERROR HANDLING ===================

app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// =================== START SERVER ===================

async function startServer(): Promise<void> {
  try {
    await initializeServices();

    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Scraper Service Started');
      console.log(`📡 Server: http://0.0.0.0:${PORT}`);
      console.log(`🔗 Webhook Base URL: ${WEBHOOK_BASE_URL}`);
      console.log(`📊 Health Check: http://0.0.0.0:${PORT}/health`);
      console.log(`🎯 Stripe Webhook: ${WEBHOOK_BASE_URL}/webhooks/stripe`);
      console.log(`🎯 Apify Webhook: ${WEBHOOK_BASE_URL}/webhooks/apify`);
      console.log('');
      console.log('✅ Ready to receive webhooks');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

