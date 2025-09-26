/**
 * Core SOLID Architecture Exports
 * 
 * This module exports all the new SOLID-compliant components:
 * - Interfaces (ISP, DIP)
 * - Repositories (SRP, DIP)
 * - Services (SRP, OCP, LSP, DIP)
 * - Container (DIP)
 * - Migration utilities
 */

// Interfaces
export * from './interfaces/IRepository';
export * from './interfaces/IBusinessRepository';
export * from './interfaces/IReviewRepository';
export * from './interfaces/IBusinessService';
export * from './interfaces/IReviewService';
export * from './interfaces/IAnalyticsService';
export * from './interfaces/IDependencyContainer';

// Repositories
export * from './repositories/BaseRepository';
export { GoogleBusinessRepository } from './repositories/GoogleBusinessRepository';
export { GoogleReviewRepository } from './repositories/GoogleReviewRepository';
export { FacebookBusinessRepository } from './repositories/FacebookBusinessRepository';
export { FacebookReviewRepository } from './repositories/FacebookReviewRepository';
export { TripAdvisorBusinessRepository } from './repositories/TripAdvisorBusinessRepository';
export { TripAdvisorReviewRepository } from './repositories/TripAdvisorReviewRepository';
export { BookingBusinessRepository } from './repositories/BookingBusinessRepository';
export { BookingReviewRepository } from './repositories/BookingReviewRepository';

// Services
export { GoogleBusinessService } from './services/GoogleBusinessService';
export { GoogleReviewService } from './services/GoogleReviewService';
export { GoogleAnalyticsService } from './services/GoogleAnalyticsService';
export { FacebookBusinessService } from './services/FacebookBusinessService';
export { FacebookReviewService } from './services/FacebookReviewService';
export { FacebookAnalyticsService } from './services/FacebookAnalyticsService';
export { TripAdvisorBusinessService } from './services/TripAdvisorBusinessService';
export { TripAdvisorReviewService } from './services/TripAdvisorReviewService';
export { TripAdvisorAnalyticsService } from './services/TripAdvisorAnalyticsService';
export { BookingBusinessService } from './services/BookingBusinessService';
export { BookingReviewService } from './services/BookingReviewService';
export { BookingAnalyticsService } from './services/BookingAnalyticsService';
export { UnifiedBusinessService } from './services/UnifiedBusinessService';
export { ModernBusinessService } from './services/ModernBusinessService';

// Container
export * from './container/DependencyContainer';
export * from './container/ServiceFactory';

// Migration
export * from './migration/ServiceMigration';
