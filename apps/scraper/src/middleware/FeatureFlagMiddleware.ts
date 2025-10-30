// apps/scraper/src/middleware/FeatureFlagMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { getGlobalFeatureChecker, StripeFeatureLookupKeys } from '@wirecrest/billing/server';
import { logger } from '../utils/logger';

/**
 * Feature flag middleware for the scraper application
 * Uses @wirecrest/billing directly for feature checks
 */
export class FeatureFlagMiddleware {
  private featureChecker = getGlobalFeatureChecker();

  constructor() {}

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

        const features = await this.featureChecker.getTeamFeatures(teamId);
        const isEnabled = features.has(feature as any);
        
        if (!isEnabled) {
          logger.warn(`Feature ${feature} is not enabled for team ${teamId}`);
          return res.status(403).json({
            success: false,
            error: `Feature ${feature} is not enabled for this team`,
            feature,
            teamId
          });
        }

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

        // Map platform names to billing feature names
        const platformFeatureMap: Record<string, string> = {
          google: StripeFeatureLookupKeys.GOOGLE_REVIEWS,
          facebook: StripeFeatureLookupKeys.FACEBOOK_REVIEWS,
          tripadvisor: StripeFeatureLookupKeys.TRIPADVISOR_REVIEWS,
          booking: StripeFeatureLookupKeys.BOOKING_REVIEWS,
          instagram: 'instagram_analytics',
          tiktok: 'tiktok_analytics'
        };

        const featureName = platformFeatureMap[platform.toLowerCase()];
        if (!featureName) {
          return res.status(400).json({
            success: false,
            error: `Unknown platform: ${platform}`
          });
        }

        const features = await this.featureChecker.getTeamFeatures(teamId);
        const isEnabled = features.has(featureName as any);
        
        if (!isEnabled) {
          logger.warn(`Platform ${platform} is not enabled for team ${teamId}`);
          return res.status(403).json({
            success: false,
            error: `Platform ${platform} is not enabled for this team`,
            platform,
            teamId
          });
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

  // ... rest of the middleware methods with similar updates
}