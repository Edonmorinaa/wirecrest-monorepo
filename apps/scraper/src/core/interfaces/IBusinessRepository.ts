import { MarketPlatform } from "@prisma/client";

/**
 * Business-specific repository interface
 * Segregated interface for business operations (ISP)
 */
export interface IBusinessRepository<T> {
  findByTeamId(teamId: string): Promise<T[]>;
  findByPlaceId(placeId: string): Promise<T | null>;
  findByPlatform(teamId: string, platform: MarketPlatform): Promise<T | null>;
  findNeedingUpdate(limit: number): Promise<T[]>;
  updateScrapedAt(id: string, scrapedAt: Date): Promise<void>;
  getBusinessCount(teamId: string, platform: MarketPlatform): Promise<number>;

  // CRUD operations
  findById(id: string): Promise<T | null>;
  create(entity: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
