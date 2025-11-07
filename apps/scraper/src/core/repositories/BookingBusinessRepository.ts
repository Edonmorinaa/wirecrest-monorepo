import { prisma } from "@wirecrest/db";
import type { BookingBusinessProfile } from "@prisma/client";
import { MarketPlatform } from "@wirecrest/db";
import { BaseRepository } from "./BaseRepository";
import type { IBusinessRepository } from "../interfaces/IBusinessRepository";

/**
 * Booking Business Repository
 * Follows Single Responsibility Principle (SRP) - only handles Booking business data
 */
export class BookingBusinessRepository
  extends BaseRepository<BookingBusinessProfile, string>
  implements IBusinessRepository<BookingBusinessProfile>
{
  protected model = prisma.bookingBusinessProfile;

  async findByTeamId(teamId: string): Promise<BookingBusinessProfile[]> {
    return await this.model.findMany({
      where: { teamId },
    });
  }

  async findByPlaceId(placeId: string): Promise<BookingBusinessProfile | null> {
    return await this.model.findFirst({
      where: { bookingUrl: placeId },
    });
  }

  async findByPlatform(
    teamId: string,
    platform: MarketPlatform,
  ): Promise<BookingBusinessProfile | null> {
    return await this.model.findFirst({
      where: {
        teamId,
        // Booking business profiles don't have platform field, they are implicitly Booking
      },
    });
  }

  async findNeedingUpdate(limit: number): Promise<BookingBusinessProfile[]> {
    return await this.model.findMany({
      where: {
        businessMetadata: {
          isActive: true,
        },
      },
      take: limit,
    });
  }

  async updateScrapedAt(id: string, scrapedAt: Date): Promise<void> {
    // Booking business profiles don't have updatedAt field, so we'll update the metadata instead
    await this.model.update({
      where: { id },
      data: {
        businessMetadata: {
          update: {
            lastUpdateAt: scrapedAt,
          },
        },
      },
    });
  }

  async getBusinessCount(
    teamId: string,
    platform: MarketPlatform,
  ): Promise<number> {
    return await this.model.count({
      where: { teamId },
    });
  }
}
