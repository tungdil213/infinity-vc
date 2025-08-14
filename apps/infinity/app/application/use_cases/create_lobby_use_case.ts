import Lobby from '../../domain/entities/lobby.js'
import { PlayerRepository } from '../repositories/player_repository.js'
import { LobbyRepository } from '../repositories/lobby_repository.js'

export interface CreateLobbyRequest {
  userUuid: string
  name: string
  maxPlayers?: number
  isPrivate?: boolean
}

export interface CreateLobbyResponse {
  lobby: {
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
    availableActions: string[]
    createdAt: Date
  }
}

export class CreateLobbyUseCase {
  constructor(
    private playerRepository: PlayerRepository,
    private lobbyRepository: LobbyRepository
  ) {}

  async execute(request: CreateLobbyRequest): Promise<CreateLobbyResponse> {
    // Validation des données d'entrée
    this.validateRequest(request)

    // Vérifier que le joueur existe
    const player = await this.playerRepository.findPlayerInterfaceByUuidOrFail(request.userUuid)

    // Vérifier que le joueur n'est pas déjà dans un lobby
    const existingLobby = await this.lobbyRepository.findByPlayer(request.userUuid)
    if (existingLobby) {
      throw new Error('Player is already in a lobby')
    }

    // Créer le lobby
    const lobby = Lobby.create({
      name: request.name,
      creator: player,
      maxPlayers: request.maxPlayers || 4,
      isPrivate: request.isPrivate || false,
    })

    // Sauvegarder le lobby
    await this.lobbyRepository.save(lobby)

    return {
      lobby: {
        uuid: lobby.uuid,
        name: lobby.name,
        status: lobby.status,
        currentPlayers: lobby.playerCount,
        maxPlayers: lobby.maxPlayers,
        isPrivate: lobby.isPrivate,
        hasAvailableSlots: lobby.hasAvailableSlots,
        canStart: lobby.canStart,
        createdBy: lobby.createdBy,
        players: lobby.players,
        availableActions: lobby.availableActions,
        createdAt: lobby.createdAt,
      },
    }
  }

  private validateRequest(request: CreateLobbyRequest): void {
    if (!request.userUuid || !request.userUuid.trim()) {
      throw new Error('User UUID is required')
    }
    if (!request.name || !request.name.trim()) {
      throw new Error('Lobby name is required')
    }
    if (request.maxPlayers && (request.maxPlayers < 2 || request.maxPlayers > 4)) {
      throw new Error('Max players must be between 2 and 4')
    }
  }
}
