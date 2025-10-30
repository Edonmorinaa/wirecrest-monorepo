import { IRepository } from '../interfaces/IRepository';

/**
 * Base repository implementation using Prisma
 * Follows Single Responsibility Principle (SRP)
 */
type RepositoryDelegate<T, K> = {
  findUnique(args: { where: { id: K } }): Promise<T | null>;
  findMany(args?: unknown): Promise<T[]>;
  create(args: { data: unknown }): Promise<T>;
  update(args: { where: { id: K }; data: unknown }): Promise<T>;
  delete(args: { where: { id: K } }): Promise<unknown>;
  count(args?: unknown): Promise<number>;
};

export abstract class BaseRepository<T, K, D extends RepositoryDelegate<T, K> = RepositoryDelegate<T, K>> implements IRepository<T, K> {
  protected abstract model: D;
  
  async findById(id: K): Promise<T | null> {
    return await this.model.findUnique({ where: { id } });
  }

  async findAll(): Promise<T[]> {
    return await this.model.findMany();
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    return await this.model.create({ data: entity });
  }

  async update(id: K, entity: Partial<T>): Promise<T> {
    return await this.model.update({ where: { id }, data: entity });
  }

  async delete(id: K): Promise<void> {
    await this.model.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return await this.model.count();
  }
}
