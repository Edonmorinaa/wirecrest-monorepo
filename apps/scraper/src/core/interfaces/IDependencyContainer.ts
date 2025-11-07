/**
 * Dependency injection container interface
 * Follows Dependency Inversion Principle (DIP)
 */
export interface IDependencyContainer {
  // Repository registrations
  registerRepository<T>(token: string, implementation: T): void;
  getRepository<T>(token: string): T;

  // Service registrations
  registerService<T>(token: string, implementation: T): void;
  getService<T>(token: string): T;

  // Factory registrations
  registerFactory<T>(token: string, factory: () => T): void;
  getFactory<T>(token: string): () => T;
}

/**
 * Service tokens for dependency injection
 */
export const SERVICE_TOKENS = {
  // Repositories
  GOOGLE_BUSINESS_REPOSITORY: "GoogleBusinessRepository",
  FACEBOOK_BUSINESS_REPOSITORY: "FacebookBusinessRepository",
  TRIPADVISOR_BUSINESS_REPOSITORY: "TripAdvisorBusinessRepository",
  BOOKING_BUSINESS_REPOSITORY: "BookingBusinessRepository",
  TIKTOK_BUSINESS_REPOSITORY: "TikTokBusinessRepository",

  GOOGLE_REVIEW_REPOSITORY: "GoogleReviewRepository",
  FACEBOOK_REVIEW_REPOSITORY: "FacebookReviewRepository",
  TRIPADVISOR_REVIEW_REPOSITORY: "TripAdvisorReviewRepository",
  BOOKING_REVIEW_REPOSITORY: "BookingReviewRepository",
  TIKTOK_REVIEW_REPOSITORY: "TikTokReviewRepository",

  // Services
  GOOGLE_BUSINESS_SERVICE: "GoogleBusinessService",
  FACEBOOK_BUSINESS_SERVICE: "FacebookBusinessService",
  TRIPADVISOR_BUSINESS_SERVICE: "TripAdvisorBusinessService",
  BOOKING_BUSINESS_SERVICE: "BookingBusinessService",
  TIKTOK_BUSINESS_SERVICE: "TikTokBusinessService",

  GOOGLE_REVIEW_SERVICE: "GoogleReviewService",
  FACEBOOK_REVIEW_SERVICE: "FacebookReviewService",
  TRIPADVISOR_REVIEW_SERVICE: "TripAdvisorReviewService",
  BOOKING_REVIEW_SERVICE: "BookingReviewService",
  TIKTOK_REVIEW_SERVICE: "TikTokReviewService",

  GOOGLE_ANALYTICS_SERVICE: "GoogleAnalyticsService",
  FACEBOOK_ANALYTICS_SERVICE: "FacebookAnalyticsService",
  TRIPADVISOR_ANALYTICS_SERVICE: "TripAdvisorAnalyticsService",
  BOOKING_ANALYTICS_SERVICE: "BookingAnalyticsService",
  TIKTOK_ANALYTICS_SERVICE: "TikTokAnalyticsService",

  // External services
  ACTOR_MANAGER: "ActorManager",
  TEAM_SERVICE: "TeamService",
  SENTIMENT_ANALYZER: "SentimentAnalyzer",

  // Task tracking
  TASK_TRACKER_SERVICE: "TaskTrackerService",

  // Apify services
  APIFY_SERVICE: "ApifyService",
  BACKEND_ORCHESTRATOR: "BackendOrchestrator",
} as const;
