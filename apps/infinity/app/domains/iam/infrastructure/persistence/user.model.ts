import { BaseModel, column, beforeSave } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import hash from '@adonisjs/core/services/hash'

export default class UserModel extends BaseModel {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'user_uuid' })
  declare userUuid: string

  @column({ columnName: 'full_name' })
  declare fullName: string | null

  @column()
  declare email: string

  @column()
  declare username: string

  @column({ serializeAs: null })
  declare password: string

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeSave()
  static async hashPassword(user: UserModel) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password)
    }
  }

  @beforeSave()
  static async generateUuid(user: UserModel) {
    if (!user.userUuid) {
      user.userUuid = randomUUID()
    }
  }
}
