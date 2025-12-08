import type { IEvent, IEventBus } from '@tyfo.dev/events'
import type { ITranscriptService } from './transcript-service.js'

/**
 * Event to channel mapping
 */
export interface EventChannelMapping {
  /** Event type to listen for */
  eventType: string
  /** Function to determine target channel(s) */
  getChannels: (event: IEvent) => string[]
  /** Optional transformer for the payload */
  transform?: (event: IEvent) => unknown
}

/**
 * Event bridge - connects event bus to transcript service
 */
export interface IEventBridge {
  /**
   * Register an event-to-channel mapping
   */
  register(mapping: EventChannelMapping): void

  /**
   * Unregister a mapping by event type
   */
  unregister(eventType: string): void

  /**
   * Start listening to events
   */
  start(): void

  /**
   * Stop listening to events
   */
  stop(): void

  /**
   * Get all registered mappings
   */
  getMappings(): EventChannelMapping[]
}

/**
 * Event bridge implementation
 */
export class EventBridge implements IEventBridge {
  private mappings: Map<string, EventChannelMapping> = new Map()
  private unsubscribes: Map<string, () => void> = new Map()
  private isRunning: boolean = false

  constructor(
    private readonly eventBus: IEventBus,
    private readonly transcriptService: ITranscriptService
  ) {}

  register(mapping: EventChannelMapping): void {
    this.mappings.set(mapping.eventType, mapping)

    // If already running, subscribe immediately
    if (this.isRunning) {
      this.subscribeToEvent(mapping)
    }
  }

  unregister(eventType: string): void {
    this.mappings.delete(eventType)

    const unsubscribe = this.unsubscribes.get(eventType)
    if (unsubscribe) {
      unsubscribe()
      this.unsubscribes.delete(eventType)
    }
  }

  start(): void {
    if (this.isRunning) return

    this.isRunning = true

    for (const mapping of this.mappings.values()) {
      this.subscribeToEvent(mapping)
    }
  }

  stop(): void {
    if (!this.isRunning) return

    for (const unsubscribe of this.unsubscribes.values()) {
      unsubscribe()
    }
    this.unsubscribes.clear()
    this.isRunning = false
  }

  getMappings(): EventChannelMapping[] {
    return Array.from(this.mappings.values())
  }

  private subscribeToEvent(mapping: EventChannelMapping): void {
    const subscription = this.eventBus.subscribe(mapping.eventType, async (event: IEvent) => {
      const channels = mapping.getChannels(event)
      const payload = mapping.transform ? mapping.transform(event) : event.payload

      for (const channel of channels) {
        await this.transcriptService.broadcast(channel, mapping.eventType, payload)
      }
    })

    this.unsubscribes.set(mapping.eventType, () => subscription.unsubscribe())
  }
}

/**
 * Fluent builder for event bridge
 */
export class EventBridgeBuilder {
  private mappings: EventChannelMapping[] = []

  /**
   * Map an event type to channel(s)
   */
  map(eventType: string): EventMappingBuilder {
    return new EventMappingBuilder(this, eventType)
  }

  /**
   * Add a mapping
   */
  addMapping(mapping: EventChannelMapping): this {
    this.mappings.push(mapping)
    return this
  }

  /**
   * Build the event bridge
   */
  build(eventBus: IEventBus, transcriptService: ITranscriptService): IEventBridge {
    const bridge = new EventBridge(eventBus, transcriptService)

    for (const mapping of this.mappings) {
      bridge.register(mapping)
    }

    return bridge
  }
}

/**
 * Helper builder for event mapping
 */
export class EventMappingBuilder {
  private getChannels?: (event: IEvent) => string[]
  private transform?: (event: IEvent) => unknown

  constructor(
    private readonly parent: EventBridgeBuilder,
    private readonly eventType: string
  ) {}

  /**
   * Set static channel(s)
   */
  toChannel(...channels: string[]): this {
    this.getChannels = () => channels
    return this
  }

  /**
   * Set dynamic channel getter
   */
  toChannels(getter: (event: IEvent) => string[]): this {
    this.getChannels = getter
    return this
  }

  /**
   * Transform the payload
   */
  transformWith(transformer: (event: IEvent) => unknown): this {
    this.transform = transformer
    return this
  }

  /**
   * Finalize and return to parent builder
   */
  and(): EventBridgeBuilder {
    if (!this.getChannels) {
      throw new Error('Channel mapping is required')
    }

    return this.parent.addMapping({
      eventType: this.eventType,
      getChannels: this.getChannels,
      transform: this.transform,
    })
  }
}

/**
 * Create an event bridge builder
 */
export function createEventBridge(): EventBridgeBuilder {
  return new EventBridgeBuilder()
}

/**
 * Predefined mappings for common domain events
 */
export const CommonMappings = {
  /**
   * Lobby events to lobby channels
   */
  lobbyEvents: (): EventChannelMapping[] => [
    {
      eventType: 'lobby.player_joined',
      getChannels: (event) => [`lobby:${(event.payload as { lobbyId: string }).lobbyId}`, 'global'],
    },
    {
      eventType: 'lobby.player_left',
      getChannels: (event) => [`lobby:${(event.payload as { lobbyId: string }).lobbyId}`, 'global'],
    },
    {
      eventType: 'lobby.status_changed',
      getChannels: (event) => [`lobby:${(event.payload as { lobbyId: string }).lobbyId}`],
    },
    {
      eventType: 'lobby.created',
      getChannels: () => ['global'],
    },
    {
      eventType: 'lobby.closed',
      getChannels: (event) => [`lobby:${(event.payload as { lobbyId: string }).lobbyId}`, 'global'],
    },
  ],

  /**
   * Game events to game channels
   */
  gameEvents: (): EventChannelMapping[] => [
    {
      eventType: 'game.started',
      getChannels: (event) => [`game:${(event.payload as { gameId: string }).gameId}`],
    },
    {
      eventType: 'game.state_changed',
      getChannels: (event) => [`game:${(event.payload as { gameId: string }).gameId}`],
    },
    {
      eventType: 'game.player_turn_started',
      getChannels: (event) => [`game:${(event.payload as { gameId: string }).gameId}`],
    },
    {
      eventType: 'game.ended',
      getChannels: (event) => [`game:${(event.payload as { gameId: string }).gameId}`],
    },
  ],
}
