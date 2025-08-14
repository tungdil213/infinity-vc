import { PlayerRepository } from '../repositories/player_repository.js'
import { LobbyRepository } from '../repositories/lobby_repository.js'
import { domainEventPublisher } from '../services/domain_event_publisher.js'

export interface JoinLobbyRequest {
  userUuid: string
  lobbyUuid: string
}

export interface JoinLobbyResponse {
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

export class JoinLobbyUseCase {
  constructor(
    private playerRepository: PlayerRepository,
    private lobbyRepository: LobbyRepository
  ) {}

  async execute(request: JoinLobbyRequest): Promise<JoinLobbyResponse> {
    // Validation des données d'entrée
    this.validateRequest(request)

    // Vérifier que le joueur existe
    const player = await this.playerRepository.findPlayerInterfaceByUuidOrFail(request.userUuid)

    // Vérifier que le joueur n'est pas déjà dans un lobby
    const existingLobby = await this.lobbyRepository.findByPlayer(request.userUuid)
    if (existingLobby) {
      throw new Error('Player is already in a lobby')
    }

    // Récupérer le lobby
    const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)

    // Ajouter le joueur au lobby
    lobby.addPlayer(player)

    // Sauvegarder le lobby mis à jour
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

  private validateRequest(request: JoinLobbyRequest): void {
    if (!request.userUuid || !request.userUuid.trim()) {
      throw new Error('User UUID is required')
    }
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      throw new Error('Lobby UUID is required')
    }
  }
}
