import { z } from "zod";

const envSchema = z.object({
  // Core
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  // Database (required)
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Redis (required)
  REDIS_HOST: z.string().min(1),
  REDIS_USERNAME: z.string().default("default"),
  REDIS_PASSWORD: z.string().min(1),
  REDIS_PORT: z.coerce.number(),

  // Apify (required)
  APIFY_TOKEN: z.string().min(1, "APIFY_TOKEN is required"),
  WEBHOOK_BASE_URL: z.string().url().optional(),

  // Apify Actor IDs (required)
  APIFY_GOOGLE_REVIEWS_ACTOR_ID: z.string().min(1),
  APIFY_FACEBOOK_PROFILE_ACTOR_ID: z.string().min(1),
  APIFY_FACEBOOK_REVIEWS_ACTOR_ID: z.string().min(1),
  APIFY_BOOKING_PROFILE_ACTOR_ID: z.string().min(1),
  APIFY_BOOKING_REVIEWS_ACTOR_ID: z.string().min(1),
  APIFY_WEBHOOK_SECRET: z.string().min(1),

  // Performance/Polling
  POLLING_INTERVAL_MS: z.coerce.number().default(300000),
  ACTOR_MEMORY_LIMIT_MB: z.coerce.number().default(32768),

  // External API Keys (required)
  GOOGLE_API_KEY: z.string().min(1),
  HIKER_API_KEY: z.string().min(1),
  LAMATOK_ACCESS_KEY: z.string().min(1),

  // Stripe (required)
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),

  // Optional
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:");
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}
