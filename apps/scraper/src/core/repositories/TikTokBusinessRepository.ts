import { MarketPlatform, PrismaClient } from "@prisma/client";

/**
 * TikTok Business Repository
 * Follows Single Responsibility Principle (SRP) - only handles TikTok business data access
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export interface TikTokBusinessProfile {
  id: string;
  locationId: string;
  platform: MarketPlatform;
  username: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTikTokBusinessInput = {
  username: string;
  isActive?: boolean;
};

export type UpdateTikTokBusinessInput = Partial<
  Pick<TikTokBusinessProfile, "username" | "isActive">
>;

export class TikTokBusinessRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Get business profile by location ID and platform
   */
  async getByLocationId(
    locationId: string,
    platform: MarketPlatform,
  ): Promise<{ id: string } | null> {
    try {
      console.log(
        `[TikTokBusinessRepository] Getting business profile for location ${locationId}`,
      );

      const profile = await this.prisma.tikTokBusinessProfile.findUnique({
        where: { locationId },
        select: { id: true },
      });

      return profile;
    } catch (error) {
      console.error(
        "[TikTokBusinessRepository] Error getting business profile:",
        error,
      );
      throw error;
    }
  }

  /**
   * Create business profile
   */
  async create(
    locationId: string,
    platform: MarketPlatform,
    data: CreateTikTokBusinessInput,
  ): Promise<{ id: string }> {
    try {
      console.log(
        `[TikTokBusinessRepository] Creating business profile for location ${locationId}`,
      );

      // Note: The actual profile data is created by TikTokDataService
      // This is just to ensure the location exists and return the basic info
      const profile = await this.prisma.tikTokBusinessProfile.findUnique({
        where: { locationId },
        select: { id: true },
      });

      if (!profile) {
        throw new Error(`No TikTok profile found for location ${locationId}`);
      }

      return profile;
    } catch (error) {
      console.error(
        "[TikTokBusinessRepository] Error creating business profile:",
        error,
      );
      throw error;
    }
  }

  /**
   * Update business profile
   */
  async update(
    locationId: string,
    platform: MarketPlatform,
    data: UpdateTikTokBusinessInput,
  ): Promise<{ id: string }> {
    try {
      console.log(
        `[TikTokBusinessRepository] Updating business profile for location ${locationId}`,
      );

      const profile = await this.prisma.tikTokBusinessProfile.update({
        where: { locationId },
        data: {
          username: data.username,
          isActive: data.isActive,
        },
        select: { id: true },
      });

      return profile;
    } catch (error) {
      console.error(
        "[TikTokBusinessRepository] Error updating business profile:",
        error,
      );
      throw error;
    }
  }

  /**
   * Delete business profile
   */
  async delete(locationId: string, platform: MarketPlatform): Promise<boolean> {
    try {
      console.log(
        `[TikTokBusinessRepository] Deleting business profile for location ${locationId}`,
      );

      await this.prisma.tikTokBusinessProfile.delete({
        where: { locationId },
      });

      return true;
    } catch (error) {
      console.error(
        "[TikTokBusinessRepository] Error deleting business profile:",
        error,
      );
      throw error;
    }
  }
}
