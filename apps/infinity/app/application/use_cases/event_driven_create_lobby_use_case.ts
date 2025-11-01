import { inject } from '@adonisjs/core'
import Lobby from '../../domain/entities/lobby.js'
import { PlayerRepository } from '../repositories/player_repository.js'
import { LobbyRepository } from '../repositories/lobby_repository.js'
import { Result } from '../../domain/shared/result.js'
import { EventBus } from '../events/event_bus.js'
import { LobbyEventFactory } from '../../domain/events/lobby/lobby_domain_events.js'

export interface CreateLobbyRequest {
  userUuid: string
  name: string
  maxPlayers?: number
  isPrivate?: boolean
  sessionId?: string
  ipAddress?: string
}

export interface CreateLobbyResponse {
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

/**
 * Use Case Event-Driven pour créer un lobby
 * Nouvelle version qui utilise le système d'événements au lieu des notifications directes
 */
@inject()
export class EventDrivenCreateLobbyUseCase {
  constructor(
    private playerRepository: PlayerRepository,
    private lobbyRepository: LobbyRepository,
    private eventBus: EventBus
  ) {}

  async execute(request: CreateLobbyRequest): Promise<Result<CreateLobbyResponse>> {
    try {
      console.log(
        `🎮 EventDrivenCreateLobbyUseCase: Creating lobby "${request.name}" for user ${request.userUuid}`
      )

      // 1. Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<CreateLobbyResponse>(validationResult.error)
      }

      // 2. Vérifier que le joueur existe
      const player = await this.playerRepository.findPlayerInterfaceByUuid(request.userUuid)
      if (!player) {
        return Result.fail('Player not found')
      }

      // 3. Gestion du lobby existant (si le joueur est déjà dans un lobby)
      const existingLobbyResult = await this.handleExistingLobby(request.userUuid)
      if (existingLobbyResult.isFailure) {
        return Result.fail(`Failed to handle existing lobby: ${existingLobbyResult.error}`)
      }

      // 4. Créer le lobby
      const lobby = Lobby.create({
        name: request.name,
        creator: player,
        maxPlayers: request.maxPlayers || 4,
        isPrivate: request.isPrivate || false,
      })

      // 5. Sauvegarder le lobby
      await this.lobbyRepository.save(lobby)

      // 6. 🎯 ÉVÉNEMENT : Publier l'événement de création via Event Bus
      const lobbyCreatedEvent = LobbyEventFactory.lobbyCreated(
        lobby.uuid,
        lobby.name,
        lobby.maxPlayers,
        lobby.isPrivate,
        { uuid: player.uuid, nickName: player.nickName },
        { userUuid: request.userUuid, sessionId: request.sessionId }
      )

      const eventResult = await this.eventBus.publish(lobbyCreatedEvent)
      if (eventResult.isFailure) {
        console.error('Failed to publish lobby created event:', eventResult.error)
        // On ne fait pas échouer le use case si l'événement échoue
        // L'important est que le lobby soit créé
      } else {
        console.log(`✅ EventDrivenCreateLobbyUseCase: Lobby created event published successfully`)
      }

      // 7. Retourner la réponse
      const response = lobby.serialize() as CreateLobbyResponse
      console.log(`🎉 EventDrivenCreateLobbyUseCase: Lobby created successfully: ${lobby.uuid}`)

      return Result.ok(response)
    } catch (error) {
      console.error('EventDrivenCreateLobbyUseCase: System error:', error)
      return Result.fail(
        `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Gère le cas où l'utilisateur est déjà dans un lobby
   */
  private async handleExistingLobby(userUuid: string): Promise<Result<void>> {
    const existingLobby = await this.lobbyRepository.findByPlayer(userUuid)
    if (!existingLobby) {
      return Result.ok() // Pas de lobby existant, tout va bien
    }

    console.log(
      `🔄 EventDrivenCreateLobbyUseCase: User ${userUuid} is already in lobby ${existingLobby.uuid}, handling leave...`
    )

    // Faire quitter l'utilisateur de son lobby actuel
    const leaveResult = existingLobby.removePlayer(userUuid)
    if (leaveResult.isFailure) {
      return Result.fail(`Failed to leave existing lobby: ${leaveResult.error}`)
    }

    // Si le lobby est maintenant vide, le supprimer
    if (existingLobby.playerCount === 0) {
      await this.lobbyRepository.delete(existingLobby.uuid)

      // 🎯 ÉVÉNEMENT : Publier l'événement de suppression
      const lobbyDeletedEvent = LobbyEventFactory.lobbyDeleted(
        existingLobby.uuid,
        'empty',
        undefined,
        { userUuid }
      )

      await this.eventBus.publish(lobbyDeletedEvent)
    } else {
      // Sinon, sauvegarder les changements
      await this.lobbyRepository.save(existingLobby)

      // 🎯 ÉVÉNEMENT : Publier l'événement de départ
      const player = existingLobby.players.find((p) => p.uuid === userUuid)
      if (player) {
        const playerLeftEvent = LobbyEventFactory.playerLeft(
          existingLobby.uuid,
          { uuid: player.uuid, nickName: player.nickName },
          {
            currentPlayers: existingLobby.playerCount,
            maxPlayers: existingLobby.maxPlayers,
            canStart: existingLobby.canStart,
            status: existingLobby.status,
          },
          false,
          { userUuid }
        )

        await this.eventBus.publish(playerLeftEvent)
      }
    }

    return Result.ok()
  }

  private validateRequest(request: CreateLobbyRequest): Result<void> {
    if (!request.userUuid || !request.userUuid.trim()) {
      return Result.fail('User UUID is required')
    }
    if (!request.name || !request.name.trim()) {
      return Result.fail('Lobby name is required')
    }
    if (request.maxPlayers !== undefined && (request.maxPlayers < 2 || request.maxPlayers > 8)) {
      return Result.fail('maxPlayers must be between 2 and 8')
    }
    return Result.ok(undefined)
  }
}

/**
 * Factory pour créer le use case avec toutes les dépendances
 */
export class EventDrivenCreateLobbyUseCaseFactory {
  static async create(
    playerRepository: PlayerRepository,
    lobbyRepository: LobbyRepository,
    eventBus: EventBus
  ): Promise<EventDrivenCreateLobbyUseCase> {
    return new EventDrivenCreateLobbyUseCase(playerRepository, lobbyRepository, eventBus)
  }
}

/**
 * Comparaison avec l'ancien use case :
 *
 * ANCIEN (impératif) :
 * 1. Créer lobby
 * 2. Sauvegarder
 * 3. notificationService.notifyLobbyCreated() -> Transmit direct
 *
 * NOUVEAU (Event-Driven) :
 * 1. Créer lobby
 * 2. Sauvegarder
 * 3. eventBus.publish(LobbyCreatedEvent) ->
 *    -> LobbyPersistenceHandler (vérification)
 *    -> LobbyBusinessRulesHandler (validation)
 *    -> TransmitEventBridge (notification Transmit)
 *    -> LobbyAnalyticsHandler (métriques)
 *    -> [Futurs handlers facilement ajoutables]
 *
 * AVANTAGES :
 * - Découplage total entre création et notifications
 * - Facilité d'ajout de nouveaux comportements (handlers)
 * - Traçabilité complète des événements
 * - Tests plus faciles (mock de l'event bus)
 * - Retry automatique en cas d'échec
 * - Rollback/compensation possible
 */
