import BusinessException from './business_exception.js'
import { ErrorClassification, ErrorSeverity, ToastType } from './types/error_classification.js'

/**
 * Exception thrown when lobby creation fails due to validation errors
 */
export class LobbyCreationException extends BusinessException {
  constructor(reason: string, technicalDetails?: string) {
    super('Failed to create lobby. Please check your input and try again.', {
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'Failed to create lobby. Please check your input and try again.',
      toastType: ToastType.ERROR,
      context: {
        reason,
        technicalDetails,
      },
    })
  }
}

/**
 * Exception thrown when lobby name is invalid or already exists
 */
export class InvalidLobbyNameException extends BusinessException {
  constructor(name: string, reason: string) {
    super('Please choose a different lobby name.', {
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.LOW,
      userMessage: 'Please choose a different lobby name.',
      toastType: ToastType.ERROR,
      context: {
        attemptedName: name,
        reason,
      },
    })
  }
}

/**
 * Exception thrown when lobby configuration is invalid
 */
export class InvalidLobbyConfigurationException extends BusinessException {
  constructor(field: string, value: any, reason: string) {
    super(`Invalid ${field}. Please check your settings.`, {
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.LOW,
      userMessage: `Invalid ${field}. Please check your settings.`,
      toastType: ToastType.ERROR,
      context: {
        field,
        value,
        reason,
      },
    })
  }
}

/**
 * Exception thrown when user is already in a lobby
 */
export class UserAlreadyInLobbyException extends BusinessException {
  constructor(userUuid: string, currentLobbyUuid: string) {
    super('You are already in a lobby. Please leave your current lobby first.', {
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'You are already in a lobby. Please leave your current lobby first.',
      toastType: ToastType.WARNING,
      context: {
        userUuid,
        currentLobbyUuid,
      },
    })
  }
}

/**
 * Exception thrown when lobby creation fails due to internal server error
 */
export class LobbyCreationInternalException extends BusinessException {
  constructor(error: Error, userUuid: string, lobbyData: any) {
    super('An unexpected error occurred while creating the lobby.', {
      classification: ErrorClassification.INTERNAL,
      severity: ErrorSeverity.HIGH,
      userMessage: 'Something went wrong. Please try again in a few moments.',
      toastType: ToastType.ERROR,
      context: {
        originalError: error.message,
        stack: error.stack,
        userUuid,
        lobbyData,
      },
    })
  }
}

/**
 * Exception thrown when lobby is not found
 */
export class LobbyNotFoundException extends BusinessException {
  constructor(lobbyUuid: string) {
    super('Lobby not found.', {
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'This lobby no longer exists or has been removed.',
      toastType: ToastType.ERROR,
      context: {
        lobbyUuid,
      },
    })
  }
}

/**
 * Exception thrown when user tries to join a full lobby
 */
export class LobbyFullException extends BusinessException {
  constructor(lobbyUuid: string, maxPlayers: number) {
    super('Lobby is full.', {
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.LOW,
      userMessage: 'This lobby is full. Please try joining another lobby.',
      toastType: ToastType.WARNING,
      context: {
        lobbyUuid,
        maxPlayers,
      },
    })
  }
}

/**
 * Exception thrown when user tries to join a lobby with wrong password
 */
export class InvalidLobbyPasswordException extends BusinessException {
  constructor(lobbyUuid: string) {
    super('Invalid lobby password.', {
      classification: ErrorClassification.SECURITY,
      severity: ErrorSeverity.LOW,
      userMessage: 'Incorrect password. Please try again.',
      toastType: ToastType.ERROR,
      context: {
        lobbyUuid,
        // Ne pas logger le mot de passe pour des raisons de sécurité
      },
    })
  }
}
