import { Result } from '@infinity.dev/lobby-domain/shared'
import type { LobbyRepository } from '../repositories/index.js'
import { LobbySerializer } from '../serializers/lobby_serializer.js'
import { type LobbyDto } from '../dtos/lobby_dto.js'
import { safeSystemError } from '../shared/error_sanitizer.js'

export interface ShowLobbyRequest {
  lobbyUuid: string
  userUuid?: string
}

export class ShowLobbyUseCase {
  constructor(private lobbyRepository: LobbyRepository) {}

  async execute(request: ShowLobbyRequest): Promise<Result<LobbyDto>> {
    try {
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<LobbyDto>(validationResult.error)
      }

      const lobby = await this.lobbyRepository.findByUuid(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      const lobbyAsUnknown = lobby as unknown as {
        serialize?: () => LobbyDto
        uuid?: string
        name?: string
      }

      if (typeof lobbyAsUnknown.serialize === 'function') {
        return Result.ok(lobbyAsUnknown.serialize())
      }

      if (lobbyAsUnknown.uuid && lobbyAsUnknown.name) {
        return Result.ok(lobby as unknown as LobbyDto)
      }

      return Result.ok(LobbySerializer.toDto(lobby))
    } catch (error) {
      return Result.fail(safeSystemError(error))
    }
  }

  private validateRequest(request: ShowLobbyRequest): Result<void> {
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      return Result.fail('Lobby UUID is required')
    }

    return Result.ok(undefined)
  }
}
