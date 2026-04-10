import { Result } from '#shared/result'
import type { UserPresenceRecord } from '#application/dtos/friend_presence_dto'
import type {
  SocialPresenceRepository,
  SocialPresenceSessionState,
} from '#application/repositories/social_presence_repository'

type SessionRegistry = Map<string, number>

const DEFAULT_SOCIAL_PRESENCE_TTL_MS = resolveSocialPresenceTtlMs()

function resolveSocialPresenceTtlMs(): number {
  const configuredValue = Number(process.env.SOCIAL_PRESENCE_TTL_MS ?? 45_000)
  if (!Number.isFinite(configuredValue)) {
    return 45_000
  }

  return Math.min(300_000, Math.max(10_000, Math.floor(configuredValue)))
}

export class InMemorySocialPresenceRepository implements SocialPresenceRepository {
  private static readonly sessionsByUser = new Map<string, SessionRegistry>()
  private static readonly presenceByUser = new Map<string, UserPresenceRecord>()

  constructor(private readonly ttlMs: number = DEFAULT_SOCIAL_PRESENCE_TTL_MS) {}

  async getPresence(userUuid: string): Promise<UserPresenceRecord | null> {
    this.pruneUser(userUuid)
    return this.clonePresence(InMemorySocialPresenceRepository.presenceByUser.get(userUuid) ?? null)
  }

  async getPresenceForUsers(userUuids: string[]): Promise<Map<string, UserPresenceRecord>> {
    const result = new Map<string, UserPresenceRecord>()

    for (const userUuid of [...new Set(userUuids)].filter(Boolean)) {
      this.pruneUser(userUuid)
      const presence = InMemorySocialPresenceRepository.presenceByUser.get(userUuid)
      if (presence) {
        result.set(userUuid, this.clonePresence(presence)!)
      }
    }

    return result
  }

  async touchSession(
    userUuid: string,
    clientSessionId: string
  ): Promise<Result<SocialPresenceSessionState>> {
    if (!userUuid.trim() || !clientSessionId.trim()) {
      return Result.fail('User UUID and client session are required')
    }

    const now = Date.now()
    this.pruneUser(userUuid, now)

    const sessions =
      InMemorySocialPresenceRepository.sessionsByUser.get(userUuid) ?? new Map<string, number>()
    sessions.set(clientSessionId, now)
    InMemorySocialPresenceRepository.sessionsByUser.set(userUuid, sessions)

    return Result.ok({
      userUuid,
      hasActiveSessions: sessions.size > 0,
      updatedAt: new Date(now),
    })
  }

  async removeSession(
    userUuid: string,
    clientSessionId: string
  ): Promise<Result<SocialPresenceSessionState>> {
    if (!userUuid.trim() || !clientSessionId.trim()) {
      return Result.fail('User UUID and client session are required')
    }

    const now = Date.now()
    this.pruneUser(userUuid, now)

    const sessions = InMemorySocialPresenceRepository.sessionsByUser.get(userUuid)
    sessions?.delete(clientSessionId)
    if (sessions && sessions.size === 0) {
      InMemorySocialPresenceRepository.sessionsByUser.delete(userUuid)
    }

    this.applyOfflinePresenceIfInactive(userUuid, now)

    return Result.ok({
      userUuid,
      hasActiveSessions: this.hasActiveSessions(userUuid),
      updatedAt: new Date(now),
    })
  }

  async clearSessions(userUuid: string): Promise<Result<SocialPresenceSessionState>> {
    if (!userUuid.trim()) {
      return Result.fail('User UUID is required')
    }

    const now = Date.now()
    InMemorySocialPresenceRepository.sessionsByUser.delete(userUuid)
    this.applyOfflinePresenceIfInactive(userUuid, now)

    return Result.ok({
      userUuid,
      hasActiveSessions: false,
      updatedAt: new Date(now),
    })
  }

  async savePresence(record: UserPresenceRecord): Promise<Result<UserPresenceRecord>> {
    if (!record.userUuid.trim()) {
      return Result.fail('User UUID is required')
    }

    const now = record.updatedAt.getTime()
    this.pruneUser(record.userUuid, now)

    const normalizedRecord =
      record.status !== 'offline' && !this.hasActiveSessions(record.userUuid)
        ? this.toOfflineRecord(record, new Date(now))
        : this.clonePresence(record)!

    InMemorySocialPresenceRepository.presenceByUser.set(record.userUuid, normalizedRecord)
    return Result.ok(this.clonePresence(normalizedRecord)!)
  }

  clearAll(): void {
    InMemorySocialPresenceRepository.sessionsByUser.clear()
    InMemorySocialPresenceRepository.presenceByUser.clear()
  }

  private pruneUser(userUuid: string, now: number = Date.now()): void {
    const sessions = InMemorySocialPresenceRepository.sessionsByUser.get(userUuid)
    if (!sessions) {
      this.applyOfflinePresenceIfInactive(userUuid, now)
      return
    }

    for (const [clientSessionId, lastSeenAt] of sessions.entries()) {
      if (now - lastSeenAt > this.ttlMs) {
        sessions.delete(clientSessionId)
      }
    }

    if (sessions.size === 0) {
      InMemorySocialPresenceRepository.sessionsByUser.delete(userUuid)
    } else {
      InMemorySocialPresenceRepository.sessionsByUser.set(userUuid, sessions)
    }

    this.applyOfflinePresenceIfInactive(userUuid, now)
  }

  private applyOfflinePresenceIfInactive(userUuid: string, now: number): void {
    if (this.hasActiveSessions(userUuid)) {
      return
    }

    const existingPresence = InMemorySocialPresenceRepository.presenceByUser.get(userUuid)
    if (!existingPresence || existingPresence.status === 'offline') {
      return
    }

    InMemorySocialPresenceRepository.presenceByUser.set(
      userUuid,
      this.toOfflineRecord(existingPresence, new Date(now))
    )
  }

  private hasActiveSessions(userUuid: string): boolean {
    const sessions = InMemorySocialPresenceRepository.sessionsByUser.get(userUuid)
    return Boolean(sessions && sessions.size > 0)
  }

  private toOfflineRecord(record: UserPresenceRecord, updatedAt: Date): UserPresenceRecord {
    return {
      userUuid: record.userUuid,
      displayName: record.displayName,
      status: 'offline',
      lobbyId: null,
      lobbyName: null,
      gameId: null,
      updatedAt,
    }
  }

  private clonePresence(record: UserPresenceRecord | null): UserPresenceRecord | null {
    if (!record) {
      return null
    }

    return {
      userUuid: record.userUuid,
      displayName: record.displayName,
      status: record.status,
      lobbyId: record.lobbyId,
      lobbyName: record.lobbyName,
      gameId: record.gameId,
      updatedAt: new Date(record.updatedAt),
    }
  }
}
