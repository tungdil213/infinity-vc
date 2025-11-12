import { BaseEntity } from '#shared_kernel/domain/base_entity'
import { Result } from '#shared_kernel/domain/result'
import type { Email } from '../value_objects/email.vo.js'
import type { Password } from '../value_objects/password.vo.js'
import type { Username } from '../value_objects/username.vo.js'

interface UserProps {
  email: Email
  password: Password
  username: Username
  fullName?: string
  isActive: boolean
}

export class User extends BaseEntity {
  private props: UserProps

  private constructor(props: UserProps, id?: string) {
    super(id)
    this.props = props
  }

  get email(): Email {
    return this.props.email
  }

  get password(): Password {
    return this.props.password
  }

  get username(): Username {
    return this.props.username
  }

  get fullName(): string | undefined {
    return this.props.fullName
  }

  get isActive(): boolean {
    return this.props.isActive
  }

  public static create(props: UserProps, id?: string): Result<User> {
    if (!props.email) {
      return Result.fail('Email is required')
    }

    if (!props.password) {
      return Result.fail('Password is required')
    }

    if (!props.username) {
      return Result.fail('Username is required')
    }

    const user = new User(
      {
        ...props,
        isActive: props.isActive !== undefined ? props.isActive : true,
      },
      id
    )

    return Result.ok(user)
  }

  public async authenticate(plainPassword: string): Promise<Result<boolean>> {
    const isValid = await this.props.password.verify(plainPassword)

    if (!isValid) {
      return Result.fail('Invalid credentials')
    }

    if (!this.props.isActive) {
      return Result.fail('User account is inactive')
    }

    return Result.ok(true)
  }

  public updateProfile(fullName?: string): Result<void> {
    this.props.fullName = fullName
    this.touch()
    return Result.ok()
  }

  public deactivate(): Result<void> {
    this.props.isActive = false
    this.touch()
    return Result.ok()
  }

  public activate(): Result<void> {
    this.props.isActive = true
    this.touch()
    return Result.ok()
  }
}
