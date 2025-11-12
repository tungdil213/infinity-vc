/**
 * Result<T> Pattern
 * Encapsule le succès ou l'échec d'une opération métier
 * Évite les exceptions pour la logique métier
 */
export class Result<T> {
  public readonly isSuccess: boolean
  public readonly isFailure: boolean
  private readonly _value?: T
  private readonly _error?: string

  private constructor(isSuccess: boolean, value?: T, error?: string) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error')
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message')
    }

    this.isSuccess = isSuccess
    this.isFailure = !isSuccess
    this._value = value
    this._error = error

    Object.freeze(this)
  }

  public get value(): T {
    if (!this.isSuccess) {
      throw new Error('Cannot get value of a failed result. Use error instead.')
    }

    return this._value!
  }

  public get error(): string {
    if (this.isSuccess) {
      throw new Error('Cannot get error of a successful result.')
    }

    return this._error!
  }

  public get errorValue(): string | undefined {
    return this._error
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, value)
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, undefined, error)
  }

  public static combine(results: Result<any>[]): Result<any> {
    for (const result of results) {
      if (result.isFailure) {
        return result
      }
    }
    return Result.ok()
  }
}
