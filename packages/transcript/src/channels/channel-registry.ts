import type { IChannel } from '../core/types.js'

/**
 * Channel authorization function type
 */
export type ChannelAuthorizer = (userId: string, channelId: string) => Promise<boolean>

/**
 * Channel registry - manages channel definitions and authorization
 */
export interface IChannelRegistry {
  /**
   * Register a channel
   */
  register(channel: IChannel): void

  /**
   * Unregister a channel
   */
  unregister(channelId: string): void

  /**
   * Get a channel by ID or pattern match
   */
  get(channelId: string): IChannel | undefined

  /**
   * Check if a user can access a channel
   */
  canAccess(userId: string, channelId: string): Promise<boolean>

  /**
   * Get all registered channels
   */
  getAll(): IChannel[]

  /**
   * Match a channel ID against registered patterns
   */
  matchPattern(channelId: string): IChannel | undefined
}

/**
 * Channel registry implementation
 */
export class ChannelRegistry implements IChannelRegistry {
  private channels: Map<string, IChannel> = new Map()
  private patterns: Map<string, IChannel> = new Map()

  register(channel: IChannel): void {
    if (channel.pattern.includes('*')) {
      this.patterns.set(channel.pattern, channel)
    } else {
      this.channels.set(channel.id, channel)
    }
  }

  unregister(channelId: string): void {
    this.channels.delete(channelId)
    this.patterns.delete(channelId)
  }

  get(channelId: string): IChannel | undefined {
    return this.channels.get(channelId) ?? this.matchPattern(channelId)
  }

  async canAccess(userId: string, channelId: string): Promise<boolean> {
    const channel = this.get(channelId)

    if (!channel) {
      // Unknown channel - deny by default
      return false
    }

    if (!channel.requiresAuth) {
      return true
    }

    if (channel.authorize) {
      return channel.authorize(userId, channelId)
    }

    // Requires auth but no authorizer - allow if user is provided
    return !!userId
  }

  getAll(): IChannel[] {
    return [...this.channels.values(), ...this.patterns.values()]
  }

  matchPattern(channelId: string): IChannel | undefined {
    for (const [pattern, channel] of this.patterns) {
      if (this.matchesPattern(channelId, pattern)) {
        return channel
      }
    }
    return undefined
  }

  private matchesPattern(channelId: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '[^:]+')
      .replace(/\*\*/g, '.+')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(channelId)
  }
}

/**
 * Mutable channel for building
 */
interface MutableChannel {
  id: string
  pattern: string
  requiresAuth: boolean
  authorize?: (userId: string, channelId: string) => Promise<boolean>
}

/**
 * Fluent builder for channel definitions
 */
export class ChannelBuilder {
  private channel: Partial<MutableChannel> = {}

  constructor(id: string) {
    this.channel.id = id
    this.channel.pattern = id
    this.channel.requiresAuth = false
  }

  /**
   * Set the channel pattern
   */
  pattern(pattern: string): this {
    this.channel.pattern = pattern
    return this
  }

  /**
   * Require authentication
   */
  requireAuth(): this {
    this.channel.requiresAuth = true
    return this
  }

  /**
   * Set authorization function
   */
  authorize(authorizer: ChannelAuthorizer): this {
    this.channel.requiresAuth = true
    this.channel.authorize = authorizer
    return this
  }

  /**
   * Build the channel definition
   */
  build(): IChannel {
    return this.channel as IChannel
  }
}

/**
 * Create a channel builder
 */
export function defineChannel(id: string): ChannelBuilder {
  return new ChannelBuilder(id)
}

/**
 * Create a channel registry
 */
export function createChannelRegistry(): IChannelRegistry {
  return new ChannelRegistry()
}

/**
 * Predefined channel definitions
 */
export const CommonChannels = {
  /**
   * Global broadcast channel
   */
  global: (): IChannel =>
    defineChannel('global')
      .pattern('global')
      .build(),

  /**
   * User-specific channel (requires auth)
   */
  user: (): IChannel =>
    defineChannel('user:*')
      .pattern('user:*')
      .requireAuth()
      .authorize(async (userId, channelId) => {
        const channelUserId = channelId.split(':')[1]
        return userId === channelUserId
      })
      .build(),

  /**
   * Lobby channel (requires auth, any authenticated user can join)
   */
  lobby: (): IChannel =>
    defineChannel('lobby:*')
      .pattern('lobby:*')
      .requireAuth()
      .build(),

  /**
   * Game channel (requires auth + game participation check)
   */
  game: (checkParticipation: (userId: string, gameId: string) => Promise<boolean>): IChannel =>
    defineChannel('game:*')
      .pattern('game:*')
      .requireAuth()
      .authorize(async (userId, channelId) => {
        const gameId = channelId.split(':')[1]
        return checkParticipation(userId, gameId)
      })
      .build(),
}
