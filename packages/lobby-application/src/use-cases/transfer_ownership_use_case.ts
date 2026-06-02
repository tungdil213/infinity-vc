import { LobbyOwnerChangedEvent } from '@infinity.dev/lobby-domain/events'
import { Result } from '@infinity.dev/lobby-domain/shared'
import type { LobbyRepository } from '../repositories/index.js'
import type { DomainEventPublisher } from '../services/index.js'
import { safeSystemError } from '../shared/error_sanitizer.js'

export interface TransferOwnershipRequest {
  lobbyUuid: string
  currentOwnerUuid: string
  newOwnerUuid: string
}

export interface TransferOwnershipResponse {
  success: boolean
  lobbyUuid: string
  previousOwnerUuid: string
  newOwnerUuid: string
  lobbyState: unknown
}

export class TransferOwnershipUseCase {
  constructor(
    private lobbyRepository: LobbyRepository,
    private domainEventPublisher: DomainEventPublisher
  ) {}

  async execute(request: TransferOwnershipRequest): Promise<Result<TransferOwnershipResponse>> {
    try {
      const validation = this.validateRequest(request)
      if (validation.isFailure) {
        return Result.fail(validation.error)
      }

      const lobby = await this.lobbyRepository.findByUuid(request.lobbyUuid)
      if (!lobby) {
        return Result.fail('Lobby not found')
      }

      const transferResult = lobby.transferOwnership(request.currentOwnerUuid, request.newOwnerUuid)
      if (transferResult.isFailure) {
        return Result.fail(transferResult.error)
      }

      await this.lobbyRepository.save(lobby)
      await this.domainEventPublisher.publishEvents([
        new LobbyOwnerChangedEvent(
          lobby.uuid,
          transferResult.value.previousOwnerUuid,
          transferResult.value.newOwnerUuid,
          request.currentOwnerUuid
        ),
      ])

      return Result.ok({
        success: true,
        lobbyUuid: lobby.uuid,
        previousOwnerUuid: transferResult.value.previousOwnerUuid,
        newOwnerUuid: transferResult.value.newOwnerUuid,
        lobbyState: lobby.serialize(),
      })
    } catch (error) {
      return Result.fail(safeSystemError(error))
    }
  }

  private validateRequest(request: TransferOwnershipRequest): Result<void> {
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      return Result.fail('Lobby UUID is required')
    }

    if (!request.currentOwnerUuid || !request.currentOwnerUuid.trim()) {
      return Result.fail('Current owner UUID is required')
    }

    if (!request.newOwnerUuid || !request.newOwnerUuid.trim()) {
      return Result.fail('New owner UUID is required')
    }

    return Result.ok(undefined)
  }
}
