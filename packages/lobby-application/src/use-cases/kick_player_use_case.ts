import { Result } from '@infinity.dev/lobby-domain/shared'
import { LobbyStatus } from '@infinity.dev/lobby-domain/value-objects'
import { PlayerKickedEvent } from '@infinity.dev/lobby-domain/events'
import type { LobbyRepository, PlayerRepository } from '../repositories/index.js'
import type { DomainEventPublisher } from '../services/index.js'
import { safeSystemError } from '../shared/error_sanitizer.js'

export interface KickPlayerRequest {
  lobbyUuid: string
  kickerUuid: string
  targetPlayerUuid: string
  reason?: string
}

export interface KickPlayerResponse {
  success: boolean
  lobbyState: unknown
}

export class KickPlayerUseCase {
  constructor(
    private lobbyRepository: LobbyRepository,
    private playerRepository: PlayerRepository,
    private domainEventPublisher: DomainEventPublisher
  ) {}

  async execute(request: KickPlayerRequest): Promise<Result<KickPlayerResponse>> {
    try {
      if (!request.lobbyUuid || !request.kickerUuid || !request.targetPlayerUuid) {
        return Result.fail('Lobby UUID, kicker UUID, and target player UUID are required')
      }

      if (request.kickerUuid === request.targetPlayerUuid) {
        return Result.fail('Cannot kick yourself')
      }

      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      if (lobby.status === LobbyStatus.STARTING) {
        return Result.fail('Cannot kick players from a game in progress')
      }

      if (lobby.createdBy !== request.kickerUuid) {
        return Result.fail('Only the lobby creator can kick players')
      }

      if (!lobby.hasPlayer(request.targetPlayerUuid)) {
        return Result.fail('Target player is not in this lobby')
      }

      const kicker = await this.playerRepository.findByUuid?.(request.kickerUuid)
      const targetPlayer = await this.playerRepository.findByUuid?.(request.targetPlayerUuid)

      if (!kicker || !targetPlayer) {
        return Result.fail('Player not found')
      }

      lobby.removePlayer(request.targetPlayerUuid)
      await this.lobbyRepository.save(lobby)

      await this.domainEventPublisher.publishEvents([
        new PlayerKickedEvent(
          lobby.uuid,
          {
            uuid: targetPlayer.uuid,
            nickName: targetPlayer.nickName,
          },
          {
            uuid: kicker.uuid,
            nickName: kicker.nickName,
          },
          request.reason || 'No reason provided',
          lobby.players.map((player) => ({
            uuid: player.uuid,
            nickName: player.nickName,
          }))
        ),
      ])

      return Result.ok({
        success: true,
        lobbyState: lobby.serialize(),
      })
    } catch (error) {
      return Result.fail(safeSystemError(error))
    }
  }
}
