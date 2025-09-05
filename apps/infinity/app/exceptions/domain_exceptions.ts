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
  constructor(
    entity: string,
    currentState: string,
    attemptedAction: string,
    context?: Record<string, any>
  ) {
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

/**
 * Exception pour les entités non trouvées
 */
export class EntityNotFoundException extends BusinessException {
  constructor(entityType: string, identifier: string, context?: Record<string, any>) {
    const userMessage = `${entityType} not found`
    const technicalMessage = `${entityType} with identifier "${identifier}" not found`

    super(technicalMessage, {
      status: 404,
      code: 'E_ENTITY_NOT_FOUND',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.LOW,
      userMessage,
      toastType: ToastType.ERROR,
      context: {
        entityType,
        identifier,
        ...context,
      },
    })
  }
}

// Domain-specific exceptions for game entities
export class GameStateException extends BusinessException {
  constructor(message: string, currentState?: string) {
    super(`Invalid game state operation: ${message}`, {
      status: 400,
      code: 'INVALID_GAME_STATE',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
      toastType: ToastType.ERROR,
      context: { currentState },
    })
  }
}

export class PlayerValidationException extends BusinessException {
  constructor(message: string, field?: string) {
    super(`Player validation failed: ${message}`, {
      status: 400,
      code: 'INVALID_PLAYER_DATA',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
      toastType: ToastType.ERROR,
      context: { field },
    })
  }
}

export class LobbyValidationException extends BusinessException {
  constructor(message: string, field?: string) {
    super(`Lobby validation failed: ${message}`, {
      status: 400,
      code: 'INVALID_LOBBY_DATA',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
      toastType: ToastType.ERROR,
      context: { field },
    })
  }
}

/**
 * Exception pour les erreurs de repository
 */
export class RepositoryException extends BusinessException {
  constructor(operation: string, details?: string) {
    super(`Repository operation failed: ${operation}${details ? ` - ${details}` : ''}`, {
      status: 500,
      code: 'REPOSITORY_ERROR',
      classification: ErrorClassification.INTERNAL,
      severity: ErrorSeverity.HIGH,
      userMessage: 'A technical error occurred. Please try again later.',
      toastType: ToastType.ERROR,
      context: { operation, details },
    })
  }
}
