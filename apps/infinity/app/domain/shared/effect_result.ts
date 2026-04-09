import { Effect, Either } from 'effect'
import { safeSystemError } from '#shared/error_sanitizer'
import { Result } from '#shared/result'

export async function runEffectAsResult<T>(
  effect: Effect.Effect<T, unknown>,
  operation: string,
  userId?: string
): Promise<Result<T>> {
  try {
    const outcome = await Effect.runPromise(Effect.either(effect))
    if (Either.isLeft(outcome)) {
      return Result.fail(safeSystemError(outcome.left, operation, userId))
    }
    return Result.ok(outcome.right)
  } catch (error) {
    return Result.fail(safeSystemError(error, operation, userId))
  }
}
