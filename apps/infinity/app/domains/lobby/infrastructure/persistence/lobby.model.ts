import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import PlayerModel from './player.model.js'

export default class LobbyModel extends BaseModel {
  public static table = 'lobbies'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare uuid: string

  @column()
  declare ownerId: number

  @column()
  declare name: string

  @column()
  declare maxPlayers: number

  @column()
  declare minPlayers: number

  @column()
  declare isPrivate: boolean

  @column()
  declare gameType: string

  @column()
  declare status: string

  @column()
  declare invitationCode: string | null

  @column()
  declare gameId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => PlayerModel, {
    foreignKey: 'lobbyId',
  })
  declare players: HasMany<typeof PlayerModel>
}
