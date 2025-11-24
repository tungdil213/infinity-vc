import type { Result } from '../domain/result.js'

/**
 * Use Case Interface
 * Pattern: Command ou Query
 */
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<Result<TResponse>>
}
