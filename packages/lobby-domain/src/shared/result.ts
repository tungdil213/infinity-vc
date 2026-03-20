/**
 * Generic Result type for handling success/failure cases in use cases
 * Following DDD principles and avoiding exceptions for business logic errors
 */
export class Result<T> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: string
  ) {}

  /**
   * Create a successful result
   */
  static ok<U>(value: U): Result<U> {
    return new Result<U>(true, value)
  }

  /**
   * Create a failed result
   */
  static fail<U>(error: string): Result<U> {
    return new Result<U>(false, undefined, error)
  }

  /**
   * Check if the result is successful
   */
  get isSuccess(): boolean {
    return this._isSuccess
  }

  /**
   * Check if the result is a failure
   */
  get isFailure(): boolean {
    return !this._isSuccess
  }

  /**
   * Get the value (only available on success)
   * Throws if accessed on failure
   */
  get value(): T {
    if (this.isFailure) {
      throw new Error('Cannot access value of a failed result')
    }
    return this._value!
  }

  /**
   * Get the error message (only available on failure)
   * Throws if accessed on success
   */
  get error(): string {
    if (this.isSuccess) {
      throw new Error('Cannot access error of a successful result')
    }
    return this._error!
  }

  /**
   * Map the value if successful, otherwise return the same failed result
   */
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this._error!)
    }
    return Result.ok(fn(this._value!))
  }

  /**
   * Chain results together (flatMap)
   */
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this._error!)
    }
    return fn(this._value!)
  }

  /**
   * Execute a function on success, return the same result
   */
  onSuccess(fn: (value: T) => void): Result<T> {
    if (this.isSuccess) {
      fn(this._value!)
    }
    return this
  }

  /**
   * Execute a function on failure, return the same result
   */
  onFailure(fn: (error: string) => void): Result<T> {
    if (this.isFailure) {
      fn(this._error!)
    }
    return this
  }
}

/**
 * Type alias for void results
 */
export type VoidResult = Result<void>
