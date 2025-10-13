/**
 * Backend Feature Gate Middleware
 * Express middleware for API route protection
 */

import { Request, Response, NextFunction } from 'express';
import { FeatureAccessService } from '../feature-access';
import { FeatureFlag } from '../feature-flags';

export interface FeatureGateOptions {
  features: FeatureFlag[];
  requireAll?: boolean; // If true, requires ALL features; if false, requires ANY
  onDenied?: (req: Request, res: Response, missingFeatures: string[]) => void;
}

/**
 * Create feature gate middleware
 */
export function createFeatureGate(options: FeatureGateOptions) {
  const { features, requireAll = true, onDenied } = options;
  const service = new FeatureAccessService();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.user?.teamId || req.headers['x-team-id'] as string;
      
      if (!teamId) {
        return res.status(401).json({ 
          error: 'Team ID required',
          code: 'MISSING_TEAM_ID'
        });
      }

      // Check features
      const hasAccess = await service.hasFeatures(teamId, features);
      
      // Determine if access is granted
      const hasRequiredAccess = requireAll 
        ? Object.values(hasAccess).every(Boolean)
        : Object.values(hasAccess).some(Boolean);

      if (!hasRequiredAccess) {
        const missingFeatures = features.filter(feature => !hasAccess[feature]);
        
        if (onDenied) {
          return onDenied(req, res, missingFeatures);
        }

        return res.status(403).json({
          error: 'Feature not available',
          missingFeatures,
          upgradeRequired: true,
          code: 'FEATURE_NOT_AVAILABLE'
        });
      }

      next();
    } catch (error) {
      console.error('Feature gate error:', error);
      res.status(500).json({ 
        error: 'Feature check failed',
        code: 'FEATURE_CHECK_ERROR'
      });
    }
  };
}

/**
 * Platform-specific feature gate
 */
export function createPlatformGate(platform: string) {
  const service = new FeatureAccessService();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.user?.teamId || req.headers['x-team-id'] as string;
      
      if (!teamId) {
        return res.status(401).json({ 
          error: 'Team ID required',
          code: 'MISSING_TEAM_ID'
        });
      }

      const hasAccess = await service.canAccessPlatform(teamId, platform);
      
      if (!hasAccess) {
        return res.status(403).json({
          error: `Platform '${platform}' not available`,
          platform,
          upgradeRequired: true,
          code: 'PLATFORM_NOT_AVAILABLE'
        });
      }

      next();
    } catch (error) {
      console.error('Platform gate error:', error);
      res.status(500).json({ 
        error: 'Platform check failed',
        code: 'PLATFORM_CHECK_ERROR'
      });
    }
  };
}

/**
 * Multi-location feature gate
 */
export function createMultiLocationGate() {
  const service = new FeatureAccessService();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.user?.teamId || req.headers['x-team-id'] as string;
      
      if (!teamId) {
        return res.status(401).json({ 
          error: 'Team ID required',
          code: 'MISSING_TEAM_ID'
        });
      }

      const hasAccess = await service.canAccessMultiLocation(teamId);
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Multi-location features not available',
          upgradeRequired: true,
          code: 'MULTI_LOCATION_NOT_AVAILABLE'
        });
      }

      next();
    } catch (error) {
      console.error('Multi-location gate error:', error);
      res.status(500).json({ 
        error: 'Multi-location check failed',
        code: 'MULTI_LOCATION_CHECK_ERROR'
      });
    }
  };
}

/**
 * API access feature gate
 */
export function createAPIGate() {
  const service = new FeatureAccessService();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.user?.teamId || req.headers['x-team-id'] as string;
      
      if (!teamId) {
        return res.status(401).json({ 
          error: 'Team ID required',
          code: 'MISSING_TEAM_ID'
        });
      }

      const hasAccess = await service.canAccessAPI(teamId);
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'API access not available',
          upgradeRequired: true,
          code: 'API_ACCESS_NOT_AVAILABLE'
        });
      }

      next();
    } catch (error) {
      console.error('API gate error:', error);
      res.status(500).json({ 
        error: 'API access check failed',
        code: 'API_ACCESS_CHECK_ERROR'
      });
    }
  };
}

/**
 * Pre-configured gates for common use cases
 */
export const GOOGLE_REVIEWS_GATE = createPlatformGate('google');
export const FACEBOOK_REVIEWS_GATE = createPlatformGate('facebook');
export const TRIPADVISOR_REVIEWS_GATE = createPlatformGate('tripadvisor');
export const BOOKING_REVIEWS_GATE = createPlatformGate('booking');
export const YELP_REVIEWS_GATE = createPlatformGate('yelp');

export const MULTI_LOCATION_GATE = createMultiLocationGate();
export const API_ACCESS_GATE = createAPIGate();

export const ANALYTICS_GATE = createFeatureGate({
  features: ['advanced_analytics' as FeatureFlag],
  requireAll: false
});

export const AUTOMATION_GATE = createFeatureGate({
  features: ['automation' as FeatureFlag, 'real_time_alerts' as FeatureFlag],
  requireAll: false
});
