import { DependencyContainer } from './DependencyContainer';
import { SERVICE_TOKENS } from '../interfaces/IDependencyContainer';

// Export SERVICE_TOKENS for external use
export { SERVICE_TOKENS };

// Import repositories
import { GoogleBusinessRepository } from '../repositories/GoogleBusinessRepository';
import { GoogleReviewRepository } from '../repositories/GoogleReviewRepository';
import { FacebookBusinessRepository } from '../repositories/FacebookBusinessRepository';
import { FacebookReviewRepository } from '../repositories/FacebookReviewRepository';
import { TripAdvisorBusinessRepository } from '../repositories/TripAdvisorBusinessRepository';
import { TripAdvisorReviewRepository } from '../repositories/TripAdvisorReviewRepository';
import { BookingBusinessRepository } from '../repositories/BookingBusinessRepository';
import { BookingReviewRepository } from '../repositories/BookingReviewRepository';
import { TikTokBusinessRepository } from '../repositories/TikTokBusinessRepository';
import { TikTokReviewRepository } from '../repositories/TikTokReviewRepository';

// Import services
import { GoogleBusinessService } from '../services/GoogleBusinessService';
import { GoogleReviewService } from '../services/GoogleReviewService';
import { GoogleAnalyticsService } from '../services/GoogleAnalyticsService';
import { FacebookBusinessService } from '../services/FacebookBusinessService';
import { FacebookReviewService } from '../services/FacebookReviewService';
import { FacebookAnalyticsService } from '../services/FacebookAnalyticsService';
import { TripAdvisorBusinessService } from '../services/TripAdvisorBusinessService';
import { TripAdvisorReviewService } from '../services/TripAdvisorReviewService';
import { TripAdvisorAnalyticsService } from '../services/TripAdvisorAnalyticsService';
import { BookingBusinessService } from '../services/BookingBusinessService';
import { BookingReviewService } from '../services/BookingReviewService';
import { BookingAnalyticsService } from '../services/BookingAnalyticsService';
import { TikTokBusinessService } from '../services/TikTokBusinessService';
import { TikTokReviewService } from '../services/TikTokReviewService';
import { TikTokAnalyticsService } from '../services/TikTokAnalyticsService';
import { TaskTrackerService } from '../services/TaskTrackerService';
import { ApifyService } from '../services/apify/ApifyService';
import { BackendOrchestrator } from '../services/BackendOrchestrator';

/**
 * Service Factory
 * Follows Factory Pattern and Dependency Inversion Principle (DIP)
 */
export class ServiceFactory {
  private container: DependencyContainer;
  private apifyToken: string;

  constructor(apifyToken?: string) {
    this.apifyToken = apifyToken || process.env.APIFY_TOKEN || '';
    this.container = new DependencyContainer();
    this.registerRepositories();
    this.registerServices();
  }

  private registerRepositories(): void {
    // Register repositories
    this.container.registerRepository(SERVICE_TOKENS.GOOGLE_BUSINESS_REPOSITORY, new GoogleBusinessRepository());
    this.container.registerRepository(SERVICE_TOKENS.GOOGLE_REVIEW_REPOSITORY, new GoogleReviewRepository());
    this.container.registerRepository(SERVICE_TOKENS.FACEBOOK_BUSINESS_REPOSITORY, new FacebookBusinessRepository());
    this.container.registerRepository(SERVICE_TOKENS.FACEBOOK_REVIEW_REPOSITORY, new FacebookReviewRepository());
    this.container.registerRepository(SERVICE_TOKENS.TRIPADVISOR_BUSINESS_REPOSITORY, new TripAdvisorBusinessRepository());
    this.container.registerRepository(SERVICE_TOKENS.TRIPADVISOR_REVIEW_REPOSITORY, new TripAdvisorReviewRepository());
    this.container.registerRepository(SERVICE_TOKENS.BOOKING_BUSINESS_REPOSITORY, new BookingBusinessRepository());
    this.container.registerRepository(SERVICE_TOKENS.BOOKING_REVIEW_REPOSITORY, new BookingReviewRepository());
    // TODO: TikTok repositories are not fully implemented yet
    // this.container.registerRepository(SERVICE_TOKENS.TIKTOK_BUSINESS_REPOSITORY, new TikTokBusinessRepository());
    // this.container.registerRepository(SERVICE_TOKENS.TIKTOK_REVIEW_REPOSITORY, new TikTokReviewRepository());
  }

  private registerServices(): void {
    // Register Google services
    this.container.registerService(
      SERVICE_TOKENS.GOOGLE_BUSINESS_SERVICE,
      new GoogleBusinessService(
        this.container.getRepository(SERVICE_TOKENS.GOOGLE_BUSINESS_REPOSITORY),
        null, // TODO: Inject proper team service
        this.apifyToken
      )
    );

    this.container.registerService(
      SERVICE_TOKENS.GOOGLE_REVIEW_SERVICE,
      new GoogleReviewService(
        this.container.getRepository(SERVICE_TOKENS.GOOGLE_REVIEW_REPOSITORY)
      )
    );

    this.container.registerService(
      SERVICE_TOKENS.GOOGLE_ANALYTICS_SERVICE,
      new GoogleAnalyticsService(
        this.container.getRepository(SERVICE_TOKENS.GOOGLE_REVIEW_REPOSITORY),
        null // TODO: Inject proper sentiment analyzer
      )
    );

    // Register Facebook services
    this.container.registerService(
      SERVICE_TOKENS.FACEBOOK_BUSINESS_SERVICE,
      new FacebookBusinessService(
        this.container.getRepository(SERVICE_TOKENS.FACEBOOK_BUSINESS_REPOSITORY),
        null, // TODO: Inject proper team service
        this.apifyToken
      )
    );

    this.container.registerService(
      SERVICE_TOKENS.FACEBOOK_REVIEW_SERVICE,
      new FacebookReviewService(
        this.container.getRepository(SERVICE_TOKENS.FACEBOOK_REVIEW_REPOSITORY)
      )
    );

    this.container.registerService(
      SERVICE_TOKENS.FACEBOOK_ANALYTICS_SERVICE,
      new FacebookAnalyticsService(
        this.container.getRepository(SERVICE_TOKENS.FACEBOOK_REVIEW_REPOSITORY),
        null // TODO: Inject proper sentiment analyzer
      )
    );

    // Register TripAdvisor services
    this.container.registerService(
      SERVICE_TOKENS.TRIPADVISOR_BUSINESS_SERVICE,
      new TripAdvisorBusinessService(
        this.container.getRepository(SERVICE_TOKENS.TRIPADVISOR_BUSINESS_REPOSITORY),
        null, // TODO: Inject proper team service
        this.apifyToken
      )
    );

    this.container.registerService(
      SERVICE_TOKENS.TRIPADVISOR_REVIEW_SERVICE,
      new TripAdvisorReviewService(
        this.container.getRepository(SERVICE_TOKENS.TRIPADVISOR_REVIEW_REPOSITORY)
      )
    );

    this.container.registerService(
      SERVICE_TOKENS.TRIPADVISOR_ANALYTICS_SERVICE,
      new TripAdvisorAnalyticsService(
        this.container.getRepository(SERVICE_TOKENS.TRIPADVISOR_REVIEW_REPOSITORY),
        null // TODO: Inject proper sentiment analyzer
      )
    );

    // Register Booking services
    this.container.registerService(
      SERVICE_TOKENS.BOOKING_BUSINESS_SERVICE,
      new BookingBusinessService(
        this.container.getRepository(SERVICE_TOKENS.BOOKING_BUSINESS_REPOSITORY),
        null, // TODO: Inject proper team service
        this.apifyToken
      )
    );

    this.container.registerService(
      SERVICE_TOKENS.BOOKING_REVIEW_SERVICE,
      new BookingReviewService(
        this.container.getRepository(SERVICE_TOKENS.BOOKING_REVIEW_REPOSITORY)
      )
    );

    this.container.registerService(
      SERVICE_TOKENS.BOOKING_ANALYTICS_SERVICE,
      new BookingAnalyticsService(
        this.container.getRepository(SERVICE_TOKENS.BOOKING_REVIEW_REPOSITORY),
        null // TODO: Inject proper sentiment analyzer
      )
    );

    // Register TikTok services
    // this.container.registerService(
    //   SERVICE_TOKENS.TIKTOK_BUSINESS_SERVICE,
    //   new TikTokBusinessService(
    //     this.container.getRepository(SERVICE_TOKENS.TIKTOK_BUSINESS_REPOSITORY),
    //     null // TODO: Inject proper team service
    //   )
    // );

    // this.container.registerService(
    //   SERVICE_TOKENS.TIKTOK_REVIEW_SERVICE,
    //   new TikTokReviewService(
    //     this.container.getRepository(SERVICE_TOKENS.TIKTOK_REVIEW_REPOSITORY)
    //   )
    // );

    // this.container.registerService(
    //   SERVICE_TOKENS.TIKTOK_ANALYTICS_SERVICE,
    //   new TikTokAnalyticsService(
    //     this.container.getRepository(SERVICE_TOKENS.TIKTOK_REVIEW_REPOSITORY),
    //     null // TODO: Inject proper sentiment analyzer
    //   )
    // );

      // Register Task Tracker Service
      this.container.registerService(
        SERVICE_TOKENS.TASK_TRACKER_SERVICE,
        new TaskTrackerService(this.container)
      );

      // Register Apify Service
      const apifyToken = process.env.APIFY_API_TOKEN || '';
      this.container.registerService(
        SERVICE_TOKENS.APIFY_SERVICE,
        new ApifyService(apifyToken, this.container)
      );

      // Register Backend Orchestrator
      this.container.registerService(
        SERVICE_TOKENS.BACKEND_ORCHESTRATOR,
        new BackendOrchestrator(this.container, this.container.getService(SERVICE_TOKENS.APIFY_SERVICE), null)
      );
    }

  getContainer(): DependencyContainer {
    return this.container;
  }

  getModernBusinessService(): any {
    // TODO: Implement proper ModernBusinessService creation
    return null;
  }
}
