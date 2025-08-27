import { Exception } from '@adonisjs/core/exceptions'
import { HttpContext } from '@adonisjs/core/http'
import {
  ErrorClassification,
  ErrorSeverity,
  ToastType,
  ErrorMetadata,
} from './types/error_classification.js'

/**
 * Exception de base pour les erreurs métier avec classification de sécurité
 */
export default class BusinessException extends Exception {
  public readonly metadata: ErrorMetadata

  constructor(
    technicalMessage: string,
    options: {
      status?: number
      code?: string
      classification: ErrorClassification
      severity: ErrorSeverity
      userMessage: string
      toastType?: ToastType
      context?: Record<string, any>
      tags?: string[]
      reportToSentry?: boolean
    }
  ) {
    super(technicalMessage, { status: options.status, code: options.code })

    this.metadata = {
      classification: options.classification,
      severity: options.severity,
      userMessage: options.userMessage,
      technicalMessage,
      toastType: options.toastType || ToastType.ERROR,
      context: options.context,
      tags: options.tags,
      reportToSentry: options.reportToSentry ?? true,
    }
  }

  /**
   * Gestion automatique de l'erreur avec toasts et logs
   */
  async handle(error: this, ctx: HttpContext) {
    // Flash message pour le toast automatique
    ctx.session.flash(this.metadata.toastType, this.metadata.userMessage)

    // Log structuré selon la classification
    this.logError(error, ctx)

    // Réponse selon le type de requête
    if (ctx.request.accepts(['json'])) {
      return ctx.response.status(error.status).json({
        success: false,
        message: this.metadata.userMessage,
        code: error.code,
      })
    }

    // Redirection avec flash message pour les requêtes web
    return ctx.response.redirect().back()
  }

  /**
   * Log structuré selon la classification
   */
  private logError(error: this, ctx: HttpContext) {
    const logData = {
      error: {
        code: error.code,
        status: error.status,
        classification: this.metadata.classification,
        severity: this.metadata.severity,
        userMessage: this.metadata.userMessage,
        technicalMessage: this.metadata.technicalMessage,
        tags: this.metadata.tags,
      },
      request: {
        method: ctx.request.method(),
        url: ctx.request.url(),
        ip: ctx.request.ip(),
        userAgent: ctx.request.header('user-agent'),
      },
      user: {
        id: ctx.auth.user?.id,
        email: ctx.auth.user?.email,
      },
      context: this.metadata.context,
    }

    switch (this.metadata.classification) {
      case ErrorClassification.USER_SAFE:
        ctx.logger.info(logData, `User error: ${this.metadata.userMessage}`)
        break

      case ErrorClassification.INTERNAL:
        ctx.logger.error(logData, `Internal error: ${this.metadata.technicalMessage}`)
        break

      case ErrorClassification.SECURITY:
        ctx.logger.warn(logData, `Security event: ${this.metadata.technicalMessage}`)
        break
    }
  }

  /**
   * Report pour Sentry (préparation future)
   */
  async report(error: this, ctx: HttpContext) {
    if (!this.metadata.reportToSentry) {
      return
    }

    // TODO: Intégration Sentry future
    // Sentry.captureException(error, {
    //   tags: this.metadata.tags,
    //   extra: this.metadata.context,
    //   user: {
    //     id: ctx.auth.user?.id,
    //     email: ctx.auth.user?.email,
    //   },
    //   level: this.getSentryLevel(),
    // })

    // Log pour préparation
    ctx.logger.info(
      {
        sentryPrep: true,
        error: error.message,
        severity: this.metadata.severity,
        tags: this.metadata.tags,
        context: this.metadata.context,
      },
      'Error prepared for Sentry reporting'
    )
  }

  /**
   * Conversion de la sévérité pour Sentry
   */
  private getSentryLevel(): string {
    switch (this.metadata.severity) {
      case ErrorSeverity.LOW:
        return 'info'
      case ErrorSeverity.MEDIUM:
        return 'warning'
      case ErrorSeverity.HIGH:
        return 'error'
      case ErrorSeverity.CRITICAL:
        return 'fatal'
      default:
        return 'error'
    }
  }
}
