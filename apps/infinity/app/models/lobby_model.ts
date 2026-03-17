import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class LobbyModel extends BaseModel {
  public static table = 'lobbies'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare uuid: string

  @column()
  declare name: string

  @column()
  declare maxPlayers: number

  @column()
  declare isPrivate: boolean

  @column()
  declare gameType: string

  @column({
    serialize: (value: string | Record<string, unknown> | null) => {
      if (!value) return {}
      if (typeof value === 'string') return JSON.parse(value)
      return value
    },
    prepare: (value: Record<string, unknown> | null) => {
      return JSON.stringify(value ?? {})
    },
  })
  declare gameSettings: Record<string, unknown>

  @column()
  declare status: string

  @column()
  declare createdBy: string

  // Relation many-to-many avec les users via lobby_players
  @manyToMany(() => User, {
    pivotTable: 'lobby_players',
    localKey: 'id',
    pivotForeignKey: 'lobby_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'user_id',
  })
  declare players: ManyToMany<typeof User>

  @column({
    serialize: (value: string) => {
      return JSON.parse(value)
    },
    prepare: (value: any) => {
      return JSON.stringify(value)
    },
  })
  declare availableActions: string[]

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Soft delete methods
  async softDelete() {
    this.deletedAt = DateTime.now()
    await this.save()
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null
  }
}
