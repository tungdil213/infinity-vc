/**
 * Business Exception
 * Exception levée pour les erreurs métier critiques
 * À utiliser avec parcimonie (privilégier Result<T>)
 */
export class BusinessException extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: Record<string, any>

  constructor(
    message: string,
    code: string = 'BUSINESS_ERROR',
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message)
    this.name = 'BusinessException'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }

  public static create(
    message: string,
    code?: string,
    statusCode?: number,
    details?: Record<string, any>
  ): BusinessException {
    return new BusinessException(message, code, statusCode, details)
  }
}
