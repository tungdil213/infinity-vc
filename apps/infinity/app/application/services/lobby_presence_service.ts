import logger from '@adonisjs/core/services/logger'

export interface PendingLeavePayload {
  lobbyUuid: string
  userUuid: string
}

export interface LobbyConnectionPayload extends PendingLeavePayload {
  clientSessionId?: string
  gracePeriodMs?: number
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
  gracePeriodMs: number
  staleLeaveTimeout?: NodeJS.Timeout
  onStaleLeave?: PendingLeaveHandler
}

const DEFAULT_GRACE_PERIOD_MS = resolveDefaultGracePeriodMs()
const MIN_DYNAMIC_GRACE_PERIOD_MS = 50
const MAX_DYNAMIC_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1_000

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
    this.clearStaleLeaveTimeout(activeConnection)
    const gracePeriodMs = this.resolveGracePeriodMs(payload, activeConnection)
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
        Date.now() - latestConnection.lastHeartbeatAt < gracePeriodMs

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
        this.clearConnection(payload)
      } catch (error) {
        logger.warn(
          { error, lobbyUuid: payload.lobbyUuid, userUuid: payload.userUuid },
          '[LobbyPresence] Delayed leave execution failed'
        )
      }
    }, gracePeriodMs)

    LobbyPresenceService.pendingLeaves.set(key, {
      timeout,
      scheduledAt: Date.now(),
      disconnectSessionId,
    })

    return {
      scheduled: true,
      gracePeriodMs,
    }
  }

  markConnected(payload: LobbyConnectionPayload, onStaleLeave?: PendingLeaveHandler): void {
    const key = this.buildKey(payload)
    const now = Date.now()
    const current = LobbyPresenceService.activeConnections.get(key)
    const staleLeaveHandler = onStaleLeave ?? current?.onStaleLeave
    const gracePeriodMs = this.resolveGracePeriodMs(payload, current)
    this.clearStaleLeaveTimeout(current)

    const connectionEntry: ActiveConnectionEntry = {
      clientSessionId: payload.clientSessionId ?? current?.clientSessionId,
      connectedAt: current?.connectedAt ?? now,
      lastHeartbeatAt: now,
      gracePeriodMs,
      onStaleLeave: staleLeaveHandler,
    }

    if (staleLeaveHandler) {
      connectionEntry.staleLeaveTimeout = this.scheduleStaleLeaveTimeout(
        {
          lobbyUuid: payload.lobbyUuid,
          userUuid: payload.userUuid,
        },
        now,
        gracePeriodMs,
        staleLeaveHandler
      )
    }

    LobbyPresenceService.activeConnections.set(key, connectionEntry)

    this.cancelPendingLeave(payload)
  }

  clearConnection(payload: PendingLeavePayload): boolean {
    const key = this.buildKey(payload)
    const activeConnection = LobbyPresenceService.activeConnections.get(key)
    if (!activeConnection) {
      return false
    }

    this.clearStaleLeaveTimeout(activeConnection)
    LobbyPresenceService.activeConnections.delete(key)
    this.cancelPendingLeave(payload)
    return true
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

    for (const activeConnection of LobbyPresenceService.activeConnections.values()) {
      this.clearStaleLeaveTimeout(activeConnection)
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

  private scheduleStaleLeaveTimeout(
    payload: PendingLeavePayload,
    expectedHeartbeatAt: number,
    gracePeriodMs: number,
    onStaleLeave: PendingLeaveHandler
  ): NodeJS.Timeout {
    return setTimeout(async () => {
      const key = this.buildKey(payload)
      const latestConnection = LobbyPresenceService.activeConnections.get(key)
      if (!latestConnection) {
        return
      }

      // A newer heartbeat already refreshed this connection.
      if (latestConnection.lastHeartbeatAt !== expectedHeartbeatAt) {
        return
      }

      try {
        await onStaleLeave(payload)
        this.clearConnection(payload)
      } catch (error) {
        logger.warn(
          { error, lobbyUuid: payload.lobbyUuid, userUuid: payload.userUuid },
          '[LobbyPresence] Stale heartbeat leave execution failed'
        )

        latestConnection.staleLeaveTimeout = this.scheduleStaleLeaveTimeout(
          payload,
          latestConnection.lastHeartbeatAt,
          latestConnection.gracePeriodMs ?? this.gracePeriodMs,
          onStaleLeave
        )
        LobbyPresenceService.activeConnections.set(key, latestConnection)
      }
    }, gracePeriodMs)
  }

  private clearStaleLeaveTimeout(connection?: ActiveConnectionEntry): void {
    if (connection?.staleLeaveTimeout) {
      clearTimeout(connection.staleLeaveTimeout)
      connection.staleLeaveTimeout = undefined
    }
  }

  private resolveGracePeriodMs(
    payload: LobbyConnectionPayload,
    current?: ActiveConnectionEntry
  ): number {
    const configured = this.normalizeGracePeriodMs(payload.gracePeriodMs)
    if (configured !== undefined) {
      return configured
    }

    if (current?.gracePeriodMs) {
      return current.gracePeriodMs
    }

    return this.gracePeriodMs
  }

  private normalizeGracePeriodMs(value?: number): number | undefined {
    if (!Number.isFinite(value)) {
      return undefined
    }

    return Math.min(
      MAX_DYNAMIC_GRACE_PERIOD_MS,
      Math.max(MIN_DYNAMIC_GRACE_PERIOD_MS, Math.floor(value as number))
    )
  }
}
