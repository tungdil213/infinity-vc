import { PlayerRepository } from '../repositories/player_repository.js'
import { LobbyRepository } from '../repositories/lobby_repository.js'
import { Result } from '../../domain/shared/result.js'

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
      try {
        lobby.addPlayer(player)
      } catch (error) {
        return Result.fail(error instanceof Error ? error.message : 'Failed to add player to lobby')
      }

      // Sauvegarder le lobby mis à jour
      await this.lobbyRepository.save(lobby)

      return Result.ok({
        lobby: {
          uuid: lobby.uuid,
          name: lobby.name,
          status: lobby.status,
          currentPlayers: lobby.players.length,
          maxPlayers: lobby.maxPlayers,
          isPrivate: lobby.isPrivate,
          hasAvailableSlots: lobby.hasAvailableSlots,
          canStart: lobby.canStart,
          createdBy: lobby.createdBy,
          players: lobby.players.map((p) => ({
            uuid: p.uuid,
            nickName: p.nickName,
          })),
          availableActions: lobby.availableActions,
          createdAt: lobby.createdAt,
        },
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
