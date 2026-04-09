const SAFE_MESSAGES = {
  database: 'A connection error occurred. Please try again.',
  authentication: 'An authentication error occurred.',
  validation: 'The provided data is invalid.',
  network: 'A network error occurred. Please try again.',
  system: 'An unexpected error occurred. Please try again later.',
} as const

type ErrorCategory = keyof typeof SAFE_MESSAGES

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
  { pattern: /mysql|postgres|redis|mongo/i, category: 'database' },
]

export function sanitizeErrorMessage(error: unknown): string {
  const technicalMessage = error instanceof Error ? error.message : String(error)

  for (const { pattern, category } of SENSITIVE_PATTERNS) {
    if (pattern.test(technicalMessage)) {
      return SAFE_MESSAGES[category]
    }
  }

  if (
    technicalMessage.length > 100 ||
    technicalMessage.includes('@') ||
    technicalMessage.includes('/')
  ) {
    return SAFE_MESSAGES.system
  }

  return technicalMessage
}

export function safeSystemError(error: unknown): string {
  return sanitizeErrorMessage(error)
}
