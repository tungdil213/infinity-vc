import { BaseValueObject } from '#shared_kernel/domain/base_value_object'
import { Result } from '#shared_kernel/domain/result'

interface EmailProps {
  value: string
}

export class Email extends BaseValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props)
  }

  get value(): string {
    return this.props.value
  }

  public static create(email: string): Result<Email> {
    if (!email || email.trim().length === 0) {
      return Result.fail('Email cannot be empty')
    }

    if (!this.isValidEmail(email)) {
      return Result.fail('Email format is invalid')
    }

    return Result.ok(new Email({ value: email.trim().toLowerCase() }))
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}
