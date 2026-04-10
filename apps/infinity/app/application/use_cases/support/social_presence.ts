import { toFriendPresenceDto } from '#application/dtos/friend_presence_dto'
import type { FriendPresenceDTO, UserPresenceRecord } from '#application/dtos/friend_presence_dto'
import type { SocialPresenceContext } from '#application/services/social_presence_context_resolver'

export function buildUserPresenceRecord(args: {
  userUuid: string
  displayName: string
  context: SocialPresenceContext | null
  updatedAt?: Date
}): UserPresenceRecord {
  const updatedAt = args.updatedAt ?? new Date()
  if (!args.context) {
    return {
      userUuid: args.userUuid,
      displayName: args.displayName,
      status: 'offline',
      lobbyId: null,
      lobbyName: null,
      gameId: null,
      updatedAt,
    }
  }

  return {
    userUuid: args.userUuid,
    displayName: args.displayName,
    status: args.context.status,
    lobbyId: args.context.lobbyId,
    lobbyName: args.context.lobbyName,
    gameId: args.context.gameId,
    updatedAt,
  }
}

export function hasPresenceChanged(
  previousPresence: UserPresenceRecord | null,
  nextPresence: UserPresenceRecord
): boolean {
  if (!previousPresence) {
    return true
  }

  return (
    previousPresence.displayName !== nextPresence.displayName ||
    previousPresence.status !== nextPresence.status ||
    previousPresence.lobbyId !== nextPresence.lobbyId ||
    previousPresence.lobbyName !== nextPresence.lobbyName ||
    previousPresence.gameId !== nextPresence.gameId
  )
}

export function toPresenceNotification(record: UserPresenceRecord): FriendPresenceDTO {
  return toFriendPresenceDto(record)
}
