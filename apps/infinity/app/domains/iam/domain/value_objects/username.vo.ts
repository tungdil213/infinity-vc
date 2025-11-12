import { BaseValueObject } from '#shared_kernel/domain/base_value_object'
import { Result } from '#shared_kernel/domain/result'

interface UsernameProps {
  value: string
}

export class Username extends BaseValueObject<UsernameProps> {
  private constructor(props: UsernameProps) {
    super(props)
  }

  get value(): string {
    return this.props.value
  }

  public static create(username: string): Result<Username> {
    if (!username || username.trim().length === 0) {
      return Result.fail('Username cannot be empty')
    }

    if (username.length < 3 || username.length > 30) {
      return Result.fail('Username must be between 3 and 30 characters')
    }

    if (!this.isValidUsername(username)) {
      return Result.fail('Username can only contain letters, numbers, underscores and hyphens')
    }

    return Result.ok(new Username({ value: username.trim() }))
  }

  private static isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    return usernameRegex.test(username)
  }
}
