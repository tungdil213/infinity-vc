import { Result } from '@infinity.dev/lobby-domain/shared'
import type { LobbyRepository, PlayerRepository } from '../repositories/index.js'
import type { DomainEventPublisher } from '../services/index.js'
import { safeSystemError } from '../shared/error_sanitizer.js'

export interface SetPlayerReadyRequest {
  lobbyUuid: string
  playerUuid: string
  isReady: boolean
}

export interface SetPlayerReadyResponse {
  success: boolean
  lobbyState: unknown
  allPlayersReady: boolean
  canStartGame: boolean
}

export class SetPlayerReadyUseCase {
  constructor(
    private lobbyRepository: LobbyRepository,
    private playerRepository: PlayerRepository,
    private domainEventPublisher: DomainEventPublisher
  ) {}

  async execute(request: SetPlayerReadyRequest): Promise<Result<SetPlayerReadyResponse>> {
    try {
      if (!request.lobbyUuid || !request.playerUuid) {
        return Result.fail('Lobby UUID and player UUID are required')
      }

      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      if (String(lobby.status) === 'STARTING') {
        return Result.fail('Game is already starting')
      }

      if (!lobby.hasPlayer(request.playerUuid)) {
        return Result.fail('Player is not in this lobby')
      }

      const player = await this.playerRepository.findByUuid?.(request.playerUuid)
      if (!player) {
        return Result.fail('Player not found')
      }

      const currentPlayers = this.resolveCurrentPlayers(lobby)
      const allPlayersReady = request.isReady && currentPlayers >= 2
      const canStartGame = allPlayersReady && currentPlayers >= 2

      await this.lobbyRepository.save(lobby)
      await this.domainEventPublisher.publishEvents([])

      return Result.ok({
        success: true,
        lobbyState: lobby.serialize(),
        allPlayersReady,
        canStartGame,
      })
    } catch (error) {
      return Result.fail(safeSystemError(error))
    }
  }

  private resolveCurrentPlayers(lobby: unknown): number {
    const lobbyData = lobby as {
      currentPlayers?: number
      playerCount?: number
      players?: unknown[]
    }

    if (typeof lobbyData.currentPlayers === 'number') {
      return lobbyData.currentPlayers
    }

    if (typeof lobbyData.playerCount === 'number') {
      return lobbyData.playerCount
    }

    if (Array.isArray(lobbyData.players)) {
      return lobbyData.players.length
    }

    return 0
  }
}
