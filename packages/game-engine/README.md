# @tyfo.dev/game-engine

Abstract game engine with state machine, rules, and actions for building board games.

## Features

- **Game Engine Interface**: Base abstraction for any turn-based game
- **State Machine**: Flexible phase/state management
- **Rule Engine**: Composable validation rules
- **Love Letter**: Complete implementation as reference

## Installation

```bash
pnpm add @tyfo.dev/game-engine
```

## Usage

### Creating a Game

```typescript
import { createLoveLetterEngine } from '@tyfo.dev/game-engine/love-letter'

const engine = createLoveLetterEngine()

// Initialize game
const result = engine.initialize([
  { id: 'p1', name: 'Alice', isActive: true },
  { id: 'p2', name: 'Bob', isActive: true },
])

if (result.isSuccess) {
  const state = result.value
  console.log('Game started:', state.gameId)
}
```

### Executing Actions

```typescript
const state = result.value

// Get available actions
const actions = engine.getAvailableActions(state, 'p1')
console.log('Available:', actions) // ['draw_card']

// Execute action
const actionResult = engine.executeAction(state, {
  type: 'draw_card',
  playerId: 'p1',
  payload: {},
  timestamp: new Date(),
})

if (actionResult.isSuccess) {
  const newState = actionResult.value.newState
  const events = actionResult.value.events
  // Process events for SSE/notifications
}
```

### Player View (Hidden Information)

```typescript
// Get what a specific player can see
const playerView = engine.getPlayerView(state, 'p1')
console.log('My hand:', playerView.state.players.find(p => p.id === 'p1').hand)
console.log('Is my turn:', playerView.isMyTurn)
```

### State Machine

```typescript
import { createStateMachine, GamePhases } from '@tyfo.dev/game-engine/state-machine'

interface GameContext {
  round: number
  currentPlayer: string
}

const machine = createStateMachine<GameContext, { playerId: string }>()
  .initial(GamePhases.WAITING_FOR_PLAYERS)
  .state(GamePhases.WAITING_FOR_PLAYERS)
  .state(GamePhases.PLAYER_TURN, {
    onEnter: (ctx) => console.log(`${ctx.currentPlayer}'s turn`),
  })
  .state(GamePhases.ACTION_RESOLUTION)
  .finalState(GamePhases.GAME_OVER)
  .transition(GamePhases.WAITING_FOR_PLAYERS, GamePhases.PLAYER_TURN, 'start')
  .transition(GamePhases.PLAYER_TURN, GamePhases.ACTION_RESOLUTION, 'action')
  .transition(GamePhases.ACTION_RESOLUTION, GamePhases.PLAYER_TURN, 'next_turn')
  .transition(GamePhases.ACTION_RESOLUTION, GamePhases.GAME_OVER, 'game_end')
  .build({ round: 1, currentPlayer: 'p1' })

// Subscribe to state changes
machine.subscribe((from, to, event, ctx) => {
  console.log(`Transition: ${from} -> ${to} via ${event}`)
})

// Send events
await machine.send('start')
console.log(machine.currentState) // 'player_turn'
```

### Custom Rules

```typescript
import { BaseRule, createRuleEngine } from '@tyfo.dev/game-engine/core'

class MaxHandSizeRule extends BaseRule {
  id = 'max-hand-size'
  description = 'Players cannot have more than 7 cards'
  priority = 10

  appliesTo(action) {
    return action.type === 'draw_card'
  }

  validate(state, action) {
    const player = state.players.find(p => p.id === action.playerId)
    if (player.hand.length >= 7) {
      return this.fail('Hand is full')
    }
    return this.success()
  }
}

const ruleEngine = createRuleEngine()
ruleEngine.addRule(new MaxHandSizeRule())

const result = ruleEngine.validate(state, action)
if (result.isFailure) {
  console.log('Rule violations:', result.error)
}
```

### Implementing a Custom Game

```typescript
import { BaseGameEngine } from '@tyfo.dev/game-engine/core'
import type { IGameState, IAction, IGameMetadata } from '@tyfo.dev/game-engine/core'

interface MyGameState extends IGameState {
  // Custom state
}

interface MyAction extends IAction {
  // Custom actions
}

class MyGameEngine extends BaseGameEngine<MyGameState, MyAction> {
  readonly metadata: IGameMetadata = {
    gameType: 'my-game',
    version: '1.0.0',
    description: 'My custom game',
    minPlayers: 2,
    maxPlayers: 6,
    estimatedDuration: '30 minutes',
    complexity: 'medium',
  }

  initialize(players, config) {
    // Create initial state
  }

  protected validateActionSpecific(state, action) {
    // Game-specific validation
  }

  executeAction(state, action) {
    // Execute and return new state + events
  }

  getAvailableActions(state, playerId) {
    // Return available action types
  }

  protected filterStateForPlayer(state, playerId) {
    // Hide information from other players
  }
}
```

## API Reference

### Core

- `IGameEngine<TState, TAction>` - Main game engine interface
- `BaseGameEngine` - Abstract base class with common functionality
- `IGameState` - Base game state interface
- `IAction` - Base action interface
- `IPlayerView` - What a player can see

### State Machine

- `IStateMachine<TContext, TEvent>` - State machine interface
- `StateMachine` - Default implementation
- `StateMachineBuilder` - Fluent builder
- `GamePhases` - Common game phase constants

### Rules

- `IRule` - Rule interface
- `IRuleEngine` - Rule engine interface
- `BaseRule` - Abstract base rule
- `CompositeRule` - Combine rules with AND/OR logic
- `RuleViolation` - Rule violation error

### Love Letter

- `LoveLetterEngine` - Complete game implementation
- `CardTypes` - Card type constants
- `Cards` - Card definitions with effects
- `ILoveLetterState` - Game state
- `ILoveLetterAction` - Game actions

## License

MIT
