import { prisma } from '@wirecrest/db';
import {
  InstagramAnalyticsData,
  InstagramDailySnapshot,
  InstagramBusinessProfile,
  AnalyticsServiceResponse
} from '@/types/instagram-analytics';

import { InstagramDataValidator } from './validation/instagram-data-validator';
import { GrowthMetricsCalculator } from './calculations/growth-metrics-calculator';
// Import calculation services
import { GeneralMetricsCalculator } from './calculations/general-metrics-calculator';
import { HistoryMetricsCalculator } from './calculations/history-metrics-calculator';
import { OverviewMetricsCalculator } from './calculations/overview-metrics-calculator';
import { EngagementMetricsCalculator } from './calculations/engagement-metrics-calculator';

/**
 * Enhanced Instagram Analytics Service
 * Follows SOLID principles and Next.js best practices
 */
export class InstagramAnalyticsServiceV2 {
  private readonly CACHE_TTL_HOURS = 24;
  private readonly MAX_DATE_RANGE_DAYS = 90;

  /**
   * Get comprehensive analytics data for Instagram business profile
   * Main entry point for analytics calculation
   */
  async getAnalyticsData(
    businessProfileId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsServiceResponse<InstagramAnalyticsData>> {
    try {
      // Validate input parameters
      const validationResult = InstagramDataValidator.validateDateRange(startDate, endDate);
      if (!validationResult.isValid) {
        return {
          success: false,
          data: null,
          error: validationResult.errors.join(', ')
        };
      }

      // Fetch data from database
      const dataResult = await this.fetchAnalyticsData(businessProfileId, startDate, endDate);
      if (!dataResult.success) {
        return dataResult;
      }

      const { snapshots, businessProfile } = dataResult.data!;

      // Validate all data
      const dataValidation = InstagramDataValidator.validateAllData(
        snapshots,
        [],
        businessProfile,
        startDate,
        endDate
      );

      if (!dataValidation.isValid) {
        console.warn('Data validation warnings:', dataValidation.errors);
        // Continue with calculation but log warnings
      }

      // Calculate analytics using specialized calculators
      console.log('Analytics service - Data summary:', {
        snapshotsCount: snapshots.length,
        businessProfileId: businessProfile?.id,
        businessProfileUsername: businessProfile?.username
      });

      const analyticsData = this.calculateAnalyticsData(snapshots, businessProfile);

      return {
        success: true,
        data: analyticsData
      };

    } catch (error) {
      console.error('Error in getAnalyticsData:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get cached analytics data with TTL
   */
  async getCachedAnalyticsData(
    businessProfileId: string,
    startDate: Date,
    endDate: Date,
    forceRefresh: boolean = false
  ): Promise<AnalyticsServiceResponse<InstagramAnalyticsData>> {
    // Always calculate fresh since we don't have cached aggregations anymore
    // React Query / tRPC will handle caching on the client side
    return this.getAnalyticsData(businessProfileId, startDate, endDate);
  }

  /**
   * Fetch raw data from database
   */
  private async fetchAnalyticsData(
    businessProfileId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsServiceResponse<{
    snapshots: InstagramDailySnapshot[];
    businessProfile: InstagramBusinessProfile | null;
  }>> {
    try {
      // Fetch daily snapshots
      const snapshots = await prisma.instagramDailySnapshot.findMany({
        where: {
          businessProfileId,
          snapshotDate: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          snapshotDate: 'asc'
        }
      });

      // Fetch business profile
      const businessProfile = await prisma.instagramBusinessProfile.findUnique({
        where: { id: businessProfileId }
      });

      return {
        success: true,
        data: {
          snapshots,
          businessProfile
        }
      };

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return {
        success: false,
        data: null,
        error: 'Failed to fetch data from database'
      };
    }
  }

  /**
   * Calculate analytics data using specialized calculators
   */
  private calculateAnalyticsData(
    snapshots: InstagramDailySnapshot[],
    businessProfile: InstagramBusinessProfile | null
  ): InstagramAnalyticsData {
    console.log('calculateAnalyticsData - Input:', {
      snapshotsLength: snapshots.length,
      businessProfileExists: !!businessProfile
    });

    const latestSnapshot = snapshots[snapshots.length - 1];
    const firstSnapshot = snapshots[0];

    console.log('calculateAnalyticsData - Snapshots:', {
      latestSnapshot: latestSnapshot ? { id: latestSnapshot.id, date: latestSnapshot.snapshotDate } : null,
      firstSnapshot: firstSnapshot ? { id: firstSnapshot.id, date: firstSnapshot.snapshotDate } : null
    });

    try {
      const general = GeneralMetricsCalculator.calculate(businessProfile, latestSnapshot, firstSnapshot);
      console.log('calculateAnalyticsData - General metrics calculated');

      const overview = OverviewMetricsCalculator.calculate(snapshots, []);
      console.log('calculateAnalyticsData - Overview metrics calculated');

      const growth = GrowthMetricsCalculator.calculate(snapshots, []);
      console.log('calculateAnalyticsData - Growth metrics calculated');

      const engagement = EngagementMetricsCalculator.calculate(snapshots, []);
      console.log('calculateAnalyticsData - Engagement metrics calculated');

      const history = HistoryMetricsCalculator.calculate(snapshots);
      console.log('calculateAnalyticsData - History metrics calculated');

      return {
        general,
        overview,
        growth,
        engagement,
        history
      };
    } catch (error) {
      console.error('calculateAnalyticsData - Error in calculation:', error);
      throw error;
    }
  }
}
