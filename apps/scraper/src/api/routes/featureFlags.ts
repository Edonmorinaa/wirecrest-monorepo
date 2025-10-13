import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { FeatureFlagService } from '../../services/FeatureFlagService';
import { FeatureFlagMiddleware } from '../../middleware/FeatureFlagMiddleware';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * Feature flag routes for the scraper application
 */
export function createFeatureFlagRoutes(prisma: PrismaClient, redis?: any): Router {
  const featureFlagService = new FeatureFlagService(prisma, redis);
  const featureFlagMiddleware = new FeatureFlagMiddleware(featureFlagService);

  /**
   * GET /api/feature-flags/:teamId
   * Get all feature flags for a team
   */
  router.get('/:teamId', async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      
      const features = await featureFlagService.getTenantFeatures(teamId);
      const scrapeInterval = await featureFlagService.getScrapeInterval(teamId);
      
      res.json({
        success: true,
        teamId,
        features,
        scrapeInterval,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error getting feature flags for team ${req.params.teamId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/feature-flags/:teamId/check/:feature
   * Check if a specific feature is enabled
   */
  router.get('/:teamId/check/:feature', async (req: Request, res: Response) => {
    try {
      const { teamId, feature } = req.params;
      
      const isEnabled = await featureFlagService.isFeatureEnabled(teamId, feature);
      
      res.json({
        success: true,
        teamId,
        feature,
        enabled: isEnabled,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error checking feature ${req.params.feature} for team ${req.params.teamId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/feature-flags/:teamId/platform/:platform
   * Check if a platform is enabled
   */
  router.get('/:teamId/platform/:platform', async (req: Request, res: Response) => {
    try {
      const { teamId, platform } = req.params;
      
      const isEnabled = await featureFlagService.isPlatformEnabled(teamId, platform);
      
      res.json({
        success: true,
        teamId,
        platform,
        enabled: isEnabled,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error checking platform ${req.params.platform} for team ${req.params.teamId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/feature-flags/:teamId/invalidate
   * Invalidate cache for a team
   */
  router.post('/:teamId/invalidate', async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      
      await featureFlagService.invalidateCache(teamId);
      
      res.json({
        success: true,
        message: `Cache invalidated for team ${teamId}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error invalidating cache for team ${req.params.teamId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/feature-flags/stats
   * Get cache statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = featureFlagService.getCacheStats();
      
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting feature flag stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
}

/**
 * Example usage of feature flag middleware in scraping routes
 */
export function createScrapingRoutes(prisma: PrismaClient, redis?: any): Router {
  const featureFlagService = new FeatureFlagService(prisma, redis);
  const featureFlagMiddleware = new FeatureFlagMiddleware(featureFlagService);
  const router = Router();

  /**
   * POST /api/scrape/:teamId/:platform
   * Start scraping for a specific platform (with feature flag checks)
   */
  router.post('/:teamId/:platform', 
    featureFlagMiddleware.requirePlatform('google'), // Example: require Google platform
    async (req: Request, res: Response) => {
      try {
        const { teamId, platform } = req.params;
        
        // Check if platform is enabled
        const isEnabled = await featureFlagService.isPlatformEnabled(teamId, platform);
        if (!isEnabled) {
          return res.status(403).json({
            success: false,
            error: `Platform ${platform} is not enabled for this team`
          });
        }

        // Get scrape interval
        const scrapeInterval = await featureFlagService.getScrapeInterval(teamId);
        
        // Start scraping job
        logger.info(`Starting ${platform} scraping for team ${teamId} with interval ${scrapeInterval}h`);
        
        // TODO: Implement actual scraping logic here
        // const scrapingJob = await scrapingService.startScraping(teamId, platform, scrapeInterval);
        
        res.json({
          success: true,
          message: `Scraping started for ${platform}`,
          teamId,
          platform,
          scrapeInterval
        });
      } catch (error) {
        logger.error(`Error starting scraping for team ${req.params.teamId}, platform ${req.params.platform}:`, error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  );

  /**
   * POST /api/scrape/:teamId/bulk
   * Start bulk scraping for multiple platforms (with feature flag checks)
   */
  router.post('/:teamId/bulk',
    featureFlagMiddleware.addFeatureFlagInfo(),
    async (req: Request, res: Response) => {
      try {
        const { teamId } = req.params;
        const { platforms } = req.body;
        
        if (!platforms || !Array.isArray(platforms)) {
          return res.status(400).json({
            success: false,
            error: 'Platforms array is required'
          });
        }

        const results = [];
        
        for (const platform of platforms) {
          const isEnabled = await featureFlagService.isPlatformEnabled(teamId, platform);
          if (isEnabled) {
            // Start scraping for this platform
            logger.info(`Starting ${platform} scraping for team ${teamId}`);
            results.push({ platform, status: 'started' });
          } else {
            logger.warn(`Platform ${platform} is not enabled for team ${teamId}`);
            results.push({ platform, status: 'skipped', reason: 'not_enabled' });
          }
        }

        res.json({
          success: true,
          message: 'Bulk scraping initiated',
          teamId,
          results
        });
      } catch (error) {
        logger.error(`Error starting bulk scraping for team ${req.params.teamId}:`, error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  );

  return router;
}

export default router;
