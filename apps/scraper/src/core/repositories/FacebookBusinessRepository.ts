import { prisma } from '@wirecrest/db';
import type { FacebookBusinessProfile, MarketPlatform } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import type { IBusinessRepository } from '../interfaces/IBusinessRepository';

/**
 * Facebook Business Repository
 * Follows Single Responsibility Principle (SRP) - only handles Facebook business data
 */
export class FacebookBusinessRepository extends BaseRepository<FacebookBusinessProfile, string> implements IBusinessRepository<FacebookBusinessProfile> {
  protected model = prisma.facebookBusinessProfile;

  async findByTeamId(teamId: string): Promise<FacebookBusinessProfile[]> {
    return await this.model.findMany({
      where: { teamId }
    });
  }

  async findByPlaceId(placeId: string): Promise<FacebookBusinessProfile | null> {
    return await this.model.findFirst({
      where: { pageId: placeId }
    });
  }

  async findByPlatform(teamId: string, platform: MarketPlatform): Promise<FacebookBusinessProfile | null> {
    return await this.model.findFirst({
      where: { 
        teamId,
        // Facebook business profiles don't have platform field, they are implicitly Facebook
      }
    });
  }

  async findNeedingUpdate(limit: number): Promise<FacebookBusinessProfile[]> {
    return await this.model.findMany({
      where: {
        metadata: {
          path: ['isActive'],
          equals: true
        }
      },
      take: limit,
      orderBy: {
        scrapedAt: 'asc'
      }
    });
  }

  async updateScrapedAt(id: string, scrapedAt: Date): Promise<void> {
    await this.model.update({
      where: { id },
      data: { scrapedAt }
    });
  }

  async getBusinessCount(teamId: string, platform: MarketPlatform): Promise<number> {
    return await this.model.count({
      where: { teamId }
    });
  }
}
