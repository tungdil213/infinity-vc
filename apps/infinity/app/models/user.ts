import { DateTime } from 'luxon'
import { BaseModel, column, beforeSave } from '@adonisjs/lucid/orm'
import hash from '@adonisjs/core/services/hash'
import { randomUUID } from 'node:crypto'
import {
  type UserRole,
  USER_ROLES,
  hasRequiredRole,
  normalizeUserRole,
} from '#domain/value_objects/user_role'

export default class User extends BaseModel {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userUuid: string

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role: UserRole | null

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password)
    }
  }

  @beforeSave()
  static async generateUuid(user: User) {
    if (!user.userUuid) {
      user.userUuid = randomUUID()
    }
  }

  @beforeSave()
  static normalizeRole(user: User) {
    if (user.$dirty.role || !user.role) {
      user.role = normalizeUserRole(user.role)
    }
  }

  // Helper method to verify password
  async verifyPassword(plainPassword: string): Promise<boolean> {
    return hash.verify(this.password, plainPassword)
  }

  // Soft delete
  async softDelete() {
    this.deletedAt = DateTime.now()
    await this.save()
  }

  get normalizedRole(): UserRole {
    return normalizeUserRole(this.role)
  }

  get isAdmin(): boolean {
    return hasRequiredRole(this.role, USER_ROLES.ADMIN)
  }

  get canModerateLobbies(): boolean {
    return hasRequiredRole(this.role, USER_ROLES.MODERATOR)
  }

  // Check if user is deleted
  get isDeleted(): boolean {
    return this.deletedAt !== null
  }

  // Alias for userUuid for backwards compatibility
  get uuid(): string {
    return this.userUuid
  }

  // Alias for fullName for backwards compatibility with Player interface
  get nickName(): string | null {
    return this.fullName
  }
}
