export type FriendPresenceStatus = 'offline' | 'online' | 'in_lobby' | 'in_game'

export interface UserPresenceRecord {
  userUuid: string
  displayName: string
  status: FriendPresenceStatus
  lobbyId: string | null
  lobbyName: string | null
  gameId: string | null
  updatedAt: Date
}

export interface FriendPresenceDTO {
  friendUserUuid: string
  displayName: string
  status: FriendPresenceStatus
  lobbyId: string | null
  lobbyName: string | null
  gameId: string | null
  updatedAt: Date
}

export interface FriendPresenceSnapshotDTO {
  friends: FriendPresenceDTO[]
}

export function toFriendPresenceDto(record: UserPresenceRecord): FriendPresenceDTO {
  return {
    friendUserUuid: record.userUuid,
    displayName: record.displayName,
    status: record.status,
    lobbyId: record.lobbyId,
    lobbyName: record.lobbyName,
    gameId: record.gameId,
    updatedAt: record.updatedAt,
  }
}
