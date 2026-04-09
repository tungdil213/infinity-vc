import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'

export default class InvitationCode extends BaseModel {
  static table = 'invitation_codes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare uuid: string

  @column()
  declare codeDigest: string

  @column()
  declare issuerUserUuid: string

  @column()
  declare status: 'active' | 'used' | 'expired' | 'revoked'

  @column.dateTime({ columnName: 'expires_at' })
  declare expiresAt: DateTime | null

  @column()
  declare maxUses: number

  @column()
  declare usedCount: number

  @column()
  declare restrictedEmail: string | null

  @column()
  declare usedByUserUuid: string | null

  @column.dateTime({ columnName: 'used_at' })
  declare usedAt: DateTime | null

  @column.dateTime({ columnName: 'revoked_at' })
  declare revokedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeCreate()
  static assignUuid(model: InvitationCode) {
    if (!model.uuid) {
      model.uuid = randomUUID()
    }
  }
}
