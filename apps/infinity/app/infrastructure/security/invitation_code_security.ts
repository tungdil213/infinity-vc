import { createHmac, randomBytes } from 'node:crypto'
import env from '#start/env'

const INVITATION_CODE_SEGMENT_LENGTH = 4
const INVITATION_CODE_SEGMENTS = 3
const INVITATION_CODE_ALLOWED = /[^A-Z0-9]/g

export function normalizeInvitationCode(code: string): string {
  return code.trim().toUpperCase().replace(INVITATION_CODE_ALLOWED, '')
}

export function formatInvitationCode(normalizedCode: string): string {
  const segments: string[] = []

  for (let index = 0; index < normalizedCode.length; index += INVITATION_CODE_SEGMENT_LENGTH) {
    segments.push(normalizedCode.slice(index, index + INVITATION_CODE_SEGMENT_LENGTH))
  }

  return segments.join('-')
}

export function generateInvitationCode(): string {
  const rawBytes = randomBytes(INVITATION_CODE_SEGMENT_LENGTH * INVITATION_CODE_SEGMENTS)
  const normalized = rawBytes
    .toString('base64url')
    .toUpperCase()
    .replace(INVITATION_CODE_ALLOWED, '')
  const clipped = normalized.slice(0, INVITATION_CODE_SEGMENT_LENGTH * INVITATION_CODE_SEGMENTS)

  return formatInvitationCode(clipped)
}

export function computeInvitationCodeDigest(code: string): string {
  const normalized = normalizeInvitationCode(code)
  const secret = resolveInvitationCodeSecret()

  return createHmac('sha256', secret).update(normalized).digest('hex')
}

function resolveInvitationCodeSecret(): string {
  const configuredSecret = env.get('INVITATION_CODE_SECRET')
  if (configuredSecret) {
    return configuredSecret
  }

  if (env.get('NODE_ENV') === 'production') {
    throw new Error('INVITATION_CODE_SECRET is required in production')
  }

  return env.get('APP_KEY')
}
