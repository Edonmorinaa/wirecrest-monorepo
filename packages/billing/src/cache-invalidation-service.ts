/**
 * Centralized Cache Invalidation Service
 * Handles immediate cache invalidation when package/subscription changes occur
 */

import { PrismaClient } from '@prisma/client';
import { FeatureChecker } from './feature-checker';
import { FeatureAccessService } from './feature-access';
import { prisma } from '@wirecrest/db';

export interface CacheInvalidationOptions {
  teamId: string;
  reason: 'subscription_change' | 'plan_change' | 'package_change' | 'manual';
  metadata?: Record<string, any>;
}

export class CacheInvalidationService {
  private featureCheckers: Set<FeatureChecker> = new Set();
  private featureAccessServices: Set<FeatureAccessService> = new Set();

  /**
   * Register a feature checker for cache invalidation
   */
  registerFeatureChecker(checker: FeatureChecker): void {
    this.featureCheckers.add(checker);
  }

  /**
   * Register a feature access service for cache invalidation
   */
  registerFeatureAccessService(service: FeatureAccessService): void {
    this.featureAccessServices.add(service);
  }

  /**
   * Invalidate cache for a specific team immediately
   */
  async invalidateTeamCache(options: CacheInvalidationOptions): Promise<void> {
    const { teamId, reason, metadata } = options;

    console.log(`🗑️ Invalidating cache for team ${teamId} (reason: ${reason})`, metadata);

    try {
      // Invalidate all registered feature checkers
      for (const checker of this.featureCheckers) {
        checker.clearTeamCache(teamId);
      }

      // Invalidate all registered feature access services
      for (const service of this.featureAccessServices) {
        await service.invalidateCache(teamId);
      }

      // Log the cache invalidation
      await this.logCacheInvalidation(teamId, reason, metadata);

      console.log(`✅ Successfully invalidated cache for team ${teamId}`);
    } catch (error) {
      console.error(`❌ Failed to invalidate cache for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for multiple teams
   */
  async invalidateMultipleTeamCaches(
    teamIds: string[],
    reason: CacheInvalidationOptions['reason'],
    metadata?: Record<string, any>
  ): Promise<void> {
    console.log(`🗑️ Invalidating cache for ${teamIds.length} teams (reason: ${reason})`);

    const promises = teamIds.map(teamId => 
      this.invalidateTeamCache({ teamId, reason, metadata })
    );

    await Promise.all(promises);
    console.log(`✅ Successfully invalidated cache for ${teamIds.length} teams`);
  }

  /**
   * Clear all caches (nuclear option)
   */
  async clearAllCaches(reason: string = 'manual'): Promise<void> {
    console.log(`🗑️ Clearing all caches (reason: ${reason})`);

    try {
      // Clear all registered feature checkers
      for (const checker of this.featureCheckers) {
        checker.clearAllCache();
      }

      // Clear all registered feature access services
      for (const service of this.featureAccessServices) {
        await service.clearCache();
      }

      console.log(`✅ Successfully cleared all caches`);
    } catch (error) {
      console.error(`❌ Failed to clear all caches:`, error);
      throw error;
    }
  }

  /**
   * Log cache invalidation for audit purposes
   */
  private async logCacheInvalidation(
    teamId: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // You can implement logging to a database table here if needed
      // For now, we'll just log to console
      console.log(`📝 Cache invalidation logged: team=${teamId}, reason=${reason}`, metadata);
    } catch (error) {
      console.error('Failed to log cache invalidation:', error);
      // Don't throw here as logging failure shouldn't break the operation
    }
  }

  /**
   * Get cache invalidation statistics
   */
  async getCacheStats(): Promise<{
    registeredCheckers: number;
    registeredAccessServices: number;
  }> {
    return {
      registeredCheckers: this.featureCheckers.size,
      registeredAccessServices: this.featureAccessServices.size,
    };
  }
}

// Singleton instance
let cacheInvalidationService: CacheInvalidationService | null = null;

/**
 * Get the singleton cache invalidation service
 */
export function getCacheInvalidationService(): CacheInvalidationService {
  if (!cacheInvalidationService) {
    cacheInvalidationService = new CacheInvalidationService();
  }
  return cacheInvalidationService;
}

/**
 * Convenience function to invalidate team cache immediately
 */
export async function invalidateTeamCacheImmediately(
  teamId: string,
  reason: CacheInvalidationOptions['reason'] = 'manual',
  metadata?: Record<string, any>
): Promise<void> {
  const service = getCacheInvalidationService();
  await service.invalidateTeamCache({ teamId, reason, metadata });
}

/**
 * Convenience function to clear all caches immediately
 */
export async function clearAllCachesImmediately(reason: string = 'manual'): Promise<void> {
  const service = getCacheInvalidationService();
  await service.clearAllCaches(reason);
}
