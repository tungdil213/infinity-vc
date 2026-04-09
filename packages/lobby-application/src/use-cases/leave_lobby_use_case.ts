import { Result } from '@infinity.dev/lobby-domain/shared'
import type { LobbyRepository } from '../repositories/index.js'
import type { LobbyEventService, LobbyNotifier } from '../services/index.js'
import { safeSystemError } from '../shared/error_sanitizer.js'

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

export class LeaveLobbyUseCase {
  constructor(
    private lobbyRepository: LobbyRepository,
    private notificationService: LobbyNotifier,
    private eventService: LobbyEventService
  ) {}

  async execute(request: LeaveLobbyRequest): Promise<Result<LeaveLobbyResponse>> {
    try {
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<LeaveLobbyResponse>(validationResult.error)
      }

      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)

      if (!lobby.hasPlayer(request.userUuid)) {
        return Result.fail('Player is not in this lobby')
      }

      const playerToRemove = lobby.players.find((player) => player.uuid === request.userUuid)
      if (!playerToRemove) {
        return Result.fail('Player not found in lobby')
      }

      const removeResult = lobby.removePlayer(request.userUuid)
      if (removeResult.isFailure) {
        return Result.fail(removeResult.error || 'Failed to remove player from lobby')
      }

      if (lobby.players.length === 0) {
        await this.lobbyRepository.delete(lobby.uuid)
        await this.eventService.emitLobbyDeleted(lobby.uuid)

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

      await this.lobbyRepository.save(lobby)

      this.notificationService.notifyPlayerLeft(lobby.uuid, playerToRemove, {
        uuid: lobby.uuid,
        name: lobby.name,
        status: lobby.status,
        currentPlayers: lobby.players.length,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players,
        creator: lobby.creator,
      })

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
      return Result.fail(safeSystemError(error))
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
