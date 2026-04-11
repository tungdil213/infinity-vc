import logger from '@adonisjs/core/services/logger'
import type {
  LobbyConnectionPayload,
  LobbyPresenceService,
  PendingLeavePayload,
} from '#application/services/lobby_presence_service'
import type { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'

export interface LobbyBeaconPayload {
  lobbyUuid?: string
  userUuid?: string
  clientSessionId?: string
}

export interface PresenceAwareLobby {
  isPrivate?: boolean
  hasPassword?: boolean
}

const PRIVATE_LOBBY_PRESENCE_GRACE_MS = resolvePrivateLobbyPresenceGraceMs()

function resolvePrivateLobbyPresenceGraceMs(): number {
  const configuredValue = Number(process.env.LOBBY_PRIVATE_DISCONNECT_GRACE_MS ?? 172_800_000)
  if (!Number.isFinite(configuredValue)) {
    return 172_800_000
  }

  // Private async lobbies can stay alive up to 7 days.
  return Math.min(604_800_000, Math.max(60_000, Math.floor(configuredValue)))
}

export class EnhancedLobbiesControllerPresence {
  constructor(
    private readonly lobbyPresenceService: LobbyPresenceService,
    private readonly leaveLobbyUseCase: Pick<LeaveLobbyUseCase, 'execute'>
  ) {}

  markConnected(payload: LobbyConnectionPayload): void {
    this.lobbyPresenceService.markConnected(payload, async (stalePayload) => {
      await this.executePresenceLeave(stalePayload, 'Stale heartbeat leave execution failed')
    })
  }

  cancelPendingLeave(payload: PendingLeavePayload): boolean {
    return this.lobbyPresenceService.cancelPendingLeave(payload)
  }

  clearConnection(payload: PendingLeavePayload): boolean {
    return this.lobbyPresenceService.clearConnection(payload)
  }

  resolveGracePeriodMs(lobby?: PresenceAwareLobby | null): number | undefined {
    const shouldKeepAsync = Boolean(lobby?.isPrivate || lobby?.hasPassword)
    return shouldKeepAsync ? PRIVATE_LOBBY_PRESENCE_GRACE_MS : undefined
  }

  scheduleLeaveOnDisconnect(payload: LobbyConnectionPayload): {
    scheduled: true
    gracePeriodMs: number
  } {
    return this.lobbyPresenceService.scheduleLeaveOnDisconnect(payload, async (leavePayload) => {
      await this.executePresenceLeave(leavePayload, 'Delayed leave on close failed')
    })
  }

  parseBeaconPayload(body: unknown): LobbyBeaconPayload {
    const normalize = (value: unknown): LobbyBeaconPayload => {
      if (!value || typeof value !== 'object') {
        return { lobbyUuid: undefined, userUuid: undefined, clientSessionId: undefined }
      }

      const raw = value as Record<string, unknown>

      return {
        lobbyUuid: typeof raw.lobbyUuid === 'string' ? raw.lobbyUuid : undefined,
        userUuid: typeof raw.userUuid === 'string' ? raw.userUuid : undefined,
        clientSessionId:
          typeof raw.clientSessionId === 'string' && raw.clientSessionId.trim().length > 0
            ? raw.clientSessionId
            : undefined,
      }
    }

    if (!body) {
      return {}
    }

    if (typeof body === 'string') {
      try {
        return normalize(JSON.parse(body))
      } catch {
        return {}
      }
    }

    if (typeof body === 'object') {
      const rawBody = body as Record<string, unknown>

      if (typeof rawBody.payload === 'string') {
        try {
          return normalize(JSON.parse(rawBody.payload))
        } catch {
          return normalize(rawBody)
        }
      }

      return normalize(rawBody)
    }

    return {}
  }

  private async executePresenceLeave(
    payload: PendingLeavePayload,
    logMessage: string
  ): Promise<void> {
    const result = await this.leaveLobbyUseCase.execute(payload)
    if (result.isFailure) {
      if (this.isAlreadyLeftError(result.error)) {
        this.lobbyPresenceService.clearConnection(payload)
        return
      }

      logger.warn(
        { lobbyUuid: payload.lobbyUuid, userUuid: payload.userUuid, error: result.error },
        logMessage
      )
      throw new Error(result.error)
    }

    this.lobbyPresenceService.clearConnection(payload)
  }

  private isAlreadyLeftError(error: string): boolean {
    return error.includes('Player is not in this lobby') || error.includes('not found')
  }
}
