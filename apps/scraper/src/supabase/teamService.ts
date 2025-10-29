import { Team, MarketPlatform } from '@prisma/client';
import { prisma } from '@wirecrest/db';
import { SubscriptionPlan, getSubscriptionDefaults } from './models';

export class TeamService {
  constructor() {
    // No initialization needed for Prisma
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const data = await prisma.team.findUnique({
        where: { id: teamId }
      });

      return data;
    } catch (error) {
      console.error('Error getting team by id:', error);
      return null;
    }
  }

  async getBusinessCountForTeam(teamId: string): Promise<number> {
    try {
      // Count businesses across all platforms
      const [googleCount, facebookCount, tripAdvisorCount, bookingCount] = await Promise.all([
        this.getBusinessCountForPlatform(teamId, MarketPlatform.GOOGLE_MAPS),
        this.getBusinessCountForPlatform(teamId, MarketPlatform.FACEBOOK),
        this.getBusinessCountForPlatform(teamId, MarketPlatform.TRIPADVISOR),
        this.getBusinessCountForPlatform(teamId, MarketPlatform.BOOKING)
      ]);

      return googleCount + facebookCount + tripAdvisorCount + bookingCount;
    } catch (error) {
      console.error('Error getting business count for team:', error);
      return 0;
    }
  }

  async getBusinessCountForPlatform(teamId: string, platform: MarketPlatform): Promise<number> {
    try {
      let count: number;
      
      switch (platform) {
        case MarketPlatform.GOOGLE_MAPS:
          count = await prisma.googleBusinessProfile.count({
            where: { teamId }
          });
          break;
        case MarketPlatform.FACEBOOK:
          count = await prisma.facebookBusinessProfile.count({
            where: { teamId }
          });
          break;
        case MarketPlatform.TRIPADVISOR:
          count = await prisma.tripAdvisorBusinessProfile.count({
            where: { teamId }
          });
          break;
        case MarketPlatform.BOOKING:
          count = await prisma.bookingBusinessProfile.count({
            where: { teamId }
          });
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      return count;
    } catch (error) {
      console.error(`Error getting business count for team on ${platform}:`, error);
      return 0;
    }
  }

  async canTeamAddBusinessForPlatform(teamId: string, platform: MarketPlatform): Promise<boolean> {
    try {
      const currentCount = await this.getBusinessCountForPlatform(teamId, platform);
      // Each team can have exactly 1 business per platform
      return currentCount === 0;
    } catch (error) {
      console.error(`Error checking if team can add business for ${platform}:`, error);
      return false;
    }
  }

  async canTeamAddBusiness(teamId: string): Promise<boolean> {
    const team = await this.getTeamById(teamId);
    if (!team) return false;

    // Use the new QuotaManager for location limits
    try {
      return true
      // const { createQuotaManager } = await import('@wirecrest/feature-flags');
      // const { PrismaClient } = await import('@prisma/client');
      
      // const prisma = new PrismaClient();
      // // const quotaManager = createQuotaManager(prisma);
      
      // const canAdd = await quotaManager.canPerformAction(teamId, {
      //   type: 'locations',
      //   amount: 1,
      // });
      
      // await prisma.$disconnect();
      // return canAdd.allowed;
    } catch (error) {
      console.error('Error checking quota with QuotaManager:', error);
      
      // Fallback to old logic
      const currentBusinessCount = await this.getBusinessCountForTeam(teamId);
      const defaults = getSubscriptionDefaults(SubscriptionPlan.FREE);
      return currentBusinessCount < defaults.maxBusinesses;
    }
  }

  async getTeamLimits(teamId: string): Promise<{
    maxBusinesses: number;
    maxReviewsPerBusiness: number;
    updateFrequencyMinutes: number;
    currentBusinessCount: number;
  } | null> {
    const team = await this.getTeamById(teamId);
    if (!team) return null;

    const currentBusinessCount = await this.getBusinessCountForTeam(teamId);

    return {
      maxBusinesses: 99,
      maxReviewsPerBusiness: 9999,
      updateFrequencyMinutes: 1,
      currentBusinessCount
    }
    
    // Try to use QuotaManager for accurate limits
    try {
      // const { createQuotaManager } = await import('@wirecrest/feature-flags');
      // const { PrismaClient } = await import('@prisma/client');
      
      // const prisma = new PrismaClient();
      // const quotaManager = createQuotaManager(prisma);
      // const quotas = await quotaManager.getTenantQuotas(teamId);
      
      // await prisma.$disconnect();
      
      // return {
      //   maxBusinesses: quotas.locations.max,
      //   maxReviewsPerBusiness: quotas.reviewRateLimit.max,
      //   updateFrequencyMinutes: 60, // Default, can be customized per tenant
      //   currentBusinessCount,
      // };
    } catch (error) {
      console.error('Error getting quotas from QuotaManager:', error);
      
      // Fallback to old defaults
      const defaults = getSubscriptionDefaults(SubscriptionPlan.FREE);

      return {
        maxBusinesses: defaults.maxBusinesses,
        maxReviewsPerBusiness: defaults.maxReviewsPerBusiness,
        updateFrequencyMinutes: defaults.updateFrequencyMinutes,
        currentBusinessCount
      };
    }
  }

  async close(): Promise<void> {
    // Prisma client doesn't need explicit closing in this context
  }
} 