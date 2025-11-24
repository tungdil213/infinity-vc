import { BaseEntity } from '#shared_kernel/domain/base_entity'
import { Result } from '#shared_kernel/domain/result'
import type { GameState } from '../value_objects/game_state.vo.js'
import { GameStatus, GameStatusTransitions } from '../value_objects/game_status.vo.js'

interface GameProps {
  lobbyId: string
  gameType: string
  playerIds: string[]
  state: GameState
  status: GameStatus
  winnerId?: string
}

export class Game extends BaseEntity {
  private props: GameProps

  private constructor(props: GameProps, id?: string) {
    super(id)
    this.props = props
  }

  get lobbyId(): string {
    return this.props.lobbyId
  }

  get gameType(): string {
    return this.props.gameType
  }

  get playerIds(): string[] {
    return [...this.props.playerIds]
  }

  get state(): GameState {
    return this.props.state
  }

  get status(): GameStatus {
    return this.props.status
  }

  get winnerId(): string | undefined {
    return this.props.winnerId
  }

  get currentPlayerId(): string {
    return this.props.playerIds[this.props.state.currentPlayerIndex]
  }

  public static create(props: Omit<GameProps, 'status'>, id?: string): Result<Game> {
    if (!props.lobbyId) {
      return Result.fail('Lobby ID is required')
    }

    if (!props.gameType) {
      return Result.fail('Game type is required')
    }

    if (props.playerIds.length < 2) {
      return Result.fail('At least 2 players required')
    }

    const game = new Game(
      {
        ...props,
        status: GameStatus.CREATED,
      },
      id
    )

    return Result.ok(game)
  }

  public start(): Result<void> {
    const transitionResult = this.changeStatus(GameStatus.IN_PROGRESS)
    if (transitionResult.isFailure) {
      return transitionResult
    }

    this.touch()
    return Result.ok()
  }

  public updateState(newState: GameState): Result<void> {
    if (this.props.status !== GameStatus.IN_PROGRESS) {
      return Result.fail('Can only update state of in-progress game')
    }

    this.props.state = newState
    this.touch()
    return Result.ok()
  }

  public complete(winnerId?: string): Result<void> {
    const transitionResult = this.changeStatus(GameStatus.COMPLETED)
    if (transitionResult.isFailure) {
      return transitionResult
    }

    this.props.winnerId = winnerId
    this.touch()
    return Result.ok()
  }

  public pause(): Result<void> {
    return this.changeStatus(GameStatus.PAUSED)
  }

  public resume(): Result<void> {
    return this.changeStatus(GameStatus.IN_PROGRESS)
  }

  public cancel(): Result<void> {
    return this.changeStatus(GameStatus.CANCELLED)
  }

  private changeStatus(newStatus: GameStatus): Result<void> {
    if (!GameStatusTransitions.canTransition(this.props.status, newStatus)) {
      return Result.fail(`Cannot transition from ${this.props.status} to ${newStatus}`)
    }

    this.props.status = newStatus
    this.touch()
    return Result.ok()
  }
}
