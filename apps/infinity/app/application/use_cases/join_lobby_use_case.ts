import { PlayerRepository } from '../repositories/player_repository.js'
import { LobbyRepository } from '../repositories/lobby_repository.js'
import { Result } from '../../domain/shared/result.js'
import { TransmitLobbyService } from '../services/transmit_lobby_service.js'

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
    private lobbyRepository: LobbyRepository,
    private notificationService: TransmitLobbyService
  ) {}

  async execute(request: JoinLobbyRequest): Promise<Result<JoinLobbyResponse>> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail(validationResult.error)
      }

      // Vérifier que le joueur existe
      const player = await this.playerRepository.findPlayerInterfaceByUuidOrFail(request.userUuid)
      if (!player) {
        return Result.fail('Player not found')
      }

      // Vérifier que le joueur n'est pas déjà dans un lobby
      const existingLobby = await this.lobbyRepository.findByPlayer(request.userUuid)
      if (existingLobby) {
        return Result.fail('Player is already in a lobby')
      }

      // Récupérer le lobby
      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      // Vérifier si le lobby est plein
      if (lobby.players.length >= lobby.maxPlayers) {
        return Result.fail('Lobby is full')
      }

      // Ajouter le joueur au lobby
      const addPlayerResult = lobby.addPlayer(player)
      if (addPlayerResult.isFailure) {
        return Result.fail(addPlayerResult.error)
      }

      // Sauvegarder le lobby mis à jour
      await this.lobbyRepository.save(lobby)

      // Notifier les autres joueurs qu'un nouveau joueur a rejoint
      // Utiliser la sérialisation complète pour inclure hasAvailableSlots, canStart, etc.
      this.notificationService.notifyPlayerJoined(lobby.uuid, player, lobby.serialize())

      return Result.ok({
        lobby: lobby.serialize(),
      })
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Failed to join lobby')
    }
  }

  private validateRequest(request: JoinLobbyRequest): Result<void> {
    if (!request.userUuid || request.userUuid.trim() === '') {
      return Result.fail('User UUID is required')
    }
    if (!request.lobbyUuid || request.lobbyUuid.trim() === '') {
      return Result.fail('Lobby UUID is required')
    }
    return Result.ok(undefined)
  }
}
