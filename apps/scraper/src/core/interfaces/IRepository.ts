/**
 * Core repository interface following Repository pattern
 * Provides abstraction over data access layer
 */
export interface IRepository<T, K> {
  findById(id: K): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: K, entity: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
  count(): Promise<number>;
}
