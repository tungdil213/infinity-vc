import type { Result } from '../result.js'

/**
 * Base Repository Interface
 * Toutes les repositories implémentent au minimum ces méthodes
 */
export interface Repository<T> {
  save(entity: T): Promise<Result<T>>
  findById(id: string): Promise<Result<T | null>>
  delete(id: string): Promise<Result<void>>
  exists(id: string): Promise<boolean>
}
