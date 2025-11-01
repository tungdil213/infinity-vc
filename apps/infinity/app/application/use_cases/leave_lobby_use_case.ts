import { inject } from '@adonisjs/core'
import { InMemoryLobbyRepository } from '../../infrastructure/repositories/in_memory_lobby_repository.js'
import { Result } from '../../domain/shared/result.js'
import { getEventBus } from '../../infrastructure/events/event_bus_singleton.js'
import { LobbyEventFactory } from '../../domain/events/lobby/lobby_domain_events.js'

export interface LeaveLobbyRequest {
  userUuid: string
  lobbyUuid: string
}

export interface LeaveLobbyResponse {
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
  lobbyDeleted: boolean
}

@inject()
export class LeaveLobbyUseCase {
  constructor(private lobbyRepository: InMemoryLobbyRepository) {}

  async execute(request: LeaveLobbyRequest): Promise<Result<LeaveLobbyResponse>> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<LeaveLobbyResponse>(validationResult.error)
      }

      // Récupérer le lobby
      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)

      // Vérifier que le joueur est dans le lobby
      if (!lobby.hasPlayer(request.userUuid)) {
        return Result.fail('Player is not in this lobby')
      }

      // Récupérer les infos du joueur avant de le retirer
      const playerToRemove = lobby.players.find((p) => p.uuid === request.userUuid)
      if (!playerToRemove) {
        return Result.fail('Player not found in lobby')
      }

      // Retirer le joueur du lobby
      const removeResult = lobby.removePlayer(request.userUuid)
      if (removeResult.isFailure) {
        return Result.fail(removeResult.error || 'Failed to remove player from lobby')
      }

      // Si le lobby est vide après le départ, le supprimer
      if (lobby.players.length === 0) {
        await this.lobbyRepository.delete(lobby.uuid)

        // 🎯 EVENT-DRIVEN: Publier l'événement LobbyDeleted
        const eventBus = await getEventBus()
        const deleteEvent = LobbyEventFactory.lobbyDeleted(lobby.uuid, 'empty', undefined, {
          userUuid: request.userUuid,
        })
        await eventBus.publish(deleteEvent)

        const response: LeaveLobbyResponse = {
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
          lobbyDeleted: true,
        }
        return Result.ok(response)
      }

      // Sinon, sauvegarder le lobby mis à jour
      await this.lobbyRepository.save(lobby)

      // 🎯 EVENT-DRIVEN: Publier l'événement PlayerLeft avec ÉTAT COMPLET
      const eventBus = await getEventBus()
      const event = LobbyEventFactory.playerLeft(
        lobby.uuid,
        { uuid: playerToRemove.uuid, nickName: playerToRemove.nickName },
        {
          currentPlayers: lobby.players.length,
          maxPlayers: lobby.maxPlayers,
          canStart: lobby.canStart,
          status: lobby.status,
          // ✅ ÉTAT COMPLET: Envoyer la liste complète des joueurs
          players: lobby.players.map((p) => ({
            uuid: p.uuid,
            nickName: p.nickName,
          })),
        },
        false,
        { userUuid: request.userUuid }
      )

      const publishResult = await eventBus.publish(event)
      if (publishResult.isFailure) {
        console.error('❌ LeaveLobbyUseCase: Failed to publish event:', publishResult.error)
      } else {
        console.log('✅ LeaveLobbyUseCase: PlayerLeft event published successfully')
      }

      const response: LeaveLobbyResponse = {
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
        lobbyDeleted: false,
      }

      return Result.ok(response)
    } catch (error) {
      return Result.fail(
        `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private validateRequest(request: LeaveLobbyRequest): Result<void> {
    if (!request.userUuid || !request.userUuid.trim()) {
      return Result.fail('User UUID is required')
    }
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      return Result.fail('Lobby UUID is required')
    }
    return Result.ok(undefined)
  }
}
