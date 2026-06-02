import type {
  JoinLobbyResponse,
  JoinLobbyUseCase,
} from '#application/use_cases/join_lobby_use_case'

export interface JoinLobbyPresenceFlow {
  markConnected(payload: { lobbyUuid: string; userUuid: string; gracePeriodMs?: number }): void
  resolveGracePeriodMs(
    lobby?: { isPrivate?: boolean; hasPassword?: boolean } | null
  ): number | undefined
}

export type EnhancedLobbyJoinResult =
  | {
      readonly status: 'failure'
      readonly error: string
    }
  | {
      readonly status: 'joined'
      readonly value: JoinLobbyResponse
    }

export class EnhancedLobbiesControllerJoinFlow {
  constructor(
    private readonly joinLobbyUseCase: Pick<JoinLobbyUseCase, 'execute'>,
    private readonly presenceFlow: JoinLobbyPresenceFlow
  ) {}

  async join(options: {
    lobbyUuid: string
    userUuid: string
    password?: string
  }): Promise<EnhancedLobbyJoinResult> {
    const result = await this.joinLobbyUseCase.execute({
      lobbyUuid: options.lobbyUuid,
      userUuid: options.userUuid,
      password: options.password,
    })

    if (result.isFailure) {
      return {
        status: 'failure',
        error: result.error,
      }
    }

    this.presenceFlow.markConnected({
      lobbyUuid: options.lobbyUuid,
      userUuid: options.userUuid,
      gracePeriodMs: this.presenceFlow.resolveGracePeriodMs(result.value.lobby),
    })

    return {
      status: 'joined',
      value: result.value,
    }
  }
}
