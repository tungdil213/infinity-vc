import type { Result } from '../domain/result.js'

/**
 * Query Interface (CQRS Read)
 * Lecture seule, ne modifie pas l'état
 */
export interface Query {}

export interface QueryHandler<TQuery extends Query, TResponse> {
  handle(query: TQuery): Promise<Result<TResponse>>
}
