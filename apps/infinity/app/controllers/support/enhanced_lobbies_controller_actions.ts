import type {
  CloseLobbyResponse,
  CloseLobbyUseCase,
} from '#application/use_cases/close_lobby_use_case'
import type {
  KickPlayerResponse,
  KickPlayerUseCase,
} from '#application/use_cases/kick_player_use_case'
import type {
  StartGameResponse,
  StartGameUseCase,
} from '#application/use_cases/start_game_use_case'
import type {
  TransferOwnershipResponse,
  TransferOwnershipUseCase,
} from '#application/use_cases/transfer_ownership_use_case'

export type EnhancedLobbyStartResult =
  | {
      readonly status: 'failure'
      readonly error: string
    }
  | {
      readonly status: 'started'
      readonly gameUuid: string
      readonly value: StartGameResponse
    }

export type EnhancedLobbyKickResult =
  | {
      readonly status: 'failure'
      readonly error: string
    }
  | {
      readonly status: 'kicked'
      readonly value: KickPlayerResponse
    }

export type EnhancedLobbyAdminCloseResult =
  | {
      readonly status: 'failure'
      readonly error: string
      readonly httpStatus: 400 | 404
    }
  | {
      readonly status: 'closed'
      readonly value: CloseLobbyResponse
      readonly logContext: {
        readonly lobbyUuid: string
        readonly reason: string
        readonly closedByUserUuid: string
        readonly closedByRole?: string
      }
    }

export type EnhancedLobbyTransferOwnershipResult =
  | {
      readonly status: 'failure'
      readonly error: string
      readonly httpStatus: 400 | 403 | 404
    }
  | {
      readonly status: 'transferred'
      readonly value: TransferOwnershipResponse
    }

export class EnhancedLobbiesControllerActionsFlow {
  constructor(
    private readonly startGameUseCase: Pick<StartGameUseCase, 'execute'>,
    private readonly kickPlayerUseCase: Pick<KickPlayerUseCase, 'execute'>,
    private readonly closeLobbyUseCase: Pick<CloseLobbyUseCase, 'execute'>,
    private readonly transferOwnershipUseCase: Pick<TransferOwnershipUseCase, 'execute'>
  ) {}

  async start(options: { lobbyUuid: string; userUuid: string }): Promise<EnhancedLobbyStartResult> {
    const result = await this.startGameUseCase.execute({
      lobbyUuid: options.lobbyUuid,
      userUuid: options.userUuid,
    })

    if (result.isFailure) {
      return {
        status: 'failure',
        error: result.error,
      }
    }

    return {
      status: 'started',
      gameUuid: result.value.game.uuid,
      value: result.value,
    }
  }

  async kickPlayer(options: {
    lobbyUuid: string
    kickerUuid: string
    targetPlayerUuid: string
  }): Promise<EnhancedLobbyKickResult> {
    const result = await this.kickPlayerUseCase.execute({
      lobbyUuid: options.lobbyUuid,
      kickerUuid: options.kickerUuid,
      targetPlayerUuid: options.targetPlayerUuid,
    })

    if (result.isFailure) {
      return {
        status: 'failure',
        error: result.error,
      }
    }

    return {
      status: 'kicked',
      value: result.value,
    }
  }

  async adminClose(options: {
    lobbyUuid: string
    closedByUserUuid: string
    closedByRole?: string
    reason?: string
  }): Promise<EnhancedLobbyAdminCloseResult> {
    const result = await this.closeLobbyUseCase.execute({
      lobbyUuid: options.lobbyUuid,
      closedByUserUuid: options.closedByUserUuid,
      closedByRole: options.closedByRole,
      reason: options.reason,
    })

    if (result.isFailure) {
      return {
        status: 'failure',
        error: result.error,
        httpStatus: result.error === 'Lobby not found' ? 404 : 400,
      }
    }

    return {
      status: 'closed',
      value: result.value,
      logContext: {
        lobbyUuid: result.value.lobbyUuid,
        reason: result.value.reason,
        closedByUserUuid: options.closedByUserUuid,
        closedByRole: options.closedByRole,
      },
    }
  }

  async transferOwnership(options: {
    lobbyUuid: string
    currentOwnerUuid: string
    newOwnerUuid: string
  }): Promise<EnhancedLobbyTransferOwnershipResult> {
    const result = await this.transferOwnershipUseCase.execute({
      lobbyUuid: options.lobbyUuid,
      currentOwnerUuid: options.currentOwnerUuid,
      newOwnerUuid: options.newOwnerUuid,
    })

    if (result.isFailure) {
      return {
        status: 'failure',
        error: result.error,
        httpStatus: this.resolveTransferOwnershipStatus(result.error),
      }
    }

    return {
      status: 'transferred',
      value: result.value,
    }
  }

  private resolveTransferOwnershipStatus(error: string): 400 | 403 | 404 {
    if (error === 'Lobby not found') {
      return 404
    }

    if (error === 'Only the lobby creator can transfer ownership') {
      return 403
    }

    return 400
  }
}
