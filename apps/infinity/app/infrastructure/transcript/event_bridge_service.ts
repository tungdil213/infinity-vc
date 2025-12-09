/**
 * Event Bridge Service
 *
 * Connects the domain event bus to the Transmit adapter using @tyfo.dev/transcript EventBridge.
 * This service automatically broadcasts domain events to the appropriate Transmit channels.
 */
import { EventBridge, createEventBridge } from '@tyfo.dev/transcript/server'
import { eventBus } from '../events/event_bus.js'
import { transmitAdapter } from './transmit_adapter.js'

/**
 * Event Bridge Service - connects event bus to Transmit
 */
class EventBridgeService {
  private bridge: EventBridge | null = null
  private isInitialized: boolean = false

  /**
   * Initialize the event bridge with default mappings
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[EventBridgeService] Already initialized')
      return
    }

    // Initialize the transmit adapter
    await transmitAdapter.initialize()

    // Create the event bridge
    const builder = createEventBridge()

    // Map lobby events
    builder
      .map('PlayerJoinedLobby')
      .toChannels((event) => {
        const payload = event.payload as { lobbyUuid?: string }
        return payload.lobbyUuid ? ['lobbies', `lobbies/${payload.lobbyUuid}`] : ['lobbies']
      })
      .transformWith((event) => ({
        type: 'lobby.player.joined',
        ...(event.payload as Record<string, unknown>),
      }))
      .and()

    builder
      .map('PlayerLeftLobby')
      .toChannels((event) => {
        const payload = event.payload as { lobbyUuid?: string }
        return payload.lobbyUuid ? ['lobbies', `lobbies/${payload.lobbyUuid}`] : ['lobbies']
      })
      .transformWith((event) => ({
        type: 'lobby.player.left',
        ...(event.payload as Record<string, unknown>),
      }))
      .and()

    builder
      .map('LobbyCreated')
      .toChannel('lobbies')
      .transformWith((event) => ({
        type: 'lobby.created',
        ...(event.payload as Record<string, unknown>),
      }))
      .and()

    builder
      .map('LobbyDeleted')
      .toChannels((event) => {
        const payload = event.payload as { lobbyUuid?: string }
        return payload.lobbyUuid ? ['lobbies', `lobbies/${payload.lobbyUuid}`] : ['lobbies']
      })
      .transformWith((event) => ({
        type: 'lobby.deleted',
        ...(event.payload as Record<string, unknown>),
      }))
      .and()

    builder
      .map('LobbyStatusChanged')
      .toChannels((event) => {
        const payload = event.payload as { lobbyUuid?: string }
        return payload.lobbyUuid ? ['lobbies', `lobbies/${payload.lobbyUuid}`] : ['lobbies']
      })
      .transformWith((event) => ({
        type: 'lobby.status.changed',
        ...(event.payload as Record<string, unknown>),
      }))
      .and()

    builder
      .map('GameStarted')
      .toChannels((event) => {
        const payload = event.payload as { lobbyUuid?: string; gameId?: string }
        const channels = ['lobbies']
        if (payload.lobbyUuid) channels.push(`lobbies/${payload.lobbyUuid}`)
        if (payload.gameId) channels.push(`games/${payload.gameId}`)
        return channels
      })
      .transformWith((event) => ({
        type: 'lobby.game.started',
        ...(event.payload as Record<string, unknown>),
      }))
      .and()

    // Map game events
    builder
      .map('game.started')
      .toChannels((event) => {
        const payload = event.payload as { gameId?: string }
        return payload.gameId ? [`games/${payload.gameId}`] : []
      })
      .and()

    builder
      .map('game.finished')
      .toChannels((event) => {
        const payload = event.payload as { gameId?: string }
        return payload.gameId ? [`games/${payload.gameId}`] : []
      })
      .and()

    builder
      .map('game.card_played')
      .toChannels((event) => {
        const payload = event.payload as { gameId?: string }
        return payload.gameId ? [`games/${payload.gameId}`] : []
      })
      .and()

    builder
      .map('game.player_eliminated')
      .toChannels((event) => {
        const payload = event.payload as { gameId?: string }
        return payload.gameId ? [`games/${payload.gameId}`] : []
      })
      .and()

    // Build and start the bridge
    this.bridge = builder.build(eventBus as any, transmitAdapter) as EventBridge
    this.bridge.start()

    this.isInitialized = true
    console.log('[EventBridgeService] Initialized with event mappings')
  }

  /**
   * Add a custom event mapping
   */
  addMapping(
    eventType: string,
    getChannels: (event: any) => string[],
    transform?: (event: any) => unknown
  ): void {
    if (!this.bridge) {
      console.warn('[EventBridgeService] Not initialized, cannot add mapping')
      return
    }

    this.bridge.register({
      eventType,
      getChannels,
      transform,
    })
  }

  /**
   * Remove an event mapping
   */
  removeMapping(eventType: string): void {
    if (!this.bridge) {
      return
    }

    this.bridge.unregister(eventType)
  }

  /**
   * Get all registered mappings
   */
  getMappings(): Array<{ eventType: string }> {
    if (!this.bridge) {
      return []
    }

    return this.bridge.getMappings()
  }

  /**
   * Stop the event bridge
   */
  stop(): void {
    if (!this.bridge) {
      return
    }

    try {
      this.bridge.stop()
    } catch (error) {
      // During short‑lived CLI commands (migrations, etc.) we do not want
      // a shutdown error to crash the whole process. We swallow the
      // original error and only emit a concise log message.
      console.warn('[EventBridgeService] stop() failed, ignoring during shutdown')
    } finally {
      this.bridge = null
      this.isInitialized = false
      console.log('[EventBridgeService] Stopped')
    }
  }

  /**
   * Restart the event bridge
   */
  restart(): void {
    if (this.bridge) {
      this.bridge.stop()
      this.bridge.start()
      console.log('[EventBridgeService] Restarted')
    }
  }
}

// Singleton instance
export const eventBridgeService = new EventBridgeService()
