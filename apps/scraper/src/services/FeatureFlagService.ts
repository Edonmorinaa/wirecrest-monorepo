import { PrismaClient } from '@prisma/client';
import { 
  createSimpleFeatureChecker,
  createStripeEntitlementsService,
  SimpleFeatureChecker,
  StripeEntitlementsService,
  FeatureKey,
  Feature
} from '@wirecrest/feature-flags';
import Redis from 'ioredis';

/**
 * Feature flag service for the scraper application
 * Uses the new Stripe Entitlements-based feature flag system
 */
export class FeatureFlagService {
  private prisma: PrismaClient;
  private redis: Redis | null;
  private stripeService: StripeEntitlementsService;
  private featureChecker: SimpleFeatureChecker;
  private cache: Map<string, { features: Set<FeatureKey>; expiresAt: number }> = new Map();
  private defaultTtl: number = 300; // 5 minutes

  constructor(prisma: PrismaClient, redis?: Redis) {
    this.prisma = prisma;
    this.redis = redis || null;
    
    // Initialize Stripe Entitlements service
    this.stripeService = createStripeEntitlementsService({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
      cacheTTL: 300, // 5 minutes
    });

    // Initialize feature checker
    this.featureChecker = createSimpleFeatureChecker(
      this.prisma,
      this.stripeService
    );
  }

  /**
   * Check if a feature is enabled for a tenant
   * @param tenantId - Tenant ID (team slug or ID)
   * @param feature - Feature key
   * @returns Promise<boolean>
   */
  async isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
    try {
      const result = await this.featureChecker.checkFeature(tenantId, feature as FeatureKey);
      return result.hasAccess;
    } catch (error) {
      console.error(`Error checking feature ${feature} for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Check if a platform is enabled for a tenant
   * @param tenantId - Tenant ID
   * @param platform - Platform name (google, facebook, tripadvisor, booking, instagram, tiktok)
   * @returns Promise<boolean>
   */
  async isPlatformEnabled(tenantId: string, platform: string): Promise<boolean> {
    try {
      // Map platform names to feature keys
      const platformFeatureMap: Record<string, FeatureKey> = {
        google: Feature.Google.Overview,
        facebook: Feature.Facebook.Overview,
        tripadvisor: Feature.TripAdvisor.Overview,
        booking: Feature.Booking.Overview,
        instagram: Feature.Instagram.Overview,
        tiktok: Feature.TikTok.Overview,
      };

      const featureKey = platformFeatureMap[platform.toLowerCase()];
      if (!featureKey) {
        console.warn(`Unknown platform: ${platform}`);
        return false;
      }

      const result = await this.featureChecker.checkFeature(tenantId, featureKey);
      return result.hasAccess;
    } catch (error) {
      console.error(`Error checking platform ${platform} for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Get all features for a tenant with caching
   * @param tenantId - Tenant ID
   * @returns Promise<Record<string, boolean>>
   */
  async getTenantFeatures(tenantId: string): Promise<Record<string, boolean>> {
    try {
      // Check cache first
      const cached = this.cache.get(tenantId);
      if (cached && cached.expiresAt > Date.now()) {
        const featuresObject: Record<string, boolean> = {};
        // Flatten feature keys from the Feature object
        const allFeatureKeys = Object.values(Feature)
          .flatMap(platform => Object.values(platform));
        
        allFeatureKeys.forEach((featureKey) => {
          featuresObject[featureKey] = cached.features.has(featureKey);
        });
        
        return featuresObject;
      }

      // Get features from Stripe via feature checker
      const features = await this.featureChecker.getTeamFeatures(tenantId);

      // Cache the result
      this.cache.set(tenantId, {
        features,
        expiresAt: Date.now() + this.defaultTtl * 1000
      });

      // Convert Set to object
      const featuresObject: Record<string, boolean> = {};
      // Flatten feature keys from the Feature object
      const allFeatureKeys = Object.values(Feature)
        .flatMap(platform => Object.values(platform));
      
      allFeatureKeys.forEach((featureKey) => {
        featuresObject[featureKey] = features.has(featureKey);
      });

      return featuresObject;
    } catch (error) {
      console.error(`Error getting features for tenant ${tenantId}:`, error);
      return {};
    }
  }

  /**
   * Get scrape interval for a tenant (deprecated - use subscription metadata)
   * @param tenantId - Tenant ID
   * @returns Promise<number> - Default 24 hours
   */
  async getScrapeInterval(tenantId: string): Promise<number> {
    // With the new system, scrape intervals should be managed through
    // subscription metadata or separate configuration
    // For now, return a default value
    return 24; // 24 hours default
  }

  /**
   * Check multiple features at once
   * @param tenantId - Tenant ID
   * @param features - Array of feature keys
   * @returns Promise<Record<string, boolean>>
   */
  async checkFeatures(tenantId: string, features: string[]): Promise<Record<string, boolean>> {
    try {
      const results = await this.featureChecker.checkFeatures(
        tenantId,
        features as FeatureKey[]
      );

      const featuresObject: Record<string, boolean> = {};
      Object.entries(results).forEach(([key, result]) => {
        featuresObject[key] = result.hasAccess;
      });

      return featuresObject;
    } catch (error) {
      console.error(`Error checking features for tenant ${tenantId}:`, error);
      return {};
    }
  }

  /**
   * Invalidate cache for a tenant
   * @param tenantId - Tenant ID
   */
  async invalidateCache(tenantId: string): Promise<void> {
    this.cache.delete(tenantId);
    await this.featureChecker.invalidateTeamCache(tenantId);
  }

  /**
   * Get all enabled platforms for a tenant
   * @param tenantId - Tenant ID
   * @returns Promise<string[]> - Array of enabled platform names
   */
  async getEnabledPlatforms(tenantId: string): Promise<string[]> {
    try {
      const platforms = ['google', 'facebook', 'tripadvisor', 'booking', 'instagram', 'tiktok'];
      const enabledPlatforms: string[] = [];

      for (const platform of platforms) {
        const isEnabled = await this.isPlatformEnabled(tenantId, platform);
        if (isEnabled) {
          enabledPlatforms.push(platform);
        }
      }

      return enabledPlatforms;
    } catch (error) {
      console.error(`Error getting enabled platforms for tenant ${tenantId}:`, error);
      return [];
    }
  }
}


