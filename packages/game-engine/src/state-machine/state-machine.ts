/**
 * State machine for game phases and transitions
 */

/**
 * State definition
 */
export interface IState<TContext = unknown> {
  /** Unique state identifier */
  readonly id: string
  /** Optional entry action */
  onEnter?: (context: TContext) => void | Promise<void>
  /** Optional exit action */
  onExit?: (context: TContext) => void | Promise<void>
}

/**
 * Transition definition
 */
export interface ITransition<TContext = unknown, TEvent = unknown> {
  /** Source state ID */
  readonly from: string
  /** Target state ID */
  readonly to: string
  /** Event that triggers this transition */
  readonly event: string
  /** Optional guard condition */
  guard?: (context: TContext, event: TEvent) => boolean
  /** Optional action to execute during transition */
  action?: (context: TContext, event: TEvent) => void | Promise<void>
}

/**
 * State machine configuration
 */
export interface IStateMachineConfig<TContext = unknown, TEvent = unknown> {
  /** Initial state ID */
  initialState: string
  /** All states */
  states: IState<TContext>[]
  /** All transitions */
  transitions: ITransition<TContext, TEvent>[]
  /** Final states (game over states) */
  finalStates?: string[]
}

/**
 * State machine interface
 */
export interface IStateMachine<TContext = unknown, TEvent = unknown> {
  /** Current state ID */
  readonly currentState: string
  /** Current context */
  readonly context: TContext
  /** Whether the machine is in a final state */
  readonly isFinal: boolean

  /**
   * Send an event to the machine
   */
  send(event: string, payload?: TEvent): Promise<boolean>

  /**
   * Check if a transition is possible
   */
  canTransition(event: string, payload?: TEvent): boolean

  /**
   * Get available events from current state
   */
  getAvailableEvents(): string[]

  /**
   * Reset to initial state
   */
  reset(): Promise<void>

  /**
   * Subscribe to state changes
   */
  subscribe(callback: StateChangeCallback<TContext>): () => void
}

/**
 * State change callback
 */
export type StateChangeCallback<TContext = unknown> = (
  from: string,
  to: string,
  event: string,
  context: TContext
) => void

/**
 * State machine implementation
 */
export class StateMachine<TContext = unknown, TEvent = unknown>
  implements IStateMachine<TContext, TEvent>
{
  private _currentState: string
  private _context: TContext
  private readonly states: Map<string, IState<TContext>>
  private readonly transitionsBySource: Map<string, ITransition<TContext, TEvent>[]>
  private readonly finalStates: Set<string>
  private readonly listeners: Set<StateChangeCallback<TContext>>
  private readonly initialState: string

  constructor(
    config: IStateMachineConfig<TContext, TEvent>,
    initialContext: TContext
  ) {
    this.initialState = config.initialState
    this._currentState = config.initialState
    this._context = initialContext
    this.listeners = new Set()
    this.finalStates = new Set(config.finalStates ?? [])

    // Index states
    this.states = new Map()
    for (const state of config.states) {
      this.states.set(state.id, state)
    }

    // Index transitions by source state
    this.transitionsBySource = new Map()
    for (const transition of config.transitions) {
      if (!this.transitionsBySource.has(transition.from)) {
        this.transitionsBySource.set(transition.from, [])
      }
      this.transitionsBySource.get(transition.from)!.push(transition)
    }
  }

  get currentState(): string {
    return this._currentState
  }

  get context(): TContext {
    return this._context
  }

  get isFinal(): boolean {
    return this.finalStates.has(this._currentState)
  }

  async send(event: string, payload?: TEvent): Promise<boolean> {
    const transition = this.findTransition(event, payload)
    if (!transition) {
      return false
    }

    const fromState = this.states.get(this._currentState)
    const toState = this.states.get(transition.to)

    if (!toState) {
      console.error(`Target state ${transition.to} not found`)
      return false
    }

    // Exit current state
    if (fromState?.onExit) {
      await fromState.onExit(this._context)
    }

    // Execute transition action
    if (transition.action) {
      await transition.action(this._context, payload as TEvent)
    }

    const previousState = this._currentState
    this._currentState = transition.to

    // Enter new state
    if (toState.onEnter) {
      await toState.onEnter(this._context)
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(previousState, this._currentState, event, this._context)
    }

    return true
  }

  canTransition(event: string, payload?: TEvent): boolean {
    return this.findTransition(event, payload) !== null
  }

  getAvailableEvents(): string[] {
    const transitions = this.transitionsBySource.get(this._currentState) ?? []
    return [...new Set(transitions.map((t) => t.event))]
  }

  async reset(): Promise<void> {
    const fromState = this.states.get(this._currentState)
    if (fromState?.onExit) {
      await fromState.onExit(this._context)
    }

    const previousState = this._currentState
    this._currentState = this.initialState

    const toState = this.states.get(this._currentState)
    if (toState?.onEnter) {
      await toState.onEnter(this._context)
    }

    for (const listener of this.listeners) {
      listener(previousState, this._currentState, 'reset', this._context)
    }
  }

  subscribe(callback: StateChangeCallback<TContext>): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private findTransition(event: string, payload?: TEvent): ITransition<TContext, TEvent> | null {
    const transitions = this.transitionsBySource.get(this._currentState) ?? []

    for (const transition of transitions) {
      if (transition.event !== event) continue

      if (transition.guard && !transition.guard(this._context, payload as TEvent)) {
        continue
      }

      return transition
    }

    return null
  }

  /**
   * Update context
   */
  updateContext(updater: (context: TContext) => TContext): void {
    this._context = updater(this._context)
  }
}

/**
 * Builder for state machine configuration
 */
export class StateMachineBuilder<TContext = unknown, TEvent = unknown> {
  private config: IStateMachineConfig<TContext, TEvent> = {
    initialState: '',
    states: [],
    transitions: [],
    finalStates: [],
  }

  initial(stateId: string): this {
    this.config.initialState = stateId
    return this
  }

  state(
    id: string,
    options?: {
      onEnter?: (context: TContext) => void | Promise<void>
      onExit?: (context: TContext) => void | Promise<void>
    }
  ): this {
    this.config.states.push({
      id,
      onEnter: options?.onEnter,
      onExit: options?.onExit,
    })
    return this
  }

  finalState(id: string): this {
    this.state(id)
    this.config.finalStates!.push(id)
    return this
  }

  transition(
    from: string,
    to: string,
    event: string,
    options?: {
      guard?: (context: TContext, event: TEvent) => boolean
      action?: (context: TContext, event: TEvent) => void | Promise<void>
    }
  ): this {
    this.config.transitions.push({
      from,
      to,
      event,
      guard: options?.guard,
      action: options?.action,
    })
    return this
  }

  build(initialContext: TContext): StateMachine<TContext, TEvent> {
    if (!this.config.initialState) {
      throw new Error('Initial state not set')
    }
    return new StateMachine(this.config, initialContext)
  }

  getConfig(): IStateMachineConfig<TContext, TEvent> {
    return { ...this.config }
  }
}

/**
 * Create a state machine builder
 */
export function createStateMachine<TContext = unknown, TEvent = unknown>(): StateMachineBuilder<
  TContext,
  TEvent
> {
  return new StateMachineBuilder<TContext, TEvent>()
}

/**
 * Predefined game phases for common patterns
 */
export const GamePhases = {
  SETUP: 'setup',
  WAITING_FOR_PLAYERS: 'waiting_for_players',
  STARTING: 'starting',
  PLAYER_TURN: 'player_turn',
  ACTION_RESOLUTION: 'action_resolution',
  ROUND_END: 'round_end',
  GAME_OVER: 'game_over',
  PAUSED: 'paused',
} as const

export type GamePhase = (typeof GamePhases)[keyof typeof GamePhases]
