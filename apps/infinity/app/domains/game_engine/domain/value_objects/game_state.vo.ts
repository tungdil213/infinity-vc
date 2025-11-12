import { BaseValueObject } from '#shared_kernel/domain/base_value_object'
import { Result } from '#shared_kernel/domain/result'

interface GameStateProps {
  data: Record<string, any>
  currentPlayerIndex: number
  turnNumber: number
}

/**
 * Game State Value Object
 * Encapsule l'état du jeu (immutable)
 */
export class GameState extends BaseValueObject<GameStateProps> {
  private constructor(props: GameStateProps) {
    super(props)
  }

  get data(): Record<string, any> {
    return { ...this.props.data }
  }

  get currentPlayerIndex(): number {
    return this.props.currentPlayerIndex
  }

  get turnNumber(): number {
    return this.props.turnNumber
  }

  public static create(props: Partial<GameStateProps> = {}): Result<GameState> {
    return Result.ok(
      new GameState({
        data: props.data || {},
        currentPlayerIndex: props.currentPlayerIndex || 0,
        turnNumber: props.turnNumber || 1,
      })
    )
  }

  public withData(newData: Record<string, any>): GameState {
    return new GameState({
      ...this.props,
      data: { ...this.props.data, ...newData },
    })
  }

  public nextTurn(nextPlayerIndex: number): GameState {
    return new GameState({
      ...this.props,
      currentPlayerIndex: nextPlayerIndex,
      turnNumber: this.props.turnNumber + 1,
    })
  }
}
