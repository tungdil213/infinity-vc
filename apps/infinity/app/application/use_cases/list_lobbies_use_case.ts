import { LobbyRepository } from '../repositories/lobby_repository.js'
import { LobbyStatus } from '../../domain/value_objects/lobby_status.js'
import { Result } from '../../domain/shared/result.js'

export interface ListLobbiesRequest {
  status?: LobbyStatus
  hasSlots?: boolean
  includePrivate?: boolean
}

export interface ListLobbiesResponse {
  lobbies: Array<{
    uuid: string
    name: string
    status: string
    currentPlayers: number
    maxPlayers: number
    isPrivate: boolean
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
    } else {
      // Par défaut, récupérer les lobbies disponibles
      lobbies = await this.lobbyRepository.findAvailableLobbies()
    }

    // Filtrer par slots disponibles si demandé
    if (request.hasSlots === true) {
      lobbies = lobbies.filter((lobby) => lobby.hasAvailableSlots)
    }

    // Filtrer les lobbies privés si non demandés
    if (!request.includePrivate) {
      lobbies = lobbies.filter((lobby) => !lobby.isPrivate)
    }

    const response: ListLobbiesResponse = {
      lobbies: lobbies.map((lobby) => ({
        uuid: lobby.uuid,
        name: lobby.name,
        status: lobby.status,
        currentPlayers:
          (lobby as any).currentPlayers || (lobby as any).playerCount || lobby.players?.length || 0,
        maxPlayers: lobby.maxPlayers,
        isPrivate: lobby.isPrivate,
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
