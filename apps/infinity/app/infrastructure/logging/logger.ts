/**
 * Logger centralisé avec Pino
 *
 * Features:
 * - Redaction automatique des données sensibles (passwords, tokens, secrets)
 * - Pretty printing en développement
 * - JSON structuré en production
 * - Niveaux de log configurables
 */

import pino from 'pino'
import env from '#start/env'

// Chemins sensibles à masquer automatiquement
const REDACT_PATHS = [
  'password',
  '*.password',
  'req.headers.authorization',
  'token',
  '*.token',
  'secret',
  '*.secret',
  'apiKey',
  '*.apiKey',
  'cookie',
  'req.headers.cookie',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
]

// Configuration du logger
export const logger = pino({
  level: env.get('LOG_LEVEL', 'info'),

  // Masquage automatique des secrets
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },

  // Format des timestamps
  timestamp: pino.stdTimeFunctions.isoTime,

  // Formatter personnalisé pour le niveau
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },

  // Pretty printing en développement
  transport:
    env.get('NODE_ENV') === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{context} → {msg}',
          },
        }
      : undefined,
})

/**
 * Créer un logger avec contexte
 *
 * @example
 * const logger = createContextLogger('UserService')
 * logger.info('User created')
 * // Output: [INFO] UserService → User created
 */
export const createContextLogger = (context: string) => logger.child({ context })

export default logger
