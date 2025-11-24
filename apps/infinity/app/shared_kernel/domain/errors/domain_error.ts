/**
 * Domain Error
 * Erreur métier (pas une exception système)
 */
export class DomainError extends Error {
  public readonly code: string
  public readonly details?: Record<string, any>

  constructor(message: string, code: string = 'DOMAIN_ERROR', details?: Record<string, any>) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }

  public static create(message: string, code?: string, details?: Record<string, any>): DomainError {
    return new DomainError(message, code, details)
  }
}
