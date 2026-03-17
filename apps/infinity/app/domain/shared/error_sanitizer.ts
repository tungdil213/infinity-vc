import logger from '@adonisjs/core/services/logger'

/**
 * Messages génériques par type d'erreur système
 */
const SAFE_MESSAGES = {
  database: 'Une erreur de connexion est survenue. Veuillez réessayer.',
  authentication: "Une erreur d'authentification est survenue.",
  validation: 'Les données fournies sont invalides.',
  network: 'Une erreur réseau est survenue. Veuillez réessayer.',
  system: 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.',
} as const

type ErrorCategory = keyof typeof SAFE_MESSAGES

/**
 * Patterns d'erreurs sensibles à détecter
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
 * Sanitize un message d'erreur pour ne pas exposer d'informations sensibles.
 * Log le message technique complet et retourne un message safe pour l'utilisateur.
 */
export function sanitizeErrorMessage(
  error: unknown,
  context?: { operation?: string; userId?: string }
): string {
  const technicalMessage = error instanceof Error ? error.message : String(error)

  // Vérifier si le message contient des patterns sensibles
  for (const { pattern, category } of SENSITIVE_PATTERNS) {
    if (pattern.test(technicalMessage)) {
      // Log le message technique complet pour debugging
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

  // Si pas de pattern sensible détecté, on vérifie quand même la longueur
  // et la présence potentielle d'informations techniques
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
 * Crée un message d'erreur Result.fail safe pour les use cases
 */
export function safeSystemError(error: unknown, operation: string, userId?: string): string {
  return sanitizeErrorMessage(error, { operation, userId })
}
