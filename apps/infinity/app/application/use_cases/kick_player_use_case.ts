import { inject } from '@adonisjs/core'
import type { LobbyRepository } from '../repositories/lobby_repository.js'
import type { PlayerRepository } from '../repositories/player_repository.js'
import type { DomainEventPublisher } from '../services/domain_event_publisher.js'
import { Result } from '../../domain/shared/result.js'
import { LobbyStatus } from '../../domain/value_objects/lobby_status.js'
import { PlayerKickedEvent } from '../../domain/events/lobby_events.js'
import Player from '../../domain/entities/player.js'

export interface KickPlayerRequest {
  lobbyUuid: string
  kickerUuid: string
  targetPlayerUuid: string
  reason?: string
}

export interface KickPlayerResponse {
  success: boolean
  lobbyState: any
}

@inject()
export class KickPlayerUseCase {
  constructor(
    private lobbyRepository: LobbyRepository,
    private playerRepository: PlayerRepository,
    private domainEventPublisher: DomainEventPublisher
  ) {}

  async execute(request: KickPlayerRequest): Promise<Result<KickPlayerResponse>> {
    try {
      // Validation des paramètres
      if (!request.lobbyUuid || !request.kickerUuid || !request.targetPlayerUuid) {
        return Result.fail('Lobby UUID, kicker UUID, and target player UUID are required')
      }

      if (request.kickerUuid === request.targetPlayerUuid) {
        return Result.fail('Cannot kick yourself')
      }

      // Récupérer le lobby
      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      // Vérifier que le lobby n'est pas en cours de jeu
      if (lobby.status === LobbyStatus.STARTING) {
        return Result.fail('Cannot kick players from a game in progress')
      }

      // Vérifier que le kicker est le créateur du lobby
      if (lobby.createdBy !== request.kickerUuid) {
        return Result.fail('Only the lobby creator can kick players')
      }

      // Vérifier que le joueur cible est dans le lobby
      if (!lobby.hasPlayer(request.targetPlayerUuid)) {
        return Result.fail('Target player is not in this lobby')
      }

      // Récupérer les informations des joueurs
      const kicker = await this.playerRepository.findByUuid(request.kickerUuid)
      const targetPlayer = await this.playerRepository.findByUuid(request.targetPlayerUuid)

      if (!kicker || !targetPlayer) {
        return Result.fail('Player not found')
      }

      // Retirer le joueur du lobby
      lobby.removePlayer(request.targetPlayerUuid)

      // Sauvegarder le lobby
      await this.lobbyRepository.save(lobby)

      // Publier l'événement de kick
      await this.domainEventPublisher.publishEvents([
        new PlayerKickedEvent(
          lobby.uuid,
          Player.create({
            userUuid: targetPlayer.uuid,
            nickName: targetPlayer.nickName,
          }),
          Player.create({
            userUuid: kicker.uuid,
            nickName: kicker.nickName,
          }),
          request.reason || 'No reason provided',
          lobby.players.map((p: any) =>
            Player.create({
              userUuid: p.uuid,
              nickName: p.nickName,
            })
          )
        ),
      ])

      return Result.ok({
        success: true,
        lobbyState: lobby.serialize(),
      })
    } catch (error) {
      return Result.fail(`Failed to kick player: ${error.message}`)
    }
  }
}
