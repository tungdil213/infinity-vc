import { inject } from '@adonisjs/core'
import type { LobbyRepository } from '../repositories/lobby_repository.js'
import type { DomainEventPublisher } from '../services/domain_event_publisher.js'
import { Result } from '../../domain/shared/result.js'
import { LobbyStatus } from '../../domain/value_objects/lobby_status.js'
import { LobbyUpdatedEvent } from '../../domain/events/lobby_events.js'

export interface UpdateLobbySettingsRequest {
  lobbyUuid: string
  updaterUuid: string
  settings: {
    name?: string
    maxPlayers?: number
    isPrivate?: boolean
  }
}

export interface UpdateLobbySettingsResponse {
  success: boolean
  lobbyState: any
}

@inject()
export class UpdateLobbySettingsUseCase {
  constructor(
    private lobbyRepository: LobbyRepository,
    private domainEventPublisher: DomainEventPublisher
  ) {}

  async execute(request: UpdateLobbySettingsRequest): Promise<Result<UpdateLobbySettingsResponse>> {
    try {
      // Validation des paramètres
      if (!request.lobbyUuid || !request.updaterUuid) {
        return Result.fail('Lobby UUID and updater UUID are required')
      }

      if (!request.settings || Object.keys(request.settings).length === 0) {
        return Result.fail('At least one setting must be provided')
      }

      // Récupérer le lobby
      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      // Vérifier que l'utilisateur est le créateur du lobby
      if (lobby.createdBy !== request.updaterUuid) {
        return Result.fail('Only the lobby creator can update settings')
      }

      // Vérifier que le lobby n'est pas en cours de jeu
      if (lobby.status === LobbyStatus.STARTING) {
        return Result.fail('Cannot update settings during a game')
      }

      // Valider les nouveaux paramètres
      const validationResult = this.validateSettings(request.settings, lobby)
      if (validationResult.isFailure) {
        return Result.fail(validationResult.error || 'Validation failed')
      }

      // Appliquer les modifications
      // TODO: Use oldSettings for event publishing
      // const oldSettings = {
      //   name: lobby.name,
      //   maxPlayers: lobby.maxPlayers,
      //   isPrivate: lobby.isPrivate,
      // }

      if (request.settings.name !== undefined) {
        ;(lobby as any).name = request.settings.name
      }

      if (request.settings.maxPlayers !== undefined) {
        ;(lobby as any).maxPlayers = request.settings.maxPlayers
      }

      if (request.settings.isPrivate !== undefined) {
        ;(lobby as any).isPrivate = request.settings.isPrivate
      }

      // Sauvegarder le lobby
      await this.lobbyRepository.save(lobby)

      // Publier l'événement de mise à jour
      await this.domainEventPublisher.publishEvents([
        new LobbyUpdatedEvent(
          lobby.uuid,
          lobby.name,
          lobby.playerCount,
          lobby.maxPlayers,
          lobby.status,
          lobby.players
        ),
      ])

      return Result.ok({
        success: true,
        lobbyState: lobby.serialize(),
      })
    } catch (error) {
      return Result.fail(`Failed to update lobby settings: ${error.message}`)
    }
  }

  private validateSettings(
    settings: UpdateLobbySettingsRequest['settings'],
    lobby: any
  ): Result<void> {
    // Valider le nom
    if (settings.name !== undefined) {
      if (!settings.name.trim()) {
        return Result.fail('Lobby name cannot be empty')
      }
      if (settings.name.length > 50) {
        return Result.fail('Lobby name cannot exceed 50 characters')
      }
    }

    // Valider maxPlayers
    if (settings.maxPlayers !== undefined) {
      if (settings.maxPlayers < 2 || settings.maxPlayers > 8) {
        return Result.fail('Max players must be between 2 and 8')
      }
      if (settings.maxPlayers < lobby.playerCount) {
        return Result.fail('Cannot reduce max players below current player count')
      }
    }

    return Result.ok(undefined)
  }
}
