import Redis from 'ioredis';

/**
 * Redis client for general caching (not feature flags)
 */
let redis: Redis | null = null;

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      redis.on('error', (error) => {
        console.error('Redis connection error:', error);
      });

      redis.on('connect', () => {
        console.log('Redis connected successfully');
      });
    } catch (error) {
      console.error('Failed to create Redis client:', error);
    }
  }
  
  return redis;
}
