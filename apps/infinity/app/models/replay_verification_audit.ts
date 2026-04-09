import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ReplayVerificationAuditModel extends BaseModel {
  public static table = 'replay_verification_audits'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare operation: string

  @column()
  declare source: string

  @column()
  declare actorId: string

  @column()
  declare targetId: string

  @column()
  declare accepted: boolean

  @column()
  declare reason: string | null

  @column()
  declare envelopeKeyId: string | null

  @column()
  declare envelopeAlgorithm: string | null

  @column()
  declare envelopeSignedAt: string | null

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: unknown) =>
      value === null || value === undefined ? null : JSON.stringify(value),
  })
  declare metadata: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime
}
