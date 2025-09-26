import { Redis } from '@upstash/redis'

// Server-side only Redis client
let redisClient: Redis;

// Only initialize Redis on the server side
if (typeof window === 'undefined') {
  // Server-side initialization
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Redis environment variables not found. Caching will be disabled.');
    // Create a mock Redis client that does nothing
    redisClient = {
      get: async () => null,
      set: async () => null,
      setex: async () => null,
      del: async () => null,
      keys: async () => [],
    } as any;
  } else {
    // Validate Redis URL format
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    try {
      redisClient = new Redis({
        url: redisUrl,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log('✅ Redis client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      // Create a mock client to prevent crashes
      redisClient = {
        get: async () => null,
        set: async () => null,
        setex: async () => null,
        del: async () => null,
        keys: async () => [],
      } as any;
    }
  }
} else {
  // Client-side - create a mock client that does nothing
  redisClient = {
    get: async () => null,
    set: async () => null,
    setex: async () => null,
    del: async () => null,
    keys: async () => [],
  } as any;
}

// Export the Redis client
const redis = redisClient;

// Cache keys
export const CACHE_KEYS = {
  // Google Business Profile
  GOOGLE_BUSINESS_PROFILE: (teamId: string) => `google:business_profile:${teamId}`,
  GOOGLE_BUSINESS_PROFILE_BY_PLACE_ID: (placeId: string) => `google:business_profile:place:${placeId}`,
  
  // Google Reviews
  GOOGLE_REVIEWS: (teamId: string, page: number = 1, limit: number = 10, filterKey: string = '') => 
    `google:reviews:${teamId}:${page}:${limit}${filterKey ? `:${filterKey}` : ''}`,
  GOOGLE_REVIEWS_ANALYTICS: (teamId: string) => `google:reviews:analytics:${teamId}`,
  GOOGLE_REVIEWS_DATE_RANGE: (teamId: string, startDate: string, endDate: string) => 
    `google:reviews:date_range:${teamId}:${startDate}:${endDate}`,
  GOOGLE_REVIEW_METADATA: (reviewId: string) => `google:review:metadata:${reviewId}`,
  
  // Facebook Business Profile
  FACEBOOK_BUSINESS_PROFILE: (teamId: string) => `facebook_business_profile:${teamId}`,
  
  // General Reviews
  REVIEWS: (teamId: string) => `reviews:${teamId}`,
  
  // Cache invalidation patterns
  GOOGLE_BUSINESS_PROFILE_PATTERN: (teamId: string) => `google:business_profile:${teamId}*`,
  GOOGLE_REVIEWS_PATTERN: (teamId: string) => `google:reviews:${teamId}*`,
} as const;

// Cache TTL in seconds
export const CACHE_TTL = {
  BUSINESS_PROFILE: 12 * 60 * 60, // 12 hours
  REVIEWS: 2 * 60 * 60, // 2 hours
  REVIEWS_ANALYTICS: 4 * 60 * 60, // 4 hours
  REVIEW_METADATA: 1 * 60 * 60, // 1 hour
} as const;

// Generic cache get function
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await redis.get(key);
    
    // Handle different Redis response formats
    if (!cached) return null;
    
    // If it's already an object, return it directly
    if (typeof cached === 'object' && cached !== null) {
      return cached as T;
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof cached === 'string') {
      return JSON.parse(cached);
    }
    
    // Fallback: return as is
    return cached as T;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

// Generic cache set function
export const setCache = async <T>(key: string, data: T, ttl: number): Promise<void> => {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Redis set error:', error);
  }
};

// Cache invalidation function
export const invalidateCache = async (pattern: string): Promise<void> => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Redis invalidation error:', error);
  }
};

// Cache invalidation for Google business profile
export const invalidateGoogleBusinessProfileCache = async (teamId: string): Promise<void> => {
  await invalidateCache(CACHE_KEYS.GOOGLE_BUSINESS_PROFILE_PATTERN(teamId));
};

// Cache invalidation for Google reviews
export const invalidateGoogleReviewsCache = async (teamId: string): Promise<void> => {
  await invalidateCache(CACHE_KEYS.GOOGLE_REVIEWS_PATTERN(teamId));
};

// Cache invalidation for all Google data
export const invalidateAllGoogleCache = async (teamId: string): Promise<void> => {
  await Promise.all([
    invalidateGoogleBusinessProfileCache(teamId),
    invalidateGoogleReviewsCache(teamId),
  ]);
};

// API route for client-side cache operations
export const clientCache = {
  async get<T>(key: string): Promise<T | null> {
    const response = await fetch(`/api/cache?key=${encodeURIComponent(key)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.value;
  },
  
  async set<T>(key: string, data: T, ttl = CACHE_TTL): Promise<void> {
    await fetch('/api/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: data, ttl }),
    });
  },
  
  async clear(key: string): Promise<void> {
    await fetch(`/api/cache?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }
};

export default redis;