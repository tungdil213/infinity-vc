# @tyfo.dev/transcript

Real-time communication abstraction for SSE and WebSocket, with server and client implementations.

## Features

- **Transport Agnostic**: Abstract interface works with SSE, WebSocket, or polling
- **Server-Side**: Connection management, channel broadcasting, event bridge
- **Client-Side**: Auto-reconnect, subscription management, React hooks
- **Channel System**: Pattern-based channels with authorization
- **Event Bridge**: Connect event bus to real-time channels

## Installation

```bash
pnpm add @tyfo.dev/transcript
```

## Server Usage

### Basic Setup

```typescript
import {
  createConnectionManager,
  createEventBridge,
  CommonMappings,
} from '@tyfo.dev/transcript/server'
import { createEventBus } from '@tyfo.dev/events'

// Create services
const eventBus = createEventBus()
const connectionManager = createConnectionManager()

// Custom transcript service (implement for your framework)
class MyTranscriptService extends BaseTranscriptService {
  async initialize() {
    // Setup SSE/WebSocket endpoints
  }
}

const transcriptService = new MyTranscriptService(connectionManager)
await transcriptService.initialize()

// Bridge events to channels
const bridge = createEventBridge()
  .map('lobby.player_joined')
    .toChannels((event) => [`lobby:${event.payload.lobbyId}`, 'global'])
    .and()
  .map('game.started')
    .toChannels((event) => [`game:${event.payload.gameId}`])
    .and()
  .build(eventBus, transcriptService)

bridge.start()
```

### Connection Management

```typescript
import { createConnectionManager } from '@tyfo.dev/transcript/server'

const manager = createConnectionManager()

// Add connection
manager.add({
  id: 'conn-123',
  userId: 'user-456',
  connectedAt: new Date(),
  channels: new Set(),
  send: async (message) => { /* send to client */ },
  close: () => { /* close connection */ },
  isAlive: () => true,
})

// Subscribe to channels
manager.subscribe('conn-123', 'lobby:abc')

// Get connections for broadcasting
const lobbyConnections = manager.getByChannel('lobby:abc')
```

### Channel Registry

```typescript
import { createChannelRegistry, defineChannel, CommonChannels } from '@tyfo.dev/transcript/channels'

const registry = createChannelRegistry()

// Register predefined channels
registry.register(CommonChannels.global())
registry.register(CommonChannels.lobby())

// Custom channel with authorization
registry.register(
  defineChannel('admin:*')
    .pattern('admin:*')
    .requireAuth()
    .authorize(async (userId) => {
      return await isAdmin(userId)
    })
    .build()
)

// Check access
const canAccess = await registry.canAccess('user-123', 'lobby:abc')
```

## Client Usage

### Basic Client

```typescript
import { createTranscriptClient } from '@tyfo.dev/transcript/client'

const client = createTranscriptClient({
  url: '/api/sse/connect',
  autoReconnect: true,
  maxReconnectAttempts: 5,
})

// Connect
await client.connect()

// Subscribe to channels
const subscription = client.subscribe('lobby:abc', (message) => {
  console.log('Received:', message.type, message.payload)
})

// Handle state changes
client.onStateChange((state, previous) => {
  console.log(`Connection: ${previous} -> ${state}`)
})

// Handle errors
client.onError((error) => {
  console.error('Error:', error.message)
})

// Cleanup
subscription.unsubscribe()
client.disconnect()
```

### React Hooks

```typescript
import React from 'react'
import { createTranscriptHooks, createTranscriptClient } from '@tyfo.dev/transcript/client'

// Create hooks (once, at app level)
const {
  TranscriptContext,
  useTranscript,
  useSubscription,
} = createTranscriptHooks(React)

// Provider component
function App() {
  const client = useMemo(() => createTranscriptClient({
    url: '/api/sse/connect',
  }), [])

  return (
    <TranscriptContext.Provider value={client}>
      <MyComponent />
    </TranscriptContext.Provider>
  )
}

// Using hooks
function LobbyView({ lobbyId }) {
  const client = useTranscriptClient()
  const { state, isConnected, connect, error } = useTranscript(client)

  const { message, messages } = useSubscription(client, `lobby:${lobbyId}`, {
    maxMessages: 50,
  })

  useEffect(() => {
    if (!isConnected) {
      connect()
    }
  }, [])

  return (
    <div>
      <div>Status: {state}</div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.type}: {JSON.stringify(msg.payload)}</div>
      ))}
    </div>
  )
}
```

### Event Filtering

```typescript
// Only receive specific event types
const subscription = client.subscribe('game:abc', handleMessage, {
  eventTypes: ['game.player_turn_started', 'game.ended'],
})
```

## Channel Patterns

```typescript
import { ChannelPatterns } from '@tyfo.dev/transcript'

// Create channel names
const userChannel = ChannelPatterns.user('user-123')     // 'user:user-123'
const lobbyChannel = ChannelPatterns.lobby('lobby-456')  // 'lobby:lobby-456'
const gameChannel = ChannelPatterns.game('game-789')     // 'game:game-789'

// Parse channel names
const parsed = ChannelPatterns.parse('lobby:abc')
console.log(parsed) // { type: 'lobby', id: 'abc' }
```

## Integration with AdonisJS Transmit

```typescript
// providers/TranscriptProvider.ts
import { BaseTranscriptService, createConnectionManager } from '@tyfo.dev/transcript/server'
import transmit from '@adonisjs/transmit/services/main'

class AdonisTranscriptService extends BaseTranscriptService {
  async initialize() {
    // Use Transmit for the actual SSE handling
    // This service provides the abstraction layer
  }

  async broadcast(channel, type, payload) {
    // Use Transmit's broadcast
    transmit.broadcast(channel, { type, ...payload })
  }
}

export const transcriptService = new AdonisTranscriptService()
```

## API Reference

### Server

- `ITranscriptService` - Server-side service interface
- `IConnectionManager` - Connection management interface
- `IEventBridge` - Event to channel bridge
- `BaseTranscriptService` - Abstract base implementation

### Client

- `ITranscriptClient` - Client interface
- `SSETranscriptClient` - SSE implementation
- `createTranscriptHooks` - React hooks factory

### Channels

- `IChannelRegistry` - Channel registry interface
- `defineChannel` - Fluent channel builder
- `CommonChannels` - Predefined channel definitions
- `ChannelPatterns` - Channel name utilities

## License

MIT
