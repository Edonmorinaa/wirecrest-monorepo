import { MarketPlatform } from '@prisma/client';
import { ServiceFactory } from '../container/ServiceFactory';
import { BackendOrchestrator } from '../services/BackendOrchestrator';
import { IApifyService } from '../interfaces/IApifyService';
import { SERVICE_TOKENS } from '../interfaces/IDependencyContainer';

/**
 * Backend Usage Example
 * Demonstrates how to use the new SOLID-compliant backend architecture
 * This is the main function that orchestrates data flow from Apify to database
 */
export class BackendUsageExample {
  private serviceFactory: ServiceFactory;
  private orchestrator: BackendOrchestrator;
  private apifyService: IApifyService;

  constructor() {
    // Initialize the service factory
    this.serviceFactory = new ServiceFactory();
    const container = this.serviceFactory.getContainer();
    
    // Get services from the container
    this.orchestrator = container.getService<BackendOrchestrator>(SERVICE_TOKENS.BACKEND_ORCHESTRATOR);
    this.apifyService = container.getService<IApifyService>(SERVICE_TOKENS.APIFY_SERVICE);
  }

  /**
   * Main function: Process a single business
   * This is the core function that demonstrates the complete data flow
   */
  async processSingleBusiness(): Promise<void> {
    console.log('🚀 Starting single business processing example...\n');

    try {
      // Example: Process a Google Maps business
      const result = await this.orchestrator.processBusinessData(
        'team-123', // teamId
        MarketPlatform.GOOGLE_MAPS, // platform
        'ChIJN1t_tDeuEmsRUsoyG83frY4', // Google Place ID
        {
          isInitialization: true, // First time setup
          maxReviews: 1000, // Maximum number of reviews to fetch
          forceRefresh: false // Don't force refresh if data exists
        }
      );

      if (result.success) {
        console.log('✅ Business processed successfully!');
        console.log(`📊 Business ID: ${result.businessId}`);
        console.log(`📝 Reviews processed: ${result.reviewsProcessed}`);
        console.log(`📈 Analytics generated: ${result.analyticsGenerated}`);
      } else {
        console.error('❌ Business processing failed:', result.error);
      }

    } catch (error) {
      console.error('❌ Error processing business:', error);
    }
  }

  /**
   * Process multiple businesses in batch
   */
  async processBatchBusinesses(): Promise<void> {
    console.log('🚀 Starting batch business processing example...\n');

    const businesses = [
      {
        teamId: 'team-123',
        platform: MarketPlatform.GOOGLE_MAPS,
        identifier: 'ChIJN1t_tDeuEmsRUsoyG83frY4', // Google Place ID
        options: {
          isInitialization: true,
          maxReviews: 1000
        }
      },
      {
        teamId: 'team-123',
        platform: MarketPlatform.FACEBOOK,
        identifier: 'myrestaurant', // Facebook page ID
        options: {
          isInitialization: true,
          maxReviews: 500
        }
      },
      {
        teamId: 'team-123',
        platform: MarketPlatform.TRIPADVISOR,
        identifier: 'd12345678', // TripAdvisor location ID
        options: {
          isInitialization: true,
          maxReviews: 800
        }
      },
      {
        teamId: 'team-123',
        platform: MarketPlatform.BOOKING,
        identifier: 'https://www.booking.com/hotel/us/example.html', // Booking URL
        options: {
          isInitialization: true,
          maxReviews: 300
        }
      }
    ];

    try {
      const results = await this.orchestrator.processBatchBusinessData(businesses);

      console.log('📊 Batch processing results:');
      results.forEach((result, index) => {
        const business = businesses[index];
        console.log(`\n${index + 1}. ${business.platform} - ${business.identifier}`);
        if (result.success) {
          console.log(`   ✅ Success: ${result.reviewsProcessed} reviews processed`);
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
        }
      });

      const successful = results.filter(r => r.success).length;
      console.log(`\n📈 Summary: ${successful}/${results.length} businesses processed successfully`);

    } catch (error) {
      console.error('❌ Error in batch processing:', error);
    }
  }

  /**
   * Get business data with reviews and analytics
   */
  async getBusinessData(): Promise<void> {
    console.log('🚀 Starting business data retrieval example...\n');

    try {
      const result = await this.orchestrator.getBusinessData(
        'team-123',
        MarketPlatform.GOOGLE_MAPS
      );

      if (result.success) {
        console.log('✅ Business data retrieved successfully!');
        console.log(`📊 Business Profile:`, result.businessProfile?.displayName || 'N/A');
        console.log(`📝 Reviews count: ${result.reviews?.length || 0}`);
        console.log(`📈 Analytics available: ${!!result.analytics}`);
        
        if (result.reviews && result.reviews.length > 0) {
          console.log('\n📝 Sample review:');
          const sampleReview = result.reviews[0];
          console.log(`   Author: ${sampleReview.name || 'Anonymous'}`);
          console.log(`   Rating: ${sampleReview.rating || sampleReview.stars || 'N/A'}`);
          console.log(`   Text: ${(sampleReview.text || '').substring(0, 100)}...`);
        }
      } else {
        console.error('❌ Failed to retrieve business data:', result.error);
      }

    } catch (error) {
      console.error('❌ Error retrieving business data:', error);
    }
  }

  /**
   * Refresh existing business data
   */
  async refreshBusinessData(): Promise<void> {
    console.log('🚀 Starting business data refresh example...\n');

    try {
      const result = await this.orchestrator.refreshBusinessData(
        'team-123',
        MarketPlatform.GOOGLE_MAPS,
        {
          maxReviews: 100, // Only fetch recent reviews
          forceRefresh: true // Force refresh even if data exists
        }
      );

      if (result.success) {
        console.log('✅ Business data refreshed successfully!');
        console.log(`📝 New reviews processed: ${result.reviewsProcessed}`);
        console.log(`📈 Analytics updated: ${result.analyticsUpdated}`);
      } else {
        console.error('❌ Failed to refresh business data:', result.error);
      }

    } catch (error) {
      console.error('❌ Error refreshing business data:', error);
    }
  }

  /**
   * Monitor Apify service status
   */
  async monitorApifyService(): Promise<void> {
    console.log('🚀 Starting Apify service monitoring example...\n');

    try {
      // Get job statistics
      const stats = await this.apifyService.getJobStatistics();
      console.log('📊 Apify Service Statistics:');
      console.log(`   Total jobs: ${stats.totalJobs}`);
      console.log(`   Completed: ${stats.completedJobs}`);
      console.log(`   Failed: ${stats.failedJobs}`);
      console.log(`   Running: ${stats.runningJobs}`);
      console.log(`   Pending: ${stats.pendingJobs}`);
      console.log(`   Success rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`   Average processing time: ${stats.averageProcessingTimeMs.toFixed(2)}ms`);

      // Get active jobs
      const activeJobs = await this.apifyService.getActiveJobs();
      console.log(`\n🔄 Active jobs: ${activeJobs.length}`);
      activeJobs.forEach(job => {
        console.log(`   - ${job.platform}: ${job.identifier} (${job.status})`);
      });

      // Get jobs by team
      const teamJobs = await this.apifyService.getJobsByTeam('team-123');
      console.log(`\n👥 Team jobs: ${teamJobs.length}`);
      teamJobs.forEach(job => {
        console.log(`   - ${job.platform}: ${job.identifier} (${job.status})`);
      });

    } catch (error) {
      console.error('❌ Error monitoring Apify service:', error);
    }
  }

  /**
   * Demonstrate error handling and retry logic
   */
  async demonstrateErrorHandling(): Promise<void> {
    console.log('🚀 Starting error handling demonstration...\n');

    try {
      // Try to process a business with invalid identifier
      const result = await this.orchestrator.processBusinessData(
        'team-123',
        MarketPlatform.GOOGLE_MAPS,
        'invalid-place-id', // This should fail
        {
          isInitialization: true,
          maxReviews: 100
        }
      );

      if (!result.success) {
        console.log('❌ Expected failure occurred:', result.error);
        
        // Demonstrate retry logic
        console.log('🔄 Attempting retry...');
        const retryResult = await this.orchestrator.processBusinessData(
          'team-123',
          MarketPlatform.GOOGLE_MAPS,
          'ChIJN1t_tDeuEmsRUsoyG83frY4', // Valid Place ID
          {
            isInitialization: true,
            maxReviews: 100
          }
        );

        if (retryResult.success) {
          console.log('✅ Retry successful!');
        } else {
          console.log('❌ Retry failed:', retryResult.error);
        }
      }

    } catch (error) {
      console.error('❌ Error in error handling demonstration:', error);
    }
  }

  /**
   * Run all examples
   */
  async runAllExamples(): Promise<void> {
    console.log('🎯 Running all backend usage examples...\n');
    console.log('=' .repeat(60));

    await this.processSingleBusiness();
    console.log('\n' + '='.repeat(60));

    await this.processBatchBusinesses();
    console.log('\n' + '='.repeat(60));

    await this.getBusinessData();
    console.log('\n' + '='.repeat(60));

    await this.refreshBusinessData();
    console.log('\n' + '='.repeat(60));

    await this.monitorApifyService();
    console.log('\n' + '='.repeat(60));

    await this.demonstrateErrorHandling();
    console.log('\n' + '='.repeat(60));

    console.log('🎉 All examples completed!');
  }
}

/**
 * Main function to run the examples
 * This is the entry point for demonstrating the backend architecture
 */
export async function runBackendExamples(): Promise<void> {
  const example = new BackendUsageExample();
  await example.runAllExamples();
}

// Example usage in a real application:
/*
// Initialize the backend
const example = new BackendUsageExample();

// Process a single business
await example.processSingleBusiness();

// Process multiple businesses
await example.processBatchBusinesses();

// Get business data
await example.getBusinessData();

// Refresh data
await example.refreshBusinessData();

// Monitor the service
await example.monitorApifyService();
*/
