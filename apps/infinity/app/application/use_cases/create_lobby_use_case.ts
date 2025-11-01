import { inject } from '@adonisjs/core'
import Lobby from '../../domain/entities/lobby.js'
import { InMemoryPlayerRepository } from '../../infrastructure/repositories/in_memory_player_repository.js'
import { InMemoryLobbyRepository } from '../../infrastructure/repositories/in_memory_lobby_repository.js'
import { Result } from '../../domain/shared/result.js'
import { getEventBus } from '../../infrastructure/events/event_bus_singleton.js'
import { LobbyEventFactory } from '../../domain/events/lobby/lobby_domain_events.js'

export interface CreateLobbyRequest {
  userUuid: string
  name: string
  maxPlayers?: number
  isPrivate?: boolean
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

@inject()
export class CreateLobbyUseCase {
  constructor(
    private playerRepository: InMemoryPlayerRepository,
    private lobbyRepository: InMemoryLobbyRepository
  ) {}

  async execute(request: CreateLobbyRequest): Promise<Result<CreateLobbyResponse>> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<CreateLobbyResponse>(validationResult.error)
      }

      // Vérifier que le joueur existe
      const player = await this.playerRepository.findPlayerInterfaceByUuid(request.userUuid)
      if (!player) {
        return Result.fail('Player not found')
      }

      // Si le joueur est déjà dans un lobby, le faire quitter automatiquement
      const existingLobby = await this.lobbyRepository.findByPlayer(request.userUuid)
      if (existingLobby) {
        const leaveResult = existingLobby.removePlayer(request.userUuid)
        if (leaveResult.isFailure) {
          return Result.fail(`Failed to leave existing lobby: ${leaveResult.error}`)
        }

        // Si le lobby est maintenant vide, le supprimer
        if (existingLobby.playerCount === 0) {
          await this.lobbyRepository.delete(existingLobby.uuid)
        } else {
          // Sinon, sauvegarder les changements
          await this.lobbyRepository.save(existingLobby)
        }
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

      // 🎯 EVENT-DRIVEN: Publier les événements de domaine via EventBus
      const eventBus = await getEventBus()
      await this.publishDomainEvents(lobby, request.userUuid, eventBus)

      // Utiliser la sérialisation de l'entité pour garantir la cohérence
      const response = lobby.serialize() as CreateLobbyResponse

      return Result.ok(response)
    } catch (error) {
      // System errors (DB down, IO errors, etc.)
      return Result.fail(
        `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Publier tous les événements de domaine accumulés dans l'entité
   */
  private async publishDomainEvents(lobby: Lobby, userUuid: string, eventBus: any): Promise<void> {
    // Récupérer les événements non publiés
    const uncommittedEvents = lobby.getUncommittedEvents()

    if (uncommittedEvents.length === 0) {
      console.log('⚠️ CreateLobbyUseCase: No domain events to publish')
      return
    }

    console.log(`📡 CreateLobbyUseCase: Publishing ${uncommittedEvents.length} domain event(s)`)

    // Publier chaque événement via l'EventBus
    for (const domainEvent of uncommittedEvents) {
      // Convertir l'ancien format d'événement vers le nouveau
      const event = this.convertToNewEventFormat(domainEvent, lobby, userUuid)

      if (event) {
        const result = await eventBus.publish(event)

        if (result.isFailure) {
          console.error(`❌ CreateLobbyUseCase: Failed to publish event:`, result.error)
        } else {
          console.log(`✅ CreateLobbyUseCase: Event ${event.type} published successfully`)
        }
      }
    }

    // Marquer les événements comme publiés
    lobby.markEventsAsCommitted()
  }

  /**
   * Convertir les anciens événements de domaine vers le nouveau format
   */
  private convertToNewEventFormat(oldEvent: any, lobby: Lobby, userUuid: string): any {
    // Déterminer le type d'événement
    if (
      oldEvent.constructor.name === 'LobbyCreatedEvent' ||
      oldEvent.eventName === 'LobbyCreated'
    ) {
      return LobbyEventFactory.lobbyCreated(
        lobby.uuid,
        lobby.name,
        lobby.maxPlayers,
        lobby.isPrivate,
        { uuid: lobby.creator.uuid, nickName: lobby.creator.nickName },
        { userUuid }
      )
    }

    // Ajouter d'autres conversions ici si nécessaire
    console.warn(`⚠️ CreateLobbyUseCase: Unknown event type:`, oldEvent.constructor.name)
    return null
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
