/**
 * Sentry configuration pour error tracking et performance monitoring
 *
 * Ce fichier configure Sentry pour capturer et monitorer :
 * - Erreurs runtime
 * - Exceptions non gérées
 * - Performance (traces)
 * - Profiling
 */

import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import env from '#start/env'
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('Sentry')

export function initializeSentry() {
  const dsn = env.get('SENTRY_DSN')
  const environment = env.get('NODE_ENV', 'development')
  const sentryEnvironment = env.get('SENTRY_ENVIRONMENT', environment)

  // Skip Sentry in test environment
  if (environment === 'test' || !dsn) {
    logger.info('Sentry disabled (no DSN or test environment)')
    return
  }

  try {
    Sentry.init({
      dsn,
      environment: sentryEnvironment,

      // Tracing
      tracesSampleRate: Number.parseFloat(env.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')),

      // Profiling
      profilesSampleRate: Number.parseFloat(env.get('SENTRY_PROFILES_SAMPLE_RATE', '0.1')),

      integrations: [
        // Performance profiling
        nodeProfilingIntegration(),
      ],

      // Before sending events, scrub sensitive data
      beforeSend(event) {
        // Remove cookies
        if (event.request?.cookies) {
          delete event.request.cookies
        }

        // Remove sensitive headers
        if (event.request?.headers) {
          const sensitiveHeaders = ['authorization', 'cookie', 'x-csrf-token', 'x-api-key']
          const headers = event.request.headers as Record<string, string>
          sensitiveHeaders.forEach((header) => {
            delete headers[header]
          })
        }

        // Remove passwords from request data
        if (event.request?.data) {
          try {
            const data = JSON.parse(event.request.data)
            if (data.password) data.password = '[REDACTED]'
            if (data.passwordConfirmation) data.passwordConfirmation = '[REDACTED]'
            if (data.oldPassword) data.oldPassword = '[REDACTED]'
            event.request.data = JSON.stringify(data)
          } catch {
            // Ignore JSON parse errors
          }
        }

        return event
      },

      // Ignore certain errors
      ignoreErrors: [
        // Browser/network errors
        'NetworkError',
        'Network request failed',
        'Failed to fetch',
        // User cancelled actions
        'AbortError',
        'The operation was aborted',
        // Common user errors (not bugs)
        'Invalid credentials',
        'Email already exists',
      ],
    })

    logger.info({ environment: sentryEnvironment }, 'Sentry initialized successfully')
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Sentry')
  }
}

// Capturer les exceptions non gérées
export function setupSentryErrorHandlers() {
  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception')
    Sentry.captureException(error, {
      level: 'fatal',
      tags: { type: 'uncaughtException' },
    })
    // Give Sentry time to send the event
    setTimeout(() => {
      process.exit(1)
    }, 2000)
  })

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection')
    Sentry.captureException(reason, {
      level: 'error',
      tags: { type: 'unhandledRejection' },
    })
  })
}

// Helper functions pour capturer des événements custom
export function captureSentryException(
  error: Error,
  context?: Record<string, any>,
  tags?: Record<string, string>
) {
  Sentry.captureException(error, {
    extra: context,
    tags,
  })
}

export function captureSentryMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  })
}

// Initialize automatically when imported
initializeSentry()
setupSentryErrorHandlers()
