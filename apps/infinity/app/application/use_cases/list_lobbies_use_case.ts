import { type LobbyRepository } from '#application/repositories/lobby_repository'
import { type LobbyStatus } from '#domain/value_objects/lobby_status'
import { Result } from '#shared/result'
import type { UserRole } from '#domain/value_objects/user_role'

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
      // Filtrer par statut spécifique
      lobbies = await this.lobbyRepository.findByStatus(request.status)
    } else if (request.includePrivate) {
      // Vue modération/admin: voir aussi les lobbies privés/protégés
      lobbies = await this.lobbyRepository.findAll()
    } else {
      // Par défaut, récupérer les lobbies disponibles
      lobbies = await this.lobbyRepository.findAvailableLobbies()
    }

    // Filtrer par slots disponibles si demandé
    if (request.hasSlots === true) {
      lobbies = lobbies.filter((lobby) => lobby.hasAvailableSlots)
    }

    const canModerate = request.viewerRole === 'ADMIN' || request.viewerRole === 'MODERATOR'

    // Les joueurs standards ne voient pas les lobbies privés, sauf s'ils en font partie.
    if (!canModerate) {
      lobbies = lobbies.filter(
        (lobby) =>
          !lobby.isPrivate ||
          (request.viewerUserUuid ? lobby.hasPlayer(request.viewerUserUuid) : false)
      )
    }

    const response: ListLobbiesResponse = {
      lobbies: lobbies.map((lobby) => ({
        uuid: lobby.uuid,
        name: lobby.name,
        description: lobby.description,
        status: lobby.status,
        currentPlayers:
          (lobby as any).currentPlayers || (lobby as any).playerCount || lobby.players?.length || 0,
        maxPlayers: lobby.maxPlayers,
        isPrivate: lobby.isPrivate,
        hasPassword: lobby.hasPassword,
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
