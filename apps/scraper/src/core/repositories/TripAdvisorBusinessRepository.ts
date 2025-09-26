import { prisma } from '@wirecrest/db';
import { TripAdvisorBusinessProfile, MarketPlatform } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { IBusinessRepository } from '../interfaces/IBusinessRepository';

/**
 * TripAdvisor Business Repository
 * Follows Single Responsibility Principle (SRP) - only handles TripAdvisor business data
 */
export class TripAdvisorBusinessRepository extends BaseRepository<TripAdvisorBusinessProfile, string> implements IBusinessRepository<TripAdvisorBusinessProfile> {
  protected model = prisma.tripAdvisorBusinessProfile;

  async findByTeamId(teamId: string): Promise<TripAdvisorBusinessProfile[]> {
    return await this.model.findMany({
      where: { teamId }
    });
  }

  async findByPlaceId(placeId: string): Promise<TripAdvisorBusinessProfile | null> {
    return await this.model.findFirst({
      where: { locationId: placeId }
    });
  }

  async findByPlatform(teamId: string, platform: MarketPlatform): Promise<TripAdvisorBusinessProfile | null> {
    return await this.model.findFirst({
      where: { 
        teamId,
        // TripAdvisor business profiles don't have platform field, they are implicitly TripAdvisor
      }
    });
  }

  async findNeedingUpdate(limit: number): Promise<TripAdvisorBusinessProfile[]> {
    return await this.model.findMany({
      where: {
        businessMetadata: {
          isActive: true
        }
      },
      take: limit
    });
  }

  async updateScrapedAt(id: string, scrapedAt: Date): Promise<void> {
    // TripAdvisor business profiles don't have updatedAt field, so we'll update the metadata instead
    await this.model.update({
      where: { id },
      data: {
        businessMetadata: {
          update: {
            lastUpdateAt: scrapedAt
          }
        }
      }
    });
  }

  async getBusinessCount(teamId: string, platform: MarketPlatform): Promise<number> {
    return await this.model.count({
      where: { teamId }
    });
  }
}
