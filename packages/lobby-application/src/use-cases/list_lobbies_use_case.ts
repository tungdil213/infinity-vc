import { type LobbyStatus } from '@infinity.dev/lobby-domain/value-objects'
import { Result } from '@infinity.dev/lobby-domain/shared'
import type { LobbyRepository } from '../repositories/index.js'

export type UserRole = 'PLAYER' | 'MODERATOR' | 'ADMIN'

export interface ListLobbiesRequest {
  status?: LobbyStatus
  hasSlots?: boolean
  includePrivate?: boolean
  viewerUserUuid?: string
  viewerRole?: UserRole
}

export interface ListLobbiesResponse {
  lobbies: Array<{
    uuid: string
    name: string
    description?: string
    status: string
    currentPlayers: number
    maxPlayers: number
    isPrivate: boolean
    hasPassword: boolean
    hasAvailableSlots: boolean
    canStart: boolean
    createdBy: string
    players: Array<{
      uuid: string
      nickName: string
    }>
    createdAt: Date
  }>
  total: number
}

export class ListLobbiesUseCase {
  constructor(private lobbyRepository: LobbyRepository) {}

  async execute(request: ListLobbiesRequest = {}): Promise<Result<ListLobbiesResponse>> {
    let lobbies

    if (request.status) {
      lobbies = await this.lobbyRepository.findByStatus(request.status)
    } else if (request.includePrivate) {
      lobbies = await this.lobbyRepository.findAll()
    } else {
      lobbies = await this.lobbyRepository.findAvailableLobbies()
    }

    if (request.hasSlots === true) {
      lobbies = lobbies.filter((lobby) => lobby.hasAvailableSlots)
    }

    const canModerate = request.viewerRole === 'ADMIN' || request.viewerRole === 'MODERATOR'

    if (!canModerate) {
      lobbies = lobbies.filter((lobby) => {
        if (!lobby.isPrivate) {
          return true
        }

        if (!request.viewerUserUuid) {
          return false
        }

        if (typeof (lobby as any).hasPlayer === 'function') {
          return (lobby as any).hasPlayer(request.viewerUserUuid)
        }

        if (Array.isArray((lobby as any).players)) {
          return (lobby as any).players.some((player: { uuid?: string }) => player.uuid === request.viewerUserUuid)
        }

        return false
      })
    }

    const response: ListLobbiesResponse = {
      lobbies: lobbies.map((lobby) => ({
        uuid: lobby.uuid,
        name: lobby.name,
        description: (lobby as any).description,
        status: String(lobby.status),
        currentPlayers:
          (lobby as any).currentPlayers || (lobby as any).playerCount || lobby.players?.length || 0,
        maxPlayers: lobby.maxPlayers,
        isPrivate: lobby.isPrivate,
        hasPassword: (lobby as any).hasPassword || false,
        hasAvailableSlots: lobby.hasAvailableSlots,
        canStart: lobby.canStart,
        createdBy: lobby.createdBy,
        players: lobby.players,
        createdAt: lobby.createdAt,
      })),
      total: lobbies.length,
    }

    return Result.ok(response)
  }
}
