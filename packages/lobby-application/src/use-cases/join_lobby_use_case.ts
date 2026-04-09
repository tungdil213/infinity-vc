import { Result } from '@infinity.dev/lobby-domain/shared'
import type { LobbyRepository, PlayerRepository } from '../repositories/index.js'
import type { LobbyNotifier } from '../services/index.js'
import { safeSystemError } from '../shared/error_sanitizer.js'

export interface JoinLobbyRequest {
  userUuid: string
  lobbyUuid: string
  password?: string
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

export class JoinLobbyUseCase {
  constructor(
    private playerRepository: PlayerRepository,
    private lobbyRepository: LobbyRepository,
    private notificationService: LobbyNotifier
  ) {}

  async execute(request: JoinLobbyRequest): Promise<Result<JoinLobbyResponse>> {
    try {
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail(validationResult.error)
      }

      const player = await this.playerRepository.findPlayerInterfaceByUuidOrFail(request.userUuid)
      if (!player) {
        return Result.fail('Player not found')
      }

      const existingLobby = await this.lobbyRepository.findByPlayer(request.userUuid)
      if (existingLobby) {
        return Result.fail('Player is already in a lobby')
      }

      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      if (lobby.hasPassword) {
        if (!request.password || request.password.trim().length === 0) {
          return Result.fail('Password is required for this lobby')
        }

        if (!lobby.verifyPassword(request.password)) {
          return Result.fail('Invalid lobby password')
        }
      }

      if (lobby.players.length >= lobby.maxPlayers) {
        return Result.fail('Lobby is full')
      }

      const addPlayerResult = lobby.addPlayer(player)
      if (addPlayerResult.isFailure) {
        return Result.fail(addPlayerResult.error)
      }

      await this.lobbyRepository.save(lobby)

      this.notificationService.notifyPlayerJoined(lobby.uuid, player, lobby.serialize())

      return Result.ok({
        lobby: lobby.serialize(),
      })
    } catch (error) {
      return Result.fail(safeSystemError(error))
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
