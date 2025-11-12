import { BaseEntity } from '#shared_kernel/domain/base_entity'
import { Result } from '#shared_kernel/domain/result'
import type { LobbySettings } from '../value_objects/lobby_settings.vo.js'
import { LobbyStatus, LobbyStatusTransitions } from '../value_objects/lobby_status.vo.js'

interface LobbyProps {
  ownerId: string
  settings: LobbySettings
  status: LobbyStatus
  invitationCode?: string
  currentPlayers: number
  gameId?: string
}

export class Lobby extends BaseEntity {
  private props: LobbyProps

  private constructor(props: LobbyProps, id?: string) {
    super(id)
    this.props = props
  }

  get ownerId(): string {
    return this.props.ownerId
  }

  get settings(): LobbySettings {
    return this.props.settings
  }

  get status(): LobbyStatus {
    return this.props.status
  }

  get invitationCode(): string | undefined {
    return this.props.invitationCode
  }

  get currentPlayers(): number {
    return this.props.currentPlayers
  }

  get gameId(): string | undefined {
    return this.props.gameId
  }

  get isFull(): boolean {
    return this.props.currentPlayers >= this.props.settings.maxPlayers
  }

  get canStart(): boolean {
    return this.props.currentPlayers >= this.props.settings.minPlayers
  }

  public static create(props: Omit<LobbyProps, 'currentPlayers'>, id?: string): Result<Lobby> {
    if (!props.ownerId) {
      return Result.fail('Owner ID is required')
    }

    if (!props.settings) {
      return Result.fail('Settings are required')
    }

    const lobby = new Lobby(
      {
        ...props,
        status: props.status || LobbyStatus.WAITING,
        currentPlayers: 0,
      },
      id
    )

    return Result.ok(lobby)
  }

  public changeStatus(newStatus: LobbyStatus): Result<void> {
    if (!LobbyStatusTransitions.canTransition(this.props.status, newStatus)) {
      return Result.fail(
        `Cannot transition from ${this.props.status} to ${newStatus}`
      )
    }

    this.props.status = newStatus
    this.touch()
    return Result.ok()
  }

  public incrementPlayers(): Result<void> {
    if (this.isFull) {
      return Result.fail('Lobby is full')
    }

    this.props.currentPlayers++
    
    if (this.isFull) {
      this.props.status = LobbyStatus.FULL
    } else if (this.canStart && this.props.status === LobbyStatus.WAITING) {
      this.props.status = LobbyStatus.READY
    }

    this.touch()
    return Result.ok()
  }

  public decrementPlayers(): Result<void> {
    if (this.props.currentPlayers === 0) {
      return Result.fail('No players to remove')
    }

    this.props.currentPlayers--

    if (this.props.status === LobbyStatus.FULL) {
      this.props.status = LobbyStatus.READY
    } else if (!this.canStart && this.props.status === LobbyStatus.READY) {
      this.props.status = LobbyStatus.WAITING
    }

    this.touch()
    return Result.ok()
  }

  public startGame(gameId: string): Result<void> {
    if (!this.canStart) {
      return Result.fail('Not enough players to start game')
    }

    const statusResult = this.changeStatus(LobbyStatus.STARTING)
    if (statusResult.isFailure) {
      return statusResult
    }

    this.props.gameId = gameId
    this.touch()
    return Result.ok()
  }
}
