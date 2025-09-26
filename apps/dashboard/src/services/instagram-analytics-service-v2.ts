import { prisma } from '@wirecrest/db';
import { 
  InstagramAnalyticsData, 
  InstagramDailySnapshot, 
  InstagramAnalytics, 
  InstagramBusinessProfile,
  AnalyticsServiceResponse 
} from '@/types/instagram-analytics';

// Import calculation services
import { GeneralMetricsCalculator } from './calculations/general-metrics-calculator';
import { OverviewMetricsCalculator } from './calculations/overview-metrics-calculator';
import { GrowthMetricsCalculator } from './calculations/growth-metrics-calculator';
import { EngagementMetricsCalculator } from './calculations/engagement-metrics-calculator';
import { HistoryMetricsCalculator } from './calculations/history-metrics-calculator';
import { InstagramDataValidator } from './validation/instagram-data-validator';

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

      const { snapshots, analytics, businessProfile } = dataResult.data!;

      // Validate all data
      const dataValidation = InstagramDataValidator.validateAllData(
        snapshots,
        analytics,
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
        analyticsCount: analytics.length,
        businessProfileId: businessProfile?.id,
        businessProfileUsername: businessProfile?.username
      });
      
      const analyticsData = this.calculateAnalyticsData(snapshots, analytics, businessProfile);

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
    try {
      // Check for recent analytics data if not forcing refresh
      if (!forceRefresh) {
        const recentAnalytics = await this.getRecentAnalytics(businessProfileId);
        if (recentAnalytics) {
          return this.getAnalyticsData(businessProfileId, startDate, endDate);
        }
      }

      // Trigger fresh calculation
      return this.getAnalyticsData(businessProfileId, startDate, endDate);

    } catch (error) {
      console.error('Error in getCachedAnalyticsData:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get summary metrics for dashboard
   */
  async getSummaryMetrics(businessProfileId: string): Promise<AnalyticsServiceResponse<{
    totalFollowers: number;
    totalFollowing: number;
    totalPosts: number;
    avgEngagementRate: number;
    growthRate: number;
    lastUpdated: Date;
  }>> {
    try {
      const latestSnapshot = await prisma.instagramDailySnapshot.findFirst({
        where: { businessProfileId },
        orderBy: { snapshotDate: 'desc' }
      });

      const analytics = await prisma.instagramAnalytics.findFirst({
        where: { businessProfileId },
        orderBy: { calculatedAt: 'desc' }
      });

      if (!latestSnapshot) {
        return {
          success: true,
          data: {
            totalFollowers: 0,
            totalFollowing: 0,
            totalPosts: 0,
            avgEngagementRate: 0,
            growthRate: 0,
            lastUpdated: new Date()
          }
        };
      }

      return {
        success: true,
        data: {
          totalFollowers: latestSnapshot.followersCount,
          totalFollowing: latestSnapshot.followingCount,
          totalPosts: latestSnapshot.mediaCount,
          avgEngagementRate: latestSnapshot.engagementRate || 0,
          growthRate: analytics?.followersGrowthRate90d || 0,
          lastUpdated: latestSnapshot.snapshotDate
        }
      };

    } catch (error) {
      console.error('Error in getSummaryMetrics:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
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
    analytics: InstagramAnalytics[];
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

      // Fetch analytics data
      const analytics = await prisma.instagramAnalytics.findMany({
        where: {
          businessProfileId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'asc'
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
          analytics,
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
    analytics: InstagramAnalytics[],
    businessProfile: InstagramBusinessProfile | null
  ): InstagramAnalyticsData {
    console.log('calculateAnalyticsData - Input:', {
      snapshotsLength: snapshots.length,
      analyticsLength: analytics.length,
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
      
      const overview = OverviewMetricsCalculator.calculate(snapshots, analytics);
      console.log('calculateAnalyticsData - Overview metrics calculated');
      
      const growth = GrowthMetricsCalculator.calculate(snapshots, analytics);
      console.log('calculateAnalyticsData - Growth metrics calculated');
      
      const engagement = EngagementMetricsCalculator.calculate(snapshots, analytics);
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

  /**
   * Get recent analytics data for caching
   */
  private async getRecentAnalytics(businessProfileId: string): Promise<InstagramAnalytics | null> {
    const cutoffTime = new Date(Date.now() - this.CACHE_TTL_HOURS * 60 * 60 * 1000);
    
    return await prisma.instagramAnalytics.findFirst({
      where: {
        businessProfileId,
        calculatedAt: {
          gte: cutoffTime
        }
      },
      orderBy: {
        calculatedAt: 'desc'
      }
    });
  }
}
