/**
 * Redis Cache Service
 * 
 * Provides Redis-based caching for feature data to avoid singleton instance issues.
 * All instances share the same Redis cache, ensuring cache consistency.
 */

import { StripeFeatureLookupKey } from './stripe-features';

// Dynamic import to avoid bundling Redis in client-side code
let createClient: any = null;

// Only import Redis on the server side
if (typeof window === 'undefined') {
  try {
    const redis = require('redis');
    createClient = redis.createClient;
  } catch (error) {
    console.warn('Redis not available:', error);
  }
}

export interface CacheEntry {
  features: string[];
  timestamp: number;
}

export class RedisCacheService {
  private client: any;
  private readonly CACHE_TTL = 5 * 60; // 5 minutes in seconds
  private readonly KEY_PREFIX = 'feature_cache:';

  constructor(redisUrl?: string) {
    if (!createClient) {
      console.warn('⚠️ Redis not available - using fallback cache');
      this.client = null;
      return;
    }

    this.client = createClient({
      username: 'default',
      password: '9lghDoXFaG4DdgmrEEKB8AIdgvme5wQm',
      socket: {
        host: 'redis-13297.crce198.eu-central-1-3.ec2.redns.redis-cloud.com',
        port: 13297
      }
    });

    this.client.on('error', (err: any) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('🔗 Connected to Redis');
    });

    this.client.on('disconnect', () => {
      console.log('🔌 Disconnected from Redis');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.client) {
      console.log('⚠️ Redis client not available');
      return;
    }
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  /**
   * Get cached features for a team
   */
  async getTeamFeatures(teamId: string): Promise<Set<StripeFeatureLookupKey> | null> {
    if (!this.client) {
      console.log('⚠️ Redis not available, skipping cache');
      return null;
    }
    
    try {
      await this.connect();
      
      const key = `${this.KEY_PREFIX}team:${teamId}`;
      const cached = await this.client.get(key);
      
      if (!cached) {
        return null;
      }

      const entry: CacheEntry = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - entry.timestamp > this.CACHE_TTL * 1000) {
        await this.client.del(key);
        return null;
      }

      console.log(`📦 Using Redis cached features for team ${teamId}:`, entry.features);
      return new Set(entry.features as StripeFeatureLookupKey[]);
    } catch (error) {
      console.error('❌ Error getting cached features from Redis:', error);
      return null;
    }
  }

  /**
   * Set cached features for a team
   */
  async setTeamFeatures(teamId: string, features: Set<StripeFeatureLookupKey>): Promise<void> {
    if (!this.client) {
      console.log('⚠️ Redis not available, skipping cache set');
      return;
    }
    
    try {
      await this.connect();
      
      const key = `${this.KEY_PREFIX}team:${teamId}`;
      const entry: CacheEntry = {
        features: Array.from(features),
        timestamp: Date.now()
      };

      await this.client.setEx(key, this.CACHE_TTL, JSON.stringify(entry));
      console.log(`💾 Cached features for team ${teamId} in Redis`);
    } catch (error) {
      console.error('❌ Error caching features in Redis:', error);
    }
  }

  /**
   * Clear cache for a specific team
   */
  async clearTeamCache(teamId: string): Promise<void> {
    if (!this.client) {
      console.log('⚠️ Redis not available, skipping cache clear');
      return;
    }
    
    try {
      await this.connect();
      
      const key = `${this.KEY_PREFIX}team:${teamId}`;
      const deleted = await this.client.del(key);
      
      if (deleted > 0) {
        console.log(`🗑️ Cleared Redis cache for team ${teamId}`);
      } else {
        console.log(`ℹ️ No Redis cache found for team ${teamId}`);
      }
    } catch (error) {
      console.error('❌ Error clearing team cache from Redis:', error);
    }
  }

  /**
   * Clear all feature caches
   */
  async clearAllCache(): Promise<void> {
    if (!this.client) {
      console.log('⚠️ Redis not available, skipping cache clear');
      return;
    }
    
    try {
      await this.connect();
      
      const pattern = `${this.KEY_PREFIX}team:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️ Cleared all Redis feature caches (${keys.length} entries)`);
      } else {
        console.log(`ℹ️ No Redis feature caches found to clear`);
      }
    } catch (error) {
      console.error('❌ Error clearing all caches from Redis:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ totalKeys: number; memoryUsage: string }> {
    if (!this.client) {
      return { totalKeys: 0, memoryUsage: 'Redis not available' };
    }
    
    try {
      await this.connect();
      
      const pattern = `${this.KEY_PREFIX}team:*`;
      const keys = await this.client.keys(pattern);
      
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';
      
      return {
        totalKeys: keys.length,
        memoryUsage
      };
    } catch (error) {
      console.error('❌ Error getting cache stats from Redis:', error);
      return { totalKeys: 0, memoryUsage: 'unknown' };
    }
  }
}

// Global Redis cache instance
let globalRedisCache: RedisCacheService | null = null;

/**
 * Get or create the global Redis cache instance
 */
export function getGlobalRedisCache(): RedisCacheService {
  if (!globalRedisCache) {
    console.log('🌍 Creating global Redis cache instance');
    globalRedisCache = new RedisCacheService();
  } else {
    console.log('🌍 Using existing global Redis cache instance');
  }
  return globalRedisCache;
}

/**
 * Reset the global Redis cache instance
 */
export function resetGlobalRedisCache(): void {
  console.log('🔄 Resetting global Redis cache instance');
  globalRedisCache = null;
}
