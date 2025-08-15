import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import User from './user.js'

export default class Player extends BaseModel {
  static table = 'players'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare playerUuid: string

  @column()
  declare userUuid: string

  @column()
  declare nickName: string

  @column()
  declare avatarUrl: string | null

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'userUuid',
    localKey: 'userUuid',
  })
  declare user: BelongsTo<typeof User>

  // Generate UUID before saving
  static async boot() {
    super.boot()

    this.before('create', async (player) => {
      if (!player.playerUuid) {
        player.playerUuid = randomUUID()
      }
    })
  }

  // Soft delete
  async softDelete() {
    this.deletedAt = DateTime.now()
    await this.save()
  }

  // Check if player is deleted
  get isDeleted(): boolean {
    return this.deletedAt !== null
  }
}
