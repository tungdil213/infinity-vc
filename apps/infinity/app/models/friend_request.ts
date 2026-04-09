import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'

export default class FriendRequest extends BaseModel {
  static table = 'friend_requests'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare uuid: string

  @column()
  declare requesterUserUuid: string

  @column()
  declare recipientUserUuid: string

  @column()
  declare pairKey: string

  @column()
  declare status: 'pending' | 'accepted' | 'rejected' | 'cancelled'

  @column.dateTime({ columnName: 'responded_at' })
  declare respondedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeCreate()
  static assignUuid(model: FriendRequest) {
    if (!model.uuid) {
      model.uuid = randomUUID()
    }
  }
}
