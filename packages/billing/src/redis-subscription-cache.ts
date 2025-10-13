/**
 * Redis Subscription Cache Service
 * Caches subscription data from Stripe to reduce API calls
 * TTL: 5 minutes
 */

import { createClient, RedisClientType } from 'redis';

export interface CachedSubscription {
  tier: string;
  status: string;
  stripeSubscriptionId: string | null;
  enabledFeatures: string[];
  includedSeats: number;
  includedLocations: number;
  includedRefreshes: number;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cachedAt: Date;
}

export class SubscriptionCacheService {
  private client: RedisClientType | null = null;
  private readonly TTL = 300; // 5 minutes in seconds
  private readonly KEY_PREFIX = 'subscription:';
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    // Lazy initialization - only connect when needed
  }

  /**
   * Ensure Redis connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (this.client?.isOpen) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ [Redis] Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('❌ [Redis] Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('🔌 [Redis] Connected');
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 [Redis] Reconnecting...');
      });

      await this.client.connect();
    })();

    return this.connectionPromise;
  }

  /**
   * Get cached subscription for a team
   */
  async get(teamId: string): Promise<CachedSubscription | null> {
    try {
      await this.ensureConnection();
      
      const key = `${this.KEY_PREFIX}${teamId}`;
      const cached = await this.client!.get(key);
      
      if (!cached || typeof cached !== 'string') {
        console.log(`❌ [Redis Cache MISS] Team ${teamId}`);
        return null;
      }

      const parsed = JSON.parse(cached);
      
      // Convert date strings back to Date objects
      if (parsed.currentPeriodEnd) {
        parsed.currentPeriodEnd = new Date(parsed.currentPeriodEnd);
      }
      if (parsed.cachedAt) {
        parsed.cachedAt = new Date(parsed.cachedAt);
      }

      console.log(`✅ [Redis Cache HIT] Team ${teamId}`);
      return parsed;
    } catch (error) {
      console.error(`⚠️ [Redis] Get error for team ${teamId}:`, error);
      return null; // Fail gracefully - continue without cache
    }
  }

  /**
   * Set cached subscription for a team
   */
  async set(teamId: string, data: Omit<CachedSubscription, 'cachedAt'>): Promise<void> {
    try {
      await this.ensureConnection();
      
      const key = `${this.KEY_PREFIX}${teamId}`;
      const cacheData: CachedSubscription = {
        ...data,
        cachedAt: new Date(),
      };

      await this.client!.setEx(
        key,
        this.TTL,
        JSON.stringify(cacheData)
      );

      console.log(`💾 [Redis] Cached subscription for team ${teamId} (TTL: ${this.TTL}s)`);
    } catch (error) {
      console.error(`⚠️ [Redis] Set error for team ${teamId}:`, error);
      // Fail gracefully - continue without caching
    }
  }

  /**
   * Invalidate cached subscription for a team
   */
  async invalidate(teamId: string): Promise<void> {
    try {
      await this.ensureConnection();
      
      const key = `${this.KEY_PREFIX}${teamId}`;
      await this.client!.del(key);

      console.log(`🗑️ [Redis] Invalidated cache for team ${teamId}`);
    } catch (error) {
      console.error(`⚠️ [Redis] Invalidate error for team ${teamId}:`, error);
      // Fail gracefully
    }
  }

  /**
   * Invalidate all cached subscriptions
   */
  async invalidateAll(): Promise<void> {
    try {
      await this.ensureConnection();
      
      const keys = await this.client!.keys(`${this.KEY_PREFIX}*`);
      
      if (keys.length > 0) {
        await this.client!.del(keys);
        console.log(`🗑️ [Redis] Invalidated ${keys.length} cached subscriptions`);
      }
    } catch (error) {
      console.error('⚠️ [Redis] Invalidate all error:', error);
      // Fail gracefully
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ totalKeys: number; cacheHitRate?: number }> {
    try {
      await this.ensureConnection();
      
      const keys = await this.client!.keys(`${this.KEY_PREFIX}*`);
      
      return {
        totalKeys: keys.length,
      };
    } catch (error) {
      console.error('⚠️ [Redis] Stats error:', error);
      return { totalKeys: 0 };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      this.client = null;
      this.connectionPromise = null;
      console.log('🔌 [Redis] Disconnected');
    }
  }
}

// Singleton instance
let globalCacheService: SubscriptionCacheService | null = null;

/**
 * Get global cache service instance
 */
export function getGlobalCacheService(): SubscriptionCacheService {
  if (!globalCacheService) {
    globalCacheService = new SubscriptionCacheService();
  }
  return globalCacheService;
}

