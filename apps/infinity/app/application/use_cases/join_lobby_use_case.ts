import { inject } from '@adonisjs/core'
import { InMemoryPlayerRepository } from '../../infrastructure/repositories/in_memory_player_repository.js'
import { InMemoryLobbyRepository } from '../../infrastructure/repositories/in_memory_lobby_repository.js'
import { Result } from '../../domain/shared/result.js'
import { getEventBus } from '../../infrastructure/events/event_bus_singleton.js'
import { LobbyEventFactory } from '../../domain/events/lobby/lobby_domain_events.js'

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

@inject()
export class JoinLobbyUseCase {
  constructor(
    private playerRepository: InMemoryPlayerRepository,
    private lobbyRepository: InMemoryLobbyRepository
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

      // 🎯 EVENT-DRIVEN: Publier l'événement PlayerJoined avec ÉTAT COMPLET
      const eventBus = await getEventBus()
      const event = LobbyEventFactory.playerJoined(
        lobby.uuid,
        { uuid: player.uuid, nickName: player.nickName },
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
        { userUuid: request.userUuid }
      )

      const publishResult = await eventBus.publish(event)
      if (publishResult.isFailure) {
        console.error('❌ JoinLobbyUseCase: Failed to publish event:', publishResult.error)
      } else {
        console.log('✅ JoinLobbyUseCase: PlayerJoined event published successfully')
      }

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
