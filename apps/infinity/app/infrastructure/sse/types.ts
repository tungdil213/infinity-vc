import { Response } from '@adonisjs/core/http'

export interface SSEEvent {
  id: string
  type: string
  data: any
  timestamp: Date
  channel?: string
  retry?: number
}

export interface SSEConnection {
  id: string
  userId: string
  response: Response
  channels: Set<string>
  lastPing: Date
  isActive: boolean
}

export interface ChannelSubscription {
  userId: string
  connectionId: string
  filters?: EventFilter[]
}

export interface EventFilter {
  field: string
  operator: 'equals' | 'contains' | 'startsWith' | 'in'
  value: any
}

export interface SSEChannel {
  name: string
  connections: Set<string>
  subscribe(connectionId: string): void
  unsubscribe(connectionId: string): void
  broadcast(event: SSEEvent): Promise<void>
  getConnectionCount(): number
}

export interface SSEConnectionManager {
  addConnection(userId: string, response: Response): string
  removeConnection(connectionId: string): void
  getConnection(connectionId: string): SSEConnection | undefined
  getConnectionsByUser(userId: string): SSEConnection[]
  sendToConnection(connectionId: string, event: SSEEvent): Promise<boolean>
  sendToUser(userId: string, event: SSEEvent): Promise<number>
  cleanup(): void
  getActiveConnectionCount(): number
}

export interface ChannelManager {
  createChannel(name: string): SSEChannel
  getChannel(name: string): SSEChannel | undefined
  deleteChannel(name: string): void
  subscribeToChannel(channelName: string, connectionId: string): boolean
  unsubscribeFromChannel(channelName: string, connectionId: string): boolean
  broadcastToChannel(channelName: string, event: SSEEvent): Promise<void>
  getChannelNames(): string[]
  cleanup(): void
}

export interface EventTransformer {
  transform(domainEvent: any): SSEEvent[]
  getTargetChannels(domainEvent: any): string[]
  canTransform(domainEvent: any): boolean
}

// Channel naming patterns
export const ChannelPatterns = {
  lobby: (lobbyUuid: string) => `lobby:${lobbyUuid}`,
  user: (userUuid: string) => `user:${userUuid}`,
  game: (gameUuid: string) => `game:${gameUuid}`,
  global: () => 'global',
  system: () => 'system',
} as const

// SSE Event types
export const SSEEventTypes = {
  // Lobby events
  LOBBY_PLAYER_JOINED: 'lobby.player.joined',
  LOBBY_PLAYER_LEFT: 'lobby.player.left',
  LOBBY_STATUS_CHANGED: 'lobby.status.changed',
  LOBBY_GAME_STARTED: 'lobby.game.started',
  
  // User events
  USER_NOTIFICATION: 'user.notification',
  USER_INVITATION: 'user.invitation',
  
  // Game events
  GAME_STATE_CHANGED: 'game.state.changed',
  GAME_PLAYER_ACTION: 'game.player.action',
  
  // System events
  SYSTEM_HEARTBEAT: 'system.heartbeat',
  SYSTEM_MAINTENANCE: 'system.maintenance',
} as const
