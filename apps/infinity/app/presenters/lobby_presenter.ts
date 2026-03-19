import type User from '#models/user'
import type { UserRole } from '#domain/value_objects/user_role'

type LobbyEntity = {
  uuid: string
  name: string
  description?: string
  status: string
  maxPlayers: number
  isPrivate: boolean
  hasPassword?: boolean
  availableActions: string[]
  createdBy: string
  createdAt: Date
  players: Array<{ uuid: string; nickName: string }>
  toJSON: () => Record<string, unknown>
}

export type LobbySummaryDTO = {
  uuid: string
  name: string
  status: string
  currentPlayers: number
  maxPlayers: number
}

export type LobbyListItemDTO = {
  uuid: string
  name: string
  description?: string
  maxPlayers: number
  currentPlayers: number
  isPrivate: boolean
  hasPassword: boolean
  status: string
  availableActions: string[]
  createdBy: string
  players: Array<{ uuid: string; nickName: string }>
  createdAt: Date
}

export type LobbyDetailDTO = ReturnType<LobbyEntity['toJSON']> & {
  invitationCode: string
  hasPassword: boolean
}

export type UserSummaryDTO = {
  uuid: string
  fullName: string
  email?: string
  nickName?: string
  role?: UserRole
}

export function toLobbySummary(lobby: LobbyEntity): LobbySummaryDTO {
  return {
    uuid: lobby.uuid,
    name: lobby.name,
    status: lobby.status,
    currentPlayers: lobby.players.length,
    maxPlayers: lobby.maxPlayers,
  }
}

export function toLobbyListItem(lobby: LobbyEntity): LobbyListItemDTO {
  return {
    uuid: lobby.uuid,
    name: lobby.name,
    description: lobby.description,
    maxPlayers: lobby.maxPlayers,
    currentPlayers: lobby.players.length,
    isPrivate: lobby.isPrivate,
    hasPassword: Boolean(lobby.hasPassword),
    status: lobby.status,
    availableActions: lobby.availableActions,
    createdBy: lobby.createdBy,
    players: lobby.players.map((player) => ({
      uuid: player.uuid,
      nickName: player.nickName,
    })),
    createdAt: lobby.createdAt,
  }
}

export function toLobbyDetail(lobby: LobbyEntity): LobbyDetailDTO {
  return {
    ...lobby.toJSON(),
    invitationCode: lobby.uuid,
    hasPassword: Boolean(lobby.hasPassword),
  }
}

export function toUserSummary(user: User, options?: { includeEmail?: boolean }): UserSummaryDTO {
  const dto: UserSummaryDTO = {
    uuid: user.userUuid,
    fullName: user.fullName ?? 'Unknown User',
    role: user.normalizedRole,
  }

  if (options?.includeEmail) {
    const email = user.email ?? undefined
    dto.email = email
    dto.nickName = email
  }

  return dto
}
