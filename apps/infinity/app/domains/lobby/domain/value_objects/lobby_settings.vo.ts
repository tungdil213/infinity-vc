import { BaseValueObject } from '#shared_kernel/domain/base_value_object'
import { Result } from '#shared_kernel/domain/result'

interface LobbySettingsProps {
  name: string
  maxPlayers: number
  minPlayers: number
  isPrivate: boolean
  gameType: string
}

export class LobbySettings extends BaseValueObject<LobbySettingsProps> {
  private constructor(props: LobbySettingsProps) {
    super(props)
  }

  get name(): string {
    return this.props.name
  }

  get maxPlayers(): number {
    return this.props.maxPlayers
  }

  get minPlayers(): number {
    return this.props.minPlayers
  }

  get isPrivate(): boolean {
    return this.props.isPrivate
  }

  get gameType(): string {
    return this.props.gameType
  }

  public static create(props: LobbySettingsProps): Result<LobbySettings> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Lobby name cannot be empty')
    }

    if (props.maxPlayers < 2 || props.maxPlayers > 10) {
      return Result.fail('Max players must be between 2 and 10')
    }

    if (props.minPlayers < 2 || props.minPlayers > props.maxPlayers) {
      return Result.fail('Min players must be between 2 and max players')
    }

    if (!props.gameType || props.gameType.trim().length === 0) {
      return Result.fail('Game type cannot be empty')
    }

    return Result.ok(
      new LobbySettings({
        name: props.name.trim(),
        maxPlayers: props.maxPlayers,
        minPlayers: props.minPlayers,
        isPrivate: props.isPrivate,
        gameType: props.gameType,
      })
    )
  }
}
