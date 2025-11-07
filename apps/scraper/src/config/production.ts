import { z } from "zod";

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  // Database
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Monitoring
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  ENABLE_METRICS: z.coerce.boolean().default(true),

  // Performance
  MAX_CONCURRENT_REVIEWS: z.coerce.number().default(10),
  BATCH_SIZE: z.coerce.number().default(50),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),

  // Security
  CORS_ORIGIN: z.string().default("*"),
  ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(true),

  // Health checks
  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().default(60000),

  // Apify
  APIFY_TOKEN: z.string().optional(),
});

export type Config = z.infer<typeof envSchema>;

class ConfigService {
  private static instance: ConfigService;
  private config: Config;

  private constructor() {
    try {
      this.config = envSchema.parse(process.env);
      this.validateProductionConfig();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Configuration validation failed:");
        error.errors.forEach((err) => {
          console.error(`  - ${err.path.join(".")}: ${err.message}`);
        });
        process.exit(1);
      }
      throw error;
    }
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private validateProductionConfig(): void {
    if (this.config.NODE_ENV === "production") {
      const requiredVars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "REDIS_URL",
      ];

      const missing = requiredVars.filter((key) => !process.env[key]);
      if (missing.length > 0) {
        throw new Error(
          `Missing required production environment variables: ${missing.join(", ")}`,
        );
      }

      // Validate secure settings for production
      if (this.config.CORS_ORIGIN === "*") {
        console.warn(
          '⚠️  CORS_ORIGIN is set to "*" in production. Consider restricting to specific domains.',
        );
      }

      if (this.config.LOG_LEVEL === "debug") {
        console.warn(
          '⚠️  LOG_LEVEL is set to "debug" in production. Consider using "info" or "warn".',
        );
      }
    }
  }

  get(): Config {
    return this.config;
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === "production";
  }

  isDevelopment(): boolean {
    return this.config.NODE_ENV === "development";
  }

  getDbConfig() {
    return {
      url: this.config.SUPABASE_URL,
      serviceKey: this.config.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  getRedisConfig() {
    return {
      url: this.config.REDIS_URL,
      password: this.config.REDIS_PASSWORD,
    };
  }

  getRateLimitConfig() {
    return {
      windowMs: this.config.RATE_LIMIT_WINDOW_MS,
      maxRequests: this.config.RATE_LIMIT_MAX_REQUESTS,
    };
  }

  getPerformanceConfig() {
    return {
      maxConcurrentReviews: this.config.MAX_CONCURRENT_REVIEWS,
      batchSize: this.config.BATCH_SIZE,
      requestTimeout: this.config.REQUEST_TIMEOUT_MS,
    };
  }
}

export const config = ConfigService.getInstance();
