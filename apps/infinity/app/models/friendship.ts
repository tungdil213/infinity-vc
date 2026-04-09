import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'

export default class Friendship extends BaseModel {
  static table = 'friendships'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare uuid: string

  @column()
  declare userAUuid: string

  @column()
  declare userBUuid: string

  @column()
  declare pairKey: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeCreate()
  static assignUuid(model: Friendship) {
    if (!model.uuid) {
      model.uuid = randomUUID()
    }
  }
}
