/**
 * SOLID Architecture Usage Example
 *
 * This file demonstrates how to use the new SOLID-compliant architecture
 * for business operations, reviews, and analytics.
 *
 * Key Benefits:
 * - Single Responsibility: Each class has one reason to change
 * - Open/Closed: Easy to extend with new platforms
 * - Liskov Substitution: All implementations are interchangeable
 * - Interface Segregation: Clients depend only on what they need
 * - Dependency Inversion: Depends on abstractions, not concretions
 */

import { ServiceFactory } from "../container/ServiceFactory";
import { MarketPlatform } from "@prisma/client";

/**
 * Example: How to use the new SOLID-compliant architecture
 */
export class ArchitectureUsageExample {
  private serviceFactory: ServiceFactory;

  constructor() {
    // Initialize the service factory with dependency injection
    this.serviceFactory = new ServiceFactory();
  }

  /**
   * Example: Create a Google business profile
   * Follows Single Responsibility Principle (SRP) - only handles Google business creation
   */
  async createGoogleBusinessProfile(
    teamId: string,
    placeId: string,
  ): Promise<void> {
    try {
      // Get the unified business service
      const unifiedBusinessService = this.serviceFactory
        .getContainer()
        .getService<any>("UnifiedBusinessService");

      // Create business profile
      const result = await unifiedBusinessService.createBusinessProfile(
        teamId,
        MarketPlatform.GOOGLE_MAPS,
        placeId,
      );

      if (result.success) {
        console.log(`✅ Google business profile created: ${result.businessId}`);
      } else {
        console.error(
          `❌ Failed to create Google business profile: ${result.error}`,
        );
      }
    } catch (error) {
      console.error("Error creating Google business profile:", error);
    }
  }

  /**
   * Example: Get reviews for a Facebook business
   * Follows Single Responsibility Principle (SRP) - only handles Facebook review retrieval
   */
  async getFacebookReviews(teamId: string, pageId: string): Promise<void> {
    try {
      // Get the unified business service
      const unifiedBusinessService = this.serviceFactory
        .getContainer()
        .getService<any>("UnifiedBusinessService");

      // Get reviews (this method needs to be implemented in UnifiedBusinessService)
      const reviews = await unifiedBusinessService.getReviews(
        teamId,
        MarketPlatform.FACEBOOK,
        pageId,
      );

      console.log(`📝 Retrieved ${reviews.length} Facebook reviews`);
    } catch (error) {
      console.error("Error getting Facebook reviews:", error);
    }
  }

  /**
   * Example: Process analytics for TripAdvisor
   * Follows Single Responsibility Principle (SRP) - only handles TripAdvisor analytics
   */
  async processTripAdvisorAnalytics(
    teamId: string,
    locationId: string,
  ): Promise<void> {
    try {
      // Get the unified business service
      const unifiedBusinessService = this.serviceFactory
        .getContainer()
        .getService<any>("UnifiedBusinessService");

      // Get analytics
      const result = await unifiedBusinessService.getAnalytics(
        teamId,
        MarketPlatform.TRIPADVISOR,
        locationId,
      );

      if (result.success) {
        console.log(`📊 TripAdvisor analytics processed:`, result.data);
      } else {
        console.error(
          `❌ Failed to process TripAdvisor analytics: ${result.error}`,
        );
      }
    } catch (error) {
      console.error("Error processing TripAdvisor analytics:", error);
    }
  }

  /**
   * Example: Use platform-specific services directly
   * Demonstrates how to access individual services for specific operations
   */
  async usePlatformSpecificServices(): Promise<void> {
    const container = this.serviceFactory.getContainer();

    try {
      // Get Google-specific services
      const googleBusinessService = container.getService<any>(
        "GoogleBusinessService",
      );
      const googleReviewService = container.getService<any>(
        "GoogleReviewService",
      );
      const googleAnalyticsService = container.getService<any>(
        "GoogleAnalyticsService",
      );

      // Use Google business service
      const businessResult = await googleBusinessService.createProfile(
        "team-123",
        MarketPlatform.GOOGLE_MAPS,
        "place-id-456",
      );

      if (businessResult.success) {
        console.log(
          "Google business profile created:",
          businessResult.businessId,
        );
      }

      // Use Google review service
      const reviews = await googleReviewService.getReviews("business-123");
      console.log(`Retrieved ${reviews.length} reviews`);

      // Use Google analytics service
      const analyticsResult =
        await googleAnalyticsService.processReviews("business-123");

      if (analyticsResult.success) {
        console.log(
          "Google analytics processed:",
          analyticsResult.analyticsData,
        );
      }
    } catch (error) {
      console.error("Error using platform-specific services:", error);
    }
  }

  /**
   * Example: Extend the architecture with a new platform
   * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
   */
  async demonstrateExtensibility(): Promise<void> {
    console.log(`
    🏗️  Architecture Extensibility Example:
    
    To add a new platform (e.g., Yelp):
    
    1. Create YelpBusinessRepository extending BaseRepository
    2. Create YelpReviewRepository extending BaseRepository  
    3. Create YelpBusinessService implementing IBusinessService
    4. Create YelpReviewService implementing IReviewService
    5. Create YelpAnalyticsService implementing IAnalyticsService
    6. Add YELP to MarketPlatform enum
    7. Register services in ServiceFactory
    8. Add Yelp endpoints to modern-index.ts
    
    The existing code remains unchanged! ✨
    `);
  }

  /**
   * Example: Demonstrate SOLID principles in action
   */
  async demonstrateSOLIDPrinciples(): Promise<void> {
    console.log(`
    🎯 SOLID Principles Demonstration:
    
    ✅ Single Responsibility Principle (SRP):
       - BusinessApiController only handles business operations
       - ReviewApiController only handles review operations
       - AnalyticsApiController only handles analytics operations
    
    ✅ Open/Closed Principle (OCP):
       - Easy to add new platforms without modifying existing code
       - New services can be added via dependency injection
    
    ✅ Liskov Substitution Principle (LSP):
       - All platform services implement the same interfaces
       - Can substitute GoogleBusinessService with FacebookBusinessService
    
    ✅ Interface Segregation Principle (ISP):
       - IBusinessApiController, IReviewApiController, IAnalyticsApiController
       - Clients depend only on interfaces they actually use
    
    ✅ Dependency Inversion Principle (DIP):
       - Controllers depend on abstractions (interfaces)
       - Services are injected via dependency container
       - High-level modules don't depend on low-level modules
    `);
  }
}

/**
 * Example usage in a real application
 */
export async function runArchitectureExample(): Promise<void> {
  const example = new ArchitectureUsageExample();

  console.log("🚀 Running SOLID Architecture Examples...\n");

  // Demonstrate basic usage
  await example.createGoogleBusinessProfile("team-123", "place-id-456");
  await example.getFacebookReviews("team-123", "page-id-789");
  await example.processTripAdvisorAnalytics("team-123", "location-id-101");

  // Demonstrate platform-specific services
  await example.usePlatformSpecificServices();

  // Demonstrate extensibility
  await example.demonstrateExtensibility();

  // Demonstrate SOLID principles
  await example.demonstrateSOLIDPrinciples();

  console.log("\n✨ SOLID Architecture Examples Complete!");
}

// Export for use in other modules
// ArchitectureUsageExample is already exported above
