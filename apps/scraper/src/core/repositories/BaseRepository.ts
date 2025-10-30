import { prisma } from '@wirecrest/db';
import { IRepository } from '../interfaces/IRepository';

/**
 * Base repository implementation using Prisma
 * Follows Single Responsibility Principle (SRP)
 */
export abstract class BaseRepository<T, K> implements IRepository<T, K> {
  protected abstract model: typeof prisma;
  
  async findById(id: K): Promise<T | null> {
    return await this.model.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<T[]> {
    return await this.model.findMany();
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    return await this.model.create({
      data: entity,
    });
  }

  async update(id: K, entity: Partial<T>): Promise<T> {
    return await this.model.update({
      where: { id },
      data: entity,
    });
  }

  async delete(id: K): Promise<void> {
    await this.model.delete({
      where: { id },
    });
  }

  async count(): Promise<number> {
    return await this.model.count();
  }
}
