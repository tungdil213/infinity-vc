import { randomUUID } from 'node:crypto'

export function generateUsernameFromEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase()
  const localPart = normalizedEmail.split('@')[0] || ''

  const sanitized = localPart
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (sanitized.length >= 3) {
    return sanitized.slice(0, 50)
  }

  const fallbackBase = localPart.replace(/[^a-zA-Z0-9]/g, '')
  if (fallbackBase.length >= 3) {
    return fallbackBase.slice(0, 50)
  }

  return `user_${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

