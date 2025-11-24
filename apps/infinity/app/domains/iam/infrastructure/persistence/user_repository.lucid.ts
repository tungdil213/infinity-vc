import { Result } from '#shared_kernel/domain/result'
import type { UserRepository } from '../../domain/repositories/user_repository.interface.js'
import type { User } from '../../domain/entities/user.entity.js'
import { User as UserEntity } from '../../domain/entities/user.entity.js'
import type { Email } from '../../domain/value_objects/email.vo.js'
import type { Username } from '../../domain/value_objects/username.vo.js'
import { Email as EmailVO } from '../../domain/value_objects/email.vo.js'
import { Password } from '../../domain/value_objects/password.vo.js'
import { Username as UsernameVO } from '../../domain/value_objects/username.vo.js'
import UserModel from './user.model.js'

export class LucidUserRepository implements UserRepository {
  async save(user: User): Promise<Result<User>> {
    try {
      const model = await UserModel.updateOrCreate(
        { userUuid: user.id },
        {
          userUuid: user.id,
          email: user.email.value,
          password: user.password.value,
          username: user.username.value,
          fullName: user.fullName,
          isActive: user.isActive,
        }
      )

      return this.toDomain(model)
    } catch (error) {
      return Result.fail(`Failed to save user: ${error.message}`)
    }
  }

  async findById(id: string): Promise<Result<User | null>> {
    try {
      const model = await UserModel.findBy('userUuid', id)
      if (!model) {
        return Result.ok(null)
      }
      return this.toDomain(model)
    } catch (error) {
      return Result.fail(`Failed to find user: ${error.message}`)
    }
  }

  async findByEmail(email: Email): Promise<Result<User | null>> {
    try {
      const model = await UserModel.findBy('email', email.value)
      if (!model) {
        return Result.ok(null)
      }
      return this.toDomain(model)
    } catch (error) {
      return Result.fail(`Failed to find user by email: ${error.message}`)
    }
  }

  async findByUsername(username: Username): Promise<Result<User | null>> {
    try {
      const model = await UserModel.findBy('username', username.value)
      if (!model) {
        return Result.ok(null)
      }
      return this.toDomain(model)
    } catch (error) {
      return Result.fail(`Failed to find user by username: ${error.message}`)
    }
  }

  async findAll(): Promise<Result<User[]>> {
    try {
      const models = await UserModel.all()
      const users: User[] = []

      for (const model of models) {
        const userResult = await this.toDomain(model)
        if (userResult.isSuccess && userResult.value) {
          users.push(userResult.value)
        }
      }

      return Result.ok(users)
    } catch (error) {
      return Result.fail(`Failed to find all users: ${error.message}`)
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const model = await UserModel.findBy('userUuid', id)
      if (model) {
        await model.delete()
      }
      return Result.ok()
    } catch (error) {
      return Result.fail(`Failed to delete user: ${error.message}`)
    }
  }

  async exists(id: string): Promise<boolean> {
    const model = await UserModel.findBy('userUuid', id)
    return model !== null
  }

  private async toDomain(model: UserModel): Promise<Result<User>> {
    const emailResult = EmailVO.create(model.email)
    if (emailResult.isFailure) {
      return Result.fail(emailResult.error)
    }

    const usernameResult = UsernameVO.create(model.username)
    if (usernameResult.isFailure) {
      return Result.fail(usernameResult.error)
    }

    const password = Password.createFromHashed(model.password)

    return UserEntity.create(
      {
        email: emailResult.value,
        password,
        username: usernameResult.value,
        fullName: model.fullName || undefined,
        isActive: model.isActive,
      },
      model.userUuid
    )
  }
}
