/**
 * Wirecrest Scraper Worker API - Modern SOLID Architecture
 * Combines legacy webhook system with new SOLID-compliant analytics services
 */

// Load environment variables first
import "dotenv/config";

import express from "express";
import type { Request, Response } from "express";
import cors from "cors";

// Legacy controllers for webhooks (still needed)
import { StripeWebhookController } from "./controllers/StripeWebhookController";
import { ApifyWebhookController } from "./controllers/ApifyWebhookController";
import { PlatformConfigWebhookController } from "./controllers/PlatformConfigWebhookController";
import { AdminController } from "./controllers/AdminController";
import { SubscriptionOrchestrator } from "./services/subscription/SubscriptionOrchestrator";
import { ApifyScheduleService } from "./services/apify/ApifyScheduleService";
import { ApifyTaskService } from "./services/apify/ApifyTaskService";
import { ApifyDataSyncService } from "./services/apify/ApifyDataSyncService";
import { FeatureExtractor } from "./services/subscription/FeatureExtractor";
import { SentimentAnalyzer } from "./sentimentAnalyzer/sentimentAnalyzer.js";
import { InstagramDataService } from "./services/instagramDataService.js";
import { TikTokDataService } from "./services/tiktokDataService.js";
import { InstagramController } from "./controllers/InstagramController.js";
import { TikTokController } from "./controllers/TikTokController.js";

// New SOLID-compliant architecture
import { ServiceFactory } from "./core/container/ServiceFactory.js";
import { BusinessApiController } from "./core/api/controllers/BusinessApiController.js";
import { ReviewApiController } from "./core/api/controllers/ReviewApiController.js";
import { AnalyticsApiController } from "./core/api/controllers/AnalyticsApiController.js";
import { TaskApiController } from "./core/api/controllers/TaskApiController.js";

// Middleware
import { validateEnv } from "./config/env";
import {
  authenticate,
  requireAdminAuth,
  requireTeamAccess,
} from "./middleware/authMiddleware";
import { MarketPlatform } from "@prisma/client";

// Validate environment before starting
const env = validateEnv();

const app: express.Express = express();
const PORT = env.PORT;

// Configuration
const APIFY_TOKEN = env.APIFY_TOKEN;
const WEBHOOK_BASE_URL = env.WEBHOOK_BASE_URL || `http://localhost:${PORT}`;
const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
const HIKER_API_KEY = process.env.HIKER_API_KEY || "";
const LAMATOK_ACCESS_KEY = process.env.LAMATOK_ACCESS_KEY || "";

// =================== MIDDLEWARE SETUP ===================

app.use(cors());

// IMPORTANT: For Stripe webhooks, we need raw body
app.use("/webhooks/stripe", express.raw({ type: "application/json" }));

// JSON body parser for all other routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// =================== SERVICE INITIALIZATION ===================

// Legacy services (for webhooks)
let stripeWebhookController: StripeWebhookController;
let apifyWebhookController: ApifyWebhookController;
let platformConfigWebhookController: PlatformConfigWebhookController;
let orchestrator: SubscriptionOrchestrator;
let scheduleService: ApifyScheduleService;
let taskService: ApifyTaskService;
let syncService: ApifyDataSyncService;
let featureExtractor: FeatureExtractor;
let adminController: AdminController;
export let sentimentAnalyzer: SentimentAnalyzer;
let instagramDataService: InstagramDataService;
let tikTokDataService: TikTokDataService;
let instagramController: InstagramController;
let tikTokController: TikTokController;

// New SOLID-compliant services
let serviceFactory: ServiceFactory;
let businessController: BusinessApiController;
let reviewController: ReviewApiController;
let analyticsController: AnalyticsApiController;
let taskController: TaskApiController;

/**
 * Initialize all services (legacy + modern)
 */
async function initializeServices(): Promise<void> {
  try {
    console.log("🔧 Initializing services...");

    // Initialize legacy services (needed for webhooks)
    console.log("  → Initializing legacy webhook services...");
    stripeWebhookController = new StripeWebhookController(
      APIFY_TOKEN,
      WEBHOOK_BASE_URL,
      STRIPE_WEBHOOK_SECRET,
    );
    apifyWebhookController = new ApifyWebhookController(APIFY_TOKEN);

    // Initialize Platform Data Services first (needed by webhook controller)
    instagramDataService = new InstagramDataService(HIKER_API_KEY);
    tikTokDataService = new TikTokDataService(LAMATOK_ACCESS_KEY);

    platformConfigWebhookController = new PlatformConfigWebhookController(
      APIFY_TOKEN,
      WEBHOOK_BASE_URL,
      instagramDataService,
      tikTokDataService,
    );
    orchestrator = new SubscriptionOrchestrator(APIFY_TOKEN, WEBHOOK_BASE_URL);
    scheduleService = new ApifyScheduleService(APIFY_TOKEN, WEBHOOK_BASE_URL);
    taskService = new ApifyTaskService(APIFY_TOKEN, WEBHOOK_BASE_URL);
    syncService = new ApifyDataSyncService(APIFY_TOKEN);
    featureExtractor = new FeatureExtractor();
    sentimentAnalyzer = new SentimentAnalyzer();

    // Initialize Platform Controllers
    instagramController = new InstagramController(instagramDataService);
    tikTokController = new TikTokController(tikTokDataService);

    adminController = new AdminController(
      orchestrator,
      scheduleService,
      taskService,
      syncService,
      featureExtractor,
    );
    console.log("  ✅ Legacy webhook services initialized");

    // Initialize new SOLID-compliant services
    console.log("  → Initializing SOLID-compliant services...");
    serviceFactory = new ServiceFactory(APIFY_TOKEN);
    const container = serviceFactory.getContainer();

    businessController = new BusinessApiController(container);
    reviewController = new ReviewApiController(container);
    analyticsController = new AnalyticsApiController(container);
    taskController = new TaskApiController(container);
    console.log("  ✅ SOLID-compliant services initialized");

    console.log("✅ All services initialized successfully\n");
  } catch (error) {
    console.error("❌ Failed to initialize services:", error);
    throw error;
  }
}

// =================== HEALTH CHECK ===================

app.get("/health", (_req: Request, res: Response) => {
  const isInitializing = !(
    stripeWebhookController &&
    apifyWebhookController &&
    platformConfigWebhookController &&
    orchestrator &&
    scheduleService &&
    taskService &&
    serviceFactory &&
    analyticsController
  );

  if (isInitializing) {
    res.status(200).json({
      success: true,
      status: "starting",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: "Services initializing...",
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    port: PORT,
    architecture: "SOLID + Legacy Webhooks",
    services: {
      legacy: "ready",
      solid: "ready",
      analytics: "ready",
    },
  });
});

// =================== WEBHOOK ENDPOINTS (Legacy) ===================

/**
 * Stripe webhook endpoint
 * Handles subscription lifecycle events
 */
app.post("/webhooks/stripe", async (req: Request, res: Response) => {
  if (!stripeWebhookController) {
    res.status(503).json({ error: "Service not ready" });
    return;
  }
  await stripeWebhookController.handleWebhook(req, res);
});

/**
 * Apify webhook endpoint
 * Handles actor run completion events
 */
app.post("/webhooks/apify", async (req: Request, res: Response) => {
  if (!apifyWebhookController) {
    res.status(503).json({ error: "Service not ready" });
    return;
  }
  await apifyWebhookController.handleWebhook(req, res);
});

/**
 * Platform configuration webhook endpoint
 * Handles platform setup from dashboard
 */
app.post(
  "/api/webhooks/platform-configured",
  async (req: Request, res: Response) => {
    if (!platformConfigWebhookController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    await platformConfigWebhookController.handlePlatformConfigured(req, res);
  },
);

// =================== ANALYTICS ENDPOINTS (SOLID Architecture) ===================

/**
 * Google Analytics Endpoints
 */
app.get(
  "/api/analytics/google/:businessProfileId",
  async (req: Request, res: Response) => {
    if (!analyticsController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    req.query.platform = MarketPlatform.GOOGLE_MAPS;
    req.params.teamId = req.params.businessProfileId;
    await analyticsController.getAnalytics(req, res);
  },
);

app.post(
  "/api/analytics/google/:businessProfileId/process",
  async (req: Request, res: Response) => {
    if (!analyticsController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    req.body.platform = MarketPlatform.GOOGLE_MAPS;
    req.body.identifier = req.params.businessProfileId;
    req.body.teamId = req.params.businessProfileId;
    await analyticsController.processAnalytics(req, res);
  },
);

/**
 * Facebook Analytics Endpoints
 */
app.get(
  "/api/analytics/facebook/:businessProfileId",
  async (req: Request, res: Response) => {
    if (!analyticsController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    req.query.platform = MarketPlatform.FACEBOOK;
    req.params.teamId = req.params.businessProfileId;
    await analyticsController.getAnalytics(req, res);
  },
);

app.post(
  "/api/analytics/facebook/:businessProfileId/process",
  async (req: Request, res: Response) => {
    if (!analyticsController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    req.body.platform = MarketPlatform.FACEBOOK;
    req.body.identifier = req.params.businessProfileId;
    req.body.teamId = req.params.businessProfileId;
    await analyticsController.processAnalytics(req, res);
  },
);

/**
 * TripAdvisor Analytics Endpoints
 */
app.get(
  "/api/analytics/tripadvisor/:businessProfileId",
  async (req: Request, res: Response) => {
    if (!analyticsController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    req.query.platform = MarketPlatform.TRIPADVISOR;
    req.params.teamId = req.params.businessProfileId;
    await analyticsController.getAnalytics(req, res);
  },
);

app.post(
  "/api/analytics/tripadvisor/:businessProfileId/process",
  async (req: Request, res: Response) => {
    if (!analyticsController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    req.body.platform = MarketPlatform.TRIPADVISOR;
    req.body.identifier = req.params.businessProfileId;
    req.body.teamId = req.params.businessProfileId;
    await analyticsController.processAnalytics(req, res);
  },
);

/**
 * Booking.com Analytics Endpoints
 */
app.get(
  "/api/analytics/booking/:businessProfileId",
  async (req: Request, res: Response) => {
    if (!analyticsController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    req.query.platform = MarketPlatform.BOOKING;
    req.params.teamId = req.params.businessProfileId;
    await analyticsController.getAnalytics(req, res);
  },
);

app.post(
  "/api/analytics/booking/:businessProfileId/process",
  async (req: Request, res: Response) => {
    if (!analyticsController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    req.body.platform = MarketPlatform.BOOKING;
    req.body.identifier = req.params.businessProfileId;
    req.body.teamId = req.params.businessProfileId;
    await analyticsController.processAnalytics(req, res);
  },
);

// =================== DASHBOARD API ENDPOINTS (Read-Only) ===================

/**
 * Get sync status for team
 */
app.get(
  "/api/sync-status/:teamId",
  requireTeamAccess,
  async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const { prisma } = await import("@wirecrest/db");

      const recentSyncs = await prisma.syncRecord.findMany({
        where: { teamId },
        orderBy: { startedAt: "desc" },
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
      console.error("Error getting sync status:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * Get schedules for team
 */
app.get(
  "/api/schedules/:teamId",
  requireTeamAccess,
  async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;

      if (!scheduleService) {
        res.status(503).json({ error: "Service not ready" });
        return;
      }

      const schedules = await scheduleService.getTeamSchedules(teamId);
      res.json(schedules);
    } catch (error: any) {
      console.error("Error getting schedules:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// =================== PLATFORM SNAPSHOT ENDPOINTS ===================

app.post(
  "/api/instagram/snapshots",
  async (req: Request, res: Response) => {
    if (!instagramController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    await instagramController.triggerSnapshot(req, res);
  },
);

app.post(
  "/api/tiktok/snapshots",
  async (req: Request, res: Response) => {
    if (!tikTokController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    await tikTokController.triggerSnapshot(req, res);
  },
);

// =================== ADMIN API ENDPOINTS ===================

app.get(
  "/api/admin/teams",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    if (!adminController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    await adminController.getAllTeams(req, res);
  },
);

app.get(
  "/api/admin/teams/:teamId/status",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    if (!adminController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    await adminController.getTeamStatus(req, res);
  },
);

app.post(
  "/api/admin/teams/:teamId/setup",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    if (!adminController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    await adminController.triggerSubscriptionSetup(req, res);
  },
);

app.post(
  "/api/admin/teams/:teamId/platforms/:platform/sync",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    if (!adminController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    await adminController.triggerPlatformSync(req, res);
  },
);

app.post(
  "/api/admin/teams/:teamId/schedules/refresh",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    if (!adminController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    await adminController.refreshSchedules(req, res);
  },
);

app.delete(
  "/api/admin/teams/:teamId/schedules",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    if (!adminController) {
      res.status(503).json({ error: "Service not ready" });
      return;
    }
    await adminController.deleteSchedules(req, res);
  },
);

// Note: cleanup endpoint removed - method doesn't exist in AdminController

// =================== SERVER STARTUP ===================

async function startServer(): Promise<void> {
  console.log(
    "🎬 Starting Wirecrest Scraper Worker API (Hybrid Architecture)...",
  );
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🚪 Port: ${PORT}`);
  console.log(`📦 Node version: ${process.version}\n`);

  try {
    await initializeServices();

    app.listen(PORT, "0.0.0.0", () => {
      console.log("🎯 ===============================================");
      console.log(`🚀 Wirecrest Scraper Worker API v2.0`);
      console.log(`📡 Server running on http://0.0.0.0:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🏗️  Architecture: Hybrid (SOLID + Legacy Webhooks)`);
      console.log("🎯 ===============================================\n");

      console.log("📋 Health & Status:");
      console.log(`  ✅ Health check: GET http://localhost:${PORT}/health\n`);

      console.log("🔔 Webhook Endpoints (Legacy):");
      console.log(`  🔵 Stripe: POST http://localhost:${PORT}/webhooks/stripe`);
      console.log(`  🟣 Apify: POST http://localhost:${PORT}/webhooks/apify`);
      console.log(
        `  🟠 Platform Config: POST http://localhost:${PORT}/api/webhooks/platform-configured\n`,
      );

      console.log("📊 Analytics Endpoints (SOLID Architecture):");
      console.log(`  🟢 Google: `);
      console.log(`    GET  /api/analytics/google/:businessProfileId`);
      console.log(`    POST /api/analytics/google/:businessProfileId/process`);
      console.log(`  🔵 Facebook: `);
      console.log(`    GET  /api/analytics/facebook/:businessProfileId`);
      console.log(
        `    POST /api/analytics/facebook/:businessProfileId/process`,
      );
      console.log(`  🟠 TripAdvisor:`);
      console.log(`    GET  /api/analytics/tripadvisor/:businessProfileId`);
      console.log(
        `    POST /api/analytics/tripadvisor/:businessProfileId/process`,
      );
      console.log(`  🏨 Booking.com:`);
      console.log(`    GET  /api/analytics/booking/:businessProfileId`);
      console.log(
        `    POST /api/analytics/booking/:businessProfileId/process\n`,
      );

      console.log("🔐 Admin Endpoints:");
      console.log(`  GET    /api/admin/teams`);
      console.log(`  GET    /api/admin/teams/:teamId/status`);
      console.log(`  POST   /api/admin/teams/:teamId/setup`);
      console.log(`  POST   /api/admin/teams/:teamId/platforms/:platform/sync`);
      console.log(`  POST   /api/admin/teams/:teamId/schedules/refresh`);
      console.log(`  DELETE /api/admin/teams/:teamId/schedules`);
      console.log(`  POST   /api/admin/cleanup`);
      console.log(`  POST   /api/instagram/snapshots`);
      console.log(`  POST   /api/tiktok/snapshots\n`);

      console.log("✨ Features:");
      console.log("  ✅ SOLID Principles Applied");
      console.log("  ✅ Dependency Injection Enabled");
      console.log("  ✅ Repository Pattern Implemented");
      console.log("  ✅ Platform-Specific Analytics");
      console.log("  ✅ Period-Based Metrics (7 periods)");
      console.log("  ✅ Type-Safe with Prisma");
      console.log("  ✅ Legacy Webhook System Preserved\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

// Start the server
startServer();

export default app;
