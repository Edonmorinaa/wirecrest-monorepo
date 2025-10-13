import { Request, Response, NextFunction } from 'express';
import { FeatureFlagService } from '../services/FeatureFlagService';
import { logger } from '../utils/logger';

/**
 * Feature flag middleware for the scraper application
 * Checks feature flags before allowing scraping operations
 */
export class FeatureFlagMiddleware {
  private featureFlagService: FeatureFlagService;

  constructor(featureFlagService: FeatureFlagService) {
    this.featureFlagService = featureFlagService;
  }

  /**
   * Middleware to check if a specific feature is enabled
   * @param feature - Feature key to check
   * @returns Express middleware function
   */
  requireFeature(feature: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const teamId = req.params.teamId || req.body.teamId;
        
        if (!teamId) {
          return res.status(400).json({
            success: false,
            error: 'Team ID is required'
          });
        }

        const isEnabled = await this.featureFlagService.isFeatureEnabled(teamId, feature);
        
        if (!isEnabled) {
          logger.warn(`Feature ${feature} is not enabled for team ${teamId}`);
          return res.status(403).json({
            success: false,
            error: `Feature ${feature} is not enabled for this team`,
            feature,
            teamId
          });
        }

        // Add feature flag info to request
        req.featureFlags = req.featureFlags || {};
        req.featureFlags[feature] = true;

        next();
      } catch (error) {
        logger.error(`Error checking feature ${feature}:`, error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  }

  /**
   * Middleware to check if a platform is enabled
   * @param platform - Platform name to check
   * @returns Express middleware function
   */
  requirePlatform(platform: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const teamId = req.params.teamId || req.body.teamId;
        
        if (!teamId) {
          return res.status(400).json({
            success: false,
            error: 'Team ID is required'
          });
        }

        const isEnabled = await this.featureFlagService.isPlatformEnabled(teamId, platform);
        
        if (!isEnabled) {
          logger.warn(`Platform ${platform} is not enabled for team ${teamId}`);
          return res.status(403).json({
            success: false,
            error: `Platform ${platform} is not enabled for this team`,
            platform,
            teamId
          });
        }

        // Add platform info to request
        req.platforms = req.platforms || [];
        if (!req.platforms.includes(platform)) {
          req.platforms.push(platform);
        }

        next();
      } catch (error) {
        logger.error(`Error checking platform ${platform}:`, error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  }

  /**
   * Middleware to check multiple features (all must be enabled)
   * @param features - Array of feature keys to check
   * @returns Express middleware function
   */
  requireAllFeatures(features: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const teamId = req.params.teamId || req.body.teamId;
        
        if (!teamId) {
          return res.status(400).json({
            success: false,
            error: 'Team ID is required'
          });
        }

        const results = await Promise.all(
          features.map(feature => 
            this.featureFlagService.isFeatureEnabled(teamId, feature)
          )
        );

        const disabledFeatures = features.filter((_, index) => !results[index]);
        
        if (disabledFeatures.length > 0) {
          logger.warn(`Features ${disabledFeatures.join(', ')} are not enabled for team ${teamId}`);
          return res.status(403).json({
            success: false,
            error: `Features ${disabledFeatures.join(', ')} are not enabled for this team`,
            disabledFeatures,
            teamId
          });
        }

        // Add feature flags info to request
        req.featureFlags = req.featureFlags || {};
        features.forEach(feature => {
          req.featureFlags![feature] = true;
        });

        next();
      } catch (error) {
        logger.error(`Error checking features ${features.join(', ')}:`, error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  }

  /**
   * Middleware to check multiple features (any must be enabled)
   * @param features - Array of feature keys to check
   * @returns Express middleware function
   */
  requireAnyFeature(features: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const teamId = req.params.teamId || req.body.teamId;
        
        if (!teamId) {
          return res.status(400).json({
            success: false,
            error: 'Team ID is required'
          });
        }

        const results = await Promise.all(
          features.map(feature => 
            this.featureFlagService.isFeatureEnabled(teamId, feature)
          )
        );

        const hasAnyEnabled = results.some(result => result);
        
        if (!hasAnyEnabled) {
          logger.warn(`None of the features ${features.join(', ')} are enabled for team ${teamId}`);
          return res.status(403).json({
            success: false,
            error: `None of the features ${features.join(', ')} are enabled for this team`,
            features,
            teamId
          });
        }

        // Add enabled features to request
        req.featureFlags = req.featureFlags || {};
        features.forEach((feature, index) => {
          if (results[index]) {
            req.featureFlags![feature] = true;
          }
        });

        next();
      } catch (error) {
        logger.error(`Error checking features ${features.join(', ')}:`, error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  }

  /**
   * Middleware to add feature flag information to request
   * @returns Express middleware function
   */
  addFeatureFlagInfo() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const teamId = req.params.teamId || req.body.teamId;
        
        if (!teamId) {
          return next();
        }

        // Get all features for the team
        const features = await this.featureFlagService.getTenantFeatures(teamId);
        const scrapeInterval = await this.featureFlagService.getScrapeInterval(teamId);

        // Add feature flag info to request
        req.featureFlags = features;
        req.scrapeInterval = scrapeInterval;

        next();
      } catch (error) {
        logger.error(`Error adding feature flag info for team ${req.params.teamId}:`, error);
        // Don't fail the request, just continue without feature flag info
        next();
      }
    };
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      featureFlags?: Record<string, boolean>;
      platforms?: string[];
      scrapeInterval?: number;
    }
  }
}
