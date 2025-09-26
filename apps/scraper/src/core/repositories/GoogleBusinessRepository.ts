import { prisma } from '@wirecrest/db';
import { GoogleBusinessProfile, MarketPlatform } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { IBusinessRepository } from '../interfaces/IBusinessRepository';

/**
 * Google Business Repository
 * Follows Single Responsibility Principle (SRP) - only handles Google business data
 */
export class GoogleBusinessRepository extends BaseRepository<GoogleBusinessProfile, string> implements IBusinessRepository<GoogleBusinessProfile> {
  protected model = prisma.googleBusinessProfile;

  async findByTeamId(teamId: string): Promise<GoogleBusinessProfile[]> {
    return await this.model.findMany({
      where: { teamId }
    });
  }

  async findByPlaceId(placeId: string): Promise<GoogleBusinessProfile | null> {
    return await this.model.findFirst({
      where: { placeId }
    });
  }

  async findByPlatform(teamId: string, platform: MarketPlatform): Promise<GoogleBusinessProfile | null> {
    return await this.model.findFirst({
      where: { 
        teamId,
        // Google business profiles don't have platform field, they are implicitly Google
      }
    });
  }

  async findNeedingUpdate(limit: number): Promise<GoogleBusinessProfile[]> {
    return await this.model.findMany({
      where: {
        metadata: {
          isActive: true
        }
      },
      take: limit
    });
  }

  async updateScrapedAt(id: string, scrapedAt: Date): Promise<void> {
    // GoogleBusinessProfile doesn't have updatedAt field, so we'll update the metadata instead
    await this.model.update({
      where: { id },
      data: {
        metadata: {
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
