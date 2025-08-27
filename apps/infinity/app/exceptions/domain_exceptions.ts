import BusinessException from './business_exception.js'
import { ErrorClassification, ErrorSeverity, ToastType } from './types/error_classification.js'

/**
 * Exception pour les erreurs de validation des entités du domaine
 */
export class DomainValidationException extends BusinessException {
  constructor(field: string, value: any, constraint: string, context?: Record<string, any>) {
    const userMessage = `Invalid ${field}: ${constraint}`
    const technicalMessage = `Domain validation failed for ${field} with value "${value}": ${constraint}`

    super(technicalMessage, {
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage,
      toastType: ToastType.ERROR,
      context: {
        field,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        constraint,
        ...context,
      },
    })
  }
}

/**
 * Exception pour les erreurs d'état des entités du domaine
 */
export class DomainStateException extends BusinessException {
  constructor(entity: string, currentState: string, attemptedAction: string, context?: Record<string, any>) {
    const userMessage = `Cannot ${attemptedAction} in current state`
    const technicalMessage = `${entity} in state "${currentState}" cannot perform action: ${attemptedAction}`

    super(technicalMessage, {
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage,
      toastType: ToastType.ERROR,
      context: {
        entity,
        currentState,
        attemptedAction,
        ...context,
      },
    })
  }
}

/**
 * Exception pour les erreurs de logique métier du domaine
 */
export class DomainLogicException extends BusinessException {
  constructor(entity: string, operation: string, reason: string, context?: Record<string, any>) {
    const userMessage = `Operation not allowed: ${reason}`
    const technicalMessage = `${entity}.${operation} failed: ${reason}`

    super(technicalMessage, {
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage,
      toastType: ToastType.ERROR,
      context: {
        entity,
        operation,
        reason,
        ...context,
      },
    })
  }
}
