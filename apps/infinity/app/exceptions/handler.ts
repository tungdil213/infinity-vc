import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import { errors } from '@vinejs/vine'
import BusinessException from './business_exception.js'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = app.inProduction

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { inertia }) => inertia.render('errors/not_found', { error }),
    '500..599': (error, { inertia }) => inertia.render('errors/server_error', { error }),
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    // Gestion spéciale des BusinessException avec toasts automatiques
    if (error instanceof BusinessException) {
      return error.handle(error, ctx)
    }

    // Gestion des erreurs de validation avec toast d'erreur
    if (error instanceof errors.E_VALIDATION_ERROR) {
      ctx.session.flash('error', 'Please check the form and correct any errors.')
      ctx.session.flashExcept(['_token'])

      if (ctx.request.accepts(['json'])) {
        return ctx.response.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      return ctx.response.redirect().back()
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    // Report personnalisé pour BusinessException
    if (error instanceof BusinessException) {
      return error.report(error, ctx)
    }

    return super.report(error, ctx)
  }

  /**
   * Contexte additionnel pour les logs
   */
  protected context(ctx: HttpContext) {
    return {
      requestId: ctx.request.id(),
      userId: ctx.auth.user?.id,
      email: ctx.auth.user?.email,
      ip: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent'),
      method: ctx.request.method(),
      url: ctx.request.url(),
    }
  }
}
