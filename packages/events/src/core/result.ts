/**
 * Result pattern for handling success/failure without exceptions
 * Inspired by Rust's Result<T, E> and functional programming
 */

export type Result<T, E = Error> = Success<T, E> | Failure<T, E>

export class Success<T, E = Error> {
  readonly isSuccess = true as const
  readonly isFailure = false as const

  constructor(public readonly value: T) {}

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Success(fn(this.value))
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value)
  }

  mapError<F>(_fn: (error: E) => F): Result<T, F> {
    return new Success(this.value)
  }

  getOrElse(_defaultValue: T): T {
    return this.value
  }

  getOrThrow(): T {
    return this.value
  }

  match<U>(handlers: { success: (value: T) => U; failure: (error: E) => U }): U {
    return handlers.success(this.value)
  }

  toPromise(): Promise<T> {
    return Promise.resolve(this.value)
  }
}

export class Failure<T, E = Error> {
  readonly isSuccess = false as const
  readonly isFailure = true as const

  constructor(public readonly error: E) {}

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Failure(this.error)
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Failure(this.error)
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return new Failure(fn(this.error))
  }

  getOrElse(defaultValue: T): T {
    return defaultValue
  }

  getOrThrow(): never {
    throw this.error
  }

  match<U>(handlers: { success: (value: T) => U; failure: (error: E) => U }): U {
    return handlers.failure(this.error)
  }

  toPromise(): Promise<T> {
    return Promise.reject(this.error)
  }
}

/**
 * Result factory functions
 */
export const Result = {
  ok<T, E = Error>(value: T): Result<T, E> {
    return new Success(value)
  },

  fail<T, E = Error>(error: E): Result<T, E> {
    return new Failure(error)
  },

  fromNullable<T, E = Error>(value: T | null | undefined, error: E): Result<T, E> {
    return value != null ? new Success(value) : new Failure(error)
  },

  fromPromise<T, E = Error>(promise: Promise<T>, errorMapper?: (e: unknown) => E): Promise<Result<T, E>> {
    return promise
      .then((value) => new Success<T, E>(value))
      .catch((e) => new Failure<T, E>(errorMapper ? errorMapper(e) : (e as E)))
  },

  combine<T, E = Error>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = []
    for (const result of results) {
      if (result.isFailure) {
        return new Failure(result.error)
      }
      values.push(result.value)
    }
    return new Success(values)
  },

  isSuccess<T, E>(result: Result<T, E>): result is Success<T, E> {
    return result.isSuccess
  },

  isFailure<T, E>(result: Result<T, E>): result is Failure<T, E> {
    return result.isFailure
  },
}

/**
 * Domain error base class
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

/**
 * Validation error with field-level details
 */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly field?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { field, ...details })
    this.name = 'ValidationError'
  }
}

/**
 * Not found error
 */
export class NotFoundError extends DomainError {
  constructor(entityType: string, identifier: string) {
    super(`${entityType} with identifier '${identifier}' not found`, 'NOT_FOUND', {
      entityType,
      identifier,
    })
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict error (e.g., duplicate, concurrent modification)
 */
export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', details)
    this.name = 'ConflictError'
  }
}

/**
 * Authorization error
 */
export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', details)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends DomainError {
  constructor(message: string = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', details)
    this.name = 'ForbiddenError'
  }
}
