import logger from '@adonisjs/core/services/logger'

export interface PendingLeavePayload {
  lobbyUuid: string
  userUuid: string
}

export interface LobbyConnectionPayload extends PendingLeavePayload {
  clientSessionId?: string
}

type PendingLeaveHandler = (payload: PendingLeavePayload) => Promise<void>

type PendingLeaveEntry = {
  timeout: NodeJS.Timeout
  scheduledAt: number
  disconnectSessionId?: string
}

type ActiveConnectionEntry = {
  clientSessionId?: string
  connectedAt: number
  lastHeartbeatAt: number
}

const DEFAULT_GRACE_PERIOD_MS = resolveDefaultGracePeriodMs()

function resolveDefaultGracePeriodMs(): number {
  const configuredValue = Number(process.env.LOBBY_DISCONNECT_GRACE_MS ?? 45_000)
  if (!Number.isFinite(configuredValue)) {
    return 45_000
  }

  return Math.min(120_000, Math.max(5_000, Math.floor(configuredValue)))
}

export class LobbyPresenceService {
  private static readonly pendingLeaves = new Map<string, PendingLeaveEntry>()
  private static readonly activeConnections = new Map<string, ActiveConnectionEntry>()

  constructor(private readonly gracePeriodMs: number = DEFAULT_GRACE_PERIOD_MS) {}

  scheduleLeaveOnDisconnect(
    payload: LobbyConnectionPayload,
    onLeave: PendingLeaveHandler
  ): { scheduled: true; gracePeriodMs: number } {
    this.cancelPendingLeave(payload)

    const key = this.buildKey(payload)
    const activeConnection = LobbyPresenceService.activeConnections.get(key)
    const disconnectSessionId = payload.clientSessionId ?? activeConnection?.clientSessionId

    const timeout = setTimeout(async () => {
      LobbyPresenceService.pendingLeaves.delete(key)

      const latestConnection = LobbyPresenceService.activeConnections.get(key)
      const latestSessionId = latestConnection?.clientSessionId
      const hasReconnected =
        typeof disconnectSessionId === 'string' &&
        typeof latestSessionId === 'string' &&
        latestSessionId !== disconnectSessionId
      const hasRecentHeartbeat =
        typeof latestConnection?.lastHeartbeatAt === 'number' &&
        Date.now() - latestConnection.lastHeartbeatAt < this.gracePeriodMs

      if (hasReconnected || hasRecentHeartbeat) {
        logger.debug(
          {
            lobbyUuid: payload.lobbyUuid,
            userUuid: payload.userUuid,
            disconnectSessionId,
            latestSessionId,
            hasRecentHeartbeat,
          },
          '[LobbyPresence] Skipping delayed leave because player reconnected'
        )
        return
      }

      try {
        await onLeave({
          lobbyUuid: payload.lobbyUuid,
          userUuid: payload.userUuid,
        })
        LobbyPresenceService.activeConnections.delete(key)
      } catch (error) {
        logger.warn(
          { error, lobbyUuid: payload.lobbyUuid, userUuid: payload.userUuid },
          '[LobbyPresence] Delayed leave execution failed'
        )
      }
    }, this.gracePeriodMs)

    LobbyPresenceService.pendingLeaves.set(key, {
      timeout,
      scheduledAt: Date.now(),
      disconnectSessionId,
    })

    return {
      scheduled: true,
      gracePeriodMs: this.gracePeriodMs,
    }
  }

  markConnected(payload: LobbyConnectionPayload): void {
    const key = this.buildKey(payload)
    const now = Date.now()
    const current = LobbyPresenceService.activeConnections.get(key)

    LobbyPresenceService.activeConnections.set(key, {
      clientSessionId: payload.clientSessionId ?? current?.clientSessionId,
      connectedAt: current?.connectedAt ?? now,
      lastHeartbeatAt: now,
    })

    this.cancelPendingLeave(payload)
  }

  cancelPendingLeave(payload: PendingLeavePayload): boolean {
    const key = this.buildKey(payload)
    const pendingLeave = LobbyPresenceService.pendingLeaves.get(key)
    if (!pendingLeave) {
      return false
    }

    clearTimeout(pendingLeave.timeout)
    LobbyPresenceService.pendingLeaves.delete(key)
    return true
  }

  hasPendingLeave(payload: PendingLeavePayload): boolean {
    return LobbyPresenceService.pendingLeaves.has(this.buildKey(payload))
  }

  getPendingCount(): number {
    return LobbyPresenceService.pendingLeaves.size
  }

  clearAllPendingLeaves(): void {
    for (const pendingLeave of LobbyPresenceService.pendingLeaves.values()) {
      clearTimeout(pendingLeave.timeout)
    }
    LobbyPresenceService.pendingLeaves.clear()
    LobbyPresenceService.activeConnections.clear()
  }

  getGracePeriodMs(): number {
    return this.gracePeriodMs
  }

  private buildKey(payload: PendingLeavePayload): string {
    return `${payload.lobbyUuid}:${payload.userUuid}`
  }
}
