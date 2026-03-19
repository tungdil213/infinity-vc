import { type LobbyRepository } from '#application/repositories/lobby_repository'
import { type LobbyEventService } from '#application/services/lobby_event_service'
import { LobbyStatus } from '#domain/value_objects/lobby_status'
import { safeSystemError } from '#shared/error_sanitizer'
import { Result } from '#shared/result'

export interface CloseLobbyRequest {
  lobbyUuid: string
  closedByUserUuid: string
  closedByRole?: string
  reason?: string
}

export interface CloseLobbyResponse {
  lobbyUuid: string
  reason: string
  closedAt: Date
}

export class CloseLobbyUseCase {
  constructor(
    private lobbyRepository: LobbyRepository,
    private eventService: LobbyEventService
  ) {}

  async execute(request: CloseLobbyRequest): Promise<Result<CloseLobbyResponse>> {
    try {
      const validation = this.validateRequest(request)
      if (validation.isFailure) {
        return Result.fail(validation.error)
      }

      const lobby = await this.lobbyRepository.findByUuid(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      if (lobby.status === LobbyStatus.STARTING) {
        return Result.fail('Cannot close a lobby while a game is starting')
      }

      await this.lobbyRepository.delete(lobby.uuid)

      const reason = this.computeReason(request)
      await this.eventService.emitLobbyDeleted(lobby.uuid, reason)
      await this.eventService.emitLobbyModerationClosed({
        lobbyUuid: lobby.uuid,
        reason,
        closedByUserUuid: request.closedByUserUuid,
        closedByRole: request.closedByRole ?? 'PLAYER',
      })

      return Result.ok({
        lobbyUuid: lobby.uuid,
        reason,
        closedAt: new Date(),
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'close_lobby'))
    }
  }

  private validateRequest(request: CloseLobbyRequest): Result<void> {
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      return Result.fail('Lobby UUID is required')
    }

    if (!request.closedByUserUuid || !request.closedByUserUuid.trim()) {
      return Result.fail('Closer user UUID is required')
    }

    return Result.ok(undefined)
  }

  private computeReason(request: CloseLobbyRequest): string {
    const reason = request.reason?.trim()
    if (reason) {
      return reason
    }

    return `closed_by_moderation:${request.closedByUserUuid}`
  }
}
