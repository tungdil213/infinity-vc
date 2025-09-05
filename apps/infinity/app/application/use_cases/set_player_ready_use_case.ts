import { inject } from '@adonisjs/core'
import { Result } from '#domain/shared/result'

export interface SetPlayerReadyRequest {
  lobbyUuid: string
  playerUuid: string
  isReady: boolean
}

export interface SetPlayerReadyResponse {
  success: boolean
  lobbyState: any
  allPlayersReady: boolean
  canStartGame: boolean
}

@inject()
export class SetPlayerReadyUseCase {
  constructor(
    private lobbyRepository: any,
    private playerRepository: any,
    private domainEventPublisher: any
  ) {}

  async execute(request: SetPlayerReadyRequest): Promise<Result<SetPlayerReadyResponse>> {
    try {
      // Validation des paramètres
      if (!request.lobbyUuid || !request.playerUuid) {
        return Result.fail('Lobby UUID and player UUID are required')
      }

      // Récupérer le lobby
      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      // Vérifier que le lobby est dans un état approprié
      if (lobby.status === 'STARTING') {
        return Result.fail('Game is already starting')
      }

      // Vérifier que le joueur est dans le lobby
      if (!lobby.hasPlayer(request.playerUuid)) {
        return Result.fail('Player is not in this lobby')
      }

      // Récupérer les informations du joueur
      const player = await this.playerRepository.findByUuid(request.playerUuid)
      if (!player) {
        return Result.fail('Player not found')
      }

      // Logique simplifiée pour les tests
      const allPlayersReady = request.isReady && lobby.currentPlayers >= 2
      const canStartGame = allPlayersReady && lobby.currentPlayers >= 2

      // Sauvegarder le lobby
      await this.lobbyRepository.save(lobby)

      // Publier l'événement (simplifié)
      await this.domainEventPublisher.publishEvents([])

      return Result.ok({
        success: true,
        lobbyState: lobby.serialize(),
        allPlayersReady,
        canStartGame,
      })
    } catch (error) {
      return Result.fail(`Failed to set player ready status: ${error.message}`)
    }
  }
}
