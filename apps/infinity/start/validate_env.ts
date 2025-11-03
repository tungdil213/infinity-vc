/**
 * Validation des variables d'environnement au démarrage
 *
 * Ce fichier est exécuté AVANT le démarrage de l'application
 * pour s'assurer que toutes les variables critiques sont présentes
 * et valides en production.
 */

import env from '#start/env'
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('EnvValidation')

interface ValidationRule {
  key: string
  required: boolean
  minLength?: number
  pattern?: RegExp
  errorMessage?: string
}

const PRODUCTION_RULES: ValidationRule[] = [
  {
    key: 'APP_KEY',
    required: true,
    pattern: /^base64:[A-Za-z0-9+\/=]{44,}$/,
    errorMessage: 'APP_KEY must be generated with "node ace generate:key"',
  },
  {
    key: 'DB_CONNECTION',
    required: true,
    pattern: /^postgres$/,
    errorMessage: 'DB_CONNECTION must be "postgres" in production (SQLite not allowed)',
  },
  {
    key: 'DB_PASSWORD',
    required: true,
    minLength: 32,
    errorMessage: 'DB_PASSWORD must be at least 32 characters long',
  },
  {
    key: 'REDIS_PASSWORD',
    required: true,
    minLength: 32,
    errorMessage: 'REDIS_PASSWORD must be at least 32 characters long',
  },
  {
    key: 'TRANSMIT_APP_KEY',
    required: true,
    minLength: 32,
    errorMessage: 'TRANSMIT_APP_KEY must be at least 32 characters long',
  },
  {
    key: 'SENTRY_DSN',
    required: true,
    pattern: /^https:\/\/.+@.+\.ingest\.sentry\.io\/.+$/,
    errorMessage: 'SENTRY_DSN must be a valid Sentry DSN URL',
  },
]

const DEVELOPMENT_RULES: ValidationRule[] = [
  {
    key: 'APP_KEY',
    required: true,
    pattern: /^base64:.+$/,
    errorMessage: 'APP_KEY must be generated with "node ace generate:key"',
  },
]

export function validateEnvironment() {
  const nodeEnv = env.get('NODE_ENV', 'development')
  const rules = nodeEnv === 'production' ? PRODUCTION_RULES : DEVELOPMENT_RULES

  logger.info({ environment: nodeEnv }, 'Validating environment variables')

  const errors: string[] = []
  const warnings: string[] = []

  for (const rule of rules) {
    const value = env.get(rule.key)

    // Check if required
    if (rule.required && !value) {
      errors.push(`❌ ${rule.key} is required but missing`)
      continue
    }

    if (!value) continue // Not required and not set, skip

    // Check for default/placeholder values
    if (
      value.includes('CHANGE_ME') ||
      value.includes('changeme') ||
      value.includes('your-') ||
      value.includes('example.com')
    ) {
      if (nodeEnv === 'production') {
        errors.push(`❌ ${rule.key} still has a default/placeholder value`)
      } else {
        warnings.push(`⚠️  ${rule.key} has a default/placeholder value`)
      }
      continue
    }

    // Check minimum length
    if (rule.minLength && value.length < rule.minLength) {
      const msg = rule.errorMessage || `${rule.key} must be at least ${rule.minLength} characters`
      errors.push(`❌ ${msg} (current: ${value.length} chars)`)
      continue
    }

    // Check pattern
    if (rule.pattern && !rule.pattern.test(value)) {
      const msg = rule.errorMessage || `${rule.key} format is invalid`
      errors.push(`❌ ${msg}`)
      continue
    }
  }

  // Report results
  if (errors.length > 0) {
    logger.fatal({ errors, warnings }, 'Environment validation failed')
    console.error('\n🔴 ENVIRONMENT VALIDATION FAILED\n')
    errors.forEach((error) => console.error(error))
    if (warnings.length > 0) {
      console.warn('\n⚠️  WARNINGS:\n')
      warnings.forEach((warning) => console.warn(warning))
    }
    console.error('\n💡 See .env.production.example for configuration guidelines\n')

    if (nodeEnv === 'production') {
      process.exit(1)
    }
  } else if (warnings.length > 0) {
    logger.warn({ warnings }, 'Environment validation passed with warnings')
    warnings.forEach((warning) => logger.warn(warning))
  } else {
    logger.info('✅ Environment validation passed')
  }
}

// Execute validation automatically when imported
validateEnvironment()
