import type {
  IDependencyContainer,
  SERVICE_TOKENS,
} from "../interfaces/IDependencyContainer";

/**
 * Simple Dependency Injection Container
 * Follows Dependency Inversion Principle (DIP)
 */
export class DependencyContainer implements IDependencyContainer {
  private repositories = new Map<string, any>();
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  registerRepository<T>(token: string, implementation: T): void {
    this.repositories.set(token, implementation);
  }

  getRepository<T>(token: string): T {
    const repository = this.repositories.get(token);
    if (!repository) {
      throw new Error(`Repository ${token} not found`);
    }
    return repository;
  }

  registerService<T>(token: string, implementation: T): void {
    this.services.set(token, implementation);
  }

  getService<T>(token: string): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service ${token} not found`);
    }
    return service;
  }

  registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  getFactory<T>(token: string): () => T {
    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`Factory ${token} not found`);
    }
    return factory;
  }
}
