import BusinessException from './business_exception.js'
import { ErrorClassification, ErrorSeverity, ToastType } from './types/error_classification.js'

/**
 * Exceptions spécifiques à l'authentification avec gestion de sécurité
 */

export class EmailAlreadyExistsException extends BusinessException {
  constructor(email: string) {
    super(`Email already exists: ${email}`, {
      status: 422,
      code: 'E_EMAIL_ALREADY_EXISTS',
      classification: ErrorClassification.SECURITY,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'An account with this information already exists. Please try logging in instead.',
      toastType: ToastType.ERROR,
      context: { email },
      tags: ['auth', 'registration', 'duplicate'],
      reportToSentry: false, // Pas besoin de reporter les tentatives normales
    })
  }
}

export class UsernameAlreadyExistsException extends BusinessException {
  constructor(username: string) {
    super(`Username already exists: ${username}`, {
      status: 422,
      code: 'E_USERNAME_ALREADY_EXISTS',
      classification: ErrorClassification.SECURITY,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'This username is not available. Please choose another one.',
      toastType: ToastType.ERROR,
      context: { username },
      tags: ['auth', 'registration', 'duplicate'],
      reportToSentry: false,
    })
  }
}

export class NicknameAlreadyExistsException extends BusinessException {
  constructor(nickname: string) {
    super(`Nickname already exists: ${nickname}`, {
      status: 422,
      code: 'E_NICKNAME_ALREADY_EXISTS',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.LOW,
      userMessage: 'This nickname is already taken. Please choose another one.',
      toastType: ToastType.ERROR,
      context: { nickname },
      tags: ['auth', 'registration', 'duplicate'],
      reportToSentry: false,
    })
  }
}

export class InvalidCredentialsException extends BusinessException {
  constructor(email: string) {
    super(`Invalid login attempt for email: ${email}`, {
      status: 401,
      code: 'E_INVALID_CREDENTIALS',
      classification: ErrorClassification.SECURITY,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'Invalid email or password. Please check your credentials and try again.',
      toastType: ToastType.ERROR,
      context: { email },
      tags: ['auth', 'login', 'failed'],
      reportToSentry: false,
    })
  }
}

export class AccountNotVerifiedException extends BusinessException {
  constructor(email: string) {
    super(`Login attempt with unverified account: ${email}`, {
      status: 403,
      code: 'E_ACCOUNT_NOT_VERIFIED',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.LOW,
      userMessage: 'Please verify your email address before logging in. Check your inbox for the verification link.',
      toastType: ToastType.WARNING,
      context: { email },
      tags: ['auth', 'verification', 'pending'],
      reportToSentry: false,
    })
  }
}

export class RegistrationFailedException extends BusinessException {
  constructor(reason: string, context?: Record<string, any>) {
    super(`Registration failed: ${reason}`, {
      status: 500,
      code: 'E_REGISTRATION_FAILED',
      classification: ErrorClassification.INTERNAL,
      severity: ErrorSeverity.HIGH,
      userMessage: 'Registration failed due to a technical issue. Please try again later.',
      toastType: ToastType.ERROR,
      context,
      tags: ['auth', 'registration', 'system_error'],
      reportToSentry: true,
    })
  }
}
