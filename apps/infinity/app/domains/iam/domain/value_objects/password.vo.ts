import { BaseValueObject } from '#shared_kernel/domain/base_value_object'
import { Result } from '#shared_kernel/domain/result'
import hash from '@adonisjs/core/services/hash'

interface PasswordProps {
  hashedValue: string
}

export class Password extends BaseValueObject<PasswordProps> {
  private constructor(props: PasswordProps) {
    super(props)
  }

  get value(): string {
    return this.props.hashedValue
  }

  public static async create(plainPassword: string): Promise<Result<Password>> {
    if (!plainPassword || plainPassword.trim().length === 0) {
      return Result.fail('Password cannot be empty')
    }

    if (!this.meetsRequirements(plainPassword)) {
      return Result.fail('Password must be at least 8 characters long')
    }

    const hashedValue = await hash.make(plainPassword)
    return Result.ok(new Password({ hashedValue }))
  }

  public static createFromHashed(hashedValue: string): Password {
    return new Password({ hashedValue })
  }

  public async verify(plainPassword: string): Promise<boolean> {
    return await hash.verify(this.props.hashedValue, plainPassword)
  }

  private static meetsRequirements(password: string): boolean {
    return password.length >= 8
  }
}
