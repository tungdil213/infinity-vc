import { inject } from '@adonisjs/core'
import { UserRepository } from '#application/repositories/user_repository'
import DomainUser from '#domain/entities/user'
import UserModel from '#models/user'

export class DatabaseUserRepository implements UserRepository {
  async findByUuid(uuid: string): Promise<DomainUser | null> {
    const userModel = await UserModel.query().where('user_uuid', uuid).first()
    if (!userModel) return null

    return this.toDomainUser(userModel)
  }

  async findByUuidOrFail(uuid: string): Promise<DomainUser> {
    const user = await this.findByUuid(uuid)
    if (!user) {
      throw new Error(`User with UUID ${uuid} not found`)
    }
    return user
  }

  async save(user: DomainUser): Promise<void> {
    const serialized = user.toJSON()

    // Check if user exists
    const existingUser = await UserModel.query().where('user_uuid', serialized.uuid).first()

    if (existingUser) {
      // Update existing user
      existingUser.merge({
        fullName: serialized.fullName,
        email: serialized.email,
      })
      await existingUser.save()
    } else {
      // Create new user
      await UserModel.create({
        userUuid: serialized.uuid,
        fullName: serialized.fullName,
        email: serialized.email,
        password: user.password, // Access password directly, will be hashed by model hook
      })
    }
  }

  async delete(uuid: string): Promise<void> {
    const userModel = await UserModel.query().where('user_uuid', uuid).firstOrFail()
    await userModel.softDelete()
  }

  async findAll(): Promise<DomainUser[]> {
    const userModels = await UserModel.query().whereNull('deleted_at')
    return userModels.map((model) => this.toDomainUser(model))
  }

  async findByEmail(email: string): Promise<DomainUser | null> {
    const userModel = await UserModel.query()
      .where('email', email)
      .whereNull('deleted_at')
      .first()

    if (!userModel) return null
    return this.toDomainUser(userModel)
  }

  async findByUsername(username: string): Promise<DomainUser | null> {
    // For now, we don't have username field, so we'll use email
    // This can be updated when username field is added to the schema
    return null
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.findByEmail(email)
    return user !== null
  }

  async existsByUsername(username: string): Promise<boolean> {
    const user = await this.findByUsername(username)
    return user !== null
  }

  private toDomainUser(userModel: UserModel): DomainUser {
    return DomainUser.create({
      uuid: userModel.userUuid,
      firstName: userModel.fullName?.split(' ')[0] || '',
      lastName: userModel.fullName?.split(' ').slice(1).join(' ') || '',
      username: userModel.email, // Use email as username for now
      email: userModel.email,
      password: userModel.password,
    })
  }
}
