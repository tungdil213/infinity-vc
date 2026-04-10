import type { FriendPresenceStatus } from '#application/dtos/friend_presence_dto'
import type { Result } from '#shared/result'

export interface SocialPresenceContext {
  status: FriendPresenceStatus
  lobbyId: string | null
  lobbyName: string | null
  gameId: string | null
}

export interface SocialPresenceContextResolver {
  resolve(userUuid: string): Promise<Result<SocialPresenceContext>>
}
