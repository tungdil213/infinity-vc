# @tyfo.dev/events

Event-driven architecture foundation for the Infinity game platform.

## Features

- **Event Contracts**: Strongly-typed event definitions with payloads
- **Event Bus**: In-memory pub/sub with subscription management
- **Event Store**: Event sourcing support with snapshots
- **Result Pattern**: Functional error handling without exceptions
- **Domain Events**: Pre-defined events for Lobby, Game, User domains

## Installation

```bash
pnpm add @tyfo.dev/events
```

## Usage

### Event Bus

```typescript
import { createEventBus, LobbyCreatedEvent } from '@tyfo.dev/events'

const eventBus = createEventBus()

// Subscribe to events
const subscription = eventBus.subscribe('lobby.created', (event) => {
  console.log('Lobby created:', event.payload.name)
})

// Publish events
await eventBus.publish(
  new LobbyCreatedEvent({
    lobbyId: '123',
    name: 'My Lobby',
    creatorId: 'user-1',
    maxPlayers: 4,
    isPrivate: false,
  })
)

// Cleanup
subscription.unsubscribe()
```

### Typed Event Bus

```typescript
import { TypedEventBus, InMemoryEventBus, type LobbyEventMap } from '@tyfo.dev/events'

const typedBus = new TypedEventBus<LobbyEventMap>(new InMemoryEventBus())

// Type-safe subscription
typedBus.subscribe('lobby.player_joined', (event) => {
  // event is typed as PlayerJoinedLobbyEvent
  console.log(`${event.payload.playerName} joined!`)
})
```

### Result Pattern

```typescript
import { Result, ValidationError } from '@tyfo.dev/events'

function validateName(name: string): Result<string, ValidationError> {
  if (name.length < 3) {
    return Result.fail(new ValidationError('Name too short', 'name'))
  }
  return Result.ok(name.trim())
}

const result = validateName('Hi')
result.match({
  success: (name) => console.log('Valid:', name),
  failure: (error) => console.log('Error:', error.message),
})
```

### Event Store

```typescript
import { createEventStore, LobbyCreatedEvent } from '@tyfo.dev/events'

const store = createEventStore()

// Append events
const event = new LobbyCreatedEvent({...})
await store.append('lobby-123', 'Lobby', [event])

// Read stream
const stream = await store.readStream('lobby-123', 'Lobby')
console.log('Events:', stream.value.events)
```

### Custom Domain Events

```typescript
import { DomainEvent, type EventMetadata } from '@tyfo.dev/events/core'

interface MyPayload {
  orderId: string
  amount: number
}

class OrderCreatedEvent extends DomainEvent<MyPayload> {
  readonly type = 'order.created'
  readonly aggregateType = 'Order'

  constructor(
    public readonly payload: MyPayload,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.orderId
  }

  get aggregateVersion(): number {
    return 1
  }
}
```

## API Reference

### Core

- `IEvent<T>` - Base event interface
- `IDomainEvent<T>` - Domain event with aggregate info
- `IIntegrationEvent<T>` - Cross-boundary event
- `DomainEvent<T>` - Abstract base class for domain events
- `Result<T, E>` - Success/Failure result type
- `DomainError` - Base error class

### Bus

- `IEventBus` - Event bus interface
- `InMemoryEventBus` - In-memory implementation
- `TypedEventBus<T>` - Type-safe wrapper

### Store

- `IEventStore` - Event store interface
- `ISnapshotStore` - Snapshot store interface
- `InMemoryEventStore` - In-memory implementation

### Domain Events

- `LobbyEventTypes` - Lobby event type constants
- `GameEventTypes` - Game event type constants
- `UserEventTypes` - User event type constants

## License

MIT
