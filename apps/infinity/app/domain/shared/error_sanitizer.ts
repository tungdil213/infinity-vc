import logger from '@adonisjs/core/services/logger'

/**
 * Safe generic messages by system error category
 */
const SAFE_MESSAGES = {
  database: 'A connection error occurred. Please try again.',
  authentication: 'An authentication error occurred.',
  validation: 'The provided data is invalid.',
  network: 'A network error occurred. Please try again.',
  system: 'An unexpected error occurred. Please try again later.',
} as const

type ErrorCategory = keyof typeof SAFE_MESSAGES

/**
 * Sensitive error patterns that should be sanitized
 */
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; category: ErrorCategory }> = [
  { pattern: /Access denied for user/i, category: 'database' },
  { pattern: /ECONNREFUSED/i, category: 'database' },
  { pattern: /ER_ACCESS_DENIED/i, category: 'database' },
  { pattern: /ETIMEDOUT/i, category: 'network' },
  { pattern: /ENOTFOUND/i, category: 'network' },
  { pattern: /password/i, category: 'authentication' },
  { pattern: /credential/i, category: 'authentication' },
  { pattern: /token.*invalid/i, category: 'authentication' },
  { pattern: /secret/i, category: 'system' },
  { pattern: /\.env/i, category: 'system' },
  { pattern: /@.*\.ch\b/i, category: 'database' }, // Infomaniak hosts
  { pattern: /mysql|postgres|redis|mongo/i, category: 'database' },
]

/**
 * Sanitizes an error message to avoid exposing sensitive information.
 * Logs the technical message and returns a safe user-facing message.
 */
export function sanitizeErrorMessage(
  error: unknown,
  context?: { operation?: string; userId?: string }
): string {
  const technicalMessage = error instanceof Error ? error.message : String(error)

  // Check whether message matches sensitive patterns
  for (const { pattern, category } of SENSITIVE_PATTERNS) {
    if (pattern.test(technicalMessage)) {
      // Log full technical message for debugging
      logger.error(
        {
          technicalMessage,
          category,
          operation: context?.operation,
          userId: context?.userId,
          sanitized: true,
        },
        `Sanitized ${category} error`
      )

      return SAFE_MESSAGES[category]
    }
  }

  // Even without a sensitive pattern, long or technical-looking messages are sanitized
  if (
    technicalMessage.length > 100 ||
    technicalMessage.includes('@') ||
    technicalMessage.includes('/')
  ) {
    logger.error(
      {
        technicalMessage,
        operation: context?.operation,
        userId: context?.userId,
        sanitized: true,
      },
      'Sanitized potentially sensitive error'
    )

    return SAFE_MESSAGES.system
  }

  return technicalMessage
}

/**
 * Creates a safe Result.fail message for use cases
 */
export function safeSystemError(error: unknown, operation: string, userId?: string): string {
  return sanitizeErrorMessage(error, { operation, userId })
}
