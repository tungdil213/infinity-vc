import { BaseEntity } from '#shared_kernel/domain/base_entity'
import { Result } from '#shared_kernel/domain/result'

interface PlayerProps {
  userId: string
  username: string
  lobbyId: string
  isReady: boolean
  isOwner: boolean
  joinedAt: Date
}

export class Player extends BaseEntity {
  private props: PlayerProps

  private constructor(props: PlayerProps, id?: string) {
    super(id)
    this.props = props
  }

  get userId(): string {
    return this.props.userId
  }

  get username(): string {
    return this.props.username
  }

  get lobbyId(): string {
    return this.props.lobbyId
  }

  get isReady(): boolean {
    return this.props.isReady
  }

  get isOwner(): boolean {
    return this.props.isOwner
  }

  get joinedAt(): Date {
    return this.props.joinedAt
  }

  public static create(
    props: Omit<PlayerProps, 'joinedAt' | 'isReady'>,
    id?: string
  ): Result<Player> {
    if (!props.userId) {
      return Result.fail('User ID is required')
    }

    if (!props.username) {
      return Result.fail('Username is required')
    }

    if (!props.lobbyId) {
      return Result.fail('Lobby ID is required')
    }

    const player = new Player(
      {
        ...props,
        isReady: false,
        joinedAt: new Date(),
      },
      id
    )

    return Result.ok(player)
  }

  public toggleReady(): Result<void> {
    this.props.isReady = !this.props.isReady
    this.touch()
    return Result.ok()
  }

  public setReady(ready: boolean): Result<void> {
    this.props.isReady = ready
    this.touch()
    return Result.ok()
  }
}
