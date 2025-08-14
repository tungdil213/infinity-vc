import { LobbyStatus } from '../value_objects/lobby_status.js'
import { LobbyEvent } from '../events/lobby_events.js'
import { StateMachine, StateTransition, InvalidStateTransitionError } from './state_machine.js'

// Re-export LobbyEvent for convenience
export { LobbyEvent }

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
      guard: () => this.playerCount + 1 >= 2 && this.playerCount + 1 < this.maxPlayers,
    },
    {
      from: LobbyStatus.OPEN,
      to: LobbyStatus.FULL,
      event: LobbyEvent.PLAYER_JOINED,
      guard: () => this.playerCount + 1 === this.maxPlayers,
    },
    {
      from: LobbyStatus.OPEN,
      to: LobbyStatus.OPEN,
      event: LobbyEvent.PLAYER_LEFT,
      guard: () => this.playerCount - 1 === 0,
    },

    // Depuis WAITING
    {
      from: LobbyStatus.WAITING,
      to: LobbyStatus.OPEN,
      event: LobbyEvent.PLAYER_LEFT,
      guard: () => this.playerCount - 1 === 1,
    },
    {
      from: LobbyStatus.WAITING,
      to: LobbyStatus.WAITING,
      event: LobbyEvent.PLAYER_JOINED,
      guard: () => this.playerCount + 1 >= 2 && this.playerCount + 1 < this.maxPlayers,
    },
    {
      from: LobbyStatus.WAITING,
      to: LobbyStatus.FULL,
      event: LobbyEvent.PLAYER_JOINED,
      guard: () => this.playerCount + 1 === this.maxPlayers,
    },
    {
      from: LobbyStatus.WAITING,
      to: LobbyStatus.READY,
      event: LobbyEvent.READY_SET,
    },

    // Depuis READY
    {
      from: LobbyStatus.READY,
      to: LobbyStatus.WAITING,
      event: LobbyEvent.PLAYER_LEFT,
      guard: () => this.playerCount - 1 < 2,
    },
    {
      from: LobbyStatus.READY,
      to: LobbyStatus.FULL,
      event: LobbyEvent.PLAYER_JOINED,
      guard: () => this.playerCount + 1 === this.maxPlayers,
    },
    {
      from: LobbyStatus.READY,
      to: LobbyStatus.STARTING,
      event: LobbyEvent.GAME_STARTED,
    },

    // Depuis FULL
    {
      from: LobbyStatus.FULL,
      to: LobbyStatus.READY,
      event: LobbyEvent.PLAYER_LEFT,
      guard: () => this.playerCount - 1 < this.maxPlayers,
    },
    {
      from: LobbyStatus.FULL,
      to: LobbyStatus.STARTING,
      event: LobbyEvent.GAME_STARTED,
    },
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
      .filter((t) => t.from === this.currentState)
      .filter((t) => !t.guard || t.guard())
      .map((t) => t.event)
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
    return (
      this.transitions.find(
        (t) => t.from === this.currentState && t.event === event && (!t.guard || t.guard())
      ) || null
    )
  }

  private logTransition(from: LobbyStatus, to: LobbyStatus, event: LobbyEvent): void {
    console.log(`State transition: ${from} --[${event}]--> ${to} (players: ${this.playerCount})`)
  }
}
