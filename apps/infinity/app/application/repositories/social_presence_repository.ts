import type { UserPresenceRecord } from '#application/dtos/friend_presence_dto'
import type { Result } from '#shared/result'

export interface SocialPresenceSessionState {
  userUuid: string
  hasActiveSessions: boolean
  updatedAt: Date
}

export interface SocialPresenceRepository {
  getPresence(userUuid: string): Promise<UserPresenceRecord | null>
  getPresenceForUsers(userUuids: string[]): Promise<Map<string, UserPresenceRecord>>
  touchSession(
    userUuid: string,
    clientSessionId: string
  ): Promise<Result<SocialPresenceSessionState>>
  removeSession(
    userUuid: string,
    clientSessionId: string
  ): Promise<Result<SocialPresenceSessionState>>
  clearSessions(userUuid: string): Promise<Result<SocialPresenceSessionState>>
  savePresence(record: UserPresenceRecord): Promise<Result<UserPresenceRecord>>
}
