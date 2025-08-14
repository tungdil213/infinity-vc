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

export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStateTransitionError'
  }
}
