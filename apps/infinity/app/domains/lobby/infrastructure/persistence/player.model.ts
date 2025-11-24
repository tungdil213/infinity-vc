import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import LobbyModel from './lobby.model.js'

export default class PlayerModel extends BaseModel {
  public static table = 'lobby_players'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare username: string

  @column()
  declare lobbyId: number

  @column()
  declare isReady: boolean

  @column()
  declare isOwner: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => LobbyModel, {
    foreignKey: 'lobbyId',
  })
  declare lobby: BelongsTo<typeof LobbyModel>
}
