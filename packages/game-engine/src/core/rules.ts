import type { Result } from '@tyfo.dev/events'
import type { IGameState, IAction } from './types.js'

/**
 * Rule interface - a single game rule that can validate actions
 */
export interface IRule<
  TState extends IGameState = IGameState,
  TAction extends IAction = IAction,
> {
  /** Rule identifier */
  readonly id: string
  /** Human-readable description */
  readonly description: string
  /** Priority for rule ordering (lower = checked first) */
  readonly priority: number

  /**
   * Check if this rule applies to the given action
   */
  appliesTo(action: TAction): boolean

  /**
   * Validate the action against this rule
   */
  validate(state: TState, action: TAction): Result<void, RuleViolation>
}

/**
 * Rule violation - when a rule is broken
 */
export class RuleViolation extends Error {
  constructor(
    public readonly ruleId: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'RuleViolation'
  }
}

/**
 * Rule engine - validates actions against a set of rules
 */
export interface IRuleEngine<
  TState extends IGameState = IGameState,
  TAction extends IAction = IAction,
> {
  /**
   * Add a rule to the engine
   */
  addRule(rule: IRule<TState, TAction>): void

  /**
   * Remove a rule by ID
   */
  removeRule(ruleId: string): void

  /**
   * Validate an action against all applicable rules
   */
  validate(state: TState, action: TAction): Result<void, RuleViolation[]>

  /**
   * Get all rules
   */
  getRules(): IRule<TState, TAction>[]
}

/**
 * Default rule engine implementation
 */
export class RuleEngine<
  TState extends IGameState = IGameState,
  TAction extends IAction = IAction,
> implements IRuleEngine<TState, TAction>
{
  private rules: Map<string, IRule<TState, TAction>> = new Map()

  addRule(rule: IRule<TState, TAction>): void {
    this.rules.set(rule.id, rule)
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId)
  }

  validate(state: TState, action: TAction): Result<void, RuleViolation[]> {
    const violations: RuleViolation[] = []

    // Get applicable rules sorted by priority
    const applicableRules = Array.from(this.rules.values())
      .filter((rule) => rule.appliesTo(action))
      .sort((a, b) => a.priority - b.priority)

    for (const rule of applicableRules) {
      const result = rule.validate(state, action)
      if (result.isFailure) {
        violations.push(result.error)
      }
    }

    if (violations.length > 0) {
      return {
        isSuccess: false,
        isFailure: true,
        error: violations,
      } as Result<void, RuleViolation[]>
    }

    return {
      isSuccess: true,
      isFailure: false,
      value: undefined,
    } as Result<void, RuleViolation[]>
  }

  getRules(): IRule<TState, TAction>[] {
    return Array.from(this.rules.values())
  }
}

/**
 * Abstract base rule with common functionality
 */
export abstract class BaseRule<
  TState extends IGameState = IGameState,
  TAction extends IAction = IAction,
> implements IRule<TState, TAction>
{
  abstract readonly id: string
  abstract readonly description: string
  readonly priority: number = 100

  abstract appliesTo(action: TAction): boolean
  abstract validate(state: TState, action: TAction): Result<void, RuleViolation>

  protected violation(message: string, details?: Record<string, unknown>): RuleViolation {
    return new RuleViolation(this.id, message, details)
  }

  protected success(): Result<void, RuleViolation> {
    return {
      isSuccess: true,
      isFailure: false,
      value: undefined,
    } as Result<void, RuleViolation>
  }

  protected fail(message: string, details?: Record<string, unknown>): Result<void, RuleViolation> {
    return {
      isSuccess: false,
      isFailure: true,
      error: this.violation(message, details),
    } as Result<void, RuleViolation>
  }
}

/**
 * Composite rule - combines multiple rules with AND/OR logic
 */
export class CompositeRule<
  TState extends IGameState = IGameState,
  TAction extends IAction = IAction,
> extends BaseRule<TState, TAction>
{
  constructor(
    public readonly id: string,
    public readonly description: string,
    private readonly rules: IRule<TState, TAction>[],
    private readonly mode: 'all' | 'any' = 'all'
  ) {
    super()
  }

  appliesTo(action: TAction): boolean {
    return this.rules.some((rule) => rule.appliesTo(action))
  }

  validate(state: TState, action: TAction): Result<void, RuleViolation> {
    const violations: RuleViolation[] = []

    for (const rule of this.rules) {
      if (!rule.appliesTo(action)) continue

      const result = rule.validate(state, action)

      if (this.mode === 'all') {
        if (result.isFailure) {
          return {
            isSuccess: false,
            isFailure: true,
            error: result.error,
          } as Result<void, RuleViolation>
        }
      } else {
        // mode === 'any'
        if (result.isSuccess) {
          return this.success()
        }
        violations.push(result.error)
      }
    }

    if (this.mode === 'any' && violations.length > 0) {
      return {
        isSuccess: false,
        isFailure: true,
        error: violations[0],
      } as Result<void, RuleViolation>
    }

    return this.success()
  }
}

/**
 * Create a new rule engine
 */
export function createRuleEngine<
  TState extends IGameState = IGameState,
  TAction extends IAction = IAction,
>(): IRuleEngine<TState, TAction> {
  return new RuleEngine<TState, TAction>()
}
