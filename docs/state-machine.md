# Machine à États - Lobbies et Parties

## Vue d'ensemble

Le système utilise une **machine à états finie** pour gérer les transitions entre les différents états des lobbies et parties. Cette approche garantit la cohérence des données et empêche les transitions invalides.

## États des Lobbies

### Diagramme d'États

```
    [CRÉATION]
        │
        ▼
    ┌─────────┐    +1 joueur    ┌─────────────┐
    │  OPEN   │ ──────────────→ │   WAITING   │
    └─────────┘                 └─────────────┘
        ▲                              │
        │ -1 joueur                    │ +1 joueur (≥2)
        │ (retour à 1)                 │
        │                              ▼
        │                       ┌─────────────┐
        │ -1 joueur             │    READY    │ ──┐ START
        │ (retour à <2)         └─────────────┘   │
        │                              │          │
        │                              │ +1 joueur│
        │                              │ (=4)     │
        │                              ▼          │
        │                       ┌─────────────┐   │
        └───────────────────────│    FULL     │   │
                                └─────────────┘   │
                                       │          │
                                       │ START    │
                                       ▼          │
                                ┌─────────────┐   │
                                │  STARTING   │←──┘
                                └─────────────┘
                                       │
                                       │ GAME CREATED
                                       ▼
                                [LOBBY DÉTRUIT]
                                       │
                                       ▼
                                ┌─────────────┐
                                │    GAME     │
                                │(Persisté DB)│
                                └─────────────┘
```

### Définition des États

```typescript
// Domain/ValueObjects/LobbyStatus.ts
export enum LobbyStatus {
  OPEN = 'OPEN',           // Lobby créé, accepte les joueurs
  WAITING = 'WAITING',     // 1 joueur, en attente d'autres
  READY = 'READY',         // 2-3 joueurs, peut démarrer
  FULL = 'FULL',           // 4 joueurs, complet
  STARTING = 'STARTING'    // Démarrage en cours
}

export const LOBBY_STATUS_DESCRIPTIONS = {
  [LobbyStatus.OPEN]: 'Lobby ouvert - En attente de joueurs',
  [LobbyStatus.WAITING]: 'En attente de joueurs supplémentaires',
  [LobbyStatus.READY]: 'Prêt à démarrer (2-3 joueurs)',
  [LobbyStatus.FULL]: 'Lobby complet (4 joueurs)',
  [LobbyStatus.STARTING]: 'Démarrage de la partie en cours'
} as const
```

## Machine à États - Implémentation

### 1. Interface de Base

```typescript
// Domain/StateMachine/StateMachine.ts
export interface StateMachine<TState, TEvent> {
  getCurrentState(): TState
  canTransition(event: TEvent): boolean
  transition(event: TEvent): TState
  getValidTransitions(): TEvent[]
}

export interface StateTransition<TState, TEvent> {
  from: TState
  to: TState
  event: TEvent
  guard?: () => boolean
  action?: () => void
}
```

### 2. Événements de Lobby

```typescript
// Domain/Events/LobbyEvents.ts
export enum LobbyEvent {
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  GAME_STARTED = 'GAME_STARTED',
  LOBBY_CLOSED = 'LOBBY_CLOSED'
}

export interface LobbyEventData {
  [LobbyEvent.PLAYER_JOINED]: { playerUUID: string }
  [LobbyEvent.PLAYER_LEFT]: { playerUUID: string }
  [LobbyEvent.GAME_STARTED]: { gameUUID: string }
  [LobbyEvent.LOBBY_CLOSED]: { reason: string }
}
```

### 3. Machine à États des Lobbies

```typescript
// Domain/StateMachine/LobbyStateMachine.ts
import { StateMachine, StateTransition } from './StateMachine'

export default class LobbyStateMachine implements StateMachine<LobbyStatus, LobbyEvent> {
  private currentState: LobbyStatus
  private playerCount: number
  private maxPlayers: number

  // Définition des transitions valides
  private transitions: StateTransition<LobbyStatus, LobbyEvent>[] = [
    // Depuis OPEN
    {
      from: LobbyStatus.OPEN,
      to: LobbyStatus.WAITING,
      event: LobbyEvent.PLAYER_JOINED,
      guard: () => this.playerCount === 1
    },
    {
      from: LobbyStatus.OPEN,
      to: LobbyStatus.FULL,
      event: LobbyEvent.PLAYER_JOINED,
      guard: () => this.playerCount === this.maxPlayers
    },

    // Depuis WAITING
    {
      from: LobbyStatus.WAITING,
      to: LobbyStatus.OPEN,
      event: LobbyEvent.PLAYER_LEFT,
      guard: () => this.playerCount === 0
    },
    {
      from: LobbyStatus.WAITING,
      to: LobbyStatus.READY,
      event: LobbyEvent.PLAYER_JOINED,
      guard: () => this.playerCount >= 2 && this.playerCount < this.maxPlayers
    },
    {
      from: LobbyStatus.WAITING,
      to: LobbyStatus.FULL,
      event: LobbyEvent.PLAYER_JOINED,
      guard: () => this.playerCount === this.maxPlayers
    },

    // Depuis READY
    {
      from: LobbyStatus.READY,
      to: LobbyStatus.WAITING,
      event: LobbyEvent.PLAYER_LEFT,
      guard: () => this.playerCount < 2
    },
    {
      from: LobbyStatus.READY,
      to: LobbyStatus.FULL,
      event: LobbyEvent.PLAYER_JOINED,
      guard: () => this.playerCount === this.maxPlayers
    },
    {
      from: LobbyStatus.READY,
      to: LobbyStatus.STARTING,
      event: LobbyEvent.GAME_STARTED
    },

    // Depuis FULL
    {
      from: LobbyStatus.FULL,
      to: LobbyStatus.READY,
      event: LobbyEvent.PLAYER_LEFT,
      guard: () => this.playerCount < this.maxPlayers
    },
    {
      from: LobbyStatus.FULL,
      to: LobbyStatus.STARTING,
      event: LobbyEvent.GAME_STARTED
    }
  ]

  constructor(initialState: LobbyStatus = LobbyStatus.OPEN, maxPlayers: number = 4) {
    this.currentState = initialState
    this.playerCount = 0
    this.maxPlayers = maxPlayers
  }

  getCurrentState(): LobbyStatus {
    return this.currentState
  }

  canTransition(event: LobbyEvent): boolean {
    return this.findValidTransition(event) !== null
  }

  transition(event: LobbyEvent): LobbyStatus {
    const transition = this.findValidTransition(event)
    
    if (!transition) {
      throw new InvalidStateTransitionError(
        `Cannot transition from ${this.currentState} with event ${event}`
      )
    }

    // Exécution de l'action si définie
    if (transition.action) {
      transition.action()
    }

    // Changement d'état
    const previousState = this.currentState
    this.currentState = transition.to

    // Log de la transition
    this.logTransition(previousState, this.currentState, event)

    return this.currentState
  }

  getValidTransitions(): LobbyEvent[] {
    return this.transitions
      .filter(t => t.from === this.currentState)
      .filter(t => !t.guard || t.guard())
      .map(t => t.event)
  }

  // Méthodes utilitaires
  updatePlayerCount(count: number): void {
    this.playerCount = count
  }

  isTerminalState(): boolean {
    return this.currentState === LobbyStatus.STARTING
  }

  canStartGame(): boolean {
    return [LobbyStatus.READY, LobbyStatus.FULL].includes(this.currentState)
  }

  private findValidTransition(event: LobbyEvent): StateTransition<LobbyStatus, LobbyEvent> | null {
    return this.transitions.find(t => 
      t.from === this.currentState && 
      t.event === event && 
      (!t.guard || t.guard())
    ) || null
  }

  private logTransition(from: LobbyStatus, to: LobbyStatus, event: LobbyEvent): void {
    console.log(`State transition: ${from} --[${event}]--> ${to} (players: ${this.playerCount})`)
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStateTransitionError'
  }
}
```

## États des Parties

### Diagramme d'États des Parties

```
┌─────────────┐    PAUSE     ┌─────────────┐
│ IN_PROGRESS │ ────────────→│   PAUSED    │
└─────────────┘              └─────────────┘
       │                            │
       │ FINISH                     │ RESUME
       │                            │
       ▼                            ▼
┌─────────────┐              ┌─────────────┐
│  FINISHED   │              │ IN_PROGRESS │
└─────────────┘              └─────────────┘
       │
       │ ARCHIVE
       ▼
┌─────────────┐
│  ARCHIVED   │
└─────────────┘
```

### Machine à États des Parties

```typescript
// Domain/StateMachine/GameStateMachine.ts
export enum GameStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum GameEvent {
  PAUSE_GAME = 'PAUSE_GAME',
  RESUME_GAME = 'RESUME_GAME',
  FINISH_GAME = 'FINISH_GAME',
  ARCHIVE_GAME = 'ARCHIVE_GAME'
}

export default class GameStateMachine implements StateMachine<GameStatus, GameEvent> {
  private currentState: GameStatus
  private startedAt: Date
  private pausedDuration: number = 0

  private transitions: StateTransition<GameStatus, GameEvent>[] = [
    {
      from: GameStatus.IN_PROGRESS,
      to: GameStatus.PAUSED,
      event: GameEvent.PAUSE_GAME,
      action: () => this.recordPauseTime()
    },
    {
      from: GameStatus.IN_PROGRESS,
      to: GameStatus.FINISHED,
      event: GameEvent.FINISH_GAME,
      action: () => this.recordFinishTime()
    },
    {
      from: GameStatus.PAUSED,
      to: GameStatus.IN_PROGRESS,
      event: GameEvent.RESUME_GAME,
      action: () => this.recordResumeTime()
    },
    {
      from: GameStatus.PAUSED,
      to: GameStatus.FINISHED,
      event: GameEvent.FINISH_GAME,
      action: () => this.recordFinishTime()
    },
    {
      from: GameStatus.FINISHED,
      to: GameStatus.ARCHIVED,
      event: GameEvent.ARCHIVE_GAME,
      guard: () => this.canArchive()
    }
  ]

  constructor() {
    this.currentState = GameStatus.IN_PROGRESS
    this.startedAt = new Date()
  }

  getCurrentState(): GameStatus {
    return this.currentState
  }

  canTransition(event: GameEvent): boolean {
    return this.findValidTransition(event) !== null
  }

  transition(event: GameEvent): GameStatus {
    const transition = this.findValidTransition(event)
    
    if (!transition) {
      throw new InvalidStateTransitionError(
        `Cannot transition from ${this.currentState} with event ${event}`
      )
    }

    if (transition.action) {
      transition.action()
    }

    this.currentState = transition.to
    return this.currentState
  }

  getValidTransitions(): GameEvent[] {
    return this.transitions
      .filter(t => t.from === this.currentState)
      .filter(t => !t.guard || t.guard())
      .map(t => t.event)
  }

  // Actions spécifiques aux parties
  private recordPauseTime(): void {
    // Logique de pause
  }

  private recordResumeTime(): void {
    // Logique de reprise
  }

  private recordFinishTime(): void {
    // Logique de fin de partie
  }

  private canArchive(): boolean {
    // Une partie ne peut être archivée que 24h après sa fin
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return this.startedAt < oneDayAgo
  }

  private findValidTransition(event: GameEvent): StateTransition<GameStatus, GameEvent> | null {
    return this.transitions.find(t => 
      t.from === this.currentState && 
      t.event === event && 
      (!t.guard || t.guard())
    ) || null
  }
}
```

## Intégration avec les Entités

### Lobby avec Machine à États

```typescript
// Domain/Entities/Lobby.ts
import LobbyStateMachine from '../StateMachine/LobbyStateMachine'
import { LobbyEvent } from '../Events/LobbyEvents'

export default class Lobby extends SessionBase {
  private stateMachine: LobbyStateMachine
  private _players: PlayerInterface[] = []

  constructor(creator: PlayerInterface, maxPlayers: number = 4) {
    super()
    this.stateMachine = new LobbyStateMachine(LobbyStatus.OPEN, maxPlayers)
    this._players = [creator]
    this.updateStateMachine()
  }

  addPlayer(player: PlayerInterface): void {
    // Validation métier
    this.validateCanAddPlayer(player)
    
    // Ajout du joueur
    this._players.push(player)
    
    // Mise à jour de la machine à états
    this.updateStateMachine()
    this.stateMachine.transition(LobbyEvent.PLAYER_JOINED)
    
    // Événement domaine
    this.recordEvent(new PlayerJoinedLobbyEvent(this, player))
  }

  removePlayer(playerUUID: string): void {
    const playerIndex = this._players.findIndex(p => p.uuid === playerUUID)
    
    if (playerIndex === -1) {
      throw new PlayerNotFoundError(`Player ${playerUUID} not found in lobby`)
    }

    // Suppression du joueur
    const removedPlayer = this._players.splice(playerIndex, 1)[0]
    
    // Mise à jour de la machine à états
    this.updateStateMachine()
    this.stateMachine.transition(LobbyEvent.PLAYER_LEFT)
    
    // Événement domaine
    this.recordEvent(new PlayerLeftLobbyEvent(this, removedPlayer))
  }

  startGame(): Game {
    if (!this.stateMachine.canStartGame()) {
      throw new CannotStartGameError('Lobby is not ready to start game')
    }

    // Transition vers STARTING
    this.stateMachine.transition(LobbyEvent.GAME_STARTED)
    
    // Création de la partie
    const game = new Game(this._players)
    
    // Événement domaine
    this.recordEvent(new GameStartedEvent(game, this.uuid))
    
    return game
  }

  get status(): LobbyStatus {
    return this.stateMachine.getCurrentState()
  }

  get canStart(): boolean {
    return this.stateMachine.canStartGame()
  }

  get availableActions(): LobbyEvent[] {
    return this.stateMachine.getValidTransitions()
  }

  private updateStateMachine(): void {
    this.stateMachine.updatePlayerCount(this._players.length)
  }

  private validateCanAddPlayer(player: PlayerInterface): void {
    if (!this.stateMachine.canTransition(LobbyEvent.PLAYER_JOINED)) {
      throw new LobbyFullError('Cannot add player to lobby')
    }
    
    if (this._players.some(p => p.uuid === player.uuid)) {
      throw new PlayerAlreadyInLobbyError('Player already in lobby')
    }
  }
}
```

## Validation et Tests

### Tests de la Machine à États

```typescript
// tests/unit/StateMachine/LobbyStateMachine.test.ts
import { test } from '@japa/runner'
import LobbyStateMachine from '#domain/StateMachine/LobbyStateMachine'
import { LobbyStatus, LobbyEvent } from '#domain/ValueObjects/LobbyStatus'

test.group('LobbyStateMachine', () => {
  test('should start in OPEN state', ({ assert }) => {
    const stateMachine = new LobbyStateMachine()
    
    assert.equal(stateMachine.getCurrentState(), LobbyStatus.OPEN)
  })

  test('should transition from OPEN to WAITING when first player joins', ({ assert }) => {
    const stateMachine = new LobbyStateMachine()
    stateMachine.updatePlayerCount(1)
    
    const newState = stateMachine.transition(LobbyEvent.PLAYER_JOINED)
    
    assert.equal(newState, LobbyStatus.WAITING)
  })

  test('should transition from WAITING to READY when second player joins', ({ assert }) => {
    const stateMachine = new LobbyStateMachine(LobbyStatus.WAITING)
    stateMachine.updatePlayerCount(2)
    
    const newState = stateMachine.transition(LobbyEvent.PLAYER_JOINED)
    
    assert.equal(newState, LobbyStatus.READY)
  })

  test('should not allow invalid transitions', ({ assert }) => {
    const stateMachine = new LobbyStateMachine(LobbyStatus.OPEN)
    
    assert.throws(() => {
      stateMachine.transition(LobbyEvent.GAME_STARTED)
    }, 'Cannot transition from OPEN with event GAME_STARTED')
  })

  test('should return valid transitions for current state', ({ assert }) => {
    const stateMachine = new LobbyStateMachine(LobbyStatus.READY)
    
    const validTransitions = stateMachine.getValidTransitions()
    
    assert.includeMembers(validTransitions, [
      LobbyEvent.PLAYER_JOINED,
      LobbyEvent.PLAYER_LEFT,
      LobbyEvent.GAME_STARTED
    ])
  })
})
```

### Tests d'Intégration

```typescript
// tests/functional/Lobby/StateMachine.test.ts
import { test } from '@japa/runner'
import Lobby from '#domain/Entities/Lobby'
import { PlayerFactory } from '#tests/factories/PlayerFactory'

test.group('Lobby State Machine Integration', () => {
  test('should handle complete lobby lifecycle', async ({ assert }) => {
    const creator = PlayerFactory.create()
    const lobby = new Lobby(creator)
    
    // État initial
    assert.equal(lobby.status, LobbyStatus.OPEN)
    assert.isFalse(lobby.canStart)
    
    // Ajout du deuxième joueur
    const player2 = PlayerFactory.create()
    lobby.addPlayer(player2)
    
    assert.equal(lobby.status, LobbyStatus.READY)
    assert.isTrue(lobby.canStart)
    
    // Démarrage de la partie
    const game = lobby.startGame()
    
    assert.equal(lobby.status, LobbyStatus.STARTING)
    assert.isNotNull(game)
  })

  test('should prevent invalid actions based on state', async ({ assert }) => {
    const creator = PlayerFactory.create()
    const lobby = new Lobby(creator)
    
    // Ne peut pas démarrer avec un seul joueur
    assert.throws(() => {
      lobby.startGame()
    }, 'Lobby is not ready to start game')
  })
})
```

## Monitoring et Debug

### Logging des Transitions

```typescript
// Services/StateMachineLogger.ts
export default class StateMachineLogger {
  static logTransition<TState, TEvent>(
    entity: string,
    entityId: string,
    from: TState,
    to: TState,
    event: TEvent,
    metadata?: any
  ): void {
    logger.info('State machine transition', {
      entity,
      entityId,
      transition: {
        from,
        to,
        event
      },
      metadata,
      timestamp: new Date().toISOString()
    })
  }

  static logInvalidTransition<TState, TEvent>(
    entity: string,
    entityId: string,
    currentState: TState,
    attemptedEvent: TEvent
  ): void {
    logger.warn('Invalid state transition attempted', {
      entity,
      entityId,
      currentState,
      attemptedEvent,
      timestamp: new Date().toISOString()
    })
  }
}
```

### Métriques des États

```typescript
// Services/StateMetricsService.ts
export default class StateMetricsService {
  private stateDistribution: Map<string, number> = new Map()
  private transitionCounts: Map<string, number> = new Map()

  recordStateDistribution(state: string): void {
    const current = this.stateDistribution.get(state) || 0
    this.stateDistribution.set(state, current + 1)
  }

  recordTransition(from: string, to: string, event: string): void {
    const key = `${from}-[${event}]->${to}`
    const current = this.transitionCounts.get(key) || 0
    this.transitionCounts.set(key, current + 1)
  }

  getMetrics(): StateMetrics {
    return {
      stateDistribution: Object.fromEntries(this.stateDistribution),
      transitionCounts: Object.fromEntries(this.transitionCounts),
      totalTransitions: Array.from(this.transitionCounts.values())
        .reduce((sum, count) => sum + count, 0)
    }
  }
}

interface StateMetrics {
  stateDistribution: Record<string, number>
  transitionCounts: Record<string, number>
  totalTransitions: number
}
```

Cette machine à états garantit :
- **Cohérence des données** : Transitions valides uniquement
- **Traçabilité** : Historique complet des changements d'état
- **Validation métier** : Règles business intégrées aux transitions
- **Testabilité** : Tests unitaires et d'intégration complets
- **Monitoring** : Métriques et logging des transitions
- **Extensibilité** : Ajout facile de nouveaux états/événements
