import type { Team } from "@prisma/client";
import { MarketPlatform } from "@wirecrest/db";
import { prisma } from "@wirecrest/db";

export class TeamService {
  constructor() {
    // No initialization needed for Prisma
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const data = await prisma.team.findUnique({
        where: { id: teamId },
      });

      return data;
    } catch (error) {
      console.error("Error getting team by id:", error);
      return null;
    }
  }

  async getBusinessCountForTeam(teamId: string): Promise<number> {
    try {
      // Count businesses across all platforms
      const [googleCount, facebookCount, tripAdvisorCount, bookingCount] =
        await Promise.all([
          this.getBusinessCountForPlatform(teamId, MarketPlatform.GOOGLE_MAPS),
          this.getBusinessCountForPlatform(teamId, MarketPlatform.FACEBOOK),
          this.getBusinessCountForPlatform(teamId, MarketPlatform.TRIPADVISOR),
          this.getBusinessCountForPlatform(teamId, MarketPlatform.BOOKING),
        ]);

      return googleCount + facebookCount + tripAdvisorCount + bookingCount;
    } catch (error) {
      console.error("Error getting business count for team:", error);
      return 0;
    }
  }

  async getBusinessCountForPlatform(
    teamId: string,
    platform: MarketPlatform,
  ): Promise<number> {
    try {
      let count: number;

      switch (platform) {
        case MarketPlatform.GOOGLE_MAPS:
          count = await prisma.googleBusinessProfile.count({
            where: { teamId },
          });
          break;
        case MarketPlatform.FACEBOOK:
          count = await prisma.facebookBusinessProfile.count({
            where: { teamId },
          });
          break;
        case MarketPlatform.TRIPADVISOR:
          count = await prisma.tripAdvisorBusinessProfile.count({
            where: { teamId },
          });
          break;
        case MarketPlatform.BOOKING:
          count = await prisma.bookingBusinessProfile.count({
            where: { teamId },
          });
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      return count;
    } catch (error) {
      console.error(
        `Error getting business count for team on ${platform}:`,
        error,
      );
      return 0;
    }
  }

  async canTeamAddBusinessForPlatform(
    teamId: string,
    platform: MarketPlatform,
  ): Promise<boolean> {
    try {
      const currentCount = await this.getBusinessCountForPlatform(
        teamId,
        platform,
      );
      // Each team can have exactly 1 business per platform
      return currentCount === 0;
    } catch (error) {
      console.error(
        `Error checking if team can add business for ${platform}:`,
        error,
      );
      return false;
    }
  }

  async canTeamAddBusiness(teamId: string): Promise<boolean> {
    const team = await this.getTeamById(teamId);
    if (!team) return false;

    return true;
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
      currentBusinessCount,
    };
  }

  async close(): Promise<void> {
    // Prisma client doesn't need explicit closing in this context
  }
}
